import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../api/axios';

const CustomerDashboardPage = () => {
  const { user } = useAuthStore();

  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ['customer-dashboard'],
    queryFn: async () => {
      const res = await api.get('/customer-portal/dashboard');
      return res.data.data;
    }
  });

  const upcomingAppointments = dashboardData?.upcomingAppointments || [];
  const walletBalance = dashboardData?.walletBalance || 0;
  const loyaltyPoints = dashboardData?.loyaltyPoints || 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.profile?.firstName || 'Guest'}!</h1>
        <p className="text-gray-500 mt-2">Here is your upcoming schedule and salon activity.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Upcoming Appointments</h2>
        </div>
        <div className="p-6">
          {isLoading ? (
            <p className="text-center text-gray-500 py-4">Loading your schedule...</p>
          ) : upcomingAppointments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">You have no upcoming appointments.</p>
              <Link to="/directory" className="bg-pink-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-pink-700 transition">
                Book an Appointment
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingAppointments.map(app => (
                <div key={app.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-gray-200 rounded-xl hover:border-pink-300 transition">
                  <div className="flex items-start space-x-4">
                    <div className="bg-pink-100 text-pink-700 rounded-lg p-3 text-center min-w-[70px]">
                      <p className="text-xs font-bold uppercase">{new Date(app.date).toLocaleDateString('en-US', { month: 'short' })}</p>
                      <p className="text-xl font-black">{new Date(app.date).getDate()}</p>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">
                        {app.services?.map(s => s.service.name).join(', ') || 'Appointment'}
                      </h3>
                      <p className="text-sm text-gray-500">{app.tenant?.name} • {new Date(app.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      <span className="inline-block mt-1 bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded-full">{app.status}</span>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-0 flex gap-2">
                    {app.status !== 'CANCELLED' && app.status !== 'COMPLETED' && (
                      <button 
                        onClick={async () => {
                          if (window.confirm('Are you sure you want to cancel this appointment?')) {
                            try {
                              await api.post(`/customer-portal/bookings/${app.id}/cancel`);
                              refetch();
                            } catch (err) {
                              alert(err.response?.data?.error?.message || 'Failed to cancel appointment');
                            }
                          }
                        }}
                        className="text-sm font-medium text-red-600 hover:text-red-800 bg-red-50 px-4 py-2 rounded-lg"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Wallet & Loyalty</h3>
            <p className="text-sm text-gray-500 mb-6">Earn points on every visit and redeem for services.</p>
            <div className="flex items-center space-x-2 mb-6">
              <span className="text-4xl text-pink-600 font-bold">{loyaltyPoints}</span>
              <span className="text-gray-500 font-medium">Points</span>
            </div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xl text-green-600 font-bold">${walletBalance.toFixed(2)}</span>
              <span className="text-gray-500 font-medium">Balance</span>
            </div>
          </div>
          <Link to="/customer/wallet" className="text-pink-600 font-semibold hover:text-pink-800 text-sm mt-4">View Details →</Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Favorite Salons</h3>
            <p className="text-sm text-gray-500 mb-6">Quickly book with your preferred stylists.</p>
            <div className="flex space-x-4 mb-6">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl">✂️</div>
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl text-gray-400">+</div>
            </div>
          </div>
          <Link to="/directory" className="text-pink-600 font-semibold hover:text-pink-800 text-sm">Find more salons →</Link>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboardPage;
