import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Calendar, Brain,
  ClipboardList, LogOut, Stethoscope, Shield,
  Clipboard, FileBarChart, UserCog
} from 'lucide-react';
import { useEffect } from 'react';
import { getSchoolColor, getSchoolShortName } from '../utils/schoolColors';

// Fallback logo — replace with actual Barangay Tanyag logo file
const logoImage = null;

export const Root = () => {
  const { user, logout, selectedSchool, setSelectedSchool } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

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
        className={`flex items-center gap-3 px-4 py-3 transition-colors ${
          isActive
            ? 'bg-[#1E40AF] text-white'
            : 'text-gray-700 hover:bg-[#EFF6FF]'
        }`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="hidden md:block text-sm font-medium">{tab.label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* LEFT TAB BAR */}
      <aside className="w-[60px] md:w-[220px] bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 h-screen z-40">
        {/* Logo */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {logoImage ? (
              <img src={logoImage} alt="Barangay Tanyag" className="w-8 h-8 md:w-10 md:h-10 object-contain flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 md:w-10 md:h-10 bg-[#E31E24] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xs">BT</span>
              </div>
            )}
            <div className="hidden md:block">
              <div className="text-lg font-bold text-[#1E40AF]">FLORAL</div>
              <div className="text-xs text-gray-500 leading-tight">Dental Health System</div>
            </div>
          </div>
        </div>

        {/* School indicator */}
        {selectedSchool && (
          <button
            onClick={handleSwitchSchool}
            className="mx-3 my-2 hidden md:flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors text-left w-[calc(100%-24px)]"
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
          <div className="hidden md:block mb-3">
            <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
            <div className="mt-1">
              <span className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded capitalize">
                {user.role.replace('_', ' ')}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center md:justify-start gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="hidden md:block text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 ml-[60px] md:ml-[220px] overflow-x-hidden">
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
