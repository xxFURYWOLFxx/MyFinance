import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Wallet,
  ShoppingCart,
  Utensils,
  Car,
  Home,
  Zap,
  Film,
  Heart,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Trash2,
  X,
  BarChart3,
  Loader2
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { budgetsService } from '@/services/budgets.service'
import type { Budget } from '@/types'

const BUDGET_CATEGORIES = [
  { value: 'shopping', label: 'Shopping', icon: ShoppingCart, color: 'from-pink-500 to-rose-500' },
  { value: 'food', label: 'Food & Dining', icon: Utensils, color: 'from-orange-500 to-amber-500' },
  { value: 'transport', label: 'Transport', icon: Car, color: 'from-blue-500 to-cyan-500' },
  { value: 'housing', label: 'Housing', icon: Home, color: 'from-purple-500 to-indigo-500' },
  { value: 'utilities', label: 'Utilities', icon: Zap, color: 'from-yellow-500 to-orange-500' },
  { value: 'entertainment', label: 'Entertainment', icon: Film, color: 'from-green-500 to-emerald-500' },
  { value: 'health', label: 'Health', icon: Heart, color: 'from-red-500 to-pink-500' },
]

export function BudgetsPage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'food',
    amount: '',
    period: 'monthly' as 'weekly' | 'monthly' | 'yearly',
    alert_threshold: '80'
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const data = await budgetsService.getAll()
      setBudgets(data)
    } catch (error) {
      console.error('Failed to load budgets:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name || !formData.amount) return

    try {
      setSaving(true)
      const data = {
        name: formData.name,
        category: formData.category,
        amount: parseFloat(formData.amount),
        period: formData.period,
        start_date: new Date().toISOString().split('T')[0],
        alert_threshold: parseInt(formData.alert_threshold) || 80
      }

      if (editingId) {
        await budgetsService.update(editingId, data)
      } else {
        await budgetsService.create(data)
      }

      await loadData()
      resetForm()
    } catch (error) {
      console.error('Failed to save budget:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this budget?')) return

    try {
      await budgetsService.delete(id)
      await loadData()
    } catch (error) {
      console.error('Failed to delete budget:', error)
    }
  }

  function handleEdit(budget: Budget) {
    setFormData({
      name: budget.name,
      category: budget.category,
      amount: budget.amount.toString(),
      period: budget.period,
      alert_threshold: budget.alert_threshold.toString()
    })
    setEditingId(budget.id)
    setShowAddModal(true)
  }

  function resetForm() {
    setFormData({
      name: '',
      category: 'food',
      amount: '',
      period: 'monthly',
      alert_threshold: '80'
    })
    setEditingId(null)
    setShowAddModal(false)
  }

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0)
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0)
  const totalRemaining = totalBudget - totalSpent

  const overBudgetCount = budgets.filter(b => (b.spent || 0) > b.amount).length
  const onTrackCount = budgets.filter(b => (b.spent || 0) <= b.amount * 0.8).length
  const warningCount = budgets.filter(b => (b.spent || 0) > b.amount * 0.8 && (b.spent || 0) <= b.amount).length

  const getCategoryInfo = (categoryValue: string) => {
    return BUDGET_CATEGORIES.find(c => c.value === categoryValue) || BUDGET_CATEGORIES[0]
  }

  const getStatusInfo = (spent: number, limit: number) => {
    const percentage = limit > 0 ? (spent / limit) * 100 : 0
    if (percentage > 100) return { status: 'over', color: 'text-red-400', bgColor: 'bg-red-500', icon: AlertTriangle }
    if (percentage > 80) return { status: 'warning', color: 'text-yellow-400', bgColor: 'bg-yellow-500', icon: AlertTriangle }
    return { status: 'good', color: 'text-green-400', bgColor: 'bg-green-500', icon: CheckCircle2 }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Budgets</h1>
          <p className="text-muted-foreground">Set and track your spending limits</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white glow"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Budget
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
              <Wallet className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Spent</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
              <TrendingDown className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {totalBudget > 0 ? `${((totalSpent / totalBudget) * 100).toFixed(0)}% of budget` : '0% of budget'}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Remaining</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
              <CheckCircle2 className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <div className={`text-2xl font-bold ${totalRemaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(Math.abs(totalRemaining))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {totalRemaining >= 0 ? 'Under budget' : 'Over budget'}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex items-center gap-2">
              <span className="text-green-400 font-semibold">{onTrackCount}</span>
              <span className="text-yellow-400 font-semibold">{warningCount}</span>
              <span className="text-red-400 font-semibold">{overBudgetCount}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">On track • Warning • Over</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="glass-card h-48 animate-pulse">
              <div className="h-full bg-white/5" />
            </Card>
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No budgets created yet</p>
            <p className="text-sm mt-1">Click "Create Budget" to set up your first budget</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => {
            const category = getCategoryInfo(budget.category)
            const Icon = category.icon
            const spent = budget.spent || 0
            const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0
            const statusInfo = getStatusInfo(spent, budget.amount)
            const StatusIcon = statusInfo.icon

            return (
              <Card key={budget.id} className="glass-card group">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${category.color}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{budget.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs mt-1">{budget.period}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-blue-500/20 hover:text-blue-400"
                      onClick={() => handleEdit(budget)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400"
                      onClick={() => handleDelete(budget.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(spent)}</p>
                      <p className="text-sm text-muted-foreground">of {formatCurrency(budget.amount)}</p>
                    </div>
                    <div className={`flex items-center gap-1 ${statusInfo.color}`}>
                      <StatusIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {percentage > 100 ? 'Over' : percentage > 80 ? 'Warning' : 'On Track'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Progress
                      value={Math.min(percentage, 100)}
                      className="h-3 bg-white/10"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{percentage.toFixed(0)}% used</span>
                      <span>
                        {spent > budget.amount
                          ? `${formatCurrency(spent - budget.amount)} over`
                          : `${formatCurrency(budget.amount - spent)} left`}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add/Edit Budget Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="glass-card w-full max-w-md mx-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="gradient-text">
                {editingId ? 'Edit Budget' : 'Create Budget'}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Budget Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Groceries"
                    className="h-12 bg-secondary/50 border-white/5 focus:border-amber-500/50"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {BUDGET_CATEGORIES.map((cat) => {
                      const CatIcon = cat.icon
                      const isSelected = formData.category === cat.value
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, category: cat.value })}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-500/50'
                              : 'bg-secondary/50 border-white/5 hover:bg-secondary'
                          } border`}
                        >
                          <div className={`p-1.5 rounded-lg bg-gradient-to-br ${cat.color}`}>
                            <CatIcon className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-[10px]">{cat.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="limit">Budget Limit</Label>
                    <Input
                      id="limit"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      className="h-12 bg-secondary/50 border-white/5 focus:border-amber-500/50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="period">Period</Label>
                    <select
                      value={formData.period}
                      onChange={(e) => setFormData({ ...formData, period: e.target.value as 'weekly' | 'monthly' | 'yearly' })}
                      className="w-full h-12 px-4 rounded-xl bg-secondary/50 border border-white/5 focus:border-amber-500/50 focus:outline-none"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alertThreshold">Alert Threshold (%)</Label>
                  <Input
                    id="alertThreshold"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.alert_threshold}
                    onChange={(e) => setFormData({ ...formData, alert_threshold: e.target.value })}
                    placeholder="80"
                    className="h-12 bg-secondary/50 border-white/5 focus:border-amber-500/50"
                  />
                  <p className="text-xs text-muted-foreground">Get notified when spending exceeds this percentage</p>
                </div>
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingId ? (
                    'Update Budget'
                  ) : (
                    'Create Budget'
                  )}
                </Button>
              </CardContent>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}

export default BudgetsPage
