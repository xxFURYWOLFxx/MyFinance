import api from './api'

export interface MonthlyArchive {
  month: string
  month_number: number
  year: number
  income: number
  expenses: number
  net: number
  savings_rate: number
  top_category: string
  top_category_amount: number
}

export interface ArchiveSummary {
  year: number
  total_income: number
  total_expenses: number
  net_saved: number
  avg_savings_rate: number
  month_count: number
}

export interface MonthDetailItem {
  source?: string
  description?: string
  category: string
  amount: number
  date: string
}

export interface CategoryBreakdown {
  category: string
  amount: number
  percentage: number
}

export interface MonthDetail {
  month: string
  year: number
  total_income: number
  total_expenses: number
  net: number
  savings_rate: number
  income_count: number
  expense_count: number
  income_items: MonthDetailItem[]
  expense_items: MonthDetailItem[]
  category_breakdown: CategoryBreakdown[]
}

export const archiveService = {
  getMonthlyArchives: async (year?: number): Promise<MonthlyArchive[]> => {
    const params = year ? `?year=${year}` : ''
    const response = await api.get(`/archive${params}`)
    return response.data
  },

  getSummary: async (year?: number): Promise<ArchiveSummary> => {
    const params = year ? `?year=${year}` : ''
    const response = await api.get(`/archive/summary${params}`)
    return response.data
  },

  getAvailableYears: async (): Promise<number[]> => {
    const response = await api.get('/archive/years')
    return response.data
  },

  getMonthDetail: async (year: number, month: number): Promise<MonthDetail> => {
    const response = await api.get(`/archive/${year}/${month}`)
    return response.data
  },

  exportMonth: async (year: number, month: number, format: 'json' | 'csv' = 'json'): Promise<string> => {
    const response = await api.get(`/archive/${year}/${month}/export`, {
      params: { format },
      responseType: format === 'csv' ? 'text' : 'json',
    })
    return format === 'json' ? JSON.stringify(response.data, null, 2) : response.data
  },
}
