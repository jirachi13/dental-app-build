import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Calendar, Brain,
  ClipboardList, LogOut, Stethoscope, Shield,
  Clipboard, FileBarChart, UserCog, KeyRound,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { getSchoolColor, getSchoolShortName } from '../utils/schoolColors';
import { apiClient, ApiError } from '../api/client';

// Fallback logo — replace with actual Barangay Tanyag logo file
const logoImage = null;

export const Root = () => {
  const { user, logout, selectedSchool, setSelectedSchool } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  // Desktop-only manual collapse -- mobile stays icon-only regardless (no
  // room to expand there anyway). Persisted so it's remembered across visits.
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');
  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      localStorage.setItem('sidebarCollapsed', String(!prev));
      return !prev;
    });
  };

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const openChangePassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setChangePasswordError(null);
    setChangePasswordSuccess(false);
    setShowChangePassword(true);
  };

  const handleChangePassword = async () => {
    setChangePasswordError(null);
    if (newPassword.length < 8) {
      setChangePasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePasswordError('New passwords do not match.');
      return;
    }
    setChangingPassword(true);
    try {
      await apiClient.patch('/auth/change-password', { currentPassword, newPassword });
      setChangePasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setChangePasswordError(err instanceof ApiError ? err.message : 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (!user) return null;

  const allTabs = [
    {
      id: 1, path: '/', label: 'Dashboard', icon: LayoutDashboard,
      roles: ['dentist','dental_aide','school_admin','bho_staff','system_admin']
    },
    {
      id: 2, path: '/appointments', label: 'Appointments', icon: Calendar,
      roles: ['dentist','dental_aide']
    },
    {
      id: 3, path: '/patients', label: 'Students', icon: Users,
      roles: ['dentist','dental_aide']
    },
    {
      id: 4, path: '/dental-charts', label: 'Dental Charts', icon: Stethoscope,
      roles: ['dentist','dental_aide']
    },
    {
      id: 5, path: '/ai-analytics', label: 'Risk Classification', icon: Brain,
      roles: ['dentist']
    },
    {
      id: 6, path: '/treatment-records', label: 'Treatment', icon: Clipboard,
      roles: ['dentist','dental_aide']
    },
    {
      id: 7, path: '/rpc', label: 'RPC Tracking', icon: Shield,
      roles: ['dentist','dental_aide']
    },
    {
      id: 8, path: '/reports', label: 'Reports', icon: FileBarChart,
      roles: ['dentist','dental_aide','school_admin','bho_staff']
    },
    {
      id: 9, path: '/accounts', label: 'User Management', icon: UserCog,
      roles: ['system_admin']
    },
    {
      id: 10, path: '/audit', label: 'Audit Trail', icon: ClipboardList,
      roles: ['system_admin']
    },
    // Follow Up Alerts REMOVED
  ];

  const visibleTabs = allTabs.filter(tab => tab.roles.includes(user.role));

  const handleSwitchSchool = () => {
    setSelectedSchool(null);
    navigate('/select-school');
  };

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const isTabActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const TabLink = ({ tab }: { tab: typeof allTabs[0] }) => {
    const isActive = isTabActive(tab.path);
    const Icon = tab.icon;
    return (
      <Link
        to={tab.path}
        title={collapsed ? tab.label : undefined}
        className={`flex items-center gap-3 px-4 py-3 transition-colors ${
          isActive
            ? 'bg-[#1E40AF] text-white'
            : 'text-gray-700 hover:bg-[#EFF6FF]'
        }`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className={`${collapsed ? 'hidden' : 'hidden md:block'} text-sm font-medium`}>{tab.label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* LEFT TAB BAR */}
      <aside className={`w-[60px] ${collapsed ? '' : 'md:w-[220px]'} bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 h-screen z-40 transition-[width] duration-200`}>
        {/* Logo */}
        <div className="p-4 border-b border-gray-200 relative">
          {/* Collapse toggle -- desktop only, mobile has no room to expand anyway */}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:flex absolute -right-3 top-5 w-6 h-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 shadow-sm z-10"
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
          <div className="flex items-center gap-3">
            {logoImage ? (
              <img src={logoImage} alt="Barangay Tanyag" className="w-8 h-8 md:w-10 md:h-10 object-contain flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 md:w-10 md:h-10 bg-[#E31E24] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xs">BT</span>
              </div>
            )}
            <div className={collapsed ? 'hidden' : 'hidden md:block'}>
              <div className="text-lg font-bold text-[#1E40AF]">FLORAL</div>
              <div className="text-xs text-gray-500 leading-tight">Dental Health Record Management System</div>
            </div>
          </div>
        </div>

        {/* School indicator */}
        {selectedSchool && (
          <button
            onClick={handleSwitchSchool}
            title={collapsed ? getSchoolShortName(selectedSchool) : undefined}
            className={`mx-3 my-2 items-start gap-2 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors text-left w-[calc(100%-24px)] ${collapsed ? 'hidden' : 'hidden md:flex'}`}
          >
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-medium text-blue-400 uppercase tracking-wide leading-none mb-0.5">Current School</div>
              <div className="text-xs font-semibold text-blue-900 leading-snug truncate">{getSchoolShortName(selectedSchool)}</div>
            </div>
            <span className="text-[10px] text-blue-500 font-medium mt-0.5 shrink-0">Switch</span>
          </button>
        )}

        {/* Tabs */}
        <nav className="flex-1 overflow-y-auto py-2">
          {visibleTabs.map((tab) => (
            <TabLink key={tab.id} tab={tab} />
          ))}
        </nav>

        {/* User info + logout */}
        <div className="border-t border-gray-200 p-4">
          <div className={`mb-3 ${collapsed ? 'hidden' : 'hidden md:block'}`}>
            <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
            <div className="mt-1">
              <span className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded capitalize">
                {user.role.replace('_', ' ')}
              </span>
            </div>
          </div>
          <button
            onClick={openChangePassword}
            title={collapsed ? 'Change Password' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors mb-1 ${collapsed ? 'justify-center' : 'justify-center md:justify-start'}`}
          >
            <KeyRound className="w-5 h-5 flex-shrink-0" />
            <span className={`${collapsed ? 'hidden' : 'hidden md:block'} text-sm font-medium`}>Change Password</span>
          </button>
          <button
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ${collapsed ? 'justify-center' : 'justify-center md:justify-start'}`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className={`${collapsed ? 'hidden' : 'hidden md:block'} text-sm font-medium`}>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className={`flex-1 ml-[60px] ${collapsed ? '' : 'md:ml-[220px]'} overflow-x-hidden transition-[margin] duration-200`}>
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">Change Password</h2>
            </div>
            {changePasswordSuccess ? (
              <div className="p-6 space-y-4">
                <p className="text-sm text-green-700">Password changed successfully.</p>
                <button
                  onClick={() => setShowChangePassword(false)}
                  className="w-full px-4 py-2 bg-[#1E40AF] text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent"
                    />
                  </div>
                  {changePasswordError && <p className="text-sm text-red-600">{changePasswordError}</p>}
                </div>
                <div className="flex gap-3 p-6 border-t">
                  <button
                    onClick={() => setShowChangePassword(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                    className="flex-1 px-4 py-2 bg-[#1E40AF] text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
                  >
                    {changingPassword ? 'Changing…' : 'Change Password'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
