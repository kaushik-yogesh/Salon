import React from 'react';
import { Link } from 'react-router-dom';

const PricingPage = () => {
  return (
    <div className="bg-slate-50 min-h-screen py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Choose the plan that fits your business. No hidden fees. Cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Basic Plan */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Basic</h3>
            <p className="text-slate-500 mb-6">Perfect for independent stylists.</p>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-slate-900">$29</span>
              <span className="text-slate-500">/mo</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1 text-slate-600">
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> 1 Staff Member</li>
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Basic Calendar</li>
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Client Management</li>
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Online Booking</li>
            </ul>
            <Link to="/register" className="w-full block text-center bg-indigo-50 text-indigo-700 font-bold py-3 rounded-lg hover:bg-indigo-100 transition">
              Start Free Trial
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="bg-indigo-900 rounded-2xl shadow-xl p-8 flex flex-col transform md:-translate-y-4 relative">
            <div className="absolute top-0 right-0 bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl uppercase tracking-wide">
              Most Popular
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Professional</h3>
            <p className="text-indigo-200 mb-6">For growing salons with small teams.</p>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-white">$79</span>
              <span className="text-indigo-200">/mo</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1 text-indigo-100">
              <li className="flex items-center"><span className="text-rose-400 mr-2">✓</span> Up to 5 Staff Members</li>
              <li className="flex items-center"><span className="text-rose-400 mr-2">✓</span> Advanced POS & Payroll</li>
              <li className="flex items-center"><span className="text-rose-400 mr-2">✓</span> Inventory Management</li>
              <li className="flex items-center"><span className="text-rose-400 mr-2">✓</span> SMS Reminders</li>
            </ul>
            <Link to="/register" className="w-full block text-center bg-rose-500 text-white font-bold py-3 rounded-lg hover:bg-rose-600 transition shadow-lg">
              Start Free Trial
            </Link>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Enterprise</h3>
            <p className="text-slate-500 mb-6">For large or multi-location salons.</p>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-slate-900">$199</span>
              <span className="text-slate-500">/mo</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1 text-slate-600">
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Unlimited Staff</li>
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Multi-Branch Support</li>
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Advanced API Access</li>
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Dedicated Account Manager</li>
            </ul>
            <Link to="/register" className="w-full block text-center bg-indigo-50 text-indigo-700 font-bold py-3 rounded-lg hover:bg-indigo-100 transition">
              Contact Sales
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
