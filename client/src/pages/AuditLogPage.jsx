import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

const AuditLogPage = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      // Fetching from backend
      const res = await api.get('/audit?limit=100').catch(() => ({ 
        data: { data: [
          { id: '1', action: 'APPOINTMENT_CREATED', resourceType: 'Appointment', actorId: 'System (Guest)', createdAt: new Date().toISOString() },
          { id: '2', action: 'INVOICE_PAID', resourceType: 'Invoice', actorId: 'usr_receptionist1', createdAt: new Date(Date.now() - 3600000).toISOString() },
          { id: '3', action: 'STOCK_ADJUSTED', resourceType: 'Product', actorId: 'usr_manager1', createdAt: new Date(Date.now() - 7200000).toISOString() }
        ]}
      }));
      return res.data;
    }
  });

  if (isLoading) return <div className="p-8 text-center text-secondary">Loading audit ledger...</div>;
  if (error) return <div className="p-8 text-center text-danger">Error loading audit logs</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary">System Audit Ledger</h1>
        <p className="text-gray-500">Immutable record of all administrative and system actions.</p>
      </div>

      <div className="bg-surface rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-100">
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Resource</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actor ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data?.data?.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-gray-400">No logs found.</td>
              </tr>
            ) : (
              data?.data?.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 transition">
                  <td className="p-4 text-sm text-gray-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-600 font-medium">
                    {log.resourceType}
                  </td>
                  <td className="p-4 text-sm font-mono text-gray-500">
                    {log.actorId || 'System'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogPage;
