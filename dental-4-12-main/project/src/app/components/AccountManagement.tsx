import { useState } from 'react';
import { Plus, Edit, Power, Search, KeyRound } from 'lucide-react';
import { useUsers, ROLE_LABELS } from '../hooks/useUsers';
import { apiClient, ApiError } from '../api/client';
import type { ApiRole } from '../api/types';

const ROLES: ApiRole[] = ['dentist', 'dental_aide', 'school_admin', 'bho_staff', 'system_admin'];

export const AccountManagement = () => {
  const { users, schools, loading, error, reload } = useUsers();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', role: 'dentist' as ApiRole, school_id: '', password: '' });

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', email: '', role: 'dentist' as ApiRole, school_id: '' });
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // 2FA management (Sprint 25). Enable is confirmation-gated server-side:
  // initiate emails a code to the account's address, confirm proves the
  // mailbox is real before 2FA can lock anyone out.
  const [twofaStep, setTwofaStep] = useState<'idle' | 'code-sent'>('idle');
  const [twofaCode, setTwofaCode] = useState('');
  const [twofaBusy, setTwofaBusy] = useState(false);
  const [twofaMessage, setTwofaMessage] = useState<string | null>(null);
  const editingUser = users.find((u) => u.id === editingUserId) ?? null;

  const openEdit = (user: (typeof users)[number]) => {
    const school = schools.find((s) => s.school_name === user.school);
    setEditForm({ full_name: user.name, email: user.email, role: user.role, school_id: school?._id ?? '' });
    setEditError(null);
    setTwofaStep('idle');
    setTwofaCode('');
    setTwofaMessage(null);
    setEditingUserId(user.id);
  };

  const handleTwofaInitiate = async () => {
    if (!editingUserId) return;
    setTwofaBusy(true);
    setTwofaMessage(null);
    try {
      const res = await apiClient.post<{ message: string }>(`/users/${editingUserId}/twofa/initiate`, {});
      setTwofaStep('code-sent');
      setTwofaMessage(res.message);
    } catch (err) {
      setTwofaMessage(err instanceof ApiError ? err.message : 'Failed to send the confirmation code');
    } finally {
      setTwofaBusy(false);
    }
  };

  const handleTwofaConfirm = async () => {
    if (!editingUserId || !twofaCode) return;
    setTwofaBusy(true);
    try {
      await apiClient.post(`/users/${editingUserId}/twofa/confirm`, { code: twofaCode });
      setTwofaStep('idle');
      setTwofaCode('');
      setTwofaMessage('Two-factor authentication enabled.');
      await reload();
    } catch (err) {
      setTwofaMessage(err instanceof ApiError ? err.message : 'Failed to confirm the code');
    } finally {
      setTwofaBusy(false);
    }
  };

  const handleTwofaDisable = async () => {
    if (!editingUserId) return;
    setTwofaBusy(true);
    try {
      await apiClient.post(`/users/${editingUserId}/twofa/disable`, {});
      setTwofaMessage('Two-factor authentication disabled.');
      await reload();
    } catch (err) {
      setTwofaMessage(err instanceof ApiError ? err.message : 'Failed to disable 2FA');
    } finally {
      setTwofaBusy(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingUserId) return;
    setEditError(null);
    if (!editForm.full_name || !editForm.email) {
      setEditError('Full name and email are required.');
      return;
    }
    setEditSubmitting(true);
    try {
      await apiClient.put(`/users/${editingUserId}`, { ...editForm, school_id: editForm.school_id || null });
      setEditingUserId(null);
      await reload();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'Failed to update account');
    } finally {
      setEditSubmitting(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.roleLabel.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = async () => {
    setFormError(null);
    if (!form.full_name || !form.email || !form.password) {
      setFormError('Full name, email, and password are required.');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/users', { ...form, school_id: form.school_id || null });
      setShowCreateForm(false);
      setForm({ full_name: '', email: '', role: 'dentist', school_id: '', password: '' });
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, status: 'Active' | 'Inactive') => {
    await apiClient.patch(`/users/${id}/${status === 'Active' ? 'archive' : 'restore'}`);
    await reload();
  };

  // Admin-assisted password reset -- System Admin sets a new password
  // directly and relays it out-of-band, no email/reset-token flow needed
  // at this app's scale.
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resettingUserName, setResettingUserName] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const openResetPassword = (user: (typeof users)[number]) => {
    setResetPassword('');
    setResetConfirm('');
    setResetError(null);
    setResettingUserName(user.name);
    setResettingUserId(user.id);
  };

  const handleResetPassword = async () => {
    if (!resettingUserId) return;
    setResetError(null);
    if (resetPassword.length < 8) {
      setResetError('Password must be at least 8 characters.');
      return;
    }
    if (resetPassword !== resetConfirm) {
      setResetError('Passwords do not match.');
      return;
    }
    setResetSubmitting(true);
    try {
      await apiClient.patch(`/users/${resettingUserId}/reset-password`, { password: resetPassword });
      setResettingUserId(null);
    } catch (err) {
      setResetError(err instanceof ApiError ? err.message : 'Failed to reset password');
    } finally {
      setResetSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500 p-8 text-center">Loading accounts…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Management</h1>
          <p className="text-gray-600 mt-1">{filteredUsers.length} user accounts</p>
        </div>

        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1E40AF] text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Account
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
          />
        </div>
      </div>

      {/* Create Account Form */}
      {showCreateForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Create New Account</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Dr. Juan Dela Cruz"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="juan.delacruz@floral.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as ApiRole })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
              >
                {ROLES.map(role => (
                  <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assigned School</label>
              <select
                value={form.school_id}
                onChange={(e) => setForm({ ...form, school_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
              >
                <option value="">None (Barangay Level)</option>
                {schools.map(school => (
                  <option key={school._id} value={school._id}>{school.school_name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Temporary Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Set an initial password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Share this with the user securely; there's no forced password-change flow yet</p>
            </div>
          </div>
          {formError && <p className="text-sm text-red-600 mt-3">{formError}</p>}
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleCreate}
              disabled={submitting}
              className="px-4 py-2 bg-[#1E40AF] text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {submitting ? 'Creating…' : 'Create Account'}
            </button>
            <button
              onClick={() => { setShowCreateForm(false); setFormError(null); }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  School
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className={`hover:bg-gray-50 ${user.pending ? 'opacity-70' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900 flex items-center">
                      {user.name}
                      {user.pending && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">Pending sync</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      {user.roleLabel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {user.school}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.status === 'Active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {!user.pending && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEdit(user)}
                          className="text-[#1E40AF] hover:text-[#1E3A8A]"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openResetPassword(user)}
                          title="Reset Password"
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user.id, user.status)}
                          className={`${
                          user.status === 'Active'
                            ? 'text-red-600 hover:text-red-700'
                            : 'text-green-600 hover:text-green-700'
                        }`}>
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {filteredUsers.map((user) => (
          <div key={user.id} className={`bg-white rounded-xl border border-gray-200 p-4 ${user.pending ? 'opacity-70' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center">
                  {user.name}
                  {user.pending && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">Pending sync</span>
                  )}
                </h3>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                user.status === 'Active'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {user.status}
              </span>
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Role:</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  {user.roleLabel}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">School:</span>
                <span className="text-gray-900">{user.school}</span>
              </div>
            </div>
            {!user.pending && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => openEdit(user)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => openResetPassword(user)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  <KeyRound className="w-4 h-4" />
                  Reset Password
                </button>
                <button
                  onClick={() => handleToggleStatus(user.id, user.status)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm ${
                  user.status === 'Active'
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}>
                  <Power className="w-4 h-4" />
                  {user.status === 'Active' ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Edit Account Modal */}
      {editingUserId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">Edit Account</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as ApiRole })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
                >
                  {ROLES.map(role => (
                    <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assigned School</label>
                <select
                  value={editForm.school_id}
                  onChange={(e) => setEditForm({ ...editForm, school_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
                >
                  <option value="">None (Barangay Level)</option>
                  {schools.map(school => (
                    <option key={school._id} value={school._id}>{school.school_name}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500">Password isn't changed here — use the Reset Password action instead.</p>

              {/* Two-factor authentication */}
              <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Two-Factor Authentication</p>
                    <p className="text-xs text-gray-500">
                      {editingUser?.twofaEnabled
                        ? 'Enabled — login requires an emailed code.'
                        : 'Off. Enabling sends a test code to the account email that must be entered here first — this proves the mailbox is real before 2FA can lock the account.'}
                    </p>
                  </div>
                  {editingUser?.twofaEnabled ? (
                    <button
                      onClick={handleTwofaDisable}
                      disabled={twofaBusy}
                      className="shrink-0 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-60"
                    >
                      Disable
                    </button>
                  ) : twofaStep === 'idle' ? (
                    <button
                      onClick={handleTwofaInitiate}
                      disabled={twofaBusy}
                      className="shrink-0 px-3 py-1.5 text-sm border border-[#1E40AF] text-[#1E40AF] rounded-lg hover:bg-blue-50 disabled:opacity-60"
                    >
                      {twofaBusy ? 'Sending…' : 'Enable (send code)'}
                    </button>
                  ) : null}
                </div>
                {!editingUser?.twofaEnabled && twofaStep === 'code-sent' && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={twofaCode}
                      onChange={(e) => setTwofaCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="6-digit code"
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
                    />
                    <button
                      onClick={handleTwofaConfirm}
                      disabled={twofaBusy || twofaCode.length !== 6}
                      className="px-3 py-1.5 text-sm bg-[#1E40AF] text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                    >
                      {twofaBusy ? 'Confirming…' : 'Confirm'}
                    </button>
                  </div>
                )}
                {twofaMessage && <p className="text-xs text-gray-600">{twofaMessage}</p>}
              </div>

              {editError && <p className="text-sm text-red-600">{editError}</p>}
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button
                onClick={() => setEditingUserId(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editSubmitting}
                className="flex-1 px-4 py-2 bg-[#1E40AF] text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {editSubmitting ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resettingUserId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">Reset Password</h2>
              <p className="text-sm text-gray-500 mt-1">for {resettingUserName}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500">Share the new password with {resettingUserName} directly (in person, chat, or phone) — there's no automatic email notification.</p>
              {resetError && <p className="text-sm text-red-600">{resetError}</p>}
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button
                onClick={() => setResettingUserId(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetSubmitting}
                className="flex-1 px-4 py-2 bg-[#1E40AF] text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {resetSubmitting ? 'Resetting…' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
