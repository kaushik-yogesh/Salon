import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

const ClientBookingPage = () => {
  const { tenantId } = useParams();
  const [step, setStep] = useState(1); // 1: Service, 2: Provider, 3: Details, 4: Success
  const [bookingData, setBookingData] = useState({
    serviceId: null,
    workerProfileId: 'any', // simplified for demo
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });

  const { data: catalogData, isLoading: isCatalogLoading } = useQuery({
    queryKey: ['public-catalog', tenantId],
    queryFn: async () => {
      const res = await api.get(`/public/${tenantId}/catalog`);
      return res.data;
    }
  });

  const { data: workersData } = useQuery({
    queryKey: ['public-workers', tenantId],
    queryFn: async () => {
      const res = await api.get(`/public/${tenantId}/workers`);
      return res.data;
    }
  });

  // Fetch branches from the directory endpoint (filter by tenantId)
  const { data: salonsData } = useQuery({
    queryKey: ['public-salons'],
    queryFn: async () => {
      const res = await api.get('/public/salons');
      return res.data;
    }
  });

  const categories = catalogData?.data || [];
  const workers = workersData?.data || [];
  const currentSalon = salonsData?.data?.find(s => s.id === tenantId);
  const branchId = currentSalon?.branches?.[0]?.id || currentSalon?.location; // Note: we need to update getPublicSalons to return branches array

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/public/${tenantId}/book`, {
        ...bookingData,
        branchId: branchId,
        workerProfileId: workers[0]?.id // Pick first available worker for now
      });
      setStep(4);
    } catch (error) {
      console.error('Booking failed', error);
      alert('Booking failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-2xl w-full rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="bg-secondary text-white p-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Book Your Appointment</h1>
          <p className="text-gray-400 mt-1">Luxe Salon & Spa</p>
        </div>

        {/* Progress Bar */}
        <div className="flex border-b border-gray-100">
          {[1, 2, 3].map(s => (
            <div key={s} className={`flex-1 h-1 ${step >= s ? 'bg-primary' : 'bg-gray-100'}`} />
          ))}
        </div>

        {/* Form Content */}
        <div className="p-8">
          
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-xl font-bold text-secondary mb-4">Step 1: Select Service</h2>
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
                          className="p-4 border-2 border-gray-100 rounded-xl hover:border-primary cursor-pointer transition flex justify-between items-center"
                        >
                          <div>
                            <h4 className="font-semibold text-gray-800">{service.name}</h4>
                            <p className="text-sm text-gray-500">{service.baseDuration} mins</p>
                          </div>
                          <span className="font-bold text-primary">${service.basePrice}</span>
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
              <h2 className="text-xl font-bold text-secondary mb-4">Step 2: Date & Time</h2>
              <input 
                type="date" 
                value={bookingData.date}
                onChange={e => setBookingData(d => ({ ...d, date: e.target.value }))}
                className="w-full border-2 border-gray-200 rounded-lg p-3 focus:outline-none focus:border-primary mb-4"
              />
              <div className="grid grid-cols-3 gap-3">
                {['09:00', '10:00', '11:00', '13:00', '14:00', '15:00'].map(time => (
                  <button 
                    key={time}
                    onClick={() => { setBookingData(d => ({ ...d, startTime: time })); handleNext(); }}
                    className="py-2 border-2 border-gray-200 rounded-lg font-medium text-gray-600 hover:border-primary hover:text-primary transition"
                  >
                    {time}
                  </button>
                ))}
              </div>
              <button onClick={handleBack} className="mt-4 text-sm font-medium text-gray-500 hover:text-gray-800">← Back</button>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h2 className="text-xl font-bold text-secondary mb-4">Step 3: Your Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="First Name" className="border-2 border-gray-200 rounded-lg p-3 focus:outline-none focus:border-primary" onChange={e => setBookingData(d => ({...d, firstName: e.target.value}))} />
                <input required placeholder="Last Name" className="border-2 border-gray-200 rounded-lg p-3 focus:outline-none focus:border-primary" onChange={e => setBookingData(d => ({...d, lastName: e.target.value}))} />
              </div>
              <input required type="email" placeholder="Email Address" className="w-full border-2 border-gray-200 rounded-lg p-3 focus:outline-none focus:border-primary" onChange={e => setBookingData(d => ({...d, email: e.target.value}))} />
              <input required type="tel" placeholder="Phone Number" className="w-full border-2 border-gray-200 rounded-lg p-3 focus:outline-none focus:border-primary" onChange={e => setBookingData(d => ({...d, phone: e.target.value}))} />
              
              <div className="pt-4 flex justify-between items-center">
                <button type="button" onClick={handleBack} className="text-sm font-medium text-gray-500 hover:text-gray-800">← Back</button>
                <button type="submit" className="bg-primary text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl hover:bg-opacity-90 transition">
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
              <h2 className="text-3xl font-bold text-secondary mb-2">Booking Confirmed!</h2>
              <p className="text-gray-500 mb-6">We've emailed you the confirmation details.</p>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 inline-block text-left">
                <p className="text-sm text-gray-600"><span className="font-semibold">Date:</span> {bookingData.date}</p>
                <p className="text-sm text-gray-600"><span className="font-semibold">Time:</span> {bookingData.startTime}</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ClientBookingPage;
