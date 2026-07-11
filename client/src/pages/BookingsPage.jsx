import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const getLocalDateString = (d = new Date()) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const BookingsPage = () => {
  const [activeDate, setActiveDate] = useState(getLocalDateString());

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
    </div>
  );
};

export default BookingsPage;
