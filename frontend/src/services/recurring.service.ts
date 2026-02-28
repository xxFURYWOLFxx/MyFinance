import api from './api'
import type { RecurringTransaction, RecurringSummary } from '@/types'

export interface CreateRecurringData {
  name: string
  transaction_type: 'income' | 'expense'
  category: string
  amount: number
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
  start_date: string
  next_occurrence?: string
  end_date?: string
}

export interface UpdateRecurringData {
  name?: string
  transaction_type?: 'income' | 'expense'
  category?: string
  amount?: number
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
  start_date?: string
  next_occurrence?: string
  end_date?: string
  is_active?: boolean
}

export const recurringService = {
  async getAll(transactionType?: string, includeInactive = false) {
    const response = await api.get<RecurringTransaction[]>('/recurring', {
      params: { transaction_type: transactionType, include_inactive: includeInactive }
    })
    return response.data
  },

  async getSummary() {
    const response = await api.get<RecurringSummary>('/recurring/summary')
    return response.data
  },

  async getById(id: number) {
    const response = await api.get<RecurringTransaction>(`/recurring/${id}`)
    return response.data
  },

  async create(data: CreateRecurringData) {
    const response = await api.post<RecurringTransaction>('/recurring', data)
    return response.data
  },

  async update(id: number, data: UpdateRecurringData) {
    const response = await api.put<RecurringTransaction>(`/recurring/${id}`, data)
    return response.data
  },

  async delete(id: number) {
    await api.delete(`/recurring/${id}`)
  },
}
