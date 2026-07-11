import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const WorkerLayout = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const navItems = [
    { path: '/worker', label: 'My Schedule', icon: '📅' },
    { path: '/worker/scanner', label: 'QR Scanner', icon: '📱' },
    { path: '/worker/salary', label: 'My Earnings', icon: '💰' },
    { path: '/worker/leaves', label: 'Time Off', icon: '🏖️' },
    { path: '/worker/profile', label: 'My Profile', icon: '👤' },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      <header className="bg-white shadow-sm px-4 py-3 flex justify-between items-center border-b border-gray-200">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg mr-3 shadow-sm">
            {user?.profile?.firstName?.charAt(0) || 'W'}
          </div>
          <div>
            <h1 className="font-bold text-gray-900 leading-tight">Worker App</h1>
            <p className="text-xs text-emerald-600 font-medium">Logged in as {user?.profile?.firstName}</p>
          </div>
        </div>
        <button
          onClick={() => {
            logout();
            localStorage.removeItem('salon_token');
            window.location.href = '/login';
          }}
          className="text-gray-500 hover:text-red-500 p-2"
          title="Sign Out"
        >
          <span className="text-xl">🚪</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation for Worker */}
      <nav className="bg-white border-t border-gray-200 fixed bottom-0 w-full flex justify-around p-2 pb-safe shadow-lg">
        {navItems.map(item => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/') && item.path !== '/worker';
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center p-2 min-w-[64px] ${isActive ? 'text-emerald-600' : 'text-gray-500 hover:text-emerald-500'}`}
            >
              <span className="text-2xl mb-1">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default WorkerLayout;
