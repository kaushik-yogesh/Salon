import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, ShieldCheck, Send } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import api from '../api/axios';

const SettingsPage = () => {
  const queryClient = useQueryClient();
  const [isEditTenantOpen, setIsEditTenantOpen] = useState(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  
  const { isSubscribed, error: pushError, requestPermissionAndSubscribe } = usePushNotifications();
  const [testPushStatus, setTestPushStatus] = useState(null);

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data;
    }
  });

  const tenantId = meData?.data?.user?.tenantId;

  const { data: tenantData, isLoading: tenantLoading } = useQuery({
    queryKey: ['tenant-details', tenantId],
    queryFn: async () => {
      const res = await api.get(`/tenants/${tenantId}`);
      return res.data;
    },
    enabled: !!tenantId
  });

  const { data: branchData, isLoading: branchLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await api.get('/branches');
      return res.data;
    },
    enabled: !!tenantId
  });

  const updateTenant = useMutation({
    mutationFn: async (data) => api.put(`/tenants/${tenantId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tenant-details', tenantId]);
      setIsEditTenantOpen(false);
    }
  });

  const saveBranch = useMutation({
    mutationFn: async (data) => {
      if (editingBranch) return api.put(`/branches/${editingBranch.id}`, data);
      return api.post('/branches', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['branches']);
      setIsBranchModalOpen(false);
      setEditingBranch(null);
    }
  });

  const deleteBranch = useMutation({
    mutationFn: async (id) => api.delete(`/branches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['branches']);
    }
  });

  const sendTestPush = async () => {
    setTestPushStatus('sending');
    try {
      await api.post('/push/test');
      setTestPushStatus('success');
      setTimeout(() => setTestPushStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setTestPushStatus('error');
      setTimeout(() => setTestPushStatus(null), 3000);
    }
  };

  if (tenantLoading || branchLoading || !tenantId) return <div className="p-8 text-center text-secondary">Loading settings...</div>;

  const tenant = tenantData?.data;
  const branches = branchData?.data || [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary">Settings</h1>
        <p className="text-gray-500">Manage your salon configurations and branches.</p>
      </div>

      <div className="bg-surface p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <h2 className="text-xl font-bold text-secondary mb-4">Tenant Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Salon Name</label>
            <input type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-50" value={tenant?.name || ''} disabled />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <input type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-50" value={tenant?.status || ''} disabled />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Currency</label>
            <input type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-50" value={tenant?.defaultCurrency || ''} disabled />
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Current Subscription Plan</h3>
            <p className="text-sm font-medium text-indigo-600 uppercase tracking-wide mt-1">{tenant?.subscriptionTier || 'BASIC'}</p>
          </div>
          <div className="space-x-3">
            <button onClick={() => setIsEditTenantOpen(true)} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded shadow-sm hover:bg-gray-50 transition">
              Edit Details
            </button>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700 transition">
              Upgrade Plan
            </button>
          </div>
        </div>
      </div>

      <div className="bg-surface p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-secondary">Branches</h2>
          <button 
            onClick={() => { setEditingBranch(null); setIsBranchModalOpen(true); }}
            className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition"
          >
            Add Branch
          </button>
        </div>
        
        {branches.length === 0 ? (
          <p className="text-gray-500 text-sm">No branches configured.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {branches.map(branch => (
                  <tr key={branch.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{branch.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{branch.address}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => { setEditingBranch(branch); setIsBranchModalOpen(true); }}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => { if(window.confirm('Are you sure you want to remove this branch?')) deleteBranch.mutate(branch.id); }}
                        className="text-red-600 hover:text-red-900 ml-4"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-surface p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
            <Bell className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-secondary">Notifications & Alerts</h2>
        </div>
        
        <p className="text-gray-500 text-sm mb-6 max-w-2xl">
          Enable browser push notifications to receive real-time alerts for new bookings, cancellations, and staff updates directly on your device.
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {isSubscribed ? (
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100 font-medium text-sm">
              <ShieldCheck className="w-5 h-5" />
              Notifications Enabled
            </div>
          ) : (
            <button 
              onClick={requestPermissionAndSubscribe}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg shadow-sm hover:bg-indigo-700 transition font-medium text-sm flex items-center gap-2"
            >
              <Bell className="w-4 h-4" />
              Enable Browser Notifications
            </button>
          )}

          {isSubscribed && (
            <button 
              onClick={sendTestPush}
              disabled={testPushStatus === 'sending'}
              className="bg-white border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg shadow-sm hover:bg-gray-50 transition font-medium text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {testPushStatus === 'sending' ? 'Sending...' : 
               testPushStatus === 'success' ? 'Sent!' : 
               testPushStatus === 'error' ? 'Failed' : 'Send Test Push'}
            </button>
          )}
        </div>
        
        {pushError && (
          <p className="mt-4 text-sm text-red-500 font-medium bg-red-50 p-3 rounded-lg border border-red-100">
            {pushError.message || 'Failed to enable notifications. Please check your browser permissions.'}
          </p>
        )}
      </div>

      {/* Edit Tenant Modal */}
      {isEditTenantOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Edit Tenant Details</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              updateTenant.mutate({
                name: formData.get('name'),
                defaultCurrency: formData.get('defaultCurrency')
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Salon Name</label>
                  <input name="name" type="text" defaultValue={tenant?.name} required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Default Currency</label>
                  <input name="defaultCurrency" type="text" defaultValue={tenant?.defaultCurrency} required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsEditTenantOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={updateTenant.isPending} className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Branch Modal */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">{editingBranch ? 'Edit Branch' : 'Add Branch'}</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              saveBranch.mutate({
                name: formData.get('name'),
                address: formData.get('address')
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Branch Name</label>
                  <input name="name" type="text" defaultValue={editingBranch?.name} required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <input name="address" type="text" defaultValue={editingBranch?.address} required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => {setIsBranchModalOpen(false); setEditingBranch(null);}} className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={saveBranch.isPending} className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
