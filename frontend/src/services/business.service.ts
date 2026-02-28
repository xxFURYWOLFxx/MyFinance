import api from './api'
import type { BusinessIncome, BusinessSummary } from '@/types'

export interface CreateInvoiceData {
  invoice_number?: string
  client: string
  description?: string
  amount: number
  currency?: string
  date: string
  due_date?: string
  status?: 'pending' | 'paid' | 'overdue' | 'partial' | 'cancelled'
  notes?: string
}

export interface UpdateInvoiceData {
  invoice_number?: string
  client?: string
  description?: string
  amount?: number
  currency?: string
  date?: string
  due_date?: string
  status?: 'pending' | 'paid' | 'overdue' | 'partial' | 'cancelled'
  notes?: string
}

export const businessService = {
  async getAll(status?: string) {
    const response = await api.get<BusinessIncome[]>('/business', { params: { status } })
    return response.data
  },

  async getSummary() {
    const response = await api.get<BusinessSummary>('/business/summary')
    return response.data
  },

  async getById(id: number) {
    const response = await api.get<BusinessIncome>(`/business/${id}`)
    return response.data
  },

  async create(data: CreateInvoiceData) {
    const response = await api.post<BusinessIncome>('/business', data)
    return response.data
  },

  async update(id: number, data: UpdateInvoiceData) {
    const response = await api.put<BusinessIncome>(`/business/${id}`, data)
    return response.data
  },

  async delete(id: number) {
    await api.delete(`/business/${id}`)
  },
}
