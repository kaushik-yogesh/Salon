import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const ReceptionLayout = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const navItems = [
    { path: '/reception', label: 'Front Desk', icon: '🛎️' },
    { path: '/reception/calendar', label: 'Calendar', icon: '📅' },
    { path: '/reception/pos', label: 'POS / Till', icon: '💳' },
    { path: '/reception/customers', label: 'Customers', icon: '👥' },
    { path: '/reception/invoices', label: 'Invoices', icon: '🧾' },
  ];

  return (
    <div className="flex h-screen bg-rose-50 font-sans">
      <aside className="w-64 bg-white border-r border-rose-200 flex flex-col hidden md:flex shadow-sm">
        <div className="p-6 border-b border-rose-100 flex items-center justify-center">
          <h1 className="text-2xl font-bold text-rose-600">SalonOS</h1>
          <span className="ml-2 text-xs font-semibold bg-rose-100 text-rose-800 px-2 py-1 rounded-full">RECEPTION</span>
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
                    ? 'bg-rose-50 text-rose-700' 
                    : 'text-gray-600 hover:bg-rose-50 hover:text-rose-900'
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-rose-100">
          <button
            onClick={() => {
              logout();
              localStorage.removeItem('salon_token');
              window.location.href = '/login';
            }}
            className="w-full text-center text-sm text-gray-500 hover:text-rose-600"
          >
            Sign Out ({user?.profile?.firstName})
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden bg-white border-b border-rose-200 p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-rose-600">Front Desk</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default ReceptionLayout;
