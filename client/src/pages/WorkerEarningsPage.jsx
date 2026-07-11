import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

const WorkerEarningsPage = () => {
  const { data: earningsData, isLoading } = useQuery({
    queryKey: ['my-earnings'],
    queryFn: async () => {
      const res = await api.get('/payroll/my-earnings');
      return res.data.data;
    }
  });

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-[calc(100vh-100px)] p-4 shadow-xl border-x border-gray-200">
      <div className="text-center mb-8 pt-4">
        <h1 className="text-xl font-bold text-secondary">My Earnings</h1>
        <p className="text-sm text-gray-500">Live Commission Tracking</p>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-500 mt-10">Loading earnings...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">Pending</span>
              <span className="text-2xl font-black text-primary">${earningsData?.summary?.pendingEarnings.toFixed(2)}</span>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">Total Paid</span>
              <span className="text-2xl font-black text-green-600">${earningsData?.summary?.totalPaid.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-700">Salary Runs</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {earningsData?.history?.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">No earnings recorded yet.</div>
              ) : (
                earningsData?.history?.map((item) => (
                  <div key={item.id} className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-gray-900 text-sm">
                        {new Date(item.salaryRun.periodStart).toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <span className={`w-2 h-2 rounded-full ${item.salaryRun.status === 'PAID' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                        {item.salaryRun.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">${item.netPayout.toFixed(2)}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.commissionTotal > 0 ? 'Commission' : 'Base'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WorkerEarningsPage;
