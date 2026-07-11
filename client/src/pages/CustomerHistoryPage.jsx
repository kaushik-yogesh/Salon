import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

const CustomerHistoryPage = () => {
  const { data: history, isLoading } = useQuery({
    queryKey: ['customer-history'],
    queryFn: async () => {
      const res = await api.get('/customer-portal/appointments?status=past');
      return res.data.data.appointments;
    }
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Service History</h1>
        <p className="text-gray-500 text-sm">Past appointments and receipts.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading history...</div>
        ) : history?.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No past appointments found.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {history?.map(item => (
              <li key={item.id} className="p-6 hover:bg-gray-50 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl">
                    {item.status === 'CANCELLED' ? '✖' : '✓'}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">
                      {item.services?.map(s => s.service.name).join(', ') || 'Appointment'}
                    </h3>
                    <p className="text-sm text-gray-500">{item.tenant?.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(item.date).toLocaleDateString()}</p>
                    {item.status === 'CANCELLED' && (
                      <span className="inline-block mt-1 bg-red-100 text-red-800 text-xs font-semibold px-2 py-0.5 rounded-full">CANCELLED</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">${item.totalPrice.toFixed(2)}</p>
                  <button className="text-sm font-medium text-pink-600 hover:text-pink-800 mt-2">
                    View Receipt
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CustomerHistoryPage;
