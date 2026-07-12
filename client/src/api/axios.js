import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true,
  timeout: 15000,
});

// For handling concurrent refresh requests
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Global logout function
export const performLogout = () => {
  localStorage.removeItem('salon_token');
  sessionStorage.clear();
  useAuthStore.getState().logout();
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('salon_token');
    if (token && token !== 'undefined') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Enhance Error object with better messages
    if (error.code === 'ERR_NETWORK' || !error.response) {
      error.isNetworkError = true;
      error.friendlyMessage = 'Network error: Please check your internet connection and try again.';
      return Promise.reject(error);
    }

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      error.isTimeout = true;
      error.friendlyMessage = 'Request timed out: The server is taking too long to respond.';
      return Promise.reject(error);
    }

    if (error.response?.status >= 500) {
      error.friendlyMessage = 'Server error: Something went wrong on our end. Please try again later.';
      return Promise.reject(error);
    }

    // 401 Unauthorized handling (Token expiration)
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't retry refresh loops or login loops
      if (originalRequest.url.includes('/auth/refresh') || originalRequest.url.includes('/auth/login')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(`${api.defaults.baseURL}/auth/refresh-token`, {}, {
          withCredentials: true,
        });
        
        const newToken = refreshResponse.data.data.accessToken;
        localStorage.setItem('salon_token', newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        
        processQueue(null, newToken);
        
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        performLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Pass through standard AppErrors (400, 403, 404, etc.)
    return Promise.reject(error);
  }
);

export default api;
