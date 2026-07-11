import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true,
});

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    // Attach JWT Token
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
    if (error.response?.status === 401 && error.config && !error.config._retry) {
      error.config._retry = true;
      try {
        const refreshResponse = await axios.post(`${api.defaults.baseURL}/auth/refresh-token`, {}, {
          withCredentials: true,
        });
        const newToken = refreshResponse.data.data.accessToken;
        localStorage.setItem('salon_token', newToken);
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return api(error.config);
      } catch (refreshError) {
        console.error('Session expired, please log in again.');
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
