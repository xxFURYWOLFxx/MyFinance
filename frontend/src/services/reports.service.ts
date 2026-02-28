import api from './api'

export interface ReportsSummary {
  total_income: number
  total_expenses: number
  net_savings: number
  savings_rate: number
  start_date: string
  end_date: string
}

export interface MonthlyData {
  month: string
  month_num: number
  income: number
  expenses: number
  net: number
}

export interface CategoryData {
  category: string
  amount: number
  percentage: number
}

export interface NetWorthHistory {
  month: string
  year: number
  net_worth: number
}

export interface CashFlowData {
  month: string
  year: number
  inflow: number
  outflow: number
  net_flow: number
}

export interface YearComparison {
  current_year: number
  last_year: number
  current_income: number
  last_income: number
  income_change: number
  current_expenses: number
  last_expenses: number
  expense_change: number
  current_net: number
  last_net: number
}

export const reportsService = {
  getSummary: async (startDate?: string, endDate?: string): Promise<ReportsSummary> => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    const response = await api.get(`/reports/summary?${params.toString()}`)
    return response.data
  },

  getMonthlyData: async (year?: number): Promise<MonthlyData[]> => {
    const params = year ? `?year=${year}` : ''
    const response = await api.get(`/reports/monthly${params}`)
    return response.data
  },

  getCategoryBreakdown: async (
    transactionType: 'income' | 'expense' = 'expense',
    startDate?: string,
    endDate?: string
  ): Promise<CategoryData[]> => {
    const params = new URLSearchParams()
    params.append('transaction_type', transactionType)
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    const response = await api.get(`/reports/categories?${params.toString()}`)
    return response.data
  },

  getNetWorthHistory: async (months: number = 12): Promise<NetWorthHistory[]> => {
    const response = await api.get(`/reports/net-worth-history?months=${months}`)
    return response.data
  },

  getCashFlow: async (months: number = 6): Promise<CashFlowData[]> => {
    const response = await api.get(`/reports/cash-flow?months=${months}`)
    return response.data
  },

  getYearComparison: async (): Promise<YearComparison> => {
    const response = await api.get('/reports/year-comparison')
    return response.data
  },
}
