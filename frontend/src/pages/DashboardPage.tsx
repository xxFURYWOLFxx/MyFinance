import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { dashboardService } from '@/services/dashboard.service'
import type { DashboardStats, CategoryBreakdown, Transaction } from '@/types'
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  CreditCard,
  Target,
  Zap,
} from 'lucide-react'

const categoryColors: Record<string, string> = {
  'Housing': 'from-purple-500 to-purple-600',
  'Food': 'from-blue-500 to-blue-600',
  'Transport': 'from-cyan-500 to-cyan-600',
  'Entertainment': 'from-pink-500 to-pink-600',
  'Utilities': 'from-orange-500 to-orange-600',
  'Healthcare': 'from-red-500 to-red-600',
  'Shopping': 'from-yellow-500 to-yellow-600',
  'Education': 'from-indigo-500 to-indigo-600',
}

function StatCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  gradient,
  loading,
}: {
  title: string
  value: string
  change?: string
  changeType?: 'positive' | 'negative'
  icon: React.ElementType
  gradient: string
  loading?: boolean
}) {
  return (
    <div className="glass-card rounded-2xl p-6 stat-card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
          ) : (
            <p className="text-2xl font-bold text-foreground">{value}</p>
          )}
          {change && !loading && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${
              changeType === 'positive' ? 'text-green-400' : 'text-red-400'
            }`}>
              {changeType === 'positive' ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              <span>{change} vs last month</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [expenseBreakdown, setExpenseBreakdown] = useState<CategoryBreakdown[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])

  const greeting = getGreeting()

  function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      setLoading(true)
      const [summaryData, expensesData, transactionsData] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getExpensesByCategory(),
        dashboardService.getRecentTransactions(5),
      ])
      setStats(summaryData)
      setExpenseBreakdown(expensesData)
      setRecentTransactions(transactionsData)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const defaultStats: DashboardStats = {
    total_income: 0,
    income_change: 0,
    total_expenses: 0,
    expense_change: 0,
    total_savings: 0,
    net_worth: 0,
    goals_progress: 0,
    active_goals: 0,
  }

  const displayStats = stats || defaultStats

  // Calculate derived stats
  const monthNet = displayStats.total_income - displayStats.total_expenses
  const savingsRate = displayStats.total_income > 0
    ? (monthNet / displayStats.total_income) * 100
    : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {greeting}, {user?.first_name || 'there'}! <span className="wave">👋</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your finances today.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl glass-card">
          <Zap className="h-4 w-4 text-yellow-400" />
          <span className="text-sm">
            Net Worth: <span className="font-bold text-foreground">{formatCurrency(displayStats.net_worth)}</span>
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Monthly Income"
          value={formatCurrency(displayStats.total_income)}
          change={displayStats.income_change !== 0 ? `${Math.abs(displayStats.income_change).toFixed(1)}%` : undefined}
          changeType={displayStats.income_change >= 0 ? 'positive' : 'negative'}
          icon={TrendingUp}
          gradient="from-green-500 to-emerald-600"
          loading={loading}
        />
        <StatCard
          title="Monthly Expenses"
          value={formatCurrency(displayStats.total_expenses)}
          change={displayStats.expense_change !== 0 ? `${Math.abs(displayStats.expense_change).toFixed(1)}%` : undefined}
          changeType={displayStats.expense_change <= 0 ? 'positive' : 'negative'}
          icon={TrendingDown}
          gradient="from-red-500 to-rose-600"
          loading={loading}
        />
        <StatCard
          title="Net Savings"
          value={formatCurrency(monthNet)}
          icon={PiggyBank}
          gradient="from-purple-500 to-violet-600"
          loading={loading}
        />
        <StatCard
          title="Savings Rate"
          value={`${savingsRate.toFixed(1)}%`}
          icon={Target}
          gradient="from-blue-500 to-cyan-600"
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Expense Breakdown */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-6">Expense Breakdown</h3>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 bg-white/5 animate-pulse rounded" />
              ))}
            </div>
          ) : expenseBreakdown.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No expense data available</p>
              <p className="text-sm mt-1">Add some expenses to see the breakdown</p>
            </div>
          ) : (
            <div className="space-y-4">
              {expenseBreakdown.map((item) => (
                <div key={item.category}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">{item.category}</span>
                    <span className="text-sm font-medium">{formatCurrency(item.amount)}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${categoryColors[item.category] || 'from-gray-500 to-gray-600'} rounded-full transition-all duration-500`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="lg:col-span-3 glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-6">Monthly Overview</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-green-400" />
                <span className="text-sm text-muted-foreground">Total Income</span>
              </div>
              {loading ? (
                <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
              ) : (
                <p className="text-2xl font-bold text-green-400">{formatCurrency(displayStats.total_income)}</p>
              )}
            </div>
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-red-400" />
                <span className="text-sm text-muted-foreground">Total Expenses</span>
              </div>
              {loading ? (
                <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
              ) : (
                <p className="text-2xl font-bold text-red-400">{formatCurrency(displayStats.total_expenses)}</p>
              )}
            </div>
          </div>

          {/* Goals & Savings Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <p className="text-xs text-muted-foreground mb-1">Total Savings</p>
              <p className="font-semibold text-purple-400">{formatCurrency(displayStats.total_savings)}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <p className="text-xs text-muted-foreground mb-1">Active Goals</p>
              <p className="font-semibold text-blue-400">{displayStats.active_goals}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <p className="text-xs text-muted-foreground mb-1">Goals Progress</p>
              <p className="font-semibold text-cyan-400">{displayStats.goals_progress.toFixed(0)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Recent Transactions</h3>
          <button
            onClick={() => navigate('/expenses')}
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            View all →
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-white/5 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : recentTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No transactions yet</p>
            <p className="text-sm mt-1">Add income or expenses to see them here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTransactions.map((tx) => (
              <div
                key={`${tx.type}-${tx.id}`}
                className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${
                    tx.type === 'income'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {tx.type === 'income' ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{tx.description}</p>
                    <p className="text-sm text-muted-foreground">{tx.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    tx.type === 'income' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">{tx.date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: TrendingUp, label: 'Add Income', color: 'from-green-500 to-emerald-600', path: '/income' },
          { icon: TrendingDown, label: 'Add Expense', color: 'from-red-500 to-rose-600', path: '/expenses' },
          { icon: Wallet, label: 'Transfer Funds', color: 'from-purple-500 to-violet-600', path: '/savings' },
        ].map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            className="glass-card rounded-xl p-4 flex items-center gap-4 hover:bg-white/10 transition-all group"
          >
            <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} group-hover:scale-110 transition-transform`}>
              <action.icon className="h-5 w-5 text-white" />
            </div>
            <span className="font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default DashboardPage
