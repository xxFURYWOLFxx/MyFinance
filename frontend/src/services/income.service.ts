import api from './api'
import type { Income, IncomeSummary } from '@/types'

export interface CreateIncomeData {
  date: string
  source: string
  category: string
  amount: number
  currency?: string
  payment_method?: string
  notes?: string
}

export interface UpdateIncomeData {
  date?: string
  source?: string
  category?: string
  amount?: number
  currency?: string
  payment_method?: string
  notes?: string
}

export const incomeService = {
  async getAll(params?: { category?: string; start_date?: string; end_date?: string }) {
    const response = await api.get<Income[]>('/income', { params })
    return response.data
  },

  async getSummary(params?: { start_date?: string; end_date?: string }) {
    const response = await api.get<IncomeSummary>('/income/summary', { params })
    return response.data
  },

  async getById(id: number) {
    const response = await api.get<Income>(`/income/${id}`)
    return response.data
  },

  async create(data: CreateIncomeData) {
    const response = await api.post<Income>('/income', data)
    return response.data
  },

  async update(id: number, data: UpdateIncomeData) {
    const response = await api.put<Income>(`/income/${id}`, data)
    return response.data
  },

  async delete(id: number) {
    await api.delete(`/income/${id}`)
  },
}
