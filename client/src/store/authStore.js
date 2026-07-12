import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  tenant: null,
  isAuthenticated: false,
  isLoading: true, // Start in loading state until session restored
  
  setAuth: (user, tenant) => set({ 
    user, 
    tenant, 
    isAuthenticated: true,
    isLoading: false
  }),
  
  setLoading: (isLoading) => set({ isLoading }),

  logout: () => {
    // Basic logout - the actual full cleanup happens in API layer or component
    set({ user: null, tenant: null, isAuthenticated: false, isLoading: false });
  },
}));
