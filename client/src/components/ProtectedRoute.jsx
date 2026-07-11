import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../api/axios';
import { usePushNotifications } from '../hooks/usePushNotifications';

const ProtectedRoute = ({ allowedRoles }) => {
  const token = localStorage.getItem('salon_token');
  const { user, setAuth, logout } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(!user);
  const location = useLocation();

  // Initialize Push Notifications in background
  usePushNotifications();

  useEffect(() => {
    if (token && !user) {
      api.get('/auth/me')
        .then(res => {
          setAuth(res.data.data.user, { id: res.data.data.user.tenantId });
        })
        .catch(() => {
          logout();
          localStorage.removeItem('salon_token');
        })
        .finally(() => setIsVerifying(false));
    } else {
      setIsVerifying(false);
    }
  }, [token, user, setAuth, logout]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // RBAC Check
  if (allowedRoles && allowedRoles.length > 0) {
    const userRoleNames = user.userRoles?.map(ur => ur.role.name) || [];
    const hasAccess = allowedRoles.some(role => userRoleNames.includes(role));
    
    // Super Admins always have access
    if (!hasAccess && !userRoleNames.includes('SUPER_ADMIN')) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Setup wizard redirect for owners who haven't completed setup
  const userRoleNames = user.userRoles?.map(ur => ur.role.name) || [];
  const isOwner = userRoleNames.includes('TENANT_OWNER');
  const isOnSetupPage = location.pathname === '/owner/setup';
  
  if (isOwner && user.setupComplete === false && !isOnSetupPage) {
    return <Navigate to="/owner/setup" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
