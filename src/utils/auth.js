import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      userType: null, // 'employee' | 'reporting_manager' | 'zonal_manager'
      userEmail: null,
      setUser: (user, userType, email) => set({ user, userType, userEmail: email }),
      logout: () => set({ user: null, userType: null, userEmail: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
)


