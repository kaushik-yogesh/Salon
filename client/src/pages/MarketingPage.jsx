import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

const MarketingPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('campaigns');
  const [campaignType, setCampaignType] = useState('SMS');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState('ALL_CUSTOMERS');

  const sendCampaign = useMutation({
    mutationFn: async (data) => api.post('/marketing/campaign', data),
    onSuccess: () => {
      alert('Campaign launched successfully!');
      setMessage('');
      queryClient.invalidateQueries(['dashboard-metrics']);
    },
    onError: (err) => {
      alert(err?.response?.data?.error?.message || 'Failed to send campaign');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return alert('Message cannot be empty');
    if (window.confirm(`Are you sure you want to blast this ${campaignType} to ${targetAudience.replace('_', ' ')}?`)) {
      sendCampaign.mutate({ type: campaignType, message, targetAudience });
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-screen overflow-y-auto pb-32">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-secondary">Marketing Engine</h1>
          <p className="text-gray-500">Drive repeat business with automated campaigns and blasts.</p>
        </div>
      </div>

      <div className="flex space-x-4 mb-6 border-b border-gray-200">
        {['campaigns', 'automated_triggers'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 font-bold text-sm uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === tab 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {activeTab === 'campaigns' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Create New Campaign</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Campaign Type</label>
                  <select 
                    value={campaignType}
                    onChange={(e) => setCampaignType(e.target.value)}
                    className="block w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="SMS">SMS Text Message</option>
                    <option value="EMAIL">Email Blast</option>
                    <option value="PUSH">App Push Notification</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Target Audience</label>
                  <select 
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="block w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="ALL_CUSTOMERS">All Customers</option>
                    <option value="VIP_CUSTOMERS">VIP Customers (High LTV)</option>
                    <option value="RECENT_CUSTOMERS">Recent (Last 30 Days)</option>
                    <option value="SLEEPING_CUSTOMERS">Sleeping (No visit in 90 Days)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Message Content</label>
                <textarea
                  required
                  rows="4"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. Holiday Special! Get 20% off all haircuts this weekend. Book now!"
                  className="block w-full border border-gray-300 rounded-lg p-3 focus:ring-indigo-500 focus:border-indigo-500"
                ></textarea>
                <p className="text-xs text-gray-500 mt-2 flex justify-between">
                  <span>Variables: {'{customer_name}'}, {'{salon_name}'}, {'{booking_link}'}</span>
                  <span>{message.length} chars</span>
                </p>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button 
                  type="submit" 
                  disabled={sendCampaign.isPending}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-lg shadow-md font-bold hover:bg-indigo-700 transition"
                >
                  {sendCampaign.isPending ? 'Sending...' : 'Launch Campaign 🚀'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              📱 Live Preview
            </h3>
            
            <div className="bg-white rounded-3xl border-8 border-gray-800 shadow-xl overflow-hidden h-[400px] relative">
              <div className="bg-gray-100 h-12 flex items-center justify-center border-b border-gray-200">
                <div className="text-xs font-bold text-gray-400">Message from SalonOS</div>
              </div>
              <div className="p-4 flex flex-col justify-end h-[calc(100%-3rem)] bg-gray-50">
                {message ? (
                  <div className="bg-blue-500 text-white p-3 rounded-2xl rounded-br-sm shadow-sm max-w-[85%] self-end text-sm">
                    {message.replace('{customer_name}', 'Sarah').replace('{salon_name}', 'Your Salon').replace('{booking_link}', 'https://salon.com/book')}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 text-sm italic">Type a message to see preview</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'automated_triggers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-xl flex items-center justify-center mb-4 text-2xl">
                🎂
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Birthday Automation</h3>
              <p className="text-sm text-gray-500 mb-6">Automatically send a personalized SMS and 10% discount coupon to customers on their birthday.</p>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className="text-sm font-bold text-green-600 uppercase">Active</span>
              <button className="text-indigo-600 font-bold text-sm">Configure</button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between opacity-75">
            <div>
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-4 text-2xl">
                😴
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">We Miss You (Win-back)</h3>
              <p className="text-sm text-gray-500 mb-6">Automatically send a special offer to customers who haven't visited in 90 days.</p>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className="text-sm font-bold text-gray-400 uppercase">Inactive</span>
              <button className="text-indigo-600 font-bold text-sm">Configure</button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default MarketingPage;
