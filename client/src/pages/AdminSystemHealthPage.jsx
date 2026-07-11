import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Mail, MessageSquare, CreditCard, DollarSign, BellRing, CheckCircle, XCircle } from 'lucide-react';
import api from '../api/axios';

const AdminSystemHealthPage = () => {
  const { data: health, isLoading } = useQuery({
    queryKey: ['admin-health-config-full'],
    queryFn: async () => {
      const res = await api.get('/dashboard/health/config');
      return res.data.data;
    }
  });

  const getStatusIcon = (isConfigured) => {
    return isConfigured ? 
      <CheckCircle className="w-6 h-6 text-emerald-500" /> : 
      <XCircle className="w-6 h-6 text-red-500" />;
  };

  const getStatusColor = (isConfigured) => {
    return isConfigured ? 'border-emerald-200 bg-emerald-50/30' : 'border-red-200 bg-red-50/30';
  };

  const ConfigCard = ({ title, description, icon: Icon, isConfigured }) => (
    <div className={`p-6 rounded-2xl border ${getStatusColor(isConfigured)} shadow-sm transition-all hover:shadow-md flex items-start gap-4`}>
      <div className={`p-3 rounded-xl ${isConfigured ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-extrabold text-gray-900">{title}</h3>
          {getStatusIcon(isConfigured)}
        </div>
        <p className="text-sm text-gray-500">{description}</p>
        {!isConfigured && (
          <p className="mt-2 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded inline-block">Missing in Environment Variables</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-[calc(100vh-100px)] overflow-y-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
            <Activity className="w-8 h-8 text-primary" /> System Health & Configuration
          </h1>
          <p className="text-gray-500 mt-1">Monitor the status of critical external integrations for production.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="text-gray-500 font-medium">Validating engines...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ConfigCard 
            title="SMTP Email" 
            description="Used for transactional emails like invitations and password resets." 
            icon={Mail} 
            isConfigured={health?.smtp} 
          />
          <ConfigCard 
            title="Twilio SMS" 
            description="Used for SMS reminders and customer communications." 
            icon={MessageSquare} 
            isConfigured={health?.twilio} 
          />
          <ConfigCard 
            title="Stripe Checkout" 
            description="Primary payment gateway for credit card processing." 
            icon={CreditCard} 
            isConfigured={health?.stripe} 
          />
          <ConfigCard 
            title="Razorpay" 
            description="Alternative payment gateway for INR processing." 
            icon={DollarSign} 
            isConfigured={health?.razorpay} 
          />
          <ConfigCard 
            title="VAPID Web Push" 
            description="Keys required to send browser push notifications." 
            icon={BellRing} 
            isConfigured={health?.vapid} 
          />
        </div>
      )}

      {health && Object.values(health).some(v => !v) && (
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
          <div className="p-2 bg-amber-100 rounded-full text-amber-600">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-extrabold text-amber-900">Degraded Production Readiness</h4>
            <p className="text-amber-700 text-sm mt-1">
              One or more external integrations are not configured. The system will gracefully degrade to mocked responses and logs for missing engines, but production capabilities will be limited.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSystemHealthPage;
