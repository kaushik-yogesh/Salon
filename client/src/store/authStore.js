import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  tenant: null,
  isAuthenticated: false,
  setAuth: (user, tenant) => set({ 
    user, 
    tenant, 
    isAuthenticated: true 
  }),
  logout: () => set({ user: null, tenant: null, isAuthenticated: false }),
}));
