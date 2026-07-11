import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { useQuery } from '@tanstack/react-query';
import { ScanLine, Play, Pause, CheckCircle2, User, Camera } from 'lucide-react';
import api from '../api/axios';

const WorkerAppPage = () => {
  const [activeAppointment, setActiveAppointment] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [isScanningStatus, setIsScanningStatus] = useState(false);
  const [activeAppointmentId, setActiveAppointmentId] = useState(null);
  const [activeStatus, setActiveStatus] = useState(null); // PENDING, IN_PROGRESS, PAUSED, COMPLETED
  
  // Advanced Execution State
  const [notes, setNotes] = useState('');
  const [productsUsed, setProductsUsed] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const { isLoading } = useQuery({
    queryKey: ['tenant-appointments'],
    queryFn: async () => {
      const date = new Date().toISOString().split('T')[0];
      const res = await api.get(`/bookings?date=${date}`);
      return res.data;
    }
  });

  const { data: inventory } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res = await api.get('/inventory');
      return res.data.data;
    }
  });

  useEffect(() => {
    if (!activeAppointment && !isLoading) {
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          rememberLastUsedCamera: true,
          aspectRatio: 1.0
        },
        false
      );

      const onScanSuccess = async (decodedText) => {
        if (isScanningStatus) return; // Prevent multiple concurrent scans
        scanner.clear();
        setIsScanningStatus(true);
        setScanError(null);
        try {
          const res = await api.post('/execution/scan', { qrToken: decodedText });
          setActiveAppointmentId(res.data.data.id);
          setActiveStatus(res.data.data.status);
          setActiveAppointment(res.data.data);
        } catch (err) {
          const msg = err.response?.data?.error?.message || 'Invalid, expired, or already-used QR code';
          setScanError(msg);
          // After 3 seconds, clear error to try again
          setTimeout(() => {
            setScanError(null);
            setIsScanningStatus(false);
            scanner.render(onScanSuccess, onScanFailure);
          }, 3000);
        } finally {
          setIsScanningStatus(false);
        }
      };

      const onScanFailure = () => {
        // ignore continuous scan errors
      };

      scanner.render(onScanSuccess, onScanFailure);

      return () => {
        scanner.clear().catch(e => console.log('Scanner clear error', e));
      };
    }
  }, [activeAppointment, isLoading, isScanningStatus]);

  const handleAction = async (action) => {
    if (!activeAppointmentId) return;
    setActionLoading(true);
    try {
      if (action === 'start') {
        await api.post(`/execution/${activeAppointmentId}/start`);
        setActiveStatus('IN_PROGRESS');
      } else if (action === 'pause') {
        await api.post(`/execution/${activeAppointmentId}/pause`);
        setActiveStatus('PAUSED');
      } else if (action === 'resume') {
        await api.post(`/execution/${activeAppointmentId}/resume`);
        setActiveStatus('IN_PROGRESS');
      } else if (action === 'complete') {
        await api.post(`/execution/${activeAppointmentId}/complete`, {
          notes,
          productsUsed
        });
        setActiveStatus('COMPLETED');
        alert('Service completed! Commission automatically added to your earnings.');
        // Reset state
        setActiveAppointmentId(null);
        setScanError(null);
        setActiveStatus(null);
        setNotes('');
        setProductsUsed([]);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const addProduct = (product) => {
    const exists = productsUsed.find(p => p.productId === product.id);
    if (exists) {
      setProductsUsed(productsUsed.map(p => p.productId === product.id ? { ...p, quantity: p.quantity + 1 } : p));
    } else {
      setProductsUsed([...productsUsed, { productId: product.id, name: product.name, quantity: 1 }]);
    }
  };

  const removeProduct = (productId) => {
    setProductsUsed(productsUsed.filter(p => p.productId !== productId));
  };

  return (
    <div className="w-full max-w-md mx-auto bg-gray-50 min-h-[calc(100vh-100px)] flex flex-col shadow-2xl border-x border-gray-200 sm:rounded-2xl sm:my-4 sm:min-h-[800px] overflow-hidden relative">
      {/* Header */}
      <div className="bg-primary text-white p-6 rounded-b-3xl shadow-lg relative z-10">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <ScanLine className="w-6 h-6" /> Worker Scanner
        </h1>
        <p className="text-primary-foreground/80 text-center text-sm mt-1">Scan QR to manage service</p>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {!activeAppointment && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mt-4 animate-in fade-in slide-in-from-bottom-4">
            
            {scanError && (
              <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold flex items-center gap-2 border border-red-100">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                {scanError}
              </div>
            )}
            
            {isScanningStatus && !scanError ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium animate-pulse">Validating QR Code...</p>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-black">
                <div id="qr-reader" className="w-full h-full object-cover"></div>
                <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none rounded-xl"></div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-primary rounded-lg relative">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary -mt-1 -ml-1"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary -mt-1 -mr-1"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary -mb-1 -ml-1"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary -mb-1 -mr-1"></div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500 font-medium">
              <Camera className="w-4 h-4" /> Point camera at customer's QR
            </div>
          </div>
        )}

        {activeAppointment && (
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 mt-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase block mb-1">Active Client</span>
                  <h2 className="text-xl font-extrabold text-gray-900 leading-none">
                    {activeAppointment.customer?.firstName} {activeAppointment.customer?.lastName}
                  </h2>
                </div>
              </div>
              <span className={`text-xs px-3 py-1.5 rounded-full font-bold shadow-sm ${
                activeAppointment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                activeAppointment.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 
                'bg-green-100 text-green-700'
              }`}>
                {activeAppointment.status}
              </span>
            </div>

            <div className="mb-6 space-y-3 bg-gray-50 p-4 rounded-2xl">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Services Requested</h3>
              {activeAppointment.services?.map(as => (
                <div key={as.id} className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                  {as.service?.name}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {activeStatus === 'PENDING' && (
                <button 
                  disabled={actionLoading}
                  onClick={() => handleAction('start')} 
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70 disabled:active:scale-100"
                >
                  {actionLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Play className="w-5 h-5 fill-current" />}
                  Start Service
                </button>
              )}
              
              {activeStatus === 'IN_PROGRESS' && (
                <div className="space-y-4">
                  <button 
                    disabled={actionLoading}
                    onClick={() => handleAction('pause')} 
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-400 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70"
                  >
                    {actionLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Pause className="w-5 h-5 fill-current" />}
                    Pause Service
                  </button>
                </div>
              )}
              
              {activeStatus === 'PAUSED' && (
                <div className="space-y-4">
                  <button 
                    disabled={actionLoading}
                    onClick={() => handleAction('resume')} 
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-400 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70"
                  >
                    {actionLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Play className="w-5 h-5 fill-current" />}
                    Resume Service
                  </button>
                </div>
              )}

              {(activeStatus === 'IN_PROGRESS' || activeStatus === 'PAUSED') && (
                <div className="mt-8 pt-6 border-t border-gray-100 animate-in fade-in slide-in-from-bottom-4">
                  <h4 className="font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Completion Details
                  </h4>
                  
                  <div className="mb-5">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Service Notes</label>
                    <textarea 
                      className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none bg-gray-50 focus:bg-white" 
                      rows="3" 
                      placeholder="e.g., Client requested darker shade, patchy areas fixed."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    ></textarea>
                  </div>

                  <div className="mb-6">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Products Used</label>
                    <div className="flex gap-2 mb-3">
                      <select 
                        className="flex-1 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-gray-50 focus:bg-white" 
                        value={productSearch} 
                        onChange={(e) => setProductSearch(e.target.value)}
                      >
                        <option value="">-- Select Product --</option>
                        {inventory?.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stockQuantity})</option>)}
                      </select>
                      <button 
                        onClick={() => {
                          const p = inventory?.find(i => i.id === productSearch);
                          if(p) addProduct(p);
                          setProductSearch('');
                        }}
                        className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors"
                      >Add</button>
                    </div>
                    
                    {productsUsed.length > 0 && (
                      <ul className="bg-gray-50 border border-gray-100 rounded-xl p-2 text-sm space-y-1">
                        {productsUsed.map(p => (
                          <li key={p.productId} className="flex justify-between items-center text-gray-700 bg-white px-3 py-2 rounded-lg border border-gray-50 shadow-sm">
                            <span className="font-semibold text-gray-900">{p.quantity}x <span className="font-medium text-gray-600">{p.name}</span></span>
                            <button onClick={() => removeProduct(p.productId)} className="text-red-400 font-bold hover:text-red-600 w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors">×</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <button 
                    disabled={actionLoading}
                    onClick={() => handleAction('complete')} 
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-400 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70"
                  >
                    {actionLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <CheckCircle2 className="w-5 h-5" />}
                    Complete Service
                  </button>
                </div>
              )}

              {activeStatus === 'COMPLETED' && (
                <div className="space-y-4 animate-in zoom-in-95 fade-in">
                  <div className="w-full py-6 rounded-2xl font-bold text-emerald-700 bg-emerald-50 text-center border border-emerald-100 shadow-sm flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    Service Logged Successfully
                  </div>
                  <button 
                    onClick={() => setActiveAppointment(null)}
                    className="w-full py-4 rounded-2xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors active:scale-95"
                  >
                    Scan Next Customer
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkerAppPage;
