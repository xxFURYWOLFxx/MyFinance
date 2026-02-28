import api from './api'

export interface ForecastSummary {
  current_balance: number
  projected_balance: number
  monthly_income: number
  monthly_expenses: number
  monthly_savings: number
  savings_rate: number
  time_to_goal: number
  goal_target: number
}

export interface MonthlyProjection {
  month: string
  year: number
  balance: number
  projected_income: number
  projected_expenses: number
}

export interface ForecastInsight {
  type: 'positive' | 'warning' | 'tip'
  message: string
}

export interface ScenarioResult {
  current_balance: number
  monthly_savings: number
  savings_rate: number
  time_to_goal: number
  projected_at_timeframe: number
  goal_achievable: boolean
  shortfall: number
}

export interface ScenarioInput {
  monthly_income: number
  monthly_expenses: number
  savings_goal: number
  timeframe_months?: number
}

export const forecastingService = {
  getSummary: async (): Promise<ForecastSummary> => {
    const response = await api.get('/forecasting/summary')
    return response.data
  },

  getProjection: async (months: number = 12): Promise<MonthlyProjection[]> => {
    const response = await api.get(`/forecasting/projection?months=${months}`)
    return response.data
  },

  getInsights: async (): Promise<ForecastInsight[]> => {
    const response = await api.get('/forecasting/insights')
    return response.data
  },

  calculateScenario: async (input: ScenarioInput): Promise<ScenarioResult> => {
    const params = new URLSearchParams()
    params.append('monthly_income', input.monthly_income.toString())
    params.append('monthly_expenses', input.monthly_expenses.toString())
    params.append('savings_goal', input.savings_goal.toString())
    if (input.timeframe_months) {
      params.append('timeframe_months', input.timeframe_months.toString())
    }
    const response = await api.post(`/forecasting/scenario?${params.toString()}`)
    return response.data
  },
}
