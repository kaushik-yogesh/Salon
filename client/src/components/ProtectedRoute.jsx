import React, { useEffect, useState, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api, { performLogout } from '../api/axios';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { getPortalRouteByRoles } from '../utils/portalRouting';

const ProtectedRoute = ({ allowedRoles }) => {
  const token = localStorage.getItem('salon_token');
  const { user, setAuth, isLoading, setLoading } = useAuthStore();
  const location = useLocation();
  const hasFetched = useRef(false);

  // Initialize Push Notifications in background
  usePushNotifications();

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    if (user || hasFetched.current) {
      if (!isLoading) setLoading(false);
      return;
    }

    hasFetched.current = true;
    
    api.get('/auth/me')
      .then(res => {
        setAuth(res.data.data.user, { id: res.data.data.user.tenantId });
      })
      .catch(() => {
        performLogout();
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, user, setAuth, setLoading, isLoading]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
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

  const userRoleNames = user.userRoles?.map(ur => ur.role.name) || [];

  // Setup wizard redirect for owners who haven't completed setup
  const isOwner = userRoleNames.includes('TENANT_OWNER');
  const isOnSetupPage = location.pathname === '/owner/setup';
  
  if (isOwner && user.setupComplete === false && !isOnSetupPage) {
    return <Navigate to="/owner/setup" replace />;
  }

  // RBAC Check
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAccess = allowedRoles.some(role => userRoleNames.includes(role));
    
    // Super Admins always have access
    if (!hasAccess && !userRoleNames.includes('SUPER_ADMIN')) {
      // Don't just go to unauthorized if they own a different portal, send them to their correct portal
      const correctPortal = getPortalRouteByRoles(user.userRoles?.map(ur => ur.role) || []);
      
      // Prevent infinite redirect if they somehow loop back to the same page
      if (location.pathname !== correctPortal && correctPortal !== '/login') {
         return <Navigate to={correctPortal} replace />;
      }
      
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
