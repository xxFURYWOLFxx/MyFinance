import api from './api'
import type { DashboardStats, CategoryBreakdown, Transaction } from '@/types'

export const dashboardService = {
  async getSummary() {
    const response = await api.get<DashboardStats>('/dashboard/summary')
    return response.data
  },

  async getExpensesByCategory() {
    const response = await api.get<CategoryBreakdown[]>('/dashboard/expenses-by-category')
    return response.data
  },

  async getRecentTransactions(limit = 10) {
    const response = await api.get<Transaction[]>('/dashboard/recent-transactions', {
      params: { limit }
    })
    return response.data
  },
}
