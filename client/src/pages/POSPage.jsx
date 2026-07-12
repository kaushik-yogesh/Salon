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
  
  // Retail Walk-in States
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [cart, setCart] = useState([]); // Array of { product, quantity }
  const [searchQuery, setSearchQuery] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');

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

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res = await api.get('/inventory');
      return res.data;
    }
  });

  const products = inventoryData?.data || [];
  const defaultBranchId = products.length > 0 ? products[0].branchId : 'c031c19b-c49b-4497-a790-281b3d5b00c6';

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleStartCheckout = async () => {
    try {
      setIsProcessing(true);
      let payload = {};
      if (isWalkIn) {
        payload = {
          branchId: defaultBranchId,
          additionalProducts: cart.map(item => ({ productId: item.product.id, quantity: item.quantity })),
          discountTotal: parseFloat(discountAmount) || 0
        };
      } else {
        payload = { 
          appointmentId: selectedAppointmentId,
          discountTotal: parseFloat(discountAmount) || 0 
        };
      }
      const res = await api.post('/pos/checkout/start', payload);
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

  const handleDirectPayment = async (method, extraData = {}) => {
    try {
      setIsProcessing(true);
      const res = await api.post('/pos/payments', {
        invoiceId: activeInvoice.id,
        amount: parseFloat(paymentAmount),
        method: method,
        ...extraData
      });
      alert(`Payment via ${method} recorded successfully!`);
      
      const { isFullyPaid, totalPaid } = res.data.data;
      if (isFullyPaid) {
        setActiveInvoice(null);
        setSelectedAppointmentId(null);
        setIsWalkIn(false);
        setCart([]);
        setClientSecret(null);
        refetch();
      } else {
        // Partial payment case: keep terminal open, update remaining balance
        const remaining = activeInvoice.grandTotal - totalPaid;
        setPaymentAmount(remaining > 0 ? remaining.toFixed(2) : '0');
        // Optionally fetch updated invoice here if needed
      }
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
            // After Razorpay is successful, the webhook processes it. We can optionally wait or verify it manually here by checking the invoice status.
            setActiveInvoice(null);
            setSelectedAppointmentId(null);
            setIsWalkIn(false);
            setCart([]);
            refetch();
        },
        notes: {
            invoiceId: activeInvoice.id,
            tenantId: activeInvoice.tenantId
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
      case 'GIFT_CARD':
        const extraData = {};
        if (paymentMethod === 'GIFT_CARD') {
          const code = document.getElementById('giftCardCodeInput')?.value;
          if (!code) return alert('Please enter gift card code');
          extraData.giftCardCode = code;
        }
        handleDirectPayment(paymentMethod, extraData);
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
    setIsWalkIn(false);
    setCart([]);
    refetch();
  };

  const [showGiftCardModal, setShowGiftCardModal] = useState(false);
  const [gcCode, setGcCode] = useState('');
  const [gcValue, setGcValue] = useState('');
  const [gcPurchaser, setGcPurchaser] = useState('');
  const [isCreatingGc, setIsCreatingGc] = useState(false);

  const handleCreateGiftCard = async (e) => {
    e.preventDefault();
    setIsCreatingGc(true);
    try {
      await api.post('/pos/gift-cards', {
        code: gcCode,
        initialValue: gcValue,
        purchaserName: gcPurchaser
      });
      alert('Gift Card issued successfully!');
      setShowGiftCardModal(false);
      setGcCode('');
      setGcValue('');
      setGcPurchaser('');
    } catch(err) {
      alert(err.response?.data?.error?.message || 'Failed to issue gift card');
    } finally {
      setIsCreatingGc(false);
    }
  };

  return (
    <div className="p-4 md:p-8 h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6 bg-gray-50/50">
      
      {/* Left Panel: Appointments List */}
      <div className="w-full md:w-1/3 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
        <div className="p-5 border-b border-gray-100 flex flex-col gap-3 bg-white/50 backdrop-blur-sm sticky top-0">
          <div className="flex justify-between items-center">
            <h2 className="font-extrabold text-gray-900 text-lg">Today's Queue</h2>
            <button 
              onClick={() => setShowGiftCardModal(true)}
              className="text-xs font-bold text-pink-600 bg-pink-50 hover:bg-pink-100 px-3 py-1.5 rounded-lg transition-colors border border-pink-100"
            >
              Sell Gift Card
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
          <button
            onClick={() => {
              setIsWalkIn(true);
              setSelectedAppointmentId(null);
              setActiveInvoice(null);
              setCart([]);
              setClientSecret(null);
              setPaymentMethod('CASH');
              setDiscountAmount('0');
            }}
            className={`w-full p-4 rounded-xl cursor-pointer transition-all border shadow-sm hover:shadow-md text-left ${
              isWalkIn
                ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                : 'border-gray-100 bg-white hover:border-gray-300'
            }`}
          >
            <div className="font-bold text-gray-900">Walk-in Retail Sale</div>
            <div className="text-xs text-gray-500 mt-1">Direct product purchase without appointment</div>
          </button>

          <div className="border-t border-gray-200 my-4"></div>

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
                  setIsWalkIn(false);
                  setActiveInvoice(null);
                  setClientSecret(null);
                  setPaymentMethod('CASH');
                  setDiscountAmount('0');
                }}
                className={`p-4 rounded-xl cursor-pointer transition-all border shadow-sm hover:shadow-md ${
                  selectedAppointmentId === app.id && !isWalkIn
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

        {isWalkIn ? (() => {
          const cartTotal = cart.reduce((sum, item) => sum + (item.product.retailPrice * item.quantity), 0);
          return (
          <>
            <div className="flex-1 p-6 overflow-y-auto bg-gray-50/30 flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Add Products</h3>
                <input 
                  type="text" 
                  placeholder="Search products..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded mb-4"
                />
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.includes(searchQuery)).map(p => (
                    <div key={p.id} className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded">
                      <div>
                        <div className="font-bold text-sm">{p.name}</div>
                        <div className="text-xs text-gray-500">Stock: {p.stockQuantity} | ${p.retailPrice}</div>
                      </div>
                      <button onClick={() => addToCart(p)} className="bg-primary text-white px-3 py-1 rounded text-xs font-bold hover:bg-opacity-90">Add</button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-full md:w-1/2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Cart</h3>
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm min-h-[200px]">
                  {cart.length === 0 ? <p className="text-gray-400 text-sm text-center">Cart is empty</p> : (
                    <div className="space-y-4">
                      {cart.map(item => (
                        <div key={item.product.id} className="flex justify-between items-center border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                          <div>
                            <h4 className="font-bold text-gray-800">{item.product.name}</h4>
                            <p className="text-[11px] text-gray-500 font-medium">Qty: {item.quantity} x ${item.product.retailPrice}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="font-bold text-gray-900">${(item.quantity * item.product.retailPrice).toFixed(2)}</div>
                            <button onClick={() => removeFromCart(item.product.id)} className="text-red-500 font-bold text-xs">Remove</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white border-t border-gray-100 p-6 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
              {!activeInvoice ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2 text-sm text-gray-500">
                    <span>Subtotal</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-4 text-sm text-gray-500">
                    <span className="font-bold uppercase tracking-wider">Manual Discount</span>
                    <input 
                      type="number"
                      step="0.01"
                      min="0"
                      value={discountAmount}
                      onChange={e => setDiscountAmount(e.target.value)}
                      className="w-24 text-right border-b border-gray-300 focus:border-primary outline-none text-gray-900 bg-transparent font-bold"
                    />
                  </div>
                  <div className="flex justify-between items-end mb-4 pt-4 border-t border-gray-100">
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Estimated Total</span>
                    <span className="text-3xl font-extrabold text-gray-900">${Math.max(0, cartTotal - (parseFloat(discountAmount) || 0)).toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={handleStartCheckout}
                    disabled={isProcessing || cart.length === 0}
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
                          <button onClick={() => setPaymentMethod('WALLET')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${paymentMethod === 'WALLET' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}>
                            <Wallet className="w-6 h-6 mb-1" />
                            <span className="text-[10px] font-bold">Wallet</span>
                          </button>
                          <button onClick={() => setPaymentMethod('GIFT_CARD')} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${paymentMethod === 'GIFT_CARD' ? 'border-pink-500 bg-pink-50 text-pink-600' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}>
                            <Gift className="w-6 h-6 mb-1" />
                            <span className="text-[10px] font-bold">Gift Card</span>
                          </button>
                        </div>
                      </div>

                      {paymentMethod === 'GIFT_CARD' && (
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Gift Card Code</label>
                          <input 
                            type="text"
                            placeholder="Enter 16-digit code"
                            id="giftCardCodeInput"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all font-bold text-gray-900"
                          />
                        </div>
                      )}
                      
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
        })() : selectedAppointmentId ? (() => {
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
                  <div className="flex justify-between items-center mb-2 text-sm text-gray-500">
                    <span>Subtotal</span>
                    <span>${appointment.totalPrice?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-4 text-sm text-gray-500">
                    <span className="font-bold uppercase tracking-wider">Manual Discount</span>
                    <input 
                      type="number"
                      step="0.01"
                      min="0"
                      value={discountAmount}
                      onChange={e => setDiscountAmount(e.target.value)}
                      className="w-24 text-right border-b border-gray-300 focus:border-primary outline-none text-gray-900 bg-transparent font-bold"
                    />
                  </div>
                  <div className="flex justify-between items-end mb-4 pt-4 border-t border-gray-100">
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Estimated Total</span>
                    <span className="text-3xl font-extrabold text-gray-900">${Math.max(0, (appointment.totalPrice || 0) - (parseFloat(discountAmount) || 0)).toFixed(2)}</span>
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

      {/* Gift Card Modal */}
      {showGiftCardModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Sell Gift Card</h3>
                <p className="text-sm text-gray-500">Issue a new digital gift card code</p>
              </div>
            </div>
            
            <form onSubmit={handleCreateGiftCard} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">16-Digit Code</label>
                <div className="flex gap-2">
                  <input required type="text" value={gcCode} onChange={e => setGcCode(e.target.value)} placeholder="e.g. 4839-XXXX-XXXX-XXXX" className="w-full border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none font-mono" />
                  <button type="button" onClick={() => setGcCode(Math.random().toString(36).substring(2, 18).toUpperCase())} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 rounded-xl text-sm font-bold">Auto</button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Value Amount ($)</label>
                <input required type="number" step="0.01" min="1" value={gcValue} onChange={e => setGcValue(e.target.value)} placeholder="50.00" className="w-full border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Purchaser Name (Optional)</label>
                <input type="text" value={gcPurchaser} onChange={e => setGcPurchaser(e.target.value)} placeholder="John Doe" className="w-full border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none" />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowGiftCardModal(false)} className="flex-1 py-3 text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl font-bold">Cancel</button>
                <button type="submit" disabled={isCreatingGc} className="flex-1 py-3 bg-pink-600 text-white rounded-xl font-bold hover:bg-pink-700 disabled:opacity-50">
                  {isCreatingGc ? 'Issuing...' : 'Issue Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default POSPage;

