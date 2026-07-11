import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

const HRPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('WORKERS');
  const [isAddWorkerOpen, setIsAddWorkerOpen] = useState(false);
  const [isTimeOffOpen, setIsTimeOffOpen] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);

  const { data: workersData, isLoading } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const res = await api.get('/hr');
      return res.data;
    }
  });

  const createWorker = useMutation({
    mutationFn: async (data) => api.post('/hr', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['workers']);
      setIsAddWorkerOpen(false);
    }
  });

  const requestTimeOff = useMutation({
    mutationFn: async ({ id, data }) => api.post(`/hr/${id}/time-off`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['workers']);
      setIsTimeOffOpen(false);
      setSelectedWorkerId(null);
    }
  });

  const updateTimeOffStatus = useMutation({
    mutationFn: async ({ requestId, status }) => api.put(`/hr/time-off/${requestId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['workers']);
    }
  });

  const workers = workersData?.data || [];
  
  // Flatten time off requests for the requests tab
  const allTimeOffRequests = workers.flatMap(w => 
    (w.timeOff || []).map(t => ({ ...t, workerName: w.user?.profile?.firstName + ' ' + w.user?.profile?.lastName }))
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-secondary">Human Resources</h1>
          <p className="text-gray-500">Manage your salon staff, schedules, and time off.</p>
        </div>
        <button 
          onClick={() => setIsAddWorkerOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition"
        >
          + Add Worker
        </button>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('WORKERS')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'WORKERS' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Staff Directory
          </button>
          <button
            onClick={() => setActiveTab('TIMEOFF')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'TIMEOFF' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Time Off Requests
          </button>
        </nav>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading HR data...</div>
        ) : activeTab === 'WORKERS' ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workers.map((worker) => (
                <tr key={worker.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold">{worker.user?.profile?.firstName?.charAt(0) || 'U'}</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{worker.user?.profile?.firstName} {worker.user?.profile?.lastName}</div>
                        <div className="text-sm text-gray-500">{worker.user?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{worker.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{worker.baseCommissionRate * 100}%</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${worker.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {worker.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => { setSelectedWorkerId(worker.id); setIsTimeOffOpen(true); }}
                      className="text-blue-600 hover:text-blue-900 ml-4"
                    >
                      Request Time Off
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allTimeOffRequests.length === 0 && (
                <tr><td colSpan="5" className="p-8 text-center text-gray-500">No time off requests found.</td></tr>
              )}
              {allTimeOffRequests.map((req) => (
                <tr key={req.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{req.workerName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{req.reason}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${req.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 
                        req.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {req.status === 'PENDING' && (
                      <div className="flex justify-end space-x-2">
                        <button onClick={() => updateTimeOffStatus.mutate({ requestId: req.id, status: 'APPROVED' })} className="text-green-600 hover:text-green-900">Approve</button>
                        <button onClick={() => updateTimeOffStatus.mutate({ requestId: req.id, status: 'REJECTED' })} className="text-red-600 hover:text-red-900">Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isAddWorkerOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Add Staff Member</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              createWorker.mutate({
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                password: formData.get('password'),
                role: formData.get('role'),
                title: formData.get('title'),
                bio: formData.get('bio'),
                baseCommissionRate: parseFloat(formData.get('commission') || 0) / 100
              });
            }}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                    <input name="firstName" type="text" required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                    <input name="lastName" type="text" required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email Address</label>
                  <input name="email" type="email" required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Initial Password</label>
                  <input name="password" type="text" required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">System Role</label>
                  <select name="role" required className="mt-1 block w-full border border-gray-300 rounded-md p-2">
                    <option value="WORKER">Worker (Stylist/Barber)</option>
                    <option value="RECEPTIONIST">Receptionist (Front Desk)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Job Title</label>
                  <input name="title" type="text" className="mt-1 block w-full border border-gray-300 rounded-md p-2 placeholder-gray-400" placeholder="e.g. Senior Stylist" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Commission Rate (%)</label>
                  <input name="commission" type="number" min="0" max="100" defaultValue="0" className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bio</label>
                  <textarea name="bio" className="mt-1 block w-full border border-gray-300 rounded-md p-2" rows="2"></textarea>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsAddWorkerOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={createWorker.isPending} className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isTimeOffOpen && selectedWorkerId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Request Time Off</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              requestTimeOff.mutate({
                id: selectedWorkerId,
                data: {
                  startDate: new Date(formData.get('startDate')).toISOString(),
                  endDate: new Date(formData.get('endDate')).toISOString(),
                  reason: formData.get('reason')
                }
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <input name="startDate" type="date" required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date</label>
                  <input name="endDate" type="date" required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reason</label>
                  <input name="reason" type="text" required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => { setIsTimeOffOpen(false); setSelectedWorkerId(null); }} className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={requestTimeOff.isPending} className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRPage;
