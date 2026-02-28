import api from './api'
import type { Expense, ExpenseSummary } from '@/types'

export interface CreateExpenseData {
  date: string
  description: string
  category: string
  amount: number
  currency?: string
  payment_method?: string
  notes?: string
}

export interface UpdateExpenseData {
  date?: string
  description?: string
  category?: string
  amount?: number
  currency?: string
  payment_method?: string
  notes?: string
}

export const expensesService = {
  async getAll(params?: { category?: string; start_date?: string; end_date?: string }) {
    const response = await api.get<Expense[]>('/expenses', { params })
    return response.data
  },

  async getSummary(params?: { start_date?: string; end_date?: string }) {
    const response = await api.get<ExpenseSummary>('/expenses/summary', { params })
    return response.data
  },

  async getById(id: number) {
    const response = await api.get<Expense>(`/expenses/${id}`)
    return response.data
  },

  async create(data: CreateExpenseData) {
    const response = await api.post<Expense>('/expenses', data)
    return response.data
  },

  async update(id: number, data: UpdateExpenseData) {
    const response = await api.put<Expense>(`/expenses/${id}`, data)
    return response.data
  },

  async delete(id: number) {
    await api.delete(`/expenses/${id}`)
  },
}
