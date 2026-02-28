import api from './api'
import type { User } from '@/types'

export interface UserUpdate {
  first_name?: string
  last_name?: string
  base_currency?: string
  timezone?: string
}

export interface PasswordChange {
  current_password: string
  new_password: string
}

export const settingsService = {
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me')
    return response.data
  },

  updateProfile: async (data: UserUpdate): Promise<User> => {
    const response = await api.put('/auth/me', data)
    return response.data
  },

  changePassword: async (data: PasswordChange): Promise<{ message: string }> => {
    const response = await api.put('/auth/change-password', data)
    return response.data
  },

  deleteAccount: async (): Promise<{ message: string }> => {
    const response = await api.delete('/auth/me')
    return response.data
  },

  exportData: async (format: 'json' | 'csv' = 'json'): Promise<string> => {
    const response = await api.get('/export', {
      params: { format },
      responseType: format === 'csv' ? 'text' : 'json',
    })
    if (format === 'json') {
      return JSON.stringify(response.data, null, 2)
    }
    return response.data
  },
}
