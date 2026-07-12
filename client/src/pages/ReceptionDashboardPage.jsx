import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { Link } from 'react-router-dom';

const ReceptionDashboardPage = () => {
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [workerProfileId, setWorkerProfileId] = useState('');
  const [loadingWalkIn, setLoadingWalkIn] = useState(false);
  const [successToken, setSuccessToken] = useState(null);

  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistCustomerId, setWaitlistCustomerId] = useState('');
  const [waitlistDate, setWaitlistDate] = useState('');
  const [waitlistNotes, setWaitlistNotes] = useState('');
  const [loadingWaitlist, setLoadingWaitlist] = useState(false);

  const { data: waitlistData, refetch: refetchWaitlist } = useQuery({
    queryKey: ['waitlist'],
    queryFn: async () => {
      const res = await api.get('/bookings/waitlist');
      return res.data?.data;
    }
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await api.get('/customers');
      return res.data?.data;
    }
  });

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const localDate = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
      const res = await api.get(`/dashboard/metrics?date=${localDate}`);
      return res.data?.data;
    }
  });

  const { data: catalog } = useQuery({
    queryKey: ['catalog'],
    queryFn: async () => {
      const res = await api.get('/catalog');
      return res.data?.data;
    }
  });

  const { data: workers } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const res = await api.get('/hr');
      return res.data?.data;
    }
  });

  const handleWalkIn = async (e) => {
    e.preventDefault();
    setLoadingWalkIn(true);
    try {
      // 1. Create Customer
      const custRes = await api.post('/customers', { firstName, lastName, phone: '' });
      const customerId = custRes.data?.data?.id;

      // 2. Fetch specific service price
      let price = 0;
      let duration = 30; // default
      if (catalog && Array.isArray(catalog)) {
        for (const cat of catalog) {
          const s = cat?.services?.find(ser => ser.id === serviceId);
          if (s) {
            price = s.basePrice || 0;
            duration = s.baseDuration || 30;
            break;
          }
        }
      }

      // 3. Create Appointment (Walk-In books for right now)
      const now = new Date();
      const end = new Date(now.getTime() + duration * 60000);
      
      const apptRes = await api.post('/bookings', {
        customerId,
        date: now.toISOString(),
        notes: 'Walk-In Customer',
        services: [{
          serviceId,
          workerProfileId,
          startTime: now.toISOString(),
          endTime: end.toISOString(),
          price
        }]
      });

      // 4. Generate simulated Token
      setSuccessToken(apptRes.data?.data);
      
    } catch (err) {
      alert('Failed to process walk-in: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setLoadingWalkIn(false);
    }
  };

  if (isLoading) return <div className="p-8 text-gray-500">Loading front desk data...</div>;

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Front Desk</h1>
          <p className="text-gray-500 text-sm">Manage today's appointments and walk-ins.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowWaitlistModal(true)}
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 text-sm font-medium shadow-sm"
          >
            + Waitlist
          </button>
          <button 
            onClick={() => setShowWalkInModal(true)}
            className="bg-rose-600 text-white px-4 py-2 rounded-md hover:bg-rose-700 text-sm font-medium shadow-sm"
          >
            + New Walk-in
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 text-sm font-medium">Today's Appointments</h3>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">📅</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{metrics?.appointmentsToday || 0}</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 text-sm font-medium">Active Staff</h3>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">👥</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{metrics?.activeWorkers || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">Today's Schedule</h2>
            <Link to="/reception/calendar" className="text-sm font-medium text-rose-600 hover:text-rose-800">
              View Calendar →
            </Link>
          </div>
          <div className="p-6">
            <p className="text-gray-500 text-center py-8">Select 'View Calendar' to see the full timeline view.</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
          </div>
          <div className="p-0">
            {!metrics?.recentActivity || metrics.recentActivity.length === 0 ? (
              <p className="p-6 text-sm text-gray-500 text-center">No recent activity.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {metrics.recentActivity.map((activity, i) => (
                  <li key={i} className="px-6 py-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Invoice #{activity?.id?.toString().slice(-4) || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{activity?.createdAt ? new Date(activity.createdAt).toLocaleTimeString() : 'Unknown Time'}</p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600">+${(activity?.grandTotal || 0).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Waitlist</h2>
          </div>
          <div className="p-0">
            {!waitlistData || waitlistData.length === 0 ? (
              <p className="p-6 text-sm text-gray-500 text-center">No one on the waitlist.</p>
            ) : (
              <ul className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                {waitlistData.filter(w => w.status === 'PENDING').map(w => (
                  <li key={w.id} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{w.customer?.firstName} {w.customer?.lastName}</p>
                      <p className="text-xs text-gray-500">Prefers: {new Date(w.preferredDate).toLocaleDateString()}</p>
                    </div>
                    <button 
                      onClick={async () => {
                        await api.put(`/bookings/waitlist/${w.id}/status`, { status: 'FULFILLED' });
                        refetchWaitlist();
                      }}
                      className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded hover:bg-rose-100"
                    >
                      Fulfill
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* WAITLIST MODAL */}
      {showWaitlistModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add to Waitlist</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setLoadingWaitlist(true);
              try {
                await api.post('/bookings/waitlist', {
                  customerId: waitlistCustomerId,
                  preferredDate: waitlistDate,
                  notes: waitlistNotes
                });
                setShowWaitlistModal(false);
                refetchWaitlist();
              } catch(err) {
                alert('Error adding to waitlist');
              } finally {
                setLoadingWaitlist(false);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Customer</label>
                <select required value={waitlistCustomerId} onChange={e => setWaitlistCustomerId(e.target.value)} className="w-full border border-gray-300 rounded p-2">
                  <option value="">-- Select Customer --</option>
                  {customersData?.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Preferred Date</label>
                <input type="date" required value={waitlistDate} onChange={e => setWaitlistDate(e.target.value)} className="w-full border border-gray-300 rounded p-2" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Notes</label>
                <input type="text" value={waitlistNotes} onChange={e => setWaitlistNotes(e.target.value)} className="w-full border border-gray-300 rounded p-2" />
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowWaitlistModal(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded">Cancel</button>
                <button type="submit" disabled={loadingWaitlist} className="px-4 py-2 bg-rose-600 text-white font-bold rounded hover:bg-rose-700 disabled:opacity-50">
                  {loadingWaitlist ? 'Saving...' : 'Add to Waitlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WALK-IN MODAL */}
      {showWalkInModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            
            {successToken ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Checked In!</h2>
                <p className="text-gray-500 text-sm mb-6">Hand this token ID to the worker to scan.</p>
                <div className="bg-gray-100 p-4 rounded-lg border-2 border-dashed border-gray-300 mb-6">
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Appointment ID / QR</p>
                  <p className="text-xl font-mono text-gray-900 font-bold break-all">{successToken?.id || 'N/A'}</p>
                </div>
                <button 
                  onClick={() => { setSuccessToken(null); setShowWalkInModal(false); }}
                  className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg"
                >
                  Close & Print
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Walk-in Customer</h2>
                <form onSubmit={handleWalkIn} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">First Name</label>
                      <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full border border-gray-300 rounded p-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Last Name</label>
                      <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} className="w-full border border-gray-300 rounded p-2" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Service Required</label>
                    <select required value={serviceId} onChange={e => setServiceId(e.target.value)} className="w-full border border-gray-300 rounded p-2">
                      <option value="">-- Select Service --</option>
                      {Array.isArray(catalog) && catalog.map(cat => (
                        <optgroup key={cat?.id} label={cat?.name || 'Category'}>
                          {Array.isArray(cat?.services) && cat.services.map(s => <option key={s?.id} value={s?.id}>{s?.name || 'Unknown'} (${s?.basePrice || 0})</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Assign Worker</label>
                    <select required value={workerProfileId} onChange={e => setWorkerProfileId(e.target.value)} className="w-full border border-gray-300 rounded p-2">
                      <option value="">-- Select Worker --</option>
                      {Array.isArray(workers) && workers.map(w => (
                        <option key={w?.id} value={w?.id}>{w?.user?.profile?.firstName || 'Unknown'} {w?.user?.profile?.lastName || 'Worker'}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                    <button type="button" onClick={() => setShowWalkInModal(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded">Cancel</button>
                    <button type="submit" disabled={loadingWalkIn} className="px-4 py-2 bg-rose-600 text-white font-bold rounded hover:bg-rose-700 disabled:opacity-50">
                      {loadingWalkIn ? 'Processing...' : 'Check-In & Generate QR'}
                    </button>
                  </div>
                </form>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default ReceptionDashboardPage;
