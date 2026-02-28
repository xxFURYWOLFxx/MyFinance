import api from './api'
import type { Debt, DebtPayment, DebtSummary } from '@/types'

export interface CreateDebtData {
  name: string
  debt_type: 'credit_card' | 'mortgage' | 'auto' | 'student' | 'personal' | 'other'
  original_amount: number
  current_balance: number
  interest_rate: number
  minimum_payment: number
  due_day?: number
}

export interface UpdateDebtData {
  name?: string
  debt_type?: 'credit_card' | 'mortgage' | 'auto' | 'student' | 'personal' | 'other'
  original_amount?: number
  current_balance?: number
  interest_rate?: number
  minimum_payment?: number
  due_day?: number
  is_active?: boolean
}

export interface CreatePaymentData {
  debt_id: number
  amount: number
  date: string
  notes?: string
}

export const debtsService = {
  async getAll(includeInactive = false) {
    const response = await api.get<Debt[]>('/debts', {
      params: { include_inactive: includeInactive }
    })
    return response.data
  },

  async getSummary() {
    const response = await api.get<DebtSummary>('/debts/summary')
    return response.data
  },

  async getById(id: number) {
    const response = await api.get<Debt>(`/debts/${id}`)
    return response.data
  },

  async create(data: CreateDebtData) {
    const response = await api.post<Debt>('/debts', data)
    return response.data
  },

  async update(id: number, data: UpdateDebtData) {
    const response = await api.put<Debt>(`/debts/${id}`, data)
    return response.data
  },

  async delete(id: number) {
    await api.delete(`/debts/${id}`)
  },

  // Payments
  async getPayments(debtId: number) {
    const response = await api.get<DebtPayment[]>(`/debts/${debtId}/payments`)
    return response.data
  },

  async addPayment(debtId: number, data: CreatePaymentData) {
    const response = await api.post<DebtPayment>(`/debts/${debtId}/payments`, data)
    return response.data
  },
}
