import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../api/axios';
import { Scissors } from 'lucide-react';

const ClientBookingPage = () => {
  const { tenantId } = useParams();
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    serviceId: null,
    serviceName: '',
    servicePrice: 0,
    workerProfileId: null,
    workerName: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '11:00',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    notes: ''
  });

  const { data: tenantData, isLoading: tenantLoading } = useQuery({
    queryKey: ['public-tenant', tenantId],
    queryFn: async () => {
      const res = await api.get(`/public/tenant/${tenantId}`);
      return res.data?.data;
    }
  });

  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: ['public-catalog', tenantId],
    queryFn: async () => {
      const res = await api.get(`/public/tenant/${tenantId}/catalog`);
      return res.data?.data || [];
    }
  });

  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['public-staff', tenantId],
    queryFn: async () => {
      const res = await api.get(`/public/tenant/${tenantId}/staff`);
      return res.data?.data || [];
    }
  });

  const createBooking = useMutation({
    mutationFn: async (data) => api.post(`/public/tenant/${tenantId}/bookings`, data),
    onSuccess: () => {
      setStep(5);
    },
    onError: (err) => {
      alert(err.response?.data?.error?.message || 'Failed to book appointment');
    }
  });

  if (tenantLoading || catalogLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  const tenant = tenantData;
  const categories = catalogData;
  const staff = staffData;

  const primaryColor = tenant?.primaryColor || '#4f46e5';

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Calculate rough end time (add 60 mins for now as default if not specified)
    const startDateTime = new Date(`${bookingData.date}T${bookingData.startTime}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60000);

    createBooking.mutate({
      firstName: bookingData.firstName,
      lastName: bookingData.lastName,
      phone: bookingData.phone,
      email: bookingData.email,
      date: startDateTime.toISOString(),
      services: [{
        serviceId: bookingData.serviceId,
        workerProfileId: bookingData.workerProfileId || null,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        price: bookingData.servicePrice
      }]
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 py-12">
      <div className="bg-white max-w-3xl w-full rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="p-8 text-center text-white relative overflow-hidden" style={{ backgroundColor: primaryColor }}>
          <div className="absolute top-0 right-0 opacity-10">
            <Scissors className="w-64 h-64 -mr-16 -mt-16 transform rotate-45" />
          </div>
          <div className="relative z-10">
            {tenant?.logoUrl && <img src={tenant.logoUrl} alt="Logo" className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-white shadow-md object-cover bg-white" />}
            <h1 className="text-3xl font-black tracking-tight">{tenant?.name || 'Salon'}</h1>
            <p className="mt-2 opacity-90 font-medium">Book Your Appointment Online</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex border-b border-gray-100">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex-1 h-1.5 transition-all duration-300" style={{ backgroundColor: step >= s ? primaryColor : '#f3f4f6' }} />
          ))}
        </div>

        {/* Form Content */}
        <div className="p-8">
          
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Select a Service</h2>
                <p className="text-gray-500 mt-1">Choose the service you'd like to book.</p>
              </div>

              {categories.length === 0 ? (
                <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-xl">No services available for online booking.</div>
              ) : (
                <div className="space-y-8">
                  {categories.map(category => (
                    <div key={category.id}>
                      <h3 className="font-bold text-lg text-gray-900 mb-4 pb-2 border-b">{category.name}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {category.services.map(service => (
                          <div 
                            key={service.id}
                            onClick={() => { 
                              setBookingData(d => ({ ...d, serviceId: service.id, serviceName: service.name, servicePrice: service.basePrice })); 
                              handleNext(); 
                            }}
                            className={`p-5 border-2 rounded-xl cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md flex justify-between items-center bg-white ${bookingData.serviceId === service.id ? 'shadow-md scale-[1.02]' : 'border-gray-100'}`}
                            style={{ borderColor: bookingData.serviceId === service.id ? primaryColor : undefined }}
                          >
                            <div>
                              <h4 className="font-bold text-gray-900">{service.name}</h4>
                              <p className="text-sm text-gray-500 mt-1">{service.baseDuration} mins</p>
                            </div>
                            <span className="font-black text-lg" style={{ color: primaryColor }}>${service.basePrice}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Select a Provider</h2>
                  <p className="text-gray-500 mt-1">Choose who you want to book with.</p>
                </div>
                <button onClick={handleBack} className="text-sm font-bold text-gray-500 hover:text-gray-800 bg-gray-100 px-3 py-1 rounded-full">← Back</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  onClick={() => { setBookingData(d => ({ ...d, workerProfileId: null, workerName: 'No Preference' })); handleNext(); }}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all flex items-center gap-4 ${!bookingData.workerProfileId ? 'shadow-md' : 'border-gray-100'}`}
                  style={{ borderColor: !bookingData.workerProfileId ? primaryColor : undefined }}
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                    <Scissors className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">No Preference</h4>
                    <p className="text-sm text-gray-500">Any available staff</p>
                  </div>
                </div>

                {staff?.map(w => (
                  <div 
                    key={w.id}
                    onClick={() => { setBookingData(d => ({ ...d, workerProfileId: w.id, workerName: `${w.user.profile.firstName} ${w.user.profile.lastName}` })); handleNext(); }}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all flex items-center gap-4 ${bookingData.workerProfileId === w.id ? 'shadow-md' : 'border-gray-100 hover:border-gray-300'}`}
                    style={{ borderColor: bookingData.workerProfileId === w.id ? primaryColor : undefined }}
                  >
                    <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                       <img src={`https://ui-avatars.com/api/?name=${w.user.profile.firstName}+${w.user.profile.lastName}&background=random`} alt="avatar" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{w.user.profile.firstName} {w.user.profile.lastName}</h4>
                      <p className="text-sm text-gray-500">{w.specializations?.join(', ') || 'Stylist'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Date & Time</h2>
                  <p className="text-gray-500 mt-1">When would you like to come in?</p>
                </div>
                <button onClick={handleBack} className="text-sm font-bold text-gray-500 hover:text-gray-800 bg-gray-100 px-3 py-1 rounded-full">← Back</button>
              </div>

              <div>
                <input 
                  type="date" 
                  min={new Date().toISOString().split('T')[0]}
                  value={bookingData.date}
                  onChange={e => setBookingData(d => ({ ...d, date: e.target.value }))}
                  className="w-full border-2 border-gray-200 rounded-xl p-4 focus:outline-none font-bold text-lg mb-6 bg-gray-50"
                  style={{ focusBorderColor: primaryColor }}
                />
                
                <h3 className="font-bold text-gray-900 mb-3">Available Times</h3>
                <div className="grid grid-cols-3 gap-3">
                  {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'].map(time => {
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
                        className={`py-3 border-2 rounded-xl font-bold transition-all ${bookingData.startTime === time ? 'text-white shadow-md' : 'border-gray-200 text-gray-700 hover:border-gray-300'} ${isPast ? 'opacity-30 cursor-not-allowed bg-gray-100' : 'bg-white'}`}
                        style={{ 
                          borderColor: bookingData.startTime === time ? primaryColor : undefined,
                          backgroundColor: bookingData.startTime === time ? primaryColor : undefined 
                        }}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Your Details</h2>
                  <p className="text-gray-500 mt-1">Almost done! We just need your info.</p>
                </div>
                <button type="button" onClick={handleBack} className="text-sm font-bold text-gray-500 hover:text-gray-800 bg-gray-100 px-3 py-1 rounded-full">← Back</button>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
                 <div>
                   <h3 className="font-bold text-gray-900 text-lg">{bookingData.serviceName}</h3>
                   <p className="text-sm text-gray-500">with {bookingData.workerName || 'Any Staff'}</p>
                 </div>
                 <div className="text-right">
                   <p className="font-black text-xl text-gray-900">${bookingData.servicePrice}</p>
                   <p className="text-sm font-bold" style={{ color: primaryColor }}>
                     {new Date(bookingData.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {bookingData.startTime}
                   </p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">First Name *</label>
                  <input required type="text" value={bookingData.firstName} onChange={e => setBookingData(d => ({...d, firstName: e.target.value}))} className="w-full border-2 border-gray-200 rounded-xl p-3 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Last Name *</label>
                  <input required type="text" value={bookingData.lastName} onChange={e => setBookingData(d => ({...d, lastName: e.target.value}))} className="w-full border-2 border-gray-200 rounded-xl p-3 focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number *</label>
                  <input required type="tel" value={bookingData.phone} onChange={e => setBookingData(d => ({...d, phone: e.target.value}))} className="w-full border-2 border-gray-200 rounded-xl p-3 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                  <input type="email" value={bookingData.email} onChange={e => setBookingData(d => ({...d, email: e.target.value}))} className="w-full border-2 border-gray-200 rounded-xl p-3 focus:outline-none" />
                </div>
              </div>
              
              <div className="pt-6">
                <button type="submit" disabled={createBooking.isPending} className="w-full text-white font-black py-4 rounded-xl shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100" style={{ backgroundColor: primaryColor }}>
                  {createBooking.isPending ? 'Processing...' : 'Confirm Booking'}
                </button>
                <p className="text-center text-xs text-gray-400 mt-4">By booking, you agree to our cancellation policy.</p>
              </div>
            </form>
          )}

          {step === 5 && (
            <div className="text-center py-12 animate-in zoom-in">
              <div className="w-24 h-24 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl" style={{ backgroundColor: primaryColor }}>
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h2 className="text-4xl font-black text-gray-900 mb-4">You're Booked!</h2>
              <p className="text-gray-500 text-lg mb-8 max-w-md mx-auto">Your appointment request has been sent to the salon. You will receive a confirmation message shortly.</p>
              
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 inline-block text-left mb-8 w-full max-w-sm mx-auto shadow-sm">
                <div className="flex justify-between mb-4 pb-4 border-b border-gray-200">
                  <span className="text-gray-500 font-medium">Service</span>
                  <span className="font-bold text-gray-900">{bookingData.serviceName}</span>
                </div>
                <div className="flex justify-between mb-4 pb-4 border-b border-gray-200">
                  <span className="text-gray-500 font-medium">Date</span>
                  <span className="font-bold text-gray-900">{new Date(bookingData.date).toLocaleDateString()} at {bookingData.startTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Location</span>
                  <span className="font-bold text-gray-900">{tenant?.name}</span>
                </div>
              </div>
              
              <div>
                <button onClick={() => window.location.reload()} className="font-bold hover:underline" style={{ color: primaryColor }}>Book Another Appointment</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ClientBookingPage;
