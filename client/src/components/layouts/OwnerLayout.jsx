import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const OwnerLayout = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/owner', label: 'Dashboard', icon: '📊' },
    { path: '/owner/bookings', label: 'Calendar', icon: '📅' },
    { path: '/owner/pos', label: 'POS / Till', icon: '💳' },
    { path: '/owner/invoices', label: 'Invoices', icon: '🧾' },
    { path: '/owner/customers', label: 'Customers', icon: '👥' },
    { path: '/owner/hr', label: 'Staff (HR)', icon: '🧑‍💼' },
    { path: '/owner/catalog', label: 'Catalog', icon: '✂️' },
    { path: '/owner/inventory', label: 'Inventory', icon: '📦' },
    { path: '/owner/expenses', label: 'Expenses', icon: '💸' },
    { path: '/owner/salary', label: 'Payroll', icon: '💰' },
    { path: '/owner/reports', label: 'Reports', icon: '📈' },
    { path: '/owner/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans relative">
      {/* Sidebar - Desktop & Mobile overlay */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 shadow-sm flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-center">
          <h1 className="text-2xl font-bold text-indigo-700">SalonOS</h1>
          <span className="ml-2 text-xs font-semibold bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">OWNER</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4 px-2">
            <div>
              <p className="text-sm font-medium text-gray-900">{user?.profile?.firstName} {user?.profile?.lastName}</p>
              <p className="text-xs text-gray-500 truncate max-w-[150px]">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              localStorage.removeItem('salon_token');
              window.location.href = '/login';
            }}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center z-30">
          <h1 className="text-xl font-bold text-indigo-700">SalonOS Owner</h1>
          <button 
            className="text-gray-500 hover:text-gray-700 focus:outline-none p-2"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default OwnerLayout;
