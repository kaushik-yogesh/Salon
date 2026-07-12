import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

const ReportsPage = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const { data: metricsData, isLoading } = useQuery({
    queryKey: ['dashboard-metrics', dateRange],
    queryFn: async () => {
      const res = await api.get(`/reports/dashboard?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      return res.data.data.metrics;
    },
    refetchInterval: 10000 // Poll every 10 seconds for real-time updates
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-secondary">Business Reports</h1>
          <p className="text-gray-500">Live analytics and insights.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Start Date</label>
            <input 
              type="date" 
              value={dateRange.startDate}
              onChange={e => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="text-sm p-1 border-gray-300 rounded"
            />
          </div>
          <div className="text-gray-300">-</div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">End Date</label>
            <input 
              type="date" 
              value={dateRange.endDate}
              onChange={e => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="text-sm p-1 border-gray-300 rounded"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-500 py-10">Loading reports...</div>
      ) : (
        <div className="space-y-8">
          {/* Revenue Overview */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-secondary mb-6">Revenue Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                <p className="text-sm font-bold text-indigo-600 uppercase tracking-wide mb-2">Gross Revenue (Paid)</p>
                <p className="text-4xl font-black text-indigo-900">${metricsData?.grossRevenue?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
                <p className="text-sm font-bold text-orange-600 uppercase tracking-wide mb-2">Outstanding Receivables</p>
                <p className="text-4xl font-black text-orange-900">${metricsData?.outstandingReceivables?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100">
                <p className="text-sm font-bold text-emerald-600 uppercase tracking-wide mb-2">Total Payroll</p>
                <p className="text-4xl font-black text-emerald-900">${metricsData?.totalPayroll?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="bg-cyan-50 p-6 rounded-xl border border-cyan-100">
                <p className="text-sm font-bold text-cyan-600 uppercase tracking-wide mb-2">Tax Collected</p>
                <p className="text-4xl font-black text-cyan-900">${metricsData?.totalTaxCollected?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Outstanding Invoices */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-secondary mb-4">Outstanding Invoices (Unpaid)</h2>
              {metricsData?.outstandingInvoices?.length === 0 ? (
                <p className="text-gray-500 text-sm">No outstanding payments.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {metricsData?.outstandingInvoices?.map((invoice) => (
                    <li key={invoice.id} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">
                          {invoice.customer?.firstName} {invoice.customer?.lastName}
                        </p>
                        <p className="text-xs text-gray-500">Invoice #{invoice.id.substring(0, 8).toUpperCase()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-600">${invoice.grandTotal?.toFixed(2) || '0.00'}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 rounded text-gray-600 uppercase">{invoice.status}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Recent Invoices */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-secondary mb-4">Recent Transactions (Paid)</h2>
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
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 rounded text-gray-600 uppercase">{activity.status}</span>
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
