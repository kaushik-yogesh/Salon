import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="bg-slate-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 md:pt-24 lg:pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-6">
            The Operating System <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-rose-500">
              For Modern Salons
            </span>
          </h1>
          <p className="mt-4 text-xl text-slate-600 max-w-2xl mx-auto mb-10">
            Manage appointments, staff, inventory, and payments from one unified platform. Built for barbershops, salons, and spas that want to scale.
          </p>
          <div className="flex justify-center gap-4 flex-col sm:flex-row">
            <Link to="/register" className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
              Start 14-Day Free Trial
            </Link>
            <Link to="/directory" className="bg-white text-indigo-600 border border-indigo-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-indigo-50 shadow-sm transition-all">
              Find a Salon Near You
            </Link>
          </div>
        </div>
        
        {/* Abstract Background Shapes */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-100 rounded-full blur-3xl opacity-50 pointer-events-none -z-10"></div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold text-indigo-600">5,000+</p>
              <p className="text-sm text-gray-500 font-medium mt-1">Salons Onboarded</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-indigo-600">2M+</p>
              <p className="text-sm text-gray-500 font-medium mt-1">Appointments Booked</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-indigo-600">$50M+</p>
              <p className="text-sm text-gray-500 font-medium mt-1">Payments Processed</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-indigo-600">99.9%</p>
              <p className="text-sm text-gray-500 font-medium mt-1">Platform Uptime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Everything you need to run your business</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-2xl mb-6">📅</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Scheduling</h3>
              <p className="text-gray-600">Prevent double bookings, manage walk-ins, and allow clients to book online 24/7 with zero friction.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-2xl mb-6">💳</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Integrated POS</h3>
              <p className="text-gray-600">Process credit cards, calculate commissions automatically, and track every penny that comes through the door.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center text-2xl mb-6">👥</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">CRM & Marketing</h3>
              <p className="text-gray-600">Know your clients better. Track purchase history, preferences, and send automated reminders to reduce no-shows.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
