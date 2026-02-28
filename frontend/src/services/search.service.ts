import api from './api'

export interface SearchResult {
  id: number
  type: 'income' | 'expense' | 'goal' | 'budget' | 'investment' | 'debt' | 'recurring'
  title: string
  description?: string
  amount?: number
  date?: string
  category?: string
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
}

export const searchService = {
  async search(query: string, limit: number = 10): Promise<SearchResponse> {
    const response = await api.get<SearchResponse>('/search', {
      params: { q: query, limit }
    })
    return response.data
  },
}
