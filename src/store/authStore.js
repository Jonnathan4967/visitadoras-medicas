import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,
  isAdmin: false,
  loading: true,
  
  setUser: (user) => set({ user, loading: false }),
  setIsAdmin: (isAdmin) => set({ isAdmin }),
  logout: () => set({ user: null, isAdmin: false }),
}))
