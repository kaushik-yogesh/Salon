import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

const ReportsPage = () => {
  const { data: metricsData, isLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const res = await api.get('/dashboard/metrics');
      return res.data.data;
    },
    refetchInterval: 10000 // Poll every 10 seconds for real-time updates
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary">Business Reports</h1>
        <p className="text-gray-500">Live analytics and insights.</p>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-500 py-10">Loading reports...</div>
      ) : (
        <div className="space-y-8">
          {/* Revenue Overview */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-secondary mb-6">Revenue Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                <p className="text-sm font-bold text-indigo-600 uppercase tracking-wide mb-2">Total Revenue (Paid)</p>
                <p className="text-4xl font-black text-indigo-900">${metricsData?.revenue?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100">
                <p className="text-sm font-bold text-emerald-600 uppercase tracking-wide mb-2">Appointments Today</p>
                <p className="text-4xl font-black text-emerald-900">{metricsData?.appointmentsToday || 0}</p>
              </div>
              <div className="bg-rose-50 p-6 rounded-xl border border-rose-100">
                <p className="text-sm font-bold text-rose-600 uppercase tracking-wide mb-2">Active Staff</p>
                <p className="text-4xl font-black text-rose-900">{metricsData?.activeWorkers || 0}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Invoices */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-secondary mb-4">Recent Transactions</h2>
              {metricsData?.recentActivity?.length === 0 ? (
                <p className="text-gray-500 text-sm">No recent transactions.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {metricsData?.recentActivity?.map((activity) => (
                    <li key={activity.id} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{activity.id.substring(0, 8).toUpperCase()}</p>
                        <p className="text-xs text-gray-500">{new Date(activity.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">${activity.grandTotal?.toFixed(2) || '0.00'}</p>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">{activity.status}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* AI Insights */}
            <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl shadow-sm p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              </div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="bg-white/20 p-1.5 rounded-lg">✨</span>
                AI Business Insights
              </h2>
              {metricsData?.aiInsights ? (
                <div className="space-y-4">
                  {Array.isArray(metricsData.aiInsights) 
                    ? metricsData.aiInsights.map((insight, idx) => (
                      <div key={idx} className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10 text-sm text-indigo-50 flex items-start gap-3">
                        <span className="mt-0.5">{insight.severity === 'WARNING' ? '⚠️' : '💡'}</span>
                        <p>{insight.message}</p>
                      </div>
                    ))
                    : String(metricsData.aiInsights).split('\n').map((line, idx) => (
                      line.trim() && (
                        <div key={idx} className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10 text-sm text-indigo-50">
                          {line}
                        </div>
                      )
                    ))
                  }
                </div>
              ) : (
                <p className="text-indigo-200 text-sm">No insights available right now.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
