import api from './api'
import type { InvestmentHolding, InvestmentTransaction, InvestmentSummary } from '@/types'

export interface CreateHoldingData {
  symbol: string
  name: string
  holding_type: 'stock' | 'etf' | 'crypto' | 'bond' | 'reit' | 'other'
  quantity: number
  average_cost: number
  current_price: number
}

export interface UpdateHoldingData {
  symbol?: string
  name?: string
  holding_type?: 'stock' | 'etf' | 'crypto' | 'bond' | 'reit' | 'other'
  quantity?: number
  average_cost?: number
  current_price?: number
}

export interface CreateTransactionData {
  holding_id: number
  transaction_type: 'buy' | 'sell' | 'dividend' | 'split'
  quantity: number
  price: number
  date: string
  fees?: number
  notes?: string
}

export interface SearchResult {
  symbol: string
  baseSymbol: string
  name: string
  type: string
  exchange?: string
  price?: number
  change?: number
  changePercent?: number
  coin_id?: string
}

export interface ChartDataPoint {
  timestamp: number
  price: number
  open?: number
  high?: number
  low?: number
  close?: number
  volume?: number
}

export interface ChartData {
  symbol: string
  name: string
  currency: string
  period: string
  interval?: string
  data: ChartDataPoint[]
  currentPrice?: number
  previousClose?: number
  type?: string
  error?: string  // API may return error message when rate limited
}

export interface FavoriteAsset {
  id: number
  user_id: number
  symbol: string
  name: string | null
  asset_type: string
  display_order: number
  created_at: string
}

export interface PopularAsset {
  symbol: string
  name: string
  icon?: string
  asset_type: string
  is_favorite: boolean
}

export interface UserInvestmentSettings {
  id: number
  user_id: number
  default_chart_type: string
  default_period: string
  default_interval: string
  default_candle_count: number
  auto_refresh_interval: number
  show_volume: boolean
  show_indicators: boolean
  created_at: string
  updated_at: string
}

// Simple in-memory cache for search results
const searchCache = new Map<string, { results: SearchResult[], timestamp: number }>()
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

// Chart data cache - configurable to avoid rate limiting while allowing real-time updates
const chartCache = new Map<string, { data: ChartData, timestamp: number }>()
const CHART_CACHE_TTL = 5 * 60 * 1000 // 5 minutes default
const CHART_CACHE_TTL_REALTIME = 10 * 1000 // 10 seconds for real-time intervals (allows 5s/10s refresh)

export const investmentsService = {
  async getAll() {
    const response = await api.get<InvestmentHolding[]>('/investments')
    return response.data
  },

  async getSummary() {
    const response = await api.get<InvestmentSummary>('/investments/summary')
    return response.data
  },

  async getById(id: number) {
    const response = await api.get<InvestmentHolding>(`/investments/${id}`)
    return response.data
  },

  async create(data: CreateHoldingData) {
    const response = await api.post<InvestmentHolding>('/investments', data)
    return response.data
  },

  async update(id: number, data: UpdateHoldingData) {
    const response = await api.put<InvestmentHolding>(`/investments/${id}`, data)
    return response.data
  },

  async delete(id: number) {
    await api.delete(`/investments/${id}`)
  },

  // Transactions
  async getTransactions(holdingId: number) {
    const response = await api.get<InvestmentTransaction[]>(`/investments/${holdingId}/transactions`)
    return response.data
  },

  async createTransaction(data: CreateTransactionData) {
    const response = await api.post<InvestmentTransaction>('/investments/transactions', data)
    return response.data
  },

  // Real-time price lookup
  async lookupPrice(symbol: string, assetType?: string): Promise<{
    symbol: string
    name: string
    price: number
    change: number
    changePercent: number
    currency: string
    type?: string
  }> {
    const params = assetType ? { asset_type: assetType } : {}
    const response = await api.get(`/investments/lookup/${encodeURIComponent(symbol)}`, {
      params,
      timeout: 15000,
    })
    return response.data
  },

  // Search for symbols with caching
  async searchSymbols(query: string, includePrices = true): Promise<{ results: SearchResult[] }> {
    const cacheKey = `${query.toUpperCase()}_${includePrices}`
    const cached = searchCache.get(cacheKey)

    // Return cached results if still valid
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return { results: cached.results }
    }

    const response = await api.get(`/investments/search/${encodeURIComponent(query)}`, {
      params: { include_prices: includePrices },
      timeout: 15000,
    })

    // Cache the results
    searchCache.set(cacheKey, {
      results: response.data.results,
      timestamp: Date.now(),
    })

    return response.data
  },

  // Get chart data with caching
  async getChartData(
    symbol: string,
    period = '1m',
    assetType?: string,
    interval?: string,
    maxCandles?: number,
    bypassCache = false
  ): Promise<ChartData> {
    const cacheKey = `${symbol}_${period}_${interval || ''}_${assetType || ''}_${maxCandles || ''}`

    // Check cache unless bypassing
    if (!bypassCache) {
      const cached = chartCache.get(cacheKey)
      // Shorter cache for real-time intervals to allow frequent updates
      const isRealtime = interval && ['1m', '3m', '5m'].includes(interval)
      const cacheTTL = isRealtime ? CHART_CACHE_TTL_REALTIME : CHART_CACHE_TTL

      if (cached && Date.now() - cached.timestamp < cacheTTL) {
        return cached.data
      }
    }

    const params: Record<string, string | number> = { period }
    if (assetType) params.asset_type = assetType
    if (interval) params.interval = interval
    if (maxCandles && maxCandles > 0) params.max_candles = maxCandles

    const response = await api.get(`/investments/chart/${encodeURIComponent(symbol)}`, {
      params,
      timeout: 30000, // Longer timeout for large data requests
    })

    // Cache the data
    chartCache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now(),
    })

    return response.data
  },

  // Clear caches (useful when data might be stale)
  clearCache() {
    searchCache.clear()
    chartCache.clear()
  },

  // ============ Favorites API ============

  async getFavorites(assetType?: string): Promise<FavoriteAsset[]> {
    const params = assetType ? { asset_type: assetType } : {}
    const response = await api.get<FavoriteAsset[]>('/investments/favorites', { params })
    return response.data
  },

  async addFavorite(data: { symbol: string; name?: string; asset_type: string }): Promise<FavoriteAsset> {
    const response = await api.post<FavoriteAsset>('/investments/favorites', data)
    return response.data
  },

  async removeFavorite(symbol: string): Promise<void> {
    await api.delete(`/investments/favorites/${encodeURIComponent(symbol)}`)
  },

  async getPopularAssets(assetType: string): Promise<{
    favorites: PopularAsset[]
    popular: PopularAsset[]
  }> {
    const response = await api.get(`/investments/popular/${assetType}`)
    return response.data
  },

  // ============ Settings API ============

  async getSettings(): Promise<UserInvestmentSettings> {
    const response = await api.get<UserInvestmentSettings>('/investments/settings')
    return response.data
  },

  async updateSettings(settings: Partial<UserInvestmentSettings>): Promise<UserInvestmentSettings> {
    const response = await api.put<UserInvestmentSettings>('/investments/settings', settings)
    return response.data
  },

  // Refresh all prices
  async refreshPrices(): Promise<{
    updated: number
    failed: number
    updates?: Array<{
      id: number
      symbol: string
      old_price: number
      new_price: number
      change: number
      changePercent: number
    }>
    errors?: string[]
  }> {
    const response = await api.post('/investments/refresh-prices', null, {
      timeout: 60000,
    })
    return response.data
  },
}
