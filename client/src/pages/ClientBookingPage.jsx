import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';

const ClientBookingPage = () => {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    serviceId: null,
    workerProfileId: null,
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    notes: ''
  });

  const { data: catalogData, isLoading: isCatalogLoading } = useQuery({
    queryKey: ['directory-catalog', tenantId],
    queryFn: async () => {
      const res = await api.get(`/directory/catalog/${tenantId}`);
      return res.data;
    },
    enabled: !!tenantId
  });

  const { data: salonsData } = useQuery({
    queryKey: ['directory-salons'],
    queryFn: async () => {
      const res = await api.get('/directory/salons');
      return res.data;
    }
  });

  const categories = catalogData?.data?.categories || [];
  const workers = catalogData?.data?.workers || [];
  const currentSalon = salonsData?.data?.salons?.find(s => s.id === tenantId);
  const branchId = currentSalon?.branches?.[0]?.id;

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      alert('Please log in to complete your booking.');
      navigate('/login');
      return;
    }

    try {
      // Create a combined datetime string
      const dateTime = new Date(`${bookingData.date}T${bookingData.startTime}:00`).toISOString();

      await api.post('/customer-portal/bookings', {
        tenantId,
        branchId,
        date: dateTime,
        notes: bookingData.notes,
        services: [{
          serviceId: bookingData.serviceId,
          workerProfileId: bookingData.workerProfileId || workers[0]?.id
        }]
      });
      setStep(4);
    } catch (error) {
      console.error('Booking failed', error);
      alert(error.response?.data?.error?.message || 'Booking failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-2xl w-full rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="bg-pink-600 text-white p-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Book Your Appointment</h1>
          <p className="text-pink-100 mt-1">{currentSalon?.name || 'Loading Salon...'}</p>
        </div>

        {/* Progress Bar */}
        <div className="flex border-b border-gray-100">
          {[1, 2, 3].map(s => (
            <div key={s} className={`flex-1 h-1 ${step >= s ? 'bg-pink-600' : 'bg-gray-100'}`} />
          ))}
        </div>

        {/* Form Content */}
        <div className="p-8">
          
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Step 1: Select Service</h2>
              {isCatalogLoading ? (
                <div className="text-center text-gray-500 py-8">Loading services...</div>
              ) : categories.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No services available.</div>
              ) : (
                categories.map(category => (
                  <div key={category.id} className="mb-6">
                    <h3 className="font-bold text-lg text-gray-800 mb-3">{category.name}</h3>
                    <div className="space-y-3">
                      {category.services.map(service => (
                        <div 
                          key={service.id}
                          onClick={() => { setBookingData(d => ({ ...d, serviceId: service.id })); handleNext(); }}
                          className={`p-4 border-2 rounded-xl cursor-pointer transition flex justify-between items-center ${bookingData.serviceId === service.id ? 'border-pink-500 bg-pink-50' : 'border-gray-100 hover:border-pink-300'}`}
                        >
                          <div>
                            <h4 className="font-semibold text-gray-800">{service.name}</h4>
                            <p className="text-sm text-gray-500">{service.baseDuration} mins</p>
                          </div>
                          <span className="font-bold text-pink-600">${service.basePrice}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Step 2: Date & Time</h2>
              <input 
                type="date" 
                min={new Date().toISOString().split('T')[0]}
                value={bookingData.date}
                onChange={e => setBookingData(d => ({ ...d, date: e.target.value }))}
                className="w-full border-2 border-gray-200 rounded-lg p-3 focus:outline-none focus:border-pink-500 mb-4"
              />
              <div className="grid grid-cols-3 gap-3">
                {['09:00', '10:00', '11:00', '13:00', '14:00', '15:00'].map(time => {
                  const isToday = bookingData.date === new Date().toISOString().split('T')[0];
                  const [hours, minutes] = time.split(':').map(Number);
                  const slotTime = new Date();
                  slotTime.setHours(hours, minutes, 0, 0);
                  const isPast = isToday && slotTime < new Date();
                  
                  return (
                    <button 
                      key={time}
                      disabled={isPast}
                      onClick={() => { setBookingData(d => ({ ...d, startTime: time })); handleNext(); }}
                      className={`py-2 border-2 rounded-lg font-medium transition ${bookingData.startTime === time ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-600 hover:border-pink-300'} ${isPast ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4">
                 <h3 className="font-bold text-sm text-gray-700 mb-2">Select Provider (Optional)</h3>
                 <select 
                   className="w-full border-2 border-gray-200 rounded-lg p-3 focus:outline-none focus:border-pink-500"
                   value={bookingData.workerProfileId || ''}
                   onChange={e => setBookingData(d => ({ ...d, workerProfileId: e.target.value }))}
                 >
                   <option value="">No Preference</option>
                   {workers.map(w => (
                     <option key={w.id} value={w.id}>{w.user?.profile?.firstName} {w.user?.profile?.lastName}</option>
                   ))}
                 </select>
              </div>
              <button onClick={handleBack} className="mt-4 text-sm font-medium text-gray-500 hover:text-gray-800">← Back</button>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Step 3: Confirmation</h2>
              {!isAuthenticated && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                  <p className="text-sm text-yellow-700">You need to log in to complete this booking.</p>
                  <Link to="/login" className="inline-block mt-2 text-sm font-bold text-yellow-800 hover:underline">Log in now →</Link>
                </div>
              )}
              
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
                 <h3 className="font-bold text-gray-800 border-b pb-2 mb-2">Booking Summary</h3>
                 <p className="text-sm text-gray-600 mb-1"><span className="font-semibold">Salon:</span> {currentSalon?.name}</p>
                 <p className="text-sm text-gray-600 mb-1"><span className="font-semibold">Date:</span> {bookingData.date}</p>
                 <p className="text-sm text-gray-600 mb-1"><span className="font-semibold">Time:</span> {bookingData.startTime}</p>
              </div>

              <textarea 
                placeholder="Any special requests or notes? (Optional)" 
                className="w-full border-2 border-gray-200 rounded-lg p-3 focus:outline-none focus:border-pink-500" 
                rows="3"
                onChange={e => setBookingData(d => ({...d, notes: e.target.value}))}
              ></textarea>
              
              <div className="pt-4 flex justify-between items-center">
                <button type="button" onClick={handleBack} className="text-sm font-medium text-gray-500 hover:text-gray-800">← Back</button>
                <button type="submit" disabled={!isAuthenticated} className="bg-pink-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:bg-pink-700 transition disabled:opacity-50">
                  Confirm Booking
                </button>
              </div>
            </form>
          )}

          {step === 4 && (
            <div className="text-center py-8 animate-in zoom-in">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
              <p className="text-gray-500 mb-6">Your appointment has been successfully scheduled.</p>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 inline-block text-left mb-6 w-full">
                <p className="text-sm text-gray-600"><span className="font-semibold">Date:</span> {bookingData.date}</p>
                <p className="text-sm text-gray-600"><span className="font-semibold">Time:</span> {bookingData.startTime}</p>
              </div>
              <div>
                <Link to="/customer/dashboard" className="text-pink-600 font-bold hover:underline">Go to Dashboard →</Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ClientBookingPage;
