import React from 'react';
import { Link, Outlet } from 'react-router-dom';

const PublicLayout = () => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-black tracking-tighter text-indigo-600">
                SalonOS
              </Link>
            </div>
            
            <nav className="hidden md:flex space-x-8">
              <Link to="/" className="text-slate-600 hover:text-indigo-600 font-medium">Home</Link>
              <Link to="/features" className="text-slate-600 hover:text-indigo-600 font-medium">Features</Link>
              <Link to="/pricing" className="text-slate-600 hover:text-indigo-600 font-medium">Pricing</Link>
              <Link to="/directory" className="text-slate-600 hover:text-indigo-600 font-medium">Find Salons</Link>
            </nav>

            <div className="flex items-center space-x-4">
              <Link to="/login" className="text-slate-600 hover:text-indigo-600 font-medium hidden sm:block">
                Log in
              </Link>
              <Link to="/register" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition shadow-sm hover:shadow">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h2 className="text-2xl font-bold text-white mb-4">SalonOS</h2>
            <p className="text-slate-400 max-w-sm">
              The complete operating system for modern salons, spas, and barbershops. Manage appointments, staff, inventory, and point-of-sale from one unified platform.
            </p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/features" className="hover:text-white">Features</Link></li>
              <li><Link to="/pricing" className="hover:text-white">Pricing</Link></li>
              <li><Link to="/directory" className="hover:text-white">Salon Directory</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/privacy" className="hover:text-white">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white">Terms of Service</Link></li>
              <li><Link to="/contact" className="hover:text-white">Contact Us</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-slate-800 text-sm text-center text-slate-500">
          &copy; {new Date().getFullYear()} SalonOS Enterprise. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
