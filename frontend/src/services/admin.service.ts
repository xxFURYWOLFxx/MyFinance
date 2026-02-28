import api from './api'

export interface AdminStats {
  total_users: number
  active_users: number
  new_users_today: number
  total_transactions: number
  total_volume: number
  avg_user_balance: number
}

export interface AdminUser {
  id: number
  email: string
  name: string
  role: 'user' | 'admin'
  status: 'active' | 'inactive' | 'suspended'
  last_login: string | null
  total_balance: number
  transactions: number
  created_at: string
}

export interface UserDetail {
  id: number
  email: string
  first_name: string | null
  last_name: string | null
  role: 'user' | 'admin'
  is_active: boolean
  created_at: string
  last_login_at: string | null
  base_currency: string
  timezone: string
  financial_summary: {
    total_income: number
    total_expenses: number
    net_balance: number
    total_savings: number
    income_count: number
    expense_count: number
  }
}

export interface ActivityItem {
  type: 'signup' | 'login' | 'transaction'
  user: string
  user_id: number
  timestamp: string
  details: {
    amount?: number
    transaction_type?: 'income' | 'expense'
  } | null
}

export interface SystemAnalytics {
  period: string
  user_growth: {
    current: number
    previous: number
    change: number
  }
  transaction_volume: {
    current: number
    previous: number
    income: number
    expenses: number
  }
}

export interface SystemAlert {
  type: 'warning' | 'info' | 'error'
  title: string
  message: string
}

export interface SecuritySettings {
  access_token_expire_minutes: number
  refresh_token_expire_days: number
  ip_binding_enabled: boolean
}

export const adminService = {
  getStats: async (): Promise<AdminStats> => {
    const response = await api.get('/admin/stats')
    return response.data
  },

  getUsers: async (
    skip: number = 0,
    limit: number = 50,
    search?: string,
    status?: string
  ): Promise<AdminUser[]> => {
    const params = new URLSearchParams()
    params.append('skip', skip.toString())
    params.append('limit', limit.toString())
    if (search) params.append('search', search)
    if (status) params.append('status', status)
    const response = await api.get(`/admin/users?${params.toString()}`)
    return response.data
  },

  getUserDetail: async (userId: number): Promise<UserDetail> => {
    const response = await api.get(`/admin/users/${userId}`)
    return response.data
  },

  updateUserStatus: async (userId: number, isActive: boolean): Promise<{ message: string }> => {
    const response = await api.put(`/admin/users/${userId}/status?is_active=${isActive}`)
    return response.data
  },

  updateUserRole: async (userId: number, role: 'user' | 'admin'): Promise<{ message: string }> => {
    const response = await api.put(`/admin/users/${userId}/role?role=${role}`)
    return response.data
  },

  getActivity: async (limit: number = 20): Promise<ActivityItem[]> => {
    const response = await api.get(`/admin/activity?limit=${limit}`)
    return response.data
  },

  getAnalytics: async (period: string = '7d'): Promise<SystemAnalytics> => {
    const response = await api.get(`/admin/analytics?period=${period}`)
    return response.data
  },

  getAlerts: async (): Promise<SystemAlert[]> => {
    const response = await api.get('/admin/alerts')
    return response.data
  },

  getSecuritySettings: async (): Promise<SecuritySettings> => {
    const response = await api.get('/admin/security-settings')
    return response.data
  },

  updateSecuritySettings: async (data: Partial<SecuritySettings>): Promise<SecuritySettings> => {
    const response = await api.put('/admin/security-settings', data)
    return response.data
  },
}
