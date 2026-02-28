import api, { ApiError } from './api'
import type { User, AuthTokens, LoginCredentials, RegisterData } from '@/types'

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    const formData = new URLSearchParams()
    formData.append('username', credentials.email)
    formData.append('password', credentials.password)

    const response = await api.post<AuthTokens>('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    // Store tokens
    localStorage.setItem('access_token', response.data.access_token)
    if (response.data.refresh_token) {
      localStorage.setItem('refresh_token', response.data.refresh_token)
    }

    return response.data
  },

  async register(data: RegisterData): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/register', data)
    return response.data
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout')
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/auth/me')
    return response.data
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await api.put<User>('/auth/me', data)
    return response.data
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.put('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    })
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email })
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await api.post('/auth/reset-password', {
      token,
      new_password: newPassword,
    })
  },

  async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/verify-email', { token })
    return response.data
  },

  async resendVerification(email: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/resend-verification', { email })
    return response.data
  },

  async createAdmin(data: RegisterData): Promise<User> {
    const response = await api.post<User>('/auth/create-admin', data)
    return response.data
  },

  async checkLocalhost(): Promise<{ is_localhost: boolean; client_host: string | null }> {
    const response = await api.get('/auth/localhost-check')
    return response.data
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token')
  },

  getErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      return error.message
    }
    if (error instanceof Error) {
      return error.message
    }
    return 'An unexpected error occurred. Please try again.'
  },
}

export default authService
