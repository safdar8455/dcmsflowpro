import React from 'react';
import { useAuth } from './AuthProvider';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { LogOut, LayoutDashboard, FileText, Settings, User as UserIcon, Calculator, TrendingUp } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role } = useAuth();
  const location = useLocation();

  const handleLogout = () => signOut(auth);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Death Claims', path: '/claims', icon: FileText },
    { name: 'FIB Schedule', path: '/fib-schedule', icon: TrendingUp },
    { name: 'Bonus Helper', path: '/bonus-helper', icon: Calculator },
  ];

  const bootstrapAdmins = ['safderjamali12@gmail.com', 'safdarse063@gmail.com'];
  const isBootstrapAdmin = user?.email && bootstrapAdmins.includes(user.email);

  if (role?.role === 'ADMIN' || isBootstrapAdmin) {
    navItems.push({ name: 'System Access', path: '/admin', icon: Settings });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-200 shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-2 text-white">
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-500/20">
              <FileText size={20} className="text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">ClaimFlow Pro</h1>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">Office Management</p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`}
              >
                <item.icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 bg-slate-800/50 m-4 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shadow-inner">
              {user?.displayName?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{user?.displayName || 'User'}</p>
              <p className="text-[10px] text-slate-500 truncate uppercase font-semibold tracking-wider">
                {role?.role?.replace('_', ' ') || 'Assigning...'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-white hover:bg-slate-700 transition-all border border-slate-700"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Header (Optional, if we want a top nav bar like the theme) */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-slate-500">
              {location.pathname === '/' ? 'Overview' : location.pathname.startsWith('/claims') ? 'Claims Pipeline' : 'Settings'}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-right">
              <div className="font-bold text-slate-700">Service Center</div>
              <div className="text-slate-400">Asia Southeast Region</div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
