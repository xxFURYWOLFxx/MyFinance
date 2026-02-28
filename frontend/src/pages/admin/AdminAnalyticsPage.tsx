import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Loader2,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { adminService, type SystemAnalytics, type AdminStats } from '@/services/admin.service'

export function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<SystemAnalytics | null>(null)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [period, setPeriod] = useState('30d')

  useEffect(() => {
    loadData()
  }, [period])

  async function loadData() {
    try {
      setLoading(true)
      const [analyticsRes, statsRes] = await Promise.all([
        adminService.getAnalytics(period),
        adminService.getStats(),
      ])
      setAnalytics(analyticsRes)
      setStats(statsRes)
    } catch (err) {
      console.error('Failed to load analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  const periodLabels: Record<string, string> = {
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    '1y': 'Last Year',
  }

  function getChangeIndicator(current: number, previous: number) {
    if (previous === 0) return { pct: current > 0 ? 100 : 0, isUp: current > 0 }
    const pct = ((current - previous) / previous) * 100
    return { pct: Math.abs(pct), isUp: pct >= 0 }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm">Detailed system metrics and trends</p>
        </div>
        <div className="flex gap-2">
          {['7d', '30d', '90d', '1y'].map((range) => (
            <Button
              key={range}
              variant={period === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(range)}
              className={period === range
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0'
                : 'border-white/10 hover:bg-white/5'
              }
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        </div>
      ) : analytics ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(() => {
              const userChange = getChangeIndicator(analytics.user_growth.current, analytics.user_growth.previous)
              return (
                <Card className="glass-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">New Users</p>
                      <div className="p-2 rounded-lg bg-blue-500/20">
                        <Users className="h-4 w-4 text-blue-400" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold">{analytics.user_growth.current}</p>
                    <div className={`flex items-center gap-1 text-xs mt-1 ${userChange.isUp ? 'text-green-400' : 'text-red-400'}`}>
                      {userChange.isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {userChange.pct.toFixed(1)}% vs previous period
                    </div>
                  </CardContent>
                </Card>
              )
            })()}

            {(() => {
              const volChange = getChangeIndicator(analytics.transaction_volume.current, analytics.transaction_volume.previous)
              return (
                <Card className="glass-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">Transaction Volume</p>
                      <div className="p-2 rounded-lg bg-purple-500/20">
                        <DollarSign className="h-4 w-4 text-purple-400" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold">{formatCurrency(analytics.transaction_volume.current)}</p>
                    <div className={`flex items-center gap-1 text-xs mt-1 ${volChange.isUp ? 'text-green-400' : 'text-red-400'}`}>
                      {volChange.isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {volChange.pct.toFixed(1)}% vs previous period
                    </div>
                  </CardContent>
                </Card>
              )
            })()}

            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Income</p>
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-green-400">{formatCurrency(analytics.transaction_volume.income)}</p>
                <p className="text-xs text-muted-foreground mt-1">{periodLabels[period]}</p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Expenses</p>
                  <div className="p-2 rounded-lg bg-red-500/20">
                    <TrendingDown className="h-4 w-4 text-red-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-red-400">{formatCurrency(analytics.transaction_volume.expenses)}</p>
                <p className="text-xs text-muted-foreground mt-1">{periodLabels[period]}</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Comparison */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-blue-400" />
                  User Growth
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Current Period</span>
                    <span className="font-medium">+{analytics.user_growth.current} users</span>
                  </div>
                  <div className="h-3 bg-secondary/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((analytics.user_growth.current / Math.max(analytics.user_growth.current, analytics.user_growth.previous, 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Previous Period</span>
                    <span className="font-medium">+{analytics.user_growth.previous} users</span>
                  </div>
                  <div className="h-3 bg-secondary/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-gray-500 to-gray-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((analytics.user_growth.previous / Math.max(analytics.user_growth.current, analytics.user_growth.previous, 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="pt-2 border-t border-white/5">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Change: </span>
                    <span className={analytics.user_growth.change >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {analytics.user_growth.change >= 0 ? '+' : ''}{analytics.user_growth.change.toFixed(1)}%
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5 text-purple-400" />
                  Transaction Volume
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Current Period</span>
                    <span className="font-medium">{formatCurrency(analytics.transaction_volume.current)}</span>
                  </div>
                  <div className="h-3 bg-secondary/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((analytics.transaction_volume.current / Math.max(analytics.transaction_volume.current, analytics.transaction_volume.previous, 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Previous Period</span>
                    <span className="font-medium">{formatCurrency(analytics.transaction_volume.previous)}</span>
                  </div>
                  <div className="h-3 bg-secondary/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-gray-500 to-gray-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((analytics.transaction_volume.previous / Math.max(analytics.transaction_volume.current, analytics.transaction_volume.previous, 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="pt-2 border-t border-white/5">
                  <div className="flex gap-4 text-sm">
                    <span>
                      <span className="text-muted-foreground">Income: </span>
                      <span className="text-green-400">{formatCurrency(analytics.transaction_volume.income)}</span>
                    </span>
                    <span>
                      <span className="text-muted-foreground">Expenses: </span>
                      <span className="text-red-400">{formatCurrency(analytics.transaction_volume.expenses)}</span>
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Platform Stats */}
          {stats && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Platform Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold">{stats.total_users}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Users</p>
                    <p className="text-2xl font-bold text-green-400">{stats.active_users}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">New Today</p>
                    <p className="text-2xl font-bold text-blue-400">+{stats.new_users_today}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Transactions</p>
                    <p className="text-2xl font-bold">{stats.total_transactions.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Volume</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats.total_volume)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Balance/User</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats.avg_user_balance)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No analytics data available</p>
        </div>
      )}
    </div>
  )
}

export default AdminAnalyticsPage
