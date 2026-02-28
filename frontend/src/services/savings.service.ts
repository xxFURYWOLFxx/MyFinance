import api from './api'
import type { SavingsAccount, SavingsTransaction } from '@/types'

export interface CreateAccountData {
  name: string
  account_type?: string
  institution?: string
  currency?: string
  initial_balance?: number
}

export interface UpdateAccountData {
  name?: string
  account_type?: string
  institution?: string
  currency?: string
  is_active?: boolean
}

export interface CreateTransactionData {
  account_id?: number
  date: string
  transaction_type: 'deposit' | 'withdrawal' | 'transfer' | 'interest'
  amount: number
  description?: string
  notes?: string
}

export const savingsService = {
  // Accounts
  async getAccounts(includeInactive = false) {
    const response = await api.get<SavingsAccount[]>('/savings/accounts', {
      params: { include_inactive: includeInactive }
    })
    return response.data
  },

  async getAccountById(id: number) {
    const response = await api.get<SavingsAccount>(`/savings/accounts/${id}`)
    return response.data
  },

  async createAccount(data: CreateAccountData) {
    const response = await api.post<SavingsAccount>('/savings/accounts', data)
    return response.data
  },

  async updateAccount(id: number, data: UpdateAccountData) {
    const response = await api.put<SavingsAccount>(`/savings/accounts/${id}`, data)
    return response.data
  },

  async deleteAccount(id: number) {
    await api.delete(`/savings/accounts/${id}`)
  },

  // Transactions
  async getTransactions(accountId?: number) {
    const response = await api.get<SavingsTransaction[]>('/savings/transactions', {
      params: { account_id: accountId }
    })
    return response.data
  },

  async createTransaction(data: CreateTransactionData) {
    const response = await api.post<SavingsTransaction>('/savings/transactions', data)
    return response.data
  },

  async deleteTransaction(id: number) {
    await api.delete(`/savings/transactions/${id}`)
  },
}
