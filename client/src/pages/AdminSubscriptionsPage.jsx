import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

const AdminSubscriptionsPage = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [selectedTier, setSelectedTier] = useState('');

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: async () => {
      const res = await api.get('/tenants');
      return res.data.data;
    }
  });

  const updateTenant = useMutation({
    mutationFn: ({ id, data }) => api.put(`/tenants/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-tenants']);
      setEditingId(null);
    }
  });

  const handleSave = (tenant) => {
    updateTenant.mutate({
      id: tenant.id,
      data: { ...tenant, subscriptionTier: selectedTier }
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
          <p className="text-gray-500 text-sm">Manage tenant billing tiers (BASIC, PRO, ENTERPRISE).</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-gray-500">Loading tenants...</td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-gray-500">No tenants found.</td>
              </tr>
            ) : (
              tenants.map(tenant => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                    <div className="text-xs text-gray-500">{tenant.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === tenant.id ? (
                      <select
                        value={selectedTier}
                        onChange={(e) => setSelectedTier(e.target.value)}
                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      >
                        <option value="BASIC">BASIC</option>
                        <option value="PRO">PRO</option>
                        <option value="ENTERPRISE">ENTERPRISE</option>
                      </select>
                    ) : (
                      <span className={`px-2 inline-flex text-xs leading-5 font-bold rounded-md ${
                        tenant.subscriptionTier === 'ENTERPRISE' ? 'bg-purple-100 text-purple-800' :
                        tenant.subscriptionTier === 'PRO' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {tenant.subscriptionTier}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingId === tenant.id ? (
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => setEditingId(null)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleSave(tenant)}
                          className="text-indigo-600 hover:text-indigo-900 font-bold"
                          disabled={updateTenant.isLoading}
                        >
                          {updateTenant.isLoading ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setEditingId(tenant.id);
                          setSelectedTier(tenant.subscriptionTier);
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Change Tier
                      </button>
                    )}
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

export default AdminSubscriptionsPage;
