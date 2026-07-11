import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const CustomerLayout = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const navItems = [
    { path: '/customer', label: 'My Portal', icon: '✨' },
    { path: '/customer/appointments', label: 'Appointments', icon: '📅' },
    { path: '/customer/wallet', label: 'Wallet & Loyalty', icon: '💳' },
    { path: '/customer/history', label: 'History', icon: '📜' },
    { path: '/customer/profile', label: 'Profile Settings', icon: '⚙️' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-pink-50 font-sans">
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link to="/customer" className="text-2xl font-bold text-pink-600">SalonOS</Link>
            </div>
            <div className="hidden md:flex space-x-8">
              {navItems.map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                      isActive ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="flex items-center">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700 hidden sm:block">Hello, {user?.profile?.firstName}</span>
                <button
                  onClick={() => {
                    logout();
                    localStorage.removeItem('salon_token');
                    window.location.href = '/login';
                  }}
                  className="text-sm text-pink-600 hover:text-pink-800 font-medium bg-pink-100 px-3 py-1.5 rounded-full"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden bg-white border-t border-gray-200 fixed bottom-0 w-full flex justify-around p-2 pb-safe shadow-lg z-50">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center p-2 min-w-[64px] ${isActive ? 'text-pink-600' : 'text-gray-500'}`}
            >
              <span className="text-xl mb-1">{item.icon}</span>
              <span className="text-[10px] font-medium truncate w-full text-center">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default CustomerLayout;
