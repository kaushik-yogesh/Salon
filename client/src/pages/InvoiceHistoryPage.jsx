import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCcw, FileText, CheckCircle, Clock } from 'lucide-react';
import api from '../api/axios';

const InvoiceHistoryPage = () => {
  const [refundingId, setRefundingId] = useState(null);

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
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {inv.status === 'PAID' && (
                          <button 
                            onClick={() => handleRefund(inv)}
                            disabled={refundingId === inv.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:text-red-600 hover:border-red-200 hover:bg-red-50 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                          >
                            <RefreshCcw className={`w-3.5 h-3.5 ${refundingId === inv.id ? 'animate-spin' : ''}`} />
                            {refundingId === inv.id ? 'Refunding...' : 'Refund'}
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
    </div>
  );
};

export default InvoiceHistoryPage;
