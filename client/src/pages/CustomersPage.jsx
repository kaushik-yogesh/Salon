import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

const CustomersPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [historyCustomerId, setHistoryCustomerId] = useState(null);
  const [historyTab, setHistoryTab] = useState('appointments');
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '', notes: '', tags: '' });
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers', searchTerm],
    queryFn: async () => {
      const res = await api.get(`/customers?search=${searchTerm}`);
      return res.data?.data?.customers || [];
    }
  });

  const { data: customerHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['customerHistory', historyCustomerId],
    queryFn: async () => {
      const res = await api.get(`/customers/${historyCustomerId}`);
      return res.data?.data?.customer;
    },
    enabled: !!historyCustomerId && isHistoryModalOpen
  });

  const createCustomer = useMutation({
    mutationFn: (newCustomer) => api.post('/customers', newCustomer),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      setIsModalOpen(false);
      setFormData({ firstName: '', lastName: '', email: '', phone: '', notes: '' });
    }
  });

  const updateCustomer = useMutation({
    mutationFn: ({ id, data }) => api.put(`/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      setIsEditModalOpen(false);
      setSelectedCustomer(null);
    }
  });

  const deleteCustomer = useMutation({
    mutationFn: (id) => api.delete(`/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
    }
  });

  const importCustomers = useMutation({
    mutationFn: (customers) => api.post('/customers/bulk-import', { customers }),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['customers']);
      alert(res.data.message || 'Customers imported successfully');
    },
    onError: (err) => {
      alert(err.response?.data?.error?.message || 'Failed to import customers');
    },
    onSettled: () => {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  });

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const parsedCustomers = [];
        for (let i = 1; i < lines.length; i++) {
          const currentline = lines[i].split(',');
          if (currentline.length <= 1) continue;
          
          const obj = {};
          for (let j = 0; j < headers.length; j++) {
            if (currentline[j]) obj[headers[j]] = currentline[j].trim();
          }
          
          // Map to schema fields (assuming CSV has firstname, lastname, email, phone, notes)
          if (obj.firstname || obj.name || obj['first name']) {
            parsedCustomers.push({
              firstName: obj.firstname || obj.name || obj['first name'],
              lastName: obj.lastname || obj['last name'] || '',
              email: obj.email || '',
              phone: obj.phone || '',
              notes: obj.notes || ''
            });
          }
        }
        
        if (parsedCustomers.length > 0) {
          importCustomers.mutate(parsedCustomers);
        } else {
          alert('No valid customers found in CSV');
          setIsImporting(false);
        }
      } catch (err) {
        console.error(err);
        alert('Failed to parse CSV file');
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData, tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean) };
    createCustomer.mutate(payload);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData, tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean) };
    updateCustomer.mutate({ id: selectedCustomer.id, data: payload });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers CRM</h1>
          <p className="text-gray-500 text-sm">Manage your salon's clients and their history.</p>
        </div>
        <div className="flex space-x-3">
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="bg-white text-indigo-600 border border-indigo-600 px-4 py-2 rounded-md hover:bg-indigo-50 text-sm font-medium disabled:opacity-50"
          >
            {isImporting ? 'Importing...' : 'Import CSV'}
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium"
          >
            + Add Customer
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search customers by name, email, or phone..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">LTV</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-purple-500 uppercase tracking-wider">Loyalty Pts</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-green-500 uppercase tracking-wider">Wallet</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">Loading customers...</td>
                </tr>
              ) : !customers || customers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">No customers found.</td>
                </tr>
              ) : (
                customers.map((cust) => (
                  <tr key={cust?.id} className="hover:bg-gray-50 transition cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold uppercase">
                          {cust?.firstName?.charAt(0) || '?'}{cust?.lastName?.charAt(0) || ''}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">{cust?.firstName || 'Unknown'} {cust?.lastName || ''}</div>
                          <div className="text-xs text-gray-500">Joined {cust?.createdAt ? new Date(cust.createdAt).toLocaleDateString() : 'Unknown'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{cust?.email || 'No email'}</div>
                      <div className="text-xs text-gray-500">{cust?.phone || 'No phone'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-emerald-600">
                      ${cust?.lifetimeValue?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-purple-600">
                      ⭐ {cust?.loyaltyPoints || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-green-600">
                      ${cust?.walletBalance?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setHistoryCustomerId(cust.id);
                          setIsHistoryModalOpen(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900 mr-4 font-bold"
                      >
                        History
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomer(cust);
                          setFormData({
                            firstName: cust.firstName || '',
                            lastName: cust.lastName || '',
                            email: cust.email || '',
                            phone: cust.phone || '',
                            notes: cust.notes || '',
                            tags: (cust.tags || []).join(', ')
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="text-gray-600 hover:text-gray-900 mr-4"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if(window.confirm('Are you sure you want to delete this customer?')) {
                            deleteCustomer.mutate(cust.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Add New Customer</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input required type="text" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input required type="text" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input type="text" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes / Preferences</label>
                <textarea rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tags (comma separated)</label>
                <input type="text" placeholder="e.g. VIP, Requires Allergy Test" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Cancel</button>
                <button type="submit" disabled={createCustomer.isPending} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md">{createCustomer.isPending ? 'Saving...' : 'Save Customer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {isEditModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Edit Customer</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input required type="text" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input required type="text" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input type="text" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes / Preferences</label>
                <textarea rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tags (comma separated)</label>
                <input type="text" placeholder="e.g. VIP, Requires Allergy Test" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Cancel</button>
                <button type="submit" disabled={updateCustomer.isPending} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md">{updateCustomer.isPending ? 'Saving...' : 'Update Customer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Customer History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full flex flex-col h-[80vh]">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {isLoadingHistory ? 'Loading...' : `${customerHistory?.firstName} ${customerHistory?.lastName}'s History`}
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  Lifetime Value: <span className="font-bold text-emerald-600">${customerHistory?.lifetimeValue?.toFixed(2) || '0.00'}</span> | 
                  Loyalty Points: <span className="font-bold text-purple-600">{customerHistory?.loyaltyPoints || 0}</span> | 
                  Wallet: <span className="font-bold text-green-600">${customerHistory?.walletBalance?.toFixed(2) || '0.00'}</span>
                </p>
                {customerHistory?.tags?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {customerHistory.tags.map(t => (
                      <span key={t} className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded">{t}</span>
                    ))}
                  </div>
                )}
                {customerHistory?.notes && (
                  <div className="mt-2 text-sm text-gray-700 bg-yellow-50 p-2 rounded border border-yellow-200">
                    <strong>Notes:</strong> {customerHistory.notes}
                  </div>
                )}
              </div>
              <button onClick={() => { setIsHistoryModalOpen(false); setHistoryCustomerId(null); }} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex border-b border-gray-200 px-6 pt-4 bg-white">
              <button 
                className={`pb-4 px-4 font-bold text-sm border-b-2 ${historyTab === 'appointments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                onClick={() => setHistoryTab('appointments')}
              >
                Recent Appointments
              </button>
              <button 
                className={`pb-4 px-4 font-bold text-sm border-b-2 ${historyTab === 'invoices' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                onClick={() => setHistoryTab('invoices')}
              >
                Recent Invoices
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
              {isLoadingHistory ? (
                <div className="text-center py-10 text-gray-500">Loading history...</div>
              ) : historyTab === 'appointments' ? (
                <div className="space-y-4">
                  {!customerHistory?.appointments || customerHistory.appointments.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 bg-white rounded-lg border border-gray-200">No appointments found.</div>
                  ) : (
                    customerHistory.appointments.map(app => (
                      <div key={app.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex justify-between items-center">
                        <div>
                          <div className="font-bold text-gray-900">{new Date(app.date).toLocaleDateString()}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            {app.services?.map(s => s.service?.name).join(', ')}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            app.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                            app.status === 'CANCELLED' || app.status === 'NO_SHOW' ? 'bg-red-100 text-red-800' : 
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {app.status}
                          </span>
                          <div className="font-bold text-gray-900 mt-2">${app.totalPrice.toFixed(2)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {!customerHistory?.Invoice || customerHistory.Invoice.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 bg-white rounded-lg border border-gray-200">No invoices found.</div>
                  ) : (
                    customerHistory.Invoice.map(inv => (
                      <div key={inv.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex justify-between items-center">
                        <div>
                          <div className="font-bold text-gray-900">Invoice #{inv.id.substring(0,8).toUpperCase()}</div>
                          <div className="text-sm text-gray-500 mt-1">{new Date(inv.createdAt).toLocaleString()}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {inv.lineItems?.length} items
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            inv.status === 'PAID' ? 'bg-green-100 text-green-800' : 
                            inv.status === 'VOID' || inv.status === 'REFUNDED' ? 'bg-red-100 text-red-800' : 
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {inv.status}
                          </span>
                          <div className="font-bold text-gray-900 mt-2">${inv.grandTotal.toFixed(2)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
