import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';

const AdminSettingsPage = () => {
  const user = useAuthStore(state => state.user);
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    defaultCurrency: 'USD',
    defaultTimezone: 'UTC'
  });
  const [saveStatus, setSaveStatus] = useState('idle');

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant', user?.tenantId],
    queryFn: async () => {
      if (!user?.tenantId) return null;
      const res = await api.get(`/tenants/${user.tenantId}`);
      return res.data.data;
    },
    enabled: !!user?.tenantId
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || '',
        defaultCurrency: tenant.defaultCurrency || 'USD',
        defaultTimezone: tenant.defaultTimezone || 'UTC'
      });
    }
  }, [tenant]);

  const updateTenant = useMutation({
    mutationFn: (data) => api.put(`/tenants/${user.tenantId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tenant', user?.tenantId]);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
    onError: () => {
      setSaveStatus('error');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaveStatus('loading');
    updateTenant.mutate(formData);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading settings...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-500 text-sm">Manage global system configurations.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
            
            {saveStatus === 'success' && (
              <div className="bg-green-50 p-4 rounded-md">
                <p className="text-sm text-green-700 font-medium">Settings saved successfully!</p>
              </div>
            )}

            {saveStatus === 'error' && (
              <div className="bg-red-50 p-4 rounded-md">
                <p className="text-sm text-red-700 font-medium">Failed to save settings.</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Platform Name</label>
              <div className="mt-1">
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">The primary name displayed on the login page.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Default Currency</label>
              <div className="mt-1">
                <select
                  value={formData.defaultCurrency}
                  onChange={(e) => setFormData({...formData, defaultCurrency: e.target.value})}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Default Timezone</label>
              <div className="mt-1">
                <select
                  value={formData.defaultTimezone}
                  onChange={(e) => setFormData({...formData, defaultTimezone: e.target.value})}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time (US & Canada)</option>
                  <option value="America/Chicago">Central Time (US & Canada)</option>
                  <option value="America/Denver">Mountain Time (US & Canada)</option>
                  <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                  <option value="Asia/Kolkata">India Standard Time (IST)</option>
                </select>
              </div>
            </div>

            <div className="pt-5 border-t border-gray-200 flex justify-end">
              <button
                type="submit"
                disabled={saveStatus === 'loading'}
                className="bg-indigo-600 border border-transparent rounded-md shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {saveStatus === 'loading' ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
