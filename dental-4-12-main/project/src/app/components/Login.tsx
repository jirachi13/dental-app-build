import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react';
import { apiClient, ApiError } from '../api/client';
// Logo placeholder — replace with actual Barangay Tanyag logo file
const logoImage = null;

type Step = 'credentials' | 'otp' | 'forgot' | 'forgot-sent';

export const Login = () => {
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { login, verifyOtp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (result.ok) {
      navigate('/');
    } else if (result.twofaRequired) {
      setStep('otp');
      setCode('');
      setResendCooldown(60);
    } else {
      setError(result.error || 'Login failed');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await verifyOtp(email, code);
    setSubmitting(false);
    if (result.ok) {
      navigate('/');
    } else {
      setError(result.error || 'Verification failed');
    }
  };

  // Re-running login re-checks the password and emails a fresh code
  const handleResend = async () => {
    setError(null);
    setResendCooldown(60);
    const result = await login(email, password);
    if (!result.twofaRequired && !result.ok) {
      setError(result.error || 'Could not resend the code');
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.post('/auth/forgot-password', { email });
      setStep('forgot-sent');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No connection — try again when back online.');
    } finally {
      setSubmitting(false);
    }
  };

  const backToSignIn = () => {
    setStep('credentials');
    setError(null);
    setCode('');
  };

  const inputClass =
    'w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent text-sm';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-4">
          <div className="flex justify-center mb-2">
            {logoImage ? (
              <img src={logoImage} alt="Barangay Tanyag" className="w-14 h-14 object-contain" />
            ) : (
              <div className="w-14 h-14 bg-[#E31E24] rounded-full flex items-center justify-center mx-auto">
                <span className="text-white font-bold text-lg">BT</span>
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-[#1E40AF] mb-1">FLORAL</h1>
          <p className="text-sm text-gray-600">Dental Health Record Management System</p>
          <p className="text-xs text-gray-500 mt-0.5">Barangay Tanyag, Taguig City</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-5 border border-gray-100">
          {step === 'credentials' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="your.email@floral.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClass} pr-9`}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setStep('forgot'); setError(null); }}
                className="block ml-auto text-xs text-[#1E40AF] hover:underline"
              >
                Forgot password?
              </button>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#1E40AF] hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg transition-colors text-sm"
              >
                {submitting ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800">
                <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                <span>A 6-digit verification code was emailed to <strong>{email}</strong>. It expires in 10 minutes.</span>
              </div>
              <div>
                <label htmlFor="login-otp" className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Code
                </label>
                <input
                  id="login-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent text-center text-xl tracking-[0.4em] font-semibold"
                  placeholder="••••••"
                  autoFocus
                  required
                />
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || code.length !== 6}
                className="w-full bg-[#1E40AF] hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg transition-colors text-sm"
              >
                {submitting ? 'Verifying…' : 'Verify & Sign In'}
              </button>

              <div className="flex items-center justify-between text-xs">
                <button type="button" onClick={backToSignIn} className="flex items-center gap-1 text-gray-500 hover:text-gray-700">
                  <ArrowLeft className="w-3 h-3" /> Back to sign in
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="text-[#1E40AF] hover:underline disabled:text-gray-400 disabled:no-underline"
                >
                  {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend code'}
                </button>
              </div>
            </form>
          )}

          {step === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <p className="text-sm text-gray-700 font-medium">Reset your password</p>
              <p className="text-xs text-gray-500">
                Enter your account email — if it has a real mailbox on file, you'll receive a reset link.
                No email set up? Contact your System Admin instead.
              </p>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="your.email@floral.com"
                  autoFocus
                  required
                />
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#1E40AF] hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg transition-colors text-sm"
              >
                {submitting ? 'Sending…' : 'Send Reset Link'}
              </button>
              <button type="button" onClick={backToSignIn} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                <ArrowLeft className="w-3 h-3" /> Back to sign in
              </button>
            </form>
          )}

          {step === 'forgot-sent' && (
            <div className="space-y-4">
              <div className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                If that email has an account, a reset link is on its way. The link expires in 30 minutes — check spam if it doesn't arrive.
              </div>
              <button type="button" onClick={backToSignIn} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                <ArrowLeft className="w-3 h-3" /> Back to sign in
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 mt-3">
          © 2026 Barangay Tanyag Health Office. All rights reserved.
        </p>
      </div>
    </div>
  );
};
