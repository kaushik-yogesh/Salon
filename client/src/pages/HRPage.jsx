import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

const HRPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('WORKERS');
  const [isAddWorkerOpen, setIsAddWorkerOpen] = useState(false);
  const [isEditWorkerOpen, setIsEditWorkerOpen] = useState(false);
  const [isTimeOffOpen, setIsTimeOffOpen] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [selectedWorker, setSelectedWorker] = useState(null);

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

  const updateWorker = useMutation({
    mutationFn: async ({ id, data }) => api.put(`/hr/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['workers']);
      setIsEditWorkerOpen(false);
      setSelectedWorker(null);
    }
  });

  const deleteWorker = useMutation({
    mutationFn: async (id) => api.delete(`/hr/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['workers']);
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

  const { data: documentsData } = useQuery({
    queryKey: ['workerDocuments', selectedWorker?.id],
    queryFn: async () => {
      if (!selectedWorker?.id) return [];
      const res = await api.get(`/hr/workers/${selectedWorker.id}/documents`);
      return res.data?.data || [];
    },
    enabled: !!selectedWorker?.id
  });

  const addDocument = useMutation({
    mutationFn: async (data) => api.post(`/hr/workers/${selectedWorker.id}/documents`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['workerDocuments', selectedWorker.id]);
      alert('Document added successfully');
    }
  });

  const workers = workersData?.data || [];
  
  const { data: shiftsData, isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const res = await api.get('/hr/shifts');
      return res.data;
    }
  });
  
  const saveShifts = useMutation({
    mutationFn: async (shifts) => api.post('/hr/shifts', { shifts }),
    onSuccess: () => {
      queryClient.invalidateQueries(['shifts']);
      alert('Shifts saved successfully');
    }
  });

  const shifts = shiftsData?.data || [];
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
          <button
            onClick={() => setActiveTab('SHIFTS')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'SHIFTS' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Attendance & Shifts
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
                      onClick={() => { setSelectedWorker(worker); setIsEditWorkerOpen(true); }}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => { setSelectedWorkerId(worker.id); setIsTimeOffOpen(true); }}
                      className="text-blue-600 hover:text-blue-900 ml-4"
                    >
                      Time Off
                    </button>
                    <button 
                      onClick={() => { if(window.confirm('Are you sure you want to remove this worker?')) deleteWorker.mutate(worker.id); }}
                      className="text-red-600 hover:text-red-900 ml-4"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : activeTab === 'TIMEOFF' ? (
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
        ) : activeTab === 'SHIFTS' ? (
          <div className="p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Weekly Staff Schedule</h2>
              <button 
                onClick={() => {
                  // In a real app, you would have a complex grid editor here.
                  // For MVP, we simulate a hardcoded save for demonstration.
                  if(window.confirm('Simulate saving default 9-5 schedule for all staff?')) {
                    const payload = [];
                    workers.forEach(w => {
                      for(let i=1; i<=5; i++) { // Mon-Fri
                        payload.push({ workerProfileId: w.id, dayOfWeek: i, startTime: "09:00", endTime: "17:00" });
                      }
                    });
                    saveShifts.mutate(payload);
                  }
                }}
                className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700 font-bold"
              >
                Auto-Fill 9-5 Schedule
              </button>
            </div>
            
            {shiftsLoading ? (
              <p className="text-gray-500">Loading schedules...</p>
            ) : shifts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No shifts scheduled. Use Auto-Fill to generate a default schedule.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {workers.map(worker => {
                  const workerShifts = shifts.filter(s => s.workerProfileId === worker.id);
                  if (workerShifts.length === 0) return null;
                  
                  return (
                    <div key={worker.id} className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                      <h3 className="font-bold text-gray-900 mb-2">{worker.user?.profile?.firstName} {worker.user?.profile?.lastName}</h3>
                      <div className="space-y-1">
                        {workerShifts.sort((a,b)=>a.dayOfWeek - b.dayOfWeek).map(s => {
                          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                          return (
                            <div key={s.id} className="flex justify-between text-sm">
                              <span className="font-medium text-gray-700">{days[s.dayOfWeek]}</span>
                              <span className="text-gray-500">{s.startTime} - {s.endTime}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
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

      {isEditWorkerOpen && selectedWorker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Edit Staff Member</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              updateWorker.mutate({
                id: selectedWorker.id,
                data: {
                  title: formData.get('title'),
                  bio: formData.get('bio'),
                  baseCommissionRate: parseFloat(formData.get('commission') || 0) / 100,
                  isActive: formData.get('isActive') === 'true'
                }
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Job Title</label>
                  <input name="title" type="text" defaultValue={selectedWorker.title} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Commission Rate (%)</label>
                  <input name="commission" type="number" min="0" max="100" defaultValue={selectedWorker.baseCommissionRate * 100} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bio</label>
                  <textarea name="bio" defaultValue={selectedWorker.bio} className="mt-1 block w-full border border-gray-300 rounded-md p-2" rows="2"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select name="isActive" defaultValue={selectedWorker.isActive ? "true" : "false"} className="mt-1 block w-full border border-gray-300 rounded-md p-2">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => { setIsEditWorkerOpen(false); setSelectedWorker(null); }} className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={updateWorker.isPending} className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">Save</button>
              </div>
            </form>

            <div className="mt-8 border-t border-gray-200 pt-6">
              <h4 className="font-bold text-gray-900 mb-4">Documents & Compliance</h4>
              
              <div className="space-y-3 mb-6">
                {!documentsData || documentsData.length === 0 ? (
                  <p className="text-sm text-gray-500">No documents on file.</p>
                ) : (
                  documentsData.map(doc => (
                    <div key={doc.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-200">
                      <div>
                        <div className="text-sm font-bold text-gray-900">{doc.documentType}</div>
                        <div className="text-xs text-gray-500">ID: {doc.documentNumber || 'N/A'}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded">On File</span>
                        {doc.expirationDate && <div className="text-xs text-gray-500 mt-1">Exp: {new Date(doc.expirationDate).toLocaleDateString()}</div>}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                addDocument.mutate({
                  documentType: formData.get('documentType'),
                  documentNumber: formData.get('documentNumber'),
                  expirationDate: formData.get('expirationDate')
                });
                e.target.reset();
              }} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="space-y-3">
                  <div>
                    <input name="documentType" type="text" placeholder="Document Type (e.g., Cosmetology License)" required className="block w-full border border-gray-300 rounded p-2 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input name="documentNumber" type="text" placeholder="License Number" className="block w-full border border-gray-300 rounded p-2 text-sm" />
                    <input name="expirationDate" type="date" className="block w-full border border-gray-300 rounded p-2 text-sm text-gray-500" />
                  </div>
                  <button type="submit" disabled={addDocument.isPending} className="w-full bg-gray-900 text-white rounded p-2 text-sm font-bold">
                    {addDocument.isPending ? 'Adding...' : 'Add Document'}
                  </button>
                </div>
              </form>
            </div>

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
