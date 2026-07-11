import React from 'react';
import { useAuthStore } from '../store/authStore';

const CustomerWalletPage = () => {
  const user = useAuthStore(state => state.user);
  
  const balance = user?.walletBalance || 0;
  const points = user?.loyaltyPoints || 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wallet & Loyalty</h1>
          <p className="text-gray-500 text-sm">View your available balance and earned rewards.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center">
          <div className="p-4 rounded-full bg-green-100 text-green-600 mr-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Available Balance</p>
            <p className="text-3xl font-bold text-gray-900">${balance.toFixed(2)}</p>
            <p className="text-sm text-green-600 mt-1 cursor-pointer hover:underline">+ Top up wallet</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center">
          <div className="p-4 rounded-full bg-purple-100 text-purple-600 mr-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Loyalty Points</p>
            <p className="text-3xl font-bold text-gray-900">{points}</p>
            <p className="text-sm text-gray-500 mt-1">Earn 10 points per $1 spent</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerWalletPage;
