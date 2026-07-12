import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

const CustomerWalletPage = () => {
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState(null);
  const queryClient = useQueryClient();
  const { data: walletsData, isLoading } = useQuery({
    queryKey: ['customer-wallets'],
    queryFn: async () => {
      const res = await api.get('/customer-portal/wallets');
      return res.data.data.wallets;
    }
  });

  const topUpWallet = useMutation({
    mutationFn: ({ tenantId, amount }) => api.post(`/customer-portal/wallets/${tenantId}/topup`, { amount: parseFloat(amount) }),
    onSuccess: () => {
      queryClient.invalidateQueries(['customer-wallets']);
      setIsTopUpOpen(false);
      setTopUpAmount('');
      setSelectedTenantId(null);
    }
  });

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading wallet data...</div>;
  }

  // Aggregate global points/balances for the header, or we can just list them per tenant.
  const totalBalance = walletsData?.reduce((acc, w) => acc + w.balance, 0) || 0;
  const totalPoints = walletsData?.reduce((acc, w) => acc + w.loyaltyPoints, 0) || 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wallet & Loyalty</h1>
          <p className="text-gray-500 text-sm">View your available balance and earned rewards.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center">
          <div className="p-4 rounded-full bg-green-100 text-green-600 mr-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Balance</p>
            <p className="text-3xl font-bold text-gray-900">${totalBalance.toFixed(2)}</p>
            {/* The global top up would need to know which tenant to top up. So we put the top up button per tenant below. */}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center">
          <div className="p-4 rounded-full bg-purple-100 text-purple-600 mr-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Loyalty Points</p>
            <p className="text-3xl font-bold text-gray-900">{totalPoints}</p>
            <p className="text-sm text-gray-500 mt-1">Earn 10 points per $1 spent</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Balances by Salon</h2>
        </div>
        {walletsData?.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No active salon accounts found.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {walletsData?.map(wallet => (
              <li key={wallet.tenantId} className="p-6 hover:bg-gray-50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{wallet.tenantName}</h3>
                  <p className="text-sm text-gray-500">{wallet.loyaltyPoints} points</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600 text-xl">${wallet.balance.toFixed(2)}</p>
                  <button 
                    onClick={() => { setSelectedTenantId(wallet.tenantId); setIsTopUpOpen(true); }}
                    className="mt-2 text-sm text-indigo-600 hover:text-indigo-900 font-medium"
                  >
                    + Top Up
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Top-Up Modal */}
      {isTopUpOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h2 className="text-xl font-bold mb-4">Top Up Wallet</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              topUpWallet.mutate({ tenantId: selectedTenantId, amount: topUpAmount });
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount ($)</label>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => setTopUpAmount('25')} className={`px-4 py-2 border rounded ${topUpAmount === '25' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-gray-300'}`}>$25</button>
                  <button type="button" onClick={() => setTopUpAmount('50')} className={`px-4 py-2 border rounded ${topUpAmount === '50' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-gray-300'}`}>$50</button>
                  <button type="button" onClick={() => setTopUpAmount('100')} className={`px-4 py-2 border rounded ${topUpAmount === '100' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-gray-300'}`}>$100</button>
                </div>
                <input 
                  type="number" 
                  required 
                  min="1"
                  className="mt-4 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" 
                  placeholder="Custom Amount"
                  value={topUpAmount} 
                  onChange={e => setTopUpAmount(e.target.value)} 
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Note: In this development environment, payment is simulated and no real card will be charged.
              </p>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setIsTopUpOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Cancel</button>
                <button type="submit" disabled={topUpWallet.isPending || !topUpAmount} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md">{topUpWallet.isPending ? 'Processing...' : 'Pay Now'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerWalletPage;
