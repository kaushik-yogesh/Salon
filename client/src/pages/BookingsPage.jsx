import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const getLocalDateString = (d = new Date()) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const BookingsPage = () => {
  const [activeDate, setActiveDate] = useState(getLocalDateString());
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['bookings', activeDate],
    queryFn: async () => {
      const res = await api.get(`/bookings?date=${activeDate}`);
      
      // Extract unique workers from appointments for the calendar headers
      const appointments = res.data?.data || [];
      const workerMap = new Map();
      let hasUnassigned = false;
      
      appointments.forEach(app => {
        app.services?.forEach(s => {
          if (s.worker?.user?.profile) {
            workerMap.set(s.worker.id, `${s.worker.user.profile.firstName} (${s.worker.title || 'Stylist'})`);
          } else {
            hasUnassigned = true;
          }
        });
      });
      
      const workers = Array.from(workerMap.values());
      if (hasUnassigned) workers.push('Unassigned');
      
      return { 
        appointments, 
        workers
      };
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async (id) => api.put(`/bookings/${id}/status`, { status: 'CANCELLED' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['bookings', activeDate]);
      setIsModalOpen(false);
      setSelectedAppt(null);
    }
  });

  const noShowMutation = useMutation({
    mutationFn: async (id) => api.put(`/bookings/${id}/status`, { status: 'NO_SHOW' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['bookings', activeDate]);
      setIsModalOpen(false);
      setSelectedAppt(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => api.put(`/bookings/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['bookings', activeDate]);
      setIsModalOpen(false);
      setSelectedAppt(null);
      setIsEditing(false);
    }
  });

  const handleEditSave = () => {
    if (!editData.date || !editData.time) return alert('Date and Time are required');
    
    const [hours, minutes] = editData.time.split(':');
    const newBaseDate = new Date(editData.date);
    newBaseDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    // Shift all services relative to the new base start time
    let currentStartTime = new Date(newBaseDate);
    const updatedServices = selectedAppt.services.map(s => {
      const oldStart = new Date(s.startTime);
      const oldEnd = new Date(s.endTime);
      const durationMs = oldEnd.getTime() - oldStart.getTime();
      
      const newStart = new Date(currentStartTime);
      const newEnd = new Date(newStart.getTime() + durationMs);
      
      currentStartTime = new Date(newEnd); // next service starts when this one ends

      return {
        serviceId: s.serviceId,
        workerProfileId: s.workerProfileId,
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
        price: s.price
      };
    });

    updateMutation.mutate({
      id: selectedAppt.id,
      payload: {
        date: newBaseDate.toISOString(),
        notes: editData.notes,
        services: updatedServices
      }
    });
  };

  if (isLoading) return <div className="p-8 text-center text-secondary">Loading calendar...</div>;
  if (error) return <div className="p-8 text-center text-danger">Error loading calendar</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-secondary">Appointments</h1>
          <p className="text-gray-500 text-sm">Manage the daily schedule</p>
        </div>
        <div className="flex space-x-4 items-center">
          <input 
            type="date" 
            value={activeDate}
            onChange={(e) => setActiveDate(e.target.value)}
            className="border border-gray-300 rounded-md p-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Link to="/owner/pos" className="bg-primary text-white px-4 py-2 rounded-md hover:bg-opacity-90 transition inline-block">
            + New Appointment
          </Link>
        </div>
      </div>

      {/* Calendar Grid Wrapper */}
      <div className="bg-surface rounded-xl shadow border border-gray-200 overflow-hidden min-h-[500px]">
        {/* Header Row (Workers) */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <div className="w-20 border-r border-gray-200 p-3 text-center text-xs font-semibold text-gray-500">
            TIME
          </div>
          <div className="flex-1 grid grid-cols-3 divide-x divide-gray-200">
            {data?.workers?.length > 0 ? data.workers.map(workerName => (
              <div key={workerName} className="p-3 text-center text-sm font-semibold text-secondary">
                {workerName}
              </div>
            )) : (
              <div className="p-3 text-center text-sm font-semibold text-gray-400">
                No active bookings
              </div>
            )}
          </div>
        </div>

        {/* Time Slots Body */}
        <div className="flex relative h-[800px] overflow-y-auto">
          {/* Time Gutter */}
          <div className="w-20 border-r border-gray-200 bg-gray-50 flex flex-col">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-20 border-b border-gray-200 p-2 text-xs text-right text-gray-400 font-medium relative">
                <span className="-top-3 relative">{i + 9}:00 AM</span>
              </div>
            ))}
          </div>

          {/* Grid Columns */}
          <div className="flex-1 grid grid-cols-3 divide-x divide-gray-200 relative bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSI4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMCA4MEwxMDAwMCA4MCIgc3Ryb2tlPSIjZjNmMTRiIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiLz48L3N2Zz4=')]">
            
            {data?.workers?.length === 0 && (
              <div className="absolute top-24 left-2 right-2 bg-blue-50 border border-blue-200 rounded p-2 text-xs shadow-sm opacity-50 col-span-3">
                <div className="text-blue-600 text-center mt-2">No appointments scheduled</div>
              </div>
            )}
            
            {data?.workers?.map(workerName => {
              return (
                <div key={workerName} className="relative">
                  {data?.appointments?.map(app => (
                    app.services?.map(s => {
                      const sWorkerName = s.worker?.user?.profile 
                        ? `${s.worker.user.profile.firstName} (${s.worker.title || 'Stylist'})` 
                        : 'Unassigned';
                        
                      if (sWorkerName !== workerName) return null;

                      const startHour = new Date(s.startTime).getHours();
                      const startMin = new Date(s.startTime).getMinutes();
                      // 9 AM is our top (0px). Each hour is 80px (h-20 = 5rem = 80px).
                      const topOffset = ((startHour - 9) * 80) + ((startMin / 60) * 80);
                      
                      return (
                        <div 
                          key={s.id} 
                          onClick={() => { setSelectedAppt(app); setIsModalOpen(true); }}
                          className="absolute left-2 right-2 bg-blue-50 border border-blue-200 rounded p-2 text-xs shadow-sm hover:shadow-md transition cursor-pointer"
                          style={{ top: `${Math.max(0, topOffset)}px` }}
                        >
                          <div className="font-semibold text-blue-800">{s.service?.name} - {app.customer?.firstName}</div>
                          <div className="text-blue-600">
                            {new Date(s.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                            {new Date(s.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </div>
                      );
                    })
                  ))}
                </div>
              );
            })}
            
          </div>
        </div>
      </div>

      {isModalOpen && selectedAppt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{isEditing ? 'Edit Appointment' : 'Appointment Details'}</h2>
            
            {!isEditing ? (
              <div className="space-y-3 mb-6">
                <p><strong>Customer:</strong> {selectedAppt.customer?.firstName} {selectedAppt.customer?.lastName}</p>
                <p><strong>Status:</strong> {selectedAppt.status}</p>
                <p><strong>Date:</strong> {new Date(selectedAppt.date).toLocaleDateString()}</p>
                <p><strong>Time:</strong> {selectedAppt.services?.[0]?.startTime ? new Date(selectedAppt.services[0].startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}</p>
                <p><strong>Notes:</strong> {selectedAppt.notes || 'None'}</p>
                <div>
                  <strong>Services:</strong>
                  <ul className="list-disc ml-5 mt-1 text-sm text-gray-600">
                    {selectedAppt.services?.map(s => (
                      <li key={s.id}>{s.service?.name} with {s.worker?.user?.profile?.firstName}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Date</label>
                  <input 
                    type="date" 
                    value={editData.date}
                    onChange={(e) => setEditData({...editData, date: e.target.value})}
                    className="w-full border border-gray-300 rounded p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Start Time</label>
                  <input 
                    type="time" 
                    value={editData.time}
                    onChange={(e) => setEditData({...editData, time: e.target.value})}
                    className="w-full border border-gray-300 rounded p-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Changing this will shift all services accordingly.</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Notes</label>
                  <textarea 
                    value={editData.notes}
                    onChange={(e) => setEditData({...editData, notes: e.target.value})}
                    className="w-full border border-gray-300 rounded p-2"
                    rows="3"
                  ></textarea>
                </div>
              </div>
            )}
            
            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              {!isEditing ? (
                <>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => { if(window.confirm('Are you sure you want to cancel this appointment?')) cancelMutation.mutate(selectedAppt.id); }}
                      className="text-red-600 font-bold text-sm hover:text-red-800"
                    >
                      Cancel Booking
                    </button>
                    <span className="text-gray-300">|</span>
                    <button 
                      onClick={() => { if(window.confirm('Mark this customer as a No-Show?')) noShowMutation.mutate(selectedAppt.id); }}
                      className="text-orange-600 font-bold text-sm hover:text-orange-800"
                    >
                      Mark No-Show
                    </button>
                  </div>
                  <div className="space-x-2">
                    <button 
                      onClick={() => {
                        const firstServiceDate = selectedAppt.services?.[0]?.startTime ? new Date(selectedAppt.services[0].startTime) : new Date(selectedAppt.date);
                        setEditData({
                          date: firstServiceDate.toISOString().split('T')[0],
                          time: firstServiceDate.toTimeString().substring(0, 5),
                          notes: selectedAppt.notes || ''
                        });
                        setIsEditing(true);
                      }}
                      className="px-4 py-2 bg-blue-50 text-blue-700 font-bold rounded-lg hover:bg-blue-100"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="text-gray-600 font-bold text-sm hover:text-gray-800"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleEditSave}
                    disabled={updateMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsPage;
