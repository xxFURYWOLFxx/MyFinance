import api from './api'
import type { Budget } from '@/types'

export interface CreateBudgetData {
  name: string
  category: string
  amount: number
  period?: 'weekly' | 'monthly' | 'yearly'
  alert_threshold?: number
}

export interface UpdateBudgetData {
  name?: string
  category?: string
  amount?: number
  period?: 'weekly' | 'monthly' | 'yearly'
  alert_threshold?: number
  is_active?: boolean
}

export const budgetsService = {
  async getAll(includeInactive = false) {
    const response = await api.get<Budget[]>('/budgets', {
      params: { include_inactive: includeInactive }
    })
    return response.data
  },

  async getById(id: number) {
    const response = await api.get<Budget>(`/budgets/${id}`)
    return response.data
  },

  async create(data: CreateBudgetData) {
    const response = await api.post<Budget>('/budgets', data)
    return response.data
  },

  async update(id: number, data: UpdateBudgetData) {
    const response = await api.put<Budget>(`/budgets/${id}`, data)
    return response.data
  },

  async delete(id: number) {
    await api.delete(`/budgets/${id}`)
  },
}
