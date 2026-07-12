import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCcw, FileText, CheckCircle, Clock, Printer, X } from 'lucide-react';
import api from '../api/axios';

const InvoiceHistoryPage = () => {
  const [refundingId, setRefundingId] = useState(null);
  const [printInvoice, setPrintInvoice] = useState(null);

  const { data: invoices, isLoading, refetch } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const res = await api.get('/invoices');
      return res.data.data;
    }
  });

  const handleRefund = async (invoice) => {
    if (!invoice.payments || invoice.payments.length === 0) {
      alert("No payments found for this invoice to refund.");
      return;
    }
    
    // For simplicity, refund the first successful payment associated with the invoice
    const paymentToRefund = invoice.payments.find(p => p.status === 'COMPLETED') || invoice.payments[0];
    
    if (!window.confirm(`Are you sure you want to refund $${paymentToRefund.amount} for this invoice?`)) {
      return;
    }

    try {
      setRefundingId(invoice.id);
      await api.post(`/pos/payments/${paymentToRefund.id}/refund`);
      alert("Refund processed successfully.");
      refetch();
    } catch (err) {
      alert(err.response?.data?.error?.message || "Failed to process refund.");
    } finally {
      setRefundingId(null);
    }
  };

  const handleVoid = async (id) => {
    if (!window.confirm('Are you sure you want to void this DRAFT invoice?')) return;
    try {
      await api.delete(`/invoices/${id}`);
      refetch();
    } catch (err) {
      alert(err.response?.data?.error?.message || "Failed to void invoice.");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
            <FileText className="w-8 h-8 text-primary" /> Invoice History
          </h1>
          <p className="text-gray-500 mt-1">View all auto-generated and manual invoices, and process refunds.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="text-gray-500 font-medium">Loading invoices...</div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Invoice ID</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {invoices?.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">No invoices found.</td></tr>
                ) : (
                  invoices?.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md">
                          {inv.id.substring(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                        {new Date(inv.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-semibold">
                        {inv.appointment?.customer ? `${inv.appointment.customer.firstName} ${inv.appointment.customer.lastName}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-gray-900 text-right">
                        ${inv.grandTotal.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                          inv.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' :
                          inv.status === 'REFUNDED' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {inv.status === 'PAID' && <CheckCircle className="w-3.5 h-3.5" />}
                          {inv.status === 'DRAFT' && <Clock className="w-3.5 h-3.5" />}
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        {inv.status === 'PAID' && (
                          <>
                            <button 
                              onClick={() => handleRefund(inv)}
                              disabled={refundingId === inv.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:text-red-600 hover:border-red-200 hover:bg-red-50 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                            >
                              <RefreshCcw className={`w-3.5 h-3.5 ${refundingId === inv.id ? 'animate-spin' : ''}`} />
                              {refundingId === inv.id ? 'Refunding...' : 'Refund'}
                            </button>
                            <button 
                              onClick={() => setPrintInvoice(inv)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-all"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              Print
                            </button>
                          </>
                        )}
                        {inv.status === 'DRAFT' && (
                          <button 
                            onClick={() => handleVoid(inv.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:text-red-600 hover:border-red-200 hover:bg-red-50 rounded-lg text-xs font-bold transition-all"
                          >
                            Void
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Print Receipt Modal */}
      {printInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:bg-white print:p-0">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 print:shadow-none print:w-full print:max-w-none print:m-0 print:border-none">
            
            {/* Non-printable header */}
            <div className="flex justify-between items-center mb-6 print:hidden border-b pb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                Print Receipt
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => window.print()}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition"
                >
                  Print Now
                </button>
                <button 
                  onClick={() => setPrintInvoice(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div className="print-area">
              <div className="text-center mb-6 border-b-2 border-dashed border-gray-200 pb-6">
                <h2 className="text-2xl font-extrabold text-gray-900 uppercase tracking-widest">SalonOS</h2>
                <p className="text-sm text-gray-500 mt-1 font-medium">Premium Hair & Beauty</p>
                <p className="text-xs text-gray-400 mt-2">Receipt #{printInvoice.id.substring(0, 8).toUpperCase()}</p>
                <p className="text-xs text-gray-400">{new Date(printInvoice.createdAt).toLocaleString()}</p>
              </div>

              <div className="mb-6">
                <p className="text-sm font-bold text-gray-800">Customer Details</p>
                <p className="text-sm text-gray-600 mt-1">
                  {printInvoice.appointment?.customer?.firstName} {printInvoice.appointment?.customer?.lastName || 'Walk-in'}
                </p>
              </div>

              <table className="w-full text-sm mb-6">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-gray-600 font-bold">Item</th>
                    <th className="text-right py-2 text-gray-600 font-bold">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 border-b border-gray-200">
                  {/* Appointment Services */}
                  {printInvoice.appointment?.services?.map((s) => (
                    <tr key={s.id}>
                      <td className="py-3 text-gray-800 font-medium">
                        {s.service?.name}
                        <div className="text-xs text-gray-400 font-normal">By {s.worker?.user?.profile?.firstName}</div>
                      </td>
                      <td className="py-3 text-right text-gray-900 font-bold">${s.price.toFixed(2)}</td>
                    </tr>
                  ))}
                  {/* Walk-in products or additional items if present */}
                  {printInvoice.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-3 text-gray-800 font-medium">{item.name || 'Product'} x{item.quantity}</td>
                      <td className="py-3 text-right text-gray-900 font-bold">${(item.price * (item.quantity||1)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between items-center py-2 text-sm text-gray-600">
                <span>Subtotal</span>
                <span>${(printInvoice.grandTotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 text-sm text-gray-600 border-b border-gray-200">
                <span>Tax (Included)</span>
                <span>$0.00</span>
              </div>
              
              <div className="flex justify-between items-center py-4 text-lg font-extrabold text-gray-900">
                <span>Total Paid</span>
                <span>${printInvoice.grandTotal.toFixed(2)}</span>
              </div>

              <div className="text-center mt-8 text-sm text-gray-500 font-medium">
                <p>Thank you for your visit!</p>
                <p className="text-xs mt-1 text-gray-400">Powered by SalonOS</p>
              </div>
            </div>
            
            <style jsx>{`
              @media print {
                body * {
                  visibility: hidden;
                }
                .print-area, .print-area * {
                  visibility: visible;
                }
                .print-area {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                }
              }
            `}</style>
          </div>
        </div>
      )}

    </div>
  );
};

export default InvoiceHistoryPage;
