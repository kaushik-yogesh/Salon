import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

const DashboardPage = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      // Fetch dynamic P&L from the new reporting engine (last 30 days)
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const res = await api.get('/reports/dashboard', { params: { startDate, endDate } });
      return res.data;
    },
    refetchInterval: 10000
  });

  if (isLoading) return <div className="p-8 text-center text-secondary">Loading dashboard...</div>;
  if (error) return <div className="p-8 text-center text-danger">Error loading dashboard</div>;

  const metrics = data?.data?.metrics;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary">SalonOS Overview (30 Days)</h1>
        <p className="text-gray-500">Welcome back. Here's your financial performance.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Gross Revenue */}
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Gross Revenue</h3>
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-secondary">${(metrics?.grossRevenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>

        {/* Operating Expenses */}
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Op. Expenses</h3>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-secondary">${(metrics?.operatingExpenses || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>

        {/* Payroll */}
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Total Payroll</h3>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-secondary">${(metrics?.totalPayroll || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>

        {/* Net Profit */}
        <div className={`p-6 rounded-2xl shadow-sm border flex flex-col justify-between hover:shadow-md transition ${(metrics?.netProfit || 0) < 0 ? 'bg-red-50 border-red-100' : 'bg-surface border-gray-100'}`}>
          <div className="flex justify-between items-start mb-4">
            <h3 className={`text-sm font-semibold uppercase tracking-wide ${(metrics?.netProfit || 0) < 0 ? 'text-red-700' : 'text-gray-500'}`}>Net Profit</h3>
            <div className={`p-2 rounded-lg ${(metrics?.netProfit || 0) < 0 ? 'bg-red-100 text-red-600' : 'bg-purple-50 text-purple-600'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
            </div>
          </div>
          <p className={`text-3xl font-bold ${(metrics?.netProfit || 0) < 0 ? 'text-red-700' : 'text-secondary'}`}>
            ${(metrics?.netProfit || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
          </p>
        </div>

      </div>

      {/* Bottom Section: Recent Activity & Graphs (Placeholder) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Activity Feed */}
        <div className="lg:col-span-2 bg-surface rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-secondary mb-4">Recent Transactions</h2>
          {metrics?.recentActivity?.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent activity.</p>
          ) : (
            <div className="space-y-4">
              {metrics?.recentActivity?.map(activity => (
                <div key={activity.id} className="flex justify-between items-center p-4 border border-gray-50 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-semibold text-secondary">Invoice #{activity.id.substring(0,8)}</p>
                    <p className="text-xs text-gray-500">{new Date(activity.createdAt).toLocaleTimeString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">${activity.grandTotal.toFixed(2)}</p>
                    <p className="text-xs font-medium text-gray-500">{activity.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Insights Engine */}
        <div className="bg-surface rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <div className="flex items-center space-x-2 mb-4">
            <h2 className="text-lg font-bold text-secondary">AI Insights</h2>
            <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">BETA</span>
          </div>
          
          {metrics?.aiInsights?.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
               <div className="text-gray-300 mb-4">
                 <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
               </div>
               <p className="text-gray-500 font-medium text-sm">Gathering Data...</p>
               <p className="text-gray-400 text-xs mt-1">Requires active transaction history.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {metrics?.aiInsights?.map((insight, idx) => (
                <div key={idx} className={`p-4 rounded-xl border ${
                  insight.severity === 'WARNING' ? 'bg-orange-50 border-orange-100' : 'bg-blue-50 border-blue-100'
                }`}>
                  <div className="flex items-start space-x-3">
                    <div className={`mt-0.5 ${insight.severity === 'WARNING' ? 'text-orange-500' : 'text-blue-500'}`}>
                      {insight.severity === 'WARNING' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${insight.severity === 'WARNING' ? 'text-orange-800' : 'text-blue-800'}`}>
                        {insight.type === 'REVENUE' ? 'Revenue Forecast' : insight.type === 'INVENTORY' ? 'Inventory Alert' : 'System Notice'}
                      </p>
                      <p className={`text-sm mt-1 ${insight.severity === 'WARNING' ? 'text-orange-700' : 'text-blue-700'}`}>
                        {insight.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default DashboardPage;
