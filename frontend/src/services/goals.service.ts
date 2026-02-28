import api from './api'
import type { Goal, GoalContribution } from '@/types'

export interface CreateGoalData {
  name: string
  category: string
  target_amount: number
  current_amount?: number
  target_date?: string
  monthly_contribution?: number
}

export interface UpdateGoalData {
  name?: string
  category?: string
  target_amount?: number
  current_amount?: number
  target_date?: string
  monthly_contribution?: number
  status?: 'in_progress' | 'completed' | 'paused' | 'cancelled'
}

export interface CreateContributionData {
  goal_id: number
  amount: number
  date: string
  notes?: string
}

export const goalsService = {
  async getAll(status?: string) {
    const response = await api.get<Goal[]>('/goals', { params: { status } })
    return response.data
  },

  async getById(id: number) {
    const response = await api.get<Goal>(`/goals/${id}`)
    return response.data
  },

  async create(data: CreateGoalData) {
    const response = await api.post<Goal>('/goals', data)
    return response.data
  },

  async update(id: number, data: UpdateGoalData) {
    const response = await api.put<Goal>(`/goals/${id}`, data)
    return response.data
  },

  async delete(id: number) {
    await api.delete(`/goals/${id}`)
  },

  // Contributions
  async getContributions(goalId: number) {
    const response = await api.get<GoalContribution[]>(`/goals/${goalId}/contributions`)
    return response.data
  },

  async addContribution(goalId: number, data: CreateContributionData) {
    const response = await api.post<GoalContribution>(`/goals/${goalId}/contributions`, data)
    return response.data
  },
}
