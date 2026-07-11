import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { Link } from 'react-router-dom';

const AdminDashboardPage = () => {
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoResult, setDemoResult] = useState(null);
  const [demoError, setDemoError] = useState('');

  const { data: metrics, isLoading: loadingMetrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: async () => {
      const res = await api.get('/dashboard/admin-metrics');
      return res.data.data;
    }
  });

  const { data: health, isLoading: loadingHealth } = useQuery({
    queryKey: ['admin-health-config'],
    queryFn: async () => {
      const res = await api.get('/dashboard/health/config');
      return res.data.data;
    }
  });

  const handleSeedDemo = async () => {
    if (!confirm('This will create demo salon data. Continue?')) return;
    setDemoLoading(true);
    setDemoError('');
    setDemoResult(null);
    try {
      const res = await api.post('/demo/seed');
      setDemoResult(res.data.data);
      refetchMetrics();
    } catch (err) {
      setDemoError(err.response?.data?.error?.message || 'Failed to seed demo data');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleResetDemo = async () => {
    if (!confirm('⚠️ This will DELETE ALL DATA in the database. Are you absolutely sure?')) return;
    setDemoLoading(true);
    setDemoError('');
    setDemoResult(null);
    try {
      await api.post('/demo/reset');
      setDemoResult({ message: 'All data has been reset. Database is clean.' });
      refetchMetrics();
    } catch (err) {
      setDemoError(err.response?.data?.error?.message || 'Failed to reset data');
    } finally {
      setDemoLoading(false);
    }
  };

  if (loadingMetrics || loadingHealth) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading platform metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-gray-500 mt-2">Manage the SalonOS SaaS Platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 border-l-4 border-l-indigo-500">
          <h3 className="text-gray-500 text-sm font-medium">Total Tenants (Salons)</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{metrics?.totalTenants || 0}</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 border-l-4 border-l-emerald-500">
          <h3 className="text-gray-500 text-sm font-medium">Total Platform Users</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{metrics?.totalUsers || 0}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 border-l-4 border-l-amber-500">
          <h3 className="text-gray-500 text-sm font-medium">Platform Processed Revenue</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">${(metrics?.platformRevenue || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Demo Mode Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">🧪 Demo Mode</h2>
            <p className="text-sm text-gray-500 mt-1">Seed or reset test data for the entire platform.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSeedDemo}
              disabled={demoLoading}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {demoLoading ? 'Working...' : '🌱 Seed Demo Data'}
            </button>
            <button
              onClick={handleResetDemo}
              disabled={demoLoading}
              className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-all"
            >
              {demoLoading ? 'Working...' : '🗑️ Reset All Data'}
            </button>
          </div>
        </div>

        {demoError && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-lg mb-4">
            <p className="text-sm text-red-700">{demoError}</p>
          </div>
        )}

        {demoResult && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <p className="text-sm text-green-700 font-medium mb-2">✅ {demoResult.message || 'Demo data seeded successfully!'}</p>
            {demoResult.credentials && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-700 mb-2">Test Credentials (all use the same password):</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {demoResult.credentials.map((cred, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-lg p-3 text-sm">
                      <span className="font-medium text-gray-900">{cred.role}</span>
                      <br />
                      <span className="text-gray-500">{cred.email}</span>
                      <br />
                      <span className="font-mono text-xs text-indigo-600">{cred.password}</span>
                      <span className="text-xs text-gray-400 ml-2">→ {cred.portal}</span>
                    </div>
                  ))}
                </div>
                {demoResult.counts && (
                  <p className="text-xs text-gray-500 mt-3">
                    Created: {demoResult.counts.categories} categories, {demoResult.counts.services} services, {demoResult.counts.workers} workers, {demoResult.counts.customers} customers, {demoResult.counts.appointments} appointments, {demoResult.counts.products} products
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">System Health & Configuration</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {health && Object.entries(health).map(([key, isConfigured]) => (
            <div key={key} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className={`w-3 h-3 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium text-gray-700 capitalize">{key}</span>
            </div>
          ))}
        </div>
        {!health?.stripe || !health?.smtp || !health?.twilio || !health?.vapid ? (
          <p className="text-xs text-red-500 mt-4 font-medium">Warning: Some production engines are missing environment variables. Features will gracefully degrade to mocked logs.</p>
        ) : null}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Recently Onboarded Salons</h2>
          <Link to="/admin/tenants" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
            View All
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {metrics?.recentTenants?.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No tenants found. Use the Seed Demo Data button above to get started.</td>
                </tr>
              ) : (
                metrics?.recentTenants?.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {tenant.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {tenant.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tenant.subscriptionTier}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;

