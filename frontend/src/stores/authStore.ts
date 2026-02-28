import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { authService } from '@/services/auth.service'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  impersonatingUser: User | null

  // Actions
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>
  logout: () => Promise<void>
  fetchCurrentUser: () => Promise<void>
  clearError: () => void
  setUser: (user: User) => void
  setImpersonation: (user: User | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: authService.isAuthenticated(),
      isLoading: false,
      error: null,
      impersonatingUser: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          await authService.login({ email, password })
          const user = await authService.getCurrentUser()
          set({ user, isAuthenticated: true, isLoading: false })
        } catch (error) {
          const message = authService.getErrorMessage(error)
          set({ error: message, isLoading: false, isAuthenticated: false })
          throw error
        }
      },

      register: async (email: string, password: string, firstName?: string, lastName?: string) => {
        set({ isLoading: true, error: null })
        try {
          await authService.register({
            email,
            password,
            first_name: firstName,
            last_name: lastName,
          })
          set({ isLoading: false })
        } catch (error) {
          const message = authService.getErrorMessage(error)
          set({ error: message, isLoading: false })
          throw error
        }
      },

      logout: async () => {
        set({ isLoading: true })
        try {
          await authService.logout()
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            impersonatingUser: null,
            error: null,
          })
        }
      },

      fetchCurrentUser: async () => {
        if (!authService.isAuthenticated()) {
          set({ user: null, isAuthenticated: false })
          return
        }

        set({ isLoading: true })
        try {
          const user = await authService.getCurrentUser()
          set({ user, isAuthenticated: true, isLoading: false })
        } catch {
          set({ user: null, isAuthenticated: false, isLoading: false })
        }
      },

      clearError: () => set({ error: null }),

      setUser: (user: User) => set({ user }),

      setImpersonation: (user: User | null) => set({ impersonatingUser: user }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

export default useAuthStore
