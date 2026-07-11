import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';

const WorkerLeavesPage = () => {
  const user = useAuthStore(state => state.user);
  const queryClient = useQueryClient();
  const workerProfileId = user?.WorkerProfile?.id;

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitStatus, setSubmitStatus] = useState('idle');

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ['worker-leaves', workerProfileId],
    queryFn: async () => {
      const res = await api.get(`/hr/${workerProfileId}/time-off`);
      return res.data.data;
    },
    enabled: !!workerProfileId
  });

  const requestLeave = useMutation({
    mutationFn: (data) => api.post(`/hr/${workerProfileId}/time-off`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['worker-leaves', workerProfileId]);
      setStartDate('');
      setEndDate('');
      setReason('');
      setSubmitStatus('success');
      setTimeout(() => setSubmitStatus('idle'), 3000);
    },
    onError: () => {
      setSubmitStatus('error');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitStatus('loading');
    requestLeave.mutate({ startDate, endDate, reason });
  };

  if (!workerProfileId) {
    return (
      <div className="p-8 text-center text-gray-500">
        You do not have an active worker profile. Please contact an admin.
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Time Off</h1>
          <p className="text-gray-500 text-sm">Request leave and view your time off history.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Request Time Off</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {submitStatus === 'success' && (
                <div className="bg-green-50 p-3 rounded-md text-sm text-green-700">Request submitted successfully!</div>
              )}
              {submitStatus === 'error' && (
                <div className="bg-red-50 p-3 rounded-md text-sm text-red-700">Failed to submit request.</div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">End Date</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Reason</label>
                <textarea
                  required
                  rows="3"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="E.g. Vacation, Sick leave..."
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitStatus === 'loading'}
                className="w-full bg-indigo-600 border border-transparent rounded-md shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {submitStatus === 'loading' ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Leave History</h2>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-8 text-center text-gray-500">Loading requests...</td>
                  </tr>
                ) : leaves.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-8 text-center text-gray-500">No time-off requests found.</td>
                  </tr>
                ) : (
                  leaves.map(leave => (
                    <tr key={leave.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {leave.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          leave.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 
                          leave.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {leave.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerLeavesPage;
