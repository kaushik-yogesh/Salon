import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, ShieldCheck, Send } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import api from '../api/axios';

const SettingsPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');
  const [isEditTenantOpen, setIsEditTenantOpen] = useState(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [businessHours, setBusinessHours] = useState({});
  const [integrationsData, setIntegrationsData] = useState({
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: ''
  });
  
  const { isSubscribed, error: pushError, requestPermissionAndSubscribe } = usePushNotifications();
  const [testPushStatus, setTestPushStatus] = useState(null);

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data;
    }
  });

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await api.get('/roles');
      return res.data;
    }
  });

  const tenantId = meData?.data?.user?.tenantId;

  const { data: tenantData, isLoading: tenantLoading } = useQuery({
    queryKey: ['tenant-details', tenantId],
    queryFn: async () => {
      const res = await api.get(`/tenants/${tenantId}`);
      
      // Seed Integrations state with existing values if available (masked for security if needed, but we assume owner can view)
      if (res.data.data) {
        setIntegrationsData({
          stripeSecretKey: res.data.data.stripeSecretKey || '',
          stripeWebhookSecret: res.data.data.stripeWebhookSecret || '',
          twilioAccountSid: res.data.data.twilioAccountSid || '',
          twilioAuthToken: res.data.data.twilioAuthToken || '',
          twilioPhoneNumber: res.data.data.twilioPhoneNumber || ''
        });
      }
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

      <div className="flex space-x-4 mb-6 border-b border-gray-200">
        {['general', 'branches', 'integrations', 'webhooks', 'access', 'billing'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 font-bold text-sm uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === tab 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <>
          <div className="bg-surface p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
            <h2 className="text-xl font-bold text-secondary mb-4">Tenant Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Salon Name</label>
                <input type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-50" value={tenant?.name || ''} disabled />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Currency</label>
                <input type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-50" value={tenant?.defaultCurrency || ''} disabled />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Global Tax Rate (%)</label>
                <input type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-50" value={tenant?.globalTaxRate !== undefined ? `${tenant.globalTaxRate}%` : '0%'} disabled />
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-100 flex justify-end">
              <button onClick={() => {
                setBusinessHours(tenant?.businessHours || {
                  monday: { isOpen: true, open: '09:00', close: '18:00' },
                  tuesday: { isOpen: true, open: '09:00', close: '18:00' },
                  wednesday: { isOpen: true, open: '09:00', close: '18:00' },
                  thursday: { isOpen: true, open: '09:00', close: '18:00' },
                  friday: { isOpen: true, open: '09:00', close: '18:00' },
                  saturday: { isOpen: true, open: '10:00', close: '16:00' },
                  sunday: { isOpen: false, open: '00:00', close: '00:00' }
                });
                setIsEditTenantOpen(true);
              }} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded shadow-sm hover:bg-gray-50 transition">
                Edit Details
              </button>
            </div>
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
        </>
      )}

      {activeTab === 'branches' && (
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
      )}

      {activeTab === 'integrations' && (
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-secondary mb-6">API Integrations</h2>
          
          <div className="space-y-8">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <div className="w-6 h-6 bg-[#635BFF] rounded flex items-center justify-center text-white font-black text-xs">S</div>
                Stripe Payments
              </h3>
              <p className="text-sm text-gray-500 mb-4">Connect your own Stripe account to securely process credit cards and Apple Pay directly to your bank account.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Secret Key</label>
                  <input type="password" value={integrationsData.stripeSecretKey} onChange={e => setIntegrationsData({...integrationsData, stripeSecretKey: e.target.value})} placeholder="sk_live_..." className="w-full p-2 border border-gray-300 rounded focus:border-[#635BFF] outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Webhook Secret</label>
                  <input type="password" value={integrationsData.stripeWebhookSecret} onChange={e => setIntegrationsData({...integrationsData, stripeWebhookSecret: e.target.value})} placeholder="whsec_..." className="w-full p-2 border border-gray-300 rounded focus:border-[#635BFF] outline-none" />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <div className="w-6 h-6 bg-[#F22F46] rounded flex items-center justify-center text-white font-black text-xs">T</div>
                Twilio SMS
              </h3>
              <p className="text-sm text-gray-500 mb-4">Connect Twilio to send automated booking confirmations and marketing text messages to your customers.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Account SID</label>
                  <input type="text" value={integrationsData.twilioAccountSid} onChange={e => setIntegrationsData({...integrationsData, twilioAccountSid: e.target.value})} className="w-full p-2 border border-gray-300 rounded focus:border-[#F22F46] outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Auth Token</label>
                  <input type="password" value={integrationsData.twilioAuthToken} onChange={e => setIntegrationsData({...integrationsData, twilioAuthToken: e.target.value})} className="w-full p-2 border border-gray-300 rounded focus:border-[#F22F46] outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Sender Phone Number</label>
                  <input type="text" value={integrationsData.twilioPhoneNumber} onChange={e => setIntegrationsData({...integrationsData, twilioPhoneNumber: e.target.value})} placeholder="+1234567890" className="w-full p-2 border border-gray-300 rounded focus:border-[#F22F46] outline-none" />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button 
                onClick={() => updateTenant.mutate(integrationsData)}
                disabled={updateTenant.isPending}
                className="bg-gray-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-black transition-colors"
              >
                {updateTenant.isPending ? 'Saving...' : 'Save Integrations'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'webhooks' && (
        <WebhooksTab tenantId={tenantId} />
      )}

      {activeTab === 'access' && (
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-secondary">Access Control</h2>
              <p className="text-sm text-gray-500">Manage what your staff can see and do.</p>
            </div>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700 font-bold text-sm">
              + New Custom Role
            </button>
          </div>

          {rolesLoading ? (
            <div className="p-8 text-center text-gray-500">Loading roles...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rolesData?.data?.map(role => (
                <div key={role.id} className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-900">{role.name}</h3>
                    {!role.isCustom && (
                      <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded uppercase">System</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-4 h-8">{role.description || 'No description provided.'}</p>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <span className="text-xs font-bold text-gray-400 uppercase">{role.permissions?.length || 0} Permissions</span>
                    {role.isCustom ? (
                      <button className="text-sm font-bold text-indigo-600 hover:text-indigo-900">Edit Permissions</button>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Locked</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black text-gray-900 mb-2">Platform Subscription</h2>
            <p className="text-gray-500">You are currently on the <strong className="text-indigo-600">{tenant?.subscriptionTier}</strong> plan.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Basic Plan */}
            <div className={`p-8 rounded-2xl border-2 ${tenant?.subscriptionTier === 'BASIC' ? 'border-indigo-600 shadow-md relative' : 'border-gray-100'}`}>
              {tenant?.subscriptionTier === 'BASIC' && <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wide">CURRENT</div>}
              <h3 className="text-lg font-bold text-gray-900">Basic</h3>
              <p className="text-gray-500 text-sm mb-6">For independent stylists.</p>
              <div className="mb-6">
                <span className="text-4xl font-black">$29</span>
                <span className="text-gray-500">/mo</span>
              </div>
              <ul className="space-y-3 mb-8 text-sm text-gray-600">
                <li className="flex items-center gap-2">✔️ Unlimited Bookings</li>
                <li className="flex items-center gap-2">✔️ Basic Reports</li>
                <li className="flex items-center gap-2">❌ SMS Notifications</li>
                <li className="flex items-center gap-2">❌ Supply Chain</li>
              </ul>
              <button 
                onClick={() => {
                  if(window.confirm('Simulating Stripe Checkout for Basic Plan... Confirm?')) {
                    api.post(`/tenants/${tenantId}/subscription`, { tier: 'BASIC' })
                      .then(() => queryClient.invalidateQueries(['tenant-details']))
                      .catch(e => alert('Failed to upgrade.'));
                  }
                }}
                disabled={tenant?.subscriptionTier === 'BASIC'}
                className={`w-full py-3 rounded-lg font-bold ${tenant?.subscriptionTier === 'BASIC' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 transition'}`}
              >
                {tenant?.subscriptionTier === 'BASIC' ? 'Active' : 'Downgrade to Basic'}
              </button>
            </div>

            {/* Pro Plan */}
            <div className={`p-8 rounded-2xl border-2 ${tenant?.subscriptionTier === 'PRO' ? 'border-indigo-600 shadow-md relative' : 'border-indigo-100 bg-indigo-50/30'}`}>
              {tenant?.subscriptionTier === 'PRO' && <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wide">CURRENT</div>}
              {tenant?.subscriptionTier !== 'PRO' && <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold tracking-wide">RECOMMENDED</div>}
              <h3 className="text-lg font-bold text-gray-900">Professional</h3>
              <p className="text-gray-500 text-sm mb-6">For growing salons with staff.</p>
              <div className="mb-6">
                <span className="text-4xl font-black">$79</span>
                <span className="text-gray-500">/mo</span>
              </div>
              <ul className="space-y-3 mb-8 text-sm text-gray-600">
                <li className="flex items-center gap-2">✔️ Unlimited Bookings</li>
                <li className="flex items-center gap-2">✔️ Advanced Tax Reports</li>
                <li className="flex items-center gap-2">✔️ Multi-Staff Payroll</li>
                <li className="flex items-center gap-2">❌ Supply Chain POs</li>
              </ul>
              <button 
                onClick={() => {
                  if(window.confirm('Simulating Stripe Checkout for PRO Plan... Confirm?')) {
                    api.post(`/tenants/${tenantId}/subscription`, { tier: 'PRO' })
                      .then(() => queryClient.invalidateQueries(['tenant-details']))
                      .catch(e => alert('Failed to upgrade.'));
                  }
                }}
                disabled={tenant?.subscriptionTier === 'PRO'}
                className={`w-full py-3 rounded-lg font-bold ${tenant?.subscriptionTier === 'PRO' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 transition'}`}
              >
                {tenant?.subscriptionTier === 'PRO' ? 'Active' : 'Upgrade to Pro'}
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className={`p-8 rounded-2xl border-2 ${tenant?.subscriptionTier === 'ENTERPRISE' ? 'border-indigo-600 shadow-md relative' : 'border-gray-100'}`}>
              {tenant?.subscriptionTier === 'ENTERPRISE' && <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wide">CURRENT</div>}
              <h3 className="text-lg font-bold text-gray-900">Enterprise</h3>
              <p className="text-gray-500 text-sm mb-6">For multi-branch chains.</p>
              <div className="mb-6">
                <span className="text-4xl font-black">$199</span>
                <span className="text-gray-500">/mo</span>
              </div>
              <ul className="space-y-3 mb-8 text-sm text-gray-600">
                <li className="flex items-center gap-2">✔️ Everything in Pro</li>
                <li className="flex items-center gap-2">✔️ Multi-Branch Sync</li>
                <li className="flex items-center gap-2">✔️ Supply Chain & POs</li>
                <li className="flex items-center gap-2">✔️ Custom Domain</li>
              </ul>
              <button 
                onClick={() => {
                  if(window.confirm('Simulating Stripe Checkout for ENTERPRISE Plan... Confirm?')) {
                    api.post(`/tenants/${tenantId}/subscription`, { tier: 'ENTERPRISE' })
                      .then(() => queryClient.invalidateQueries(['tenant-details']))
                      .catch(e => alert('Failed to upgrade.'));
                  }
                }}
                disabled={tenant?.subscriptionTier === 'ENTERPRISE'}
                className={`w-full py-3 rounded-lg font-bold ${tenant?.subscriptionTier === 'ENTERPRISE' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-black transition'}`}
              >
                {tenant?.subscriptionTier === 'ENTERPRISE' ? 'Active' : 'Upgrade to Enterprise'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Tenant Modal */}
      {isEditTenantOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-bold mb-4">Edit Tenant Details</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              updateTenant.mutate({
                name: formData.get('name'),
                defaultCurrency: formData.get('defaultCurrency'),
                globalTaxRate: parseFloat(formData.get('globalTaxRate')) || 0,
                logoUrl: formData.get('logoUrl'),
                primaryColor: formData.get('primaryColor'),
                invoiceFooterText: formData.get('invoiceFooterText'),
                receiptMessage: formData.get('receiptMessage'),
                businessHours
              });
            }} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto flex-1 pr-2 space-y-6">
                
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900 border-b pb-2">General Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Salon Name</label>
                      <input name="name" type="text" defaultValue={tenant?.name} required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Default Currency</label>
                      <input name="defaultCurrency" type="text" defaultValue={tenant?.defaultCurrency} required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Global Tax Rate (%)</label>
                      <input name="globalTaxRate" type="number" step="0.01" min="0" max="100" defaultValue={tenant?.globalTaxRate || 0} required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900 border-b pb-2">Branding & Receipts</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Logo URL</label>
                      <input name="logoUrl" type="url" defaultValue={tenant?.logoUrl} placeholder="https://..." className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Primary Color (Hex)</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input name="primaryColor" type="color" defaultValue={tenant?.primaryColor || '#4f46e5'} className="h-10 w-10 border border-gray-300 rounded-md cursor-pointer p-0.5" />
                        <input type="text" defaultValue={tenant?.primaryColor || '#4f46e5'} className="block w-full border border-gray-300 rounded-md p-2 bg-gray-50 text-gray-500" disabled />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Invoice Footer Text</label>
                    <input name="invoiceFooterText" type="text" defaultValue={tenant?.invoiceFooterText} placeholder="Tax ID: 12345678" className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Receipt Message</label>
                    <input name="receiptMessage" type="text" defaultValue={tenant?.receiptMessage} placeholder="Thank you for visiting!" className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900 border-b pb-2">Business Hours</h4>
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                    <div key={day} className="flex items-center gap-4">
                      <div className="w-28 flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          checked={businessHours[day]?.isOpen || false}
                          onChange={(e) => setBusinessHours({
                            ...businessHours,
                            [day]: { ...businessHours[day], isOpen: e.target.checked }
                          })}
                        />
                        <span className="capitalize font-medium text-sm text-gray-700">{day}</span>
                      </div>
                      <input 
                        type="time" 
                        value={businessHours[day]?.open || ''}
                        disabled={!businessHours[day]?.isOpen}
                        onChange={(e) => setBusinessHours({
                          ...businessHours,
                          [day]: { ...businessHours[day], open: e.target.value }
                        })}
                        className="border border-gray-300 rounded p-1 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                      />
                      <span className="text-gray-500 text-sm">to</span>
                      <input 
                        type="time" 
                        value={businessHours[day]?.close || ''}
                        disabled={!businessHours[day]?.isOpen}
                        onChange={(e) => setBusinessHours({
                          ...businessHours,
                          [day]: { ...businessHours[day], close: e.target.value }
                        })}
                        className="border border-gray-300 rounded p-1 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </div>
                  ))}
                </div>

              </div>
              <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsEditTenantOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 font-bold">Cancel</button>
                <button type="submit" disabled={updateTenant.isPending} className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 font-bold">Save Changes</button>
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

const WebhooksTab = ({ tenantId }) => {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [event, setEvent] = useState('ALL');
  const [secret, setSecret] = useState('');

  const { data: webhooks } = useQuery({
    queryKey: ['webhooks', tenantId],
    queryFn: async () => {
      const res = await api.get(`/tenants/${tenantId}/webhooks`);
      return res.data?.data;
    },
    enabled: !!tenantId
  });

  const createWebhook = useMutation({
    mutationFn: async (data) => api.post(`/tenants/${tenantId}/webhooks`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['webhooks', tenantId]);
      setUrl('');
      setSecret('');
      setEvent('ALL');
    }
  });

  const deleteWebhook = useMutation({
    mutationFn: async (id) => api.delete(`/tenants/${tenantId}/webhooks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['webhooks', tenantId]);
    }
  });

  return (
    <div className="bg-surface p-6 rounded-2xl shadow-sm border border-gray-100">
      <h2 className="text-xl font-bold text-secondary mb-6">Enterprise Webhooks</h2>
      
      <form onSubmit={(e) => { e.preventDefault(); createWebhook.mutate({ url, event, secret }); }} className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8 space-y-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Register Webhook</h3>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Payload URL</label>
          <input type="url" required value={url} onChange={e => setUrl(e.target.value)} placeholder="https://your-server.com/webhook" className="w-full p-2 border border-gray-300 rounded outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Event Type</label>
            <select value={event} onChange={e => setEvent(e.target.value)} className="w-full p-2 border border-gray-300 rounded outline-none">
              <option value="ALL">ALL Events</option>
              <option value="APPOINTMENT_CREATED">APPOINTMENT_CREATED</option>
              <option value="INVOICE_PAID">INVOICE_PAID</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Secret (Signature)</label>
            <input type="text" value={secret} onChange={e => setSecret(e.target.value)} placeholder="Optional secret..." className="w-full p-2 border border-gray-300 rounded outline-none" />
          </div>
        </div>
        <button type="submit" disabled={createWebhook.isPending} className="bg-gray-900 text-white px-4 py-2 rounded font-bold mt-4">
          {createWebhook.isPending ? 'Saving...' : 'Add Webhook'}
        </button>
      </form>

      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Active Endpoints</h3>
        {!webhooks || webhooks.length === 0 ? (
          <p className="text-gray-500 text-sm">No webhooks registered.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {webhooks.map(wh => (
              <li key={wh.id} className="py-4 flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-900">{wh.url}</p>
                  <p className="text-sm text-gray-500">Event: {wh.event}</p>
                </div>
                <button onClick={() => deleteWebhook.mutate(wh.id)} className="text-red-600 text-sm font-bold">Remove</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
