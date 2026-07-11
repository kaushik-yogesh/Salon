import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';

const CustomerProfilePage = () => {
  const user = useAuthStore(state => state.user);
  
  const [formData, setFormData] = useState({
    firstName: user?.profile?.firstName || '',
    lastName: user?.profile?.lastName || '',
    phone: user?.phone || '',
  });
  
  const [status, setStatus] = useState('idle');

  const updateProfile = useMutation({
    mutationFn: (data) => api.put('/customer-auth/me', data),
    onSuccess: () => {
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
      window.location.reload(); // Simple reload for MVP to refresh context state
    },
    onError: () => {
      setStatus('error');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus('loading');
    updateProfile.mutate(formData);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-500 text-sm">Update your personal information.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
            {status === 'success' && (
              <div className="bg-green-50 p-4 rounded-md text-sm text-green-700">
                Profile updated successfully!
              </div>
            )}
            {status === 'error' && (
              <div className="bg-red-50 p-4 rounded-md text-sm text-red-700">
                Failed to update profile.
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Email (Read Only)</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-gray-50 rounded-md shadow-sm sm:text-sm text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="pt-5 flex justify-end">
              <button
                type="submit"
                disabled={status === 'loading'}
                className="bg-indigo-600 border border-transparent rounded-md shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {status === 'loading' ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfilePage;
