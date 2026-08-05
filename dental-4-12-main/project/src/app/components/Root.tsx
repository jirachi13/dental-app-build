import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Calendar, Brain,
  ClipboardList, LogOut, Stethoscope, Shield,
  Clipboard, FileBarChart, UserCog, KeyRound,
  ChevronLeft, ChevronRight, Menu, X
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getSchoolColor, getSchoolShortName } from '../utils/schoolColors';
import { apiClient, ApiError } from '../api/client';
import { useToast } from './Toast';
import { Modal } from './Modal';


export const Root = () => {
  const { user, logout, selectedSchool, setSelectedSchool } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  // Desktop-only manual collapse. Not persisted per-breakpoint: below md the
  // sidebar is an off-canvas drawer and `collapsed` is ignored entirely.
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');
  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      localStorage.setItem('sidebarCollapsed', String(!prev));
      return !prev;
    });
  };

  // Mobile navigation drawer (Sprint 33). Below md the sidebar used to shrink
  // to a 60px icon rail with every label hidden and no working tooltip --
  // ten unlabeled glyphs. It is now off-canvas and fully labeled.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Close on navigation. Covers back/forward too; TabLink also closes on click
  // so that re-selecting the CURRENT route (no pathname change) still closes.
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  // Escape to close, Tab trapped inside, background scroll locked. Focus moves
  // into the drawer on open and back to the hamburger on close.
  useEffect(() => {
    if (!drawerOpen) return;
    const el = drawerRef.current;
    if (!el) return;

    const SEL = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusable = () =>
      Array.from(el.querySelectorAll<HTMLElement>(SEL)).filter((n) => n.offsetParent !== null);

    focusable()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setDrawerOpen(false); return; }
      if (e.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      menuButtonRef.current?.focus();
    };
  }, [drawerOpen]);

  // High-risk count for the Risk Classification badge — one light server
  // aggregate (Sprint 23p) instead of the dashboard's 6-collection fetch.
  const [highRiskCount, setHighRiskCount] = useState(0);
  useEffect(() => {
    if (user?.role !== 'dentist') return;
    const q = selectedSchool ? `?school=${encodeURIComponent(selectedSchool)}` : '';
    apiClient.get<{ count: number }>(`/stats/high-risk-count${q}`)
      .then((r) => setHighRiskCount(r.count))
      .catch(() => setHighRiskCount(0));
  }, [user?.role, selectedSchool]);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const openChangePassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setChangePasswordError(null);
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
      toast.success('Password changed.');
      setShowChangePassword(false);
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

  // Label visibility: always shown below md (the drawer is 280px wide and
  // unlabeled icons were the whole bug), then governed by `collapsed` at md+.
  const labelCls = collapsed ? 'block md:hidden' : 'block';
  const badgeCls = collapsed ? 'inline-block md:hidden' : 'inline-block';

  const TabLink = ({ tab }: { tab: typeof allTabs[0] }) => {
    const isActive = isTabActive(tab.path);
    const Icon = tab.icon;
    return (
      <Link
        to={tab.path}
        onClick={() => setDrawerOpen(false)}
        title={collapsed ? tab.label : undefined}
        aria-current={isActive ? 'page' : undefined}
        className={`flex items-center gap-3 px-4 py-3 transition-colors ${
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-foreground hover:bg-primary-surface'
        }`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className={`${labelCls} text-sm font-medium`}>{tab.label}</span>
        {tab.path === '/ai-analytics' && highRiskCount > 0 && (
          <span className={`${badgeCls} ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${
            isActive ? 'bg-white/20 text-white' : 'bg-danger-surface text-destructive'
          }`}>
            {highRiskCount}
          </span>
        )}
      </Link>
    );
  };

  return (
    // flex-col below md so the mobile top bar stacks ABOVE the content as a
    // normal flow item. It must not be `fixed`: OfflineBanner renders in flow
    // at the document top (App.tsx), and a fixed bar would sit on top of it and
    // hide the offline/sync warning entirely. `sticky` keeps it in flow, lets
    // the banner show, and still pins the bar once the page scrolls.
    <div className="min-h-screen bg-canvas flex flex-col md:flex-row">
      {/* MOBILE TOP BAR -- below md only; the drawer's only entry point */}
      <header className="md:hidden sticky top-0 h-14 z-30 flex items-center gap-3 px-4 bg-card border-b border-border">
        <button
          ref={menuButtonRef}
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={drawerOpen}
          aria-controls="main-nav"
          className="-ml-2 p-2 rounded-lg text-foreground hover:bg-primary-surface transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-base font-bold text-primary">FLORAL</span>
        {selectedSchool && (
          <span className="ml-auto text-xs font-medium text-muted-foreground truncate max-w-[45%]">
            {getSchoolShortName(selectedSchool)}
          </span>
        )}
      </header>

      {/* DRAWER BACKDROP -- below md only */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
          className="md:hidden fixed inset-0 bg-black/40 z-40"
        />
      )}

      {/* LEFT TAB BAR -- off-canvas drawer below md, fixed rail at md+.
          `invisible` when closed keeps the offscreen drawer out of the tab
          order and the accessibility tree; md:visible restores the desktop
          sidebar unconditionally. */}
      <aside
        ref={drawerRef}
        id="main-nav"
        className={`bg-card border-r border-border flex flex-col fixed left-0 top-0 h-screen z-50
          w-[280px] transition-transform duration-200
          ${drawerOpen ? 'translate-x-0 visible' : '-translate-x-full invisible'}
          md:visible md:translate-x-0 md:transition-[width]
          ${collapsed ? 'md:w-[60px]' : 'md:w-[220px]'}`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-border relative">
          {/* Collapse toggle -- desktop only, mobile has no room to expand anyway */}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:flex absolute -right-3 top-5 w-6 h-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-gray-50 shadow-sm z-10"
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="FLORAL" className="w-8 h-8 md:w-10 md:h-10 object-contain flex-shrink-0" />
            <div className={labelCls}>
              <div className="text-lg font-bold text-primary">FLORAL</div>
              <div className="text-xs text-muted-foreground leading-tight">Dental Health Record Management System</div>
            </div>
            {/* Close -- drawer only; Escape and the backdrop also close it */}
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation menu"
              className="md:hidden ml-auto -mr-2 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-primary-surface transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* School indicator */}
        {selectedSchool && (
          <button
            onClick={handleSwitchSchool}
            title={collapsed ? getSchoolShortName(selectedSchool) : undefined}
            className={`mx-3 my-2 items-start gap-2 px-3 py-2 rounded-lg bg-primary-surface hover:bg-blue-100 transition-colors text-left w-[calc(100%-24px)] ${collapsed ? 'flex md:hidden' : 'flex'}`}
          >
            <div className="min-w-0 flex-1">
              {/* label carries the blue fill's own hue at AA contrast (audit U4:
                  was 10px tracked-uppercase blue-400 on blue-50, ~2.2:1) */}
              <div className="text-[11px] font-medium text-blue-700 leading-none mb-0.5">Current school</div>
              <div className="text-xs font-semibold text-blue-900 leading-snug truncate">{getSchoolShortName(selectedSchool)}</div>
            </div>
            <span className="text-[11px] text-blue-700 font-medium mt-0.5 shrink-0">Switch</span>
          </button>
        )}

        {/* Tabs */}
        <nav className="flex-1 overflow-y-auto py-2">
          {visibleTabs.map((tab) => (
            <TabLink key={tab.id} tab={tab} />
          ))}
        </nav>

        {/* User info + logout */}
        <div className="border-t border-border p-4">
          <div className={`mb-3 ${labelCls}`}>
            <div className="text-sm font-medium text-foreground truncate">{user.name}</div>
            <div className="mt-1">
              <span className="inline-block px-2 py-0.5 text-xs bg-primary-surface text-primary rounded capitalize">
                {user.role.replace('_', ' ')}
              </span>
            </div>
          </div>
          <button
            onClick={openChangePassword}
            title={collapsed ? 'Change Password' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors mb-1 justify-start ${collapsed ? 'md:justify-center' : 'md:justify-start'}`}
          >
            <KeyRound className="w-5 h-5 flex-shrink-0" />
            <span className={`${labelCls} text-sm font-medium`}>Change Password</span>
          </button>
          <button
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 text-destructive hover:bg-danger-surface rounded-lg transition-colors justify-start ${collapsed ? 'md:justify-center' : 'md:justify-start'}`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className={`${labelCls} text-sm font-medium`}>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      {/* MAIN CONTENT -- full width below md (the drawer is off-canvas), offset
          by the fixed rail at md+. No top padding needed: the mobile bar is a
          flow sibling above, not an overlay. */}
      <main className={`flex-1 ml-0 ${collapsed ? 'md:ml-[60px]' : 'md:ml-[220px]'} overflow-x-hidden transition-[margin] duration-200`}>
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Change Password Modal */}
      {showChangePassword && (
        <Modal onClose={() => setShowChangePassword(false)} closeDisabled={changingPassword}>
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Change Password</h2>
            </div>
            <>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  {changePasswordError && <p className="text-sm text-destructive">{changePasswordError}</p>}
                </div>
                <div className="flex gap-3 p-6 border-t border-border">
                  <button
                    onClick={() => setShowChangePassword(false)}
                    className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover disabled:opacity-60 transition-colors"
                  >
                    {changingPassword ? 'Changing…' : 'Change Password'}
                  </button>
                </div>
            </>
        </Modal>
      )}
    </div>
  );
};
