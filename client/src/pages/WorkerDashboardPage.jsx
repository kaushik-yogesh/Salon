import React from 'react';
import { Link } from 'react-router-dom';

const WorkerDashboardPage = () => {
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Schedule</h1>
          <p className="text-gray-500 text-sm">View your upcoming appointments.</p>
        </div>
        <Link to="/worker/scanner" className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium shadow flex items-center">
          <span className="mr-2">📷</span> Scan QR
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100">
          <h2 className="text-emerald-800 font-semibold">Today: {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h2>
        </div>
        <div className="p-6 text-center text-gray-500 py-12">
          <div className="text-4xl mb-4">✨</div>
          <p className="text-lg font-medium text-gray-900">You're all caught up!</p>
          <p className="text-sm mt-1">No remaining appointments for today.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link to="/worker/salary" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center hover:shadow-md transition">
          <span className="text-3xl mb-2">💰</span>
          <span className="font-medium text-gray-900 text-sm">My Earnings</span>
        </Link>
        <Link to="/worker/leaves" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center hover:shadow-md transition">
          <span className="text-3xl mb-2">🏖️</span>
          <span className="font-medium text-gray-900 text-sm">Time Off</span>
        </Link>
      </div>
    </div>
  );
};

export default WorkerDashboardPage;
