import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { Wallet, Smartphone, Banknote, CreditCard, ExternalLink } from 'lucide-react';
import api from '../api/axios';
import StripeCheckout from '../components/pos/StripeCheckout';

// Load Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_dummy');

const loadRazorpay = () => new Promise((resolve) => {
  if (window.Razorpay) return resolve(true);
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

const POSPage = () => {
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [activeInvoice, setActiveInvoice] = useState(null);
  
  // Payment states
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH, STRIPE, RAZORPAY, UPI, WALLET
  const [clientSecret, setClientSecret] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: appointments, isLoading: loadingAppointments, refetch } = useQuery({
    queryKey: ['appointments-today'],
    queryFn: async () => {
      const date = new Date().toISOString().split('T')[0];
      const res = await api.get(`/bookings?date=${date}`);
      return res.data;
    }
  });

  const handleStartCheckout = async () => {
    try {
      setIsProcessing(true);
      const res = await api.post('/pos/checkout/start', {
        appointmentId: selectedAppointmentId
      });
      setActiveInvoice(res.data.data);
      // Determine remaining amount based on invoice data if partials existed, otherwise grandTotal
      const amountDue = res.data.data.grandTotal || 0;
      setPaymentAmount(amountDue.toString());
      setIsProcessing(false);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to start checkout');
      setIsProcessing(false);
    }
  };

  const handleDirectPayment = async (method) => {
    try {
      setIsProcessing(true);
      await api.post('/pos/payments', {
        invoiceId: activeInvoice.id,
        amount: parseFloat(paymentAmount),
        method: method
      });
      alert(`Payment via ${method} recorded successfully!`);
      setActiveInvoice(null);
      setSelectedAppointmentId(null);
      setClientSecret(null);
      refetch();
    } catch (err) {
      alert(err.response?.data?.error?.message || `Failed to process ${method} payment`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStripePayment = async () => {
    try {
      setIsProcessing(true);
      const res = await api.post('/pos/payments/intent', {
        invoiceId: activeInvoice.id,
        amount: parseFloat(paymentAmount),
        gateway: 'STRIPE'
      });
      setClientSecret(res.data.data.clientSecret);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to initialize card payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRazorpayPayment = async () => {
    try {
      setIsProcessing(true);
      const res = await api.post('/pos/payments/intent', {
        invoiceId: activeInvoice.id,
        amount: parseFloat(paymentAmount),
        gateway: 'RAZORPAY'
      });
      const data = res.data.data;
      
      const loaded = await loadRazorpay();
      if (!loaded) {
        alert("Razorpay SDK failed to load");
        setIsProcessing(false);
        return;
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY || 'rzp_test_dummy',
        amount: Math.round(parseFloat(paymentAmount) * 100), // Note: amount in paise, fallback calculated here
        currency: data.currency || "INR",
        name: "SalonOS Integration",
        description: `Payment for Invoice ${activeInvoice.id}`,
        order_id: data.orderId, // Should come from backend if configured properly
        handler: function (response) {
            alert('Razorpay Payment successful! ID: ' + response.razorpay_payment_id);
            // In a real flow, we'd hit a webhook/callback endpoint, but we simulate success here.
            setActiveInvoice(null);
            setSelectedAppointmentId(null);
            refetch();
        },
        prefill: {
            name: activeInvoice.appointment?.customer?.firstName || "Customer",
        },
        theme: {
            color: "#6366f1" // indigo-500
        }
      };
      
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response){
        alert(response.error.description);
      });
      rzp.open();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to initialize Razorpay');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSubmit = () => {
    if (!paymentAmount || isNaN(paymentAmount) || parseFloat(paymentAmount) <= 0) {
      alert("Please enter a valid payment amount");
      return;
    }
    
    switch (paymentMethod) {
      case 'CASH':
      case 'UPI':
      case 'WALLET':
        handleDirectPayment(paymentMethod);
        break;
      case 'STRIPE':
        handleStripePayment();
        break;
      case 'RAZORPAY':
        handleRazorpayPayment();
        break;
      default:
        break;
    }
  };

  const onStripeSuccess = () => {
    alert('Payment successful!');
    setClientSecret(null);
    setActiveInvoice(null);
    setSelectedAppointmentId(null);
    refetch();
  };

  return (
    <div className="p-4 md:p-8 h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6 bg-gray-50/50">
      
      {/* Left Panel: Appointments List */}
      <div className="w-full md:w-1/3 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0">
          <h2 className="font-extrabold text-gray-900 text-lg">Today's Queue</h2>
          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full uppercase tracking-wider">Active</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
          {loadingAppointments ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <div className="text-sm text-gray-500 font-medium">Loading queue...</div>
            </div>
          ) : (
            appointments?.data?.filter(a => ['COMPLETED', 'PENDING', 'IN_PROGRESS'].includes(a.status)).map(app => (
              <div 
                key={app.id} 
                onClick={() => {
                  setSelectedAppointmentId(app.id);
                  setActiveInvoice(null);
                  setClientSecret(null);
                  setPaymentMethod('CASH');
                }}
                className={`p-4 rounded-xl cursor-pointer transition-all border shadow-sm hover:shadow-md ${
                  selectedAppointmentId === app.id 
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                    : 'border-gray-100 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">{app.customer?.firstName} {app.customer?.lastName}</span>
                  <span className="text-sm font-extrabold text-primary">${app.totalPrice?.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${
                    app.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                    app.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {app.status}
                  </span>
                  <span className="text-xs text-gray-500">{app.services?.length || 0} services</span>
                </div>
              </div>
            ))
          )}
          {appointments?.data?.length === 0 && (
            <div className="text-center text-sm text-gray-400 mt-10">No appointments for today.</div>
          )}
        </div>
      </div>

      {/* Right Panel: POS Cart */}
      <div className="w-full md:w-2/3 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col relative overflow-hidden h-full">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white/50 backdrop-blur-sm">
          <h2 className="font-extrabold text-gray-900 text-lg">Checkout Terminal</h2>
        </div>

        {selectedAppointmentId ? (() => {
          const appointment = appointments?.data?.find(a => a.id === selectedAppointmentId);
          if (!appointment) return null;
          
          return (
          <>
            <div className="flex-1 p-6 overflow-y-auto bg-gray-50/30">
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Service Details</h3>
                <div className="space-y-4">
                  {appointment.services?.map(s => (
                    <div key={s.id} className="flex justify-between items-center border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                      <div>
                        <h4 className="font-bold text-gray-800">{s.service?.name}</h4>
                        <p className="text-[11px] text-gray-500 font-medium">By {s.worker?.user?.profile?.firstName}</p>
                      </div>
                      <div className="font-bold text-gray-900">${s.price?.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white border-t border-gray-100 p-6 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
              {!activeInvoice ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-end mb-4">
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Estimated Total</span>
                    <span className="text-3xl font-extrabold text-gray-900">${appointment.totalPrice?.toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={handleStartCheckout}
                    disabled={isProcessing}
                    className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors shadow-md flex justify-center items-center gap-2 active:scale-[0.99] disabled:opacity-70"
                  >
                    {isProcessing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : null}
                    {isProcessing ? 'Generating Invoice...' : 'Proceed to Checkout'}
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <span className="font-bold text-gray-600">Amount Due</span>
                    <span className="text-2xl font-extrabold text-primary">${activeInvoice.grandTotal?.toFixed(2)}</span>
                  </div>
                  
                  {!clientSecret ? (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Payment Amount (Partial Supported)</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                          <input 
                            type="number" 
                            step="0.01"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-gray-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Payment Method</label>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          <button onClick={() => setPaymentMethod('CASH')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${paymentMethod === 'CASH' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}>
                            <Banknote className="w-6 h-6 mb-1" />
                            <span className="text-[10px] font-bold">Cash</span>
                          </button>
                          <button onClick={() => setPaymentMethod('STRIPE')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${paymentMethod === 'STRIPE' ? 'border-[#635BFF] bg-[#635BFF]/5 text-[#635BFF]' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}>
                            <CreditCard className="w-6 h-6 mb-1" />
                            <span className="text-[10px] font-bold">Stripe</span>
                          </button>
                          <button onClick={() => setPaymentMethod('RAZORPAY')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${paymentMethod === 'RAZORPAY' ? 'border-[#3399cc] bg-[#3399cc]/5 text-[#3399cc]' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}>
                            <ExternalLink className="w-6 h-6 mb-1" />
                            <span className="text-[10px] font-bold">Razorpay</span>
                          </button>
                          <button onClick={() => setPaymentMethod('UPI')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${paymentMethod === 'UPI' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}>
                            <Smartphone className="w-6 h-6 mb-1" />
                            <span className="text-[10px] font-bold">UPI Apps</span>
                          </button>
                          <button onClick={() => setPaymentMethod('WALLET')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${paymentMethod === 'WALLET' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}>
                            <Wallet className="w-6 h-6 mb-1" />
                            <span className="text-[10px] font-bold">Wallet</span>
                          </button>
                        </div>
                      </div>
                      
                      <button 
                        onClick={handlePaymentSubmit}
                        disabled={isProcessing}
                        className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:bg-opacity-90 transition-all flex justify-center items-center gap-2 active:scale-[0.99] disabled:opacity-70"
                      >
                        {isProcessing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : null}
                        {isProcessing ? 'Processing...' : `Pay $${paymentAmount} via ${paymentMethod}`}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-gray-800">Complete Stripe Payment</h4>
                        <button onClick={() => setClientSecret(null)} className="text-xs font-bold text-gray-500 hover:text-gray-800">Cancel</button>
                      </div>
                      <Elements stripe={stripePromise} options={{ clientSecret }}>
                        <StripeCheckout 
                          clientSecret={clientSecret} 
                          invoiceId={activeInvoice.id} 
                          amount={parseFloat(paymentAmount)}
                          onPaymentSuccess={onStripeSuccess}
                          onCancel={() => setClientSecret(null)}
                        />
                      </Elements>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
          );
        })() : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
            <CreditCard className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-medium text-center">Select an appointment from the queue<br/>to begin checkout processing.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default POSPage;

