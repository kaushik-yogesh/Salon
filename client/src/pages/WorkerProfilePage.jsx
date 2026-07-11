import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';

const WorkerProfilePage = () => {
  const user = useAuthStore(state => state.user);
  
  const [formData, setFormData] = useState({
    firstName: user?.profile?.firstName || '',
    lastName: user?.profile?.lastName || '',
    phone: user?.profile?.phone || '',
    title: user?.WorkerProfile?.title || '',
    bio: user?.WorkerProfile?.bio || '',
  });

  const [status, setStatus] = useState('idle');

  const updateProfile = useMutation({
    mutationFn: async (data) => {
      const promises = [];
      
      // Update User Profile
      promises.push(
        api.put(`/users/${user.id}/profile`, {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
        })
      );
      
      // Update Worker Profile if it exists
      if (user.WorkerProfile?.id) {
        promises.push(
          api.put(`/hr/${user.WorkerProfile.id}`, {
            title: data.title,
            bio: data.bio,
            baseCommissionRate: user.WorkerProfile.baseCommissionRate,
            isActive: user.WorkerProfile.isActive
          })
        );
      }
      
      await Promise.all(promises);
    },
    onSuccess: () => {
      // Invalidate the getMe auth check to refresh context if needed
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
      window.location.reload(); // Hard reload to grab fresh auth state for simplicity in MVP
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
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 text-sm">Manage your personal and professional details.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
            {status === 'success' && (
              <div className="bg-green-50 p-4 rounded-md">
                <p className="text-sm text-green-700 font-medium">Profile updated successfully!</p>
              </div>
            )}
            {status === 'error' && (
              <div className="bg-red-50 p-4 rounded-md">
                <p className="text-sm text-red-700 font-medium">Failed to update profile.</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
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

              <div>
                <label className="block text-sm font-medium text-gray-700">Job Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="e.g. Senior Stylist"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Bio</label>
                <textarea
                  rows="4"
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Tell clients a bit about your experience..."
                ></textarea>
              </div>
            </div>

            <div className="pt-5 border-t border-gray-200 flex justify-end">
              <button
                type="submit"
                disabled={status === 'loading'}
                className="bg-indigo-600 border border-transparent rounded-md shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {status === 'loading' ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WorkerProfilePage;
