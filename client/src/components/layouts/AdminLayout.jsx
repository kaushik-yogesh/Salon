import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const AdminLayout = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const navItems = [
    { path: '/admin', label: 'Platform Overview', icon: '🌍' },
    { path: '/admin/tenants', label: 'Tenants & Salons', icon: '🏢' },
    { path: '/admin/subscriptions', label: 'Subscriptions', icon: '💳' },
    { path: '/admin/users', label: 'Platform Users', icon: '👥' },
    { path: '/admin/audit', label: 'Audit Logs', icon: '📋' },
    { path: '/admin/health', label: 'System Health', icon: '❤️' },
    { path: '/admin/settings', label: 'System Settings', icon: '⚙️' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <aside className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex shadow-xl">
        <div className="p-6 border-b border-slate-800 flex items-center justify-center">
          <h1 className="text-2xl font-bold text-white">SalonOS</h1>
          <span className="ml-2 text-[10px] font-bold bg-red-500 text-white px-2 py-1 rounded-sm uppercase tracking-wider">Super Admin</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-slate-800 text-white' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <div className="flex items-center justify-between mb-4 px-2">
            <div>
              <p className="text-sm font-medium text-white">{user?.profile?.firstName} {user?.profile?.lastName}</p>
              <p className="text-xs text-slate-400 truncate max-w-[150px]">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              localStorage.removeItem('salon_token');
              window.location.href = '/login';
            }}
            className="w-full flex items-center justify-center px-4 py-2 border border-slate-700 shadow-sm text-sm font-medium rounded-md text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center text-white">
          <h1 className="text-xl font-bold">Admin Portal</h1>
          <button className="text-slate-400">☰</button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-100">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
