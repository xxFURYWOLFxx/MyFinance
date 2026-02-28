import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  TrendingDown,
  DollarSign,
  Calendar,
  Edit2,
  Trash2,
  X,
  ShoppingCart,
  Utensils,
  Car,
  Home,
  Zap,
  Film,
  Heart,
  MoreHorizontal,
  Loader2
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { expensesService } from '@/services/expenses.service'
import type { Expense, ExpenseSummary } from '@/types'

const EXPENSE_CATEGORIES = [
  { value: 'shopping', label: 'Shopping', icon: ShoppingCart, color: 'from-pink-500 to-rose-500' },
  { value: 'food', label: 'Food & Dining', icon: Utensils, color: 'from-orange-500 to-amber-500' },
  { value: 'transport', label: 'Transport', icon: Car, color: 'from-blue-500 to-cyan-500' },
  { value: 'housing', label: 'Housing', icon: Home, color: 'from-purple-500 to-indigo-500' },
  { value: 'utilities', label: 'Utilities', icon: Zap, color: 'from-yellow-500 to-orange-500' },
  { value: 'entertainment', label: 'Entertainment', icon: Film, color: 'from-green-500 to-emerald-500' },
  { value: 'health', label: 'Health', icon: Heart, color: 'from-red-500 to-pink-500' },
  { value: 'other', label: 'Other', icon: MoreHorizontal, color: 'from-gray-500 to-slate-500' },
]

export function ExpensesPage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [expenseList, setExpenseList] = useState<Expense[]>([])
  const [summary, setSummary] = useState<ExpenseSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'shopping',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [expensesData, summaryData] = await Promise.all([
        expensesService.getAll(),
        expensesService.getSummary()
      ])
      setExpenseList(expensesData)
      setSummary(summaryData)
    } catch (error) {
      console.error('Failed to load expenses data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.description || !formData.amount) return

    try {
      setSaving(true)
      const data = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
        date: formData.date,
        notes: formData.notes || undefined
      }

      if (editingId) {
        await expensesService.update(editingId, data)
      } else {
        await expensesService.create(data)
      }

      await loadData()
      resetForm()
    } catch (error) {
      console.error('Failed to save expense:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this expense?')) return

    try {
      await expensesService.delete(id)
      await loadData()
    } catch (error) {
      console.error('Failed to delete expense:', error)
    }
  }

  function handleEdit(expense: Expense) {
    setFormData({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      date: expense.date,
      notes: expense.notes || ''
    })
    setEditingId(expense.id)
    setShowAddModal(true)
  }

  function resetForm() {
    setFormData({
      description: '',
      amount: '',
      category: 'shopping',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    })
    setEditingId(null)
    setShowAddModal(false)
  }

  const getCategoryInfo = (categoryValue: string) => {
    return EXPENSE_CATEGORIES.find(c => c.value === categoryValue) || EXPENSE_CATEGORIES[7]
  }

  const totalExpenses = summary?.total || 0
  const expenseCount = summary?.count || expenseList.length

  // Calculate category breakdown from summary or expenses
  const categoryBreakdown = EXPENSE_CATEGORIES.map(cat => {
    const total = summary?.by_category?.[cat.value] ||
      expenseList.filter(e => e.category === cat.value).reduce((sum, e) => sum + e.amount, 0)
    return { ...cat, total, percentage: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0 }
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Expenses</h1>
          <p className="text-muted-foreground">Track and categorize your spending</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white glow"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-pink-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-pink-500">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">{expenseCount} transactions</p>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-amber-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
              <Calendar className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Current period</p>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-indigo-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Daily Average</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500">
              <TrendingDown className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold">
                {formatCurrency(expenseCount > 0 ? totalExpenses / Math.max(expenseCount, 1) : 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Expense List */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-400" />
              Expense History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-white/5 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : expenseList.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No expenses recorded yet</p>
                <p className="text-sm mt-1">Click "Add Expense" to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expenseList.map((expense) => {
                  const category = getCategoryInfo(expense.category)
                  const CategoryIcon = category.icon
                  return (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${category.color}`}>
                          <CategoryIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {category.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{expense.date}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-semibold text-red-400">
                          -{formatCurrency(expense.amount)}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-blue-500/20 hover:text-blue-400"
                            onClick={() => handleEdit(expense)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400"
                            onClick={() => handleDelete(expense.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-white/5 animate-pulse rounded" />
                ))}
              </div>
            ) : categoryBreakdown.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No spending data yet</p>
            ) : (
              categoryBreakdown.map((cat) => {
                const Icon = cat.icon
                return (
                  <div key={cat.value} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg bg-gradient-to-br ${cat.color}`}>
                          <Icon className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-sm">{cat.label}</span>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(cat.total)}</span>
                    </div>
                    <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${cat.color} transition-all`}
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="glass-card w-full max-w-md mx-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="gradient-text">
                {editingId ? 'Edit Expense' : 'Add Expense'}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., Grocery Shopping"
                    className="h-12 bg-secondary/50 border-white/5 focus:border-red-500/50"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="h-12 bg-secondary/50 border-white/5 focus:border-red-500/50"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {EXPENSE_CATEGORIES.map((cat) => {
                      const Icon = cat.icon
                      const isSelected = formData.category === cat.value
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, category: cat.value })}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                            isSelected
                              ? 'bg-red-500/20 border-red-500/50'
                              : 'bg-secondary/50 border-white/5 hover:bg-secondary'
                          } border`}
                        >
                          <div className={`p-1.5 rounded-lg bg-gradient-to-br ${cat.color}`}>
                            <Icon className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-[10px]">{cat.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <DatePicker
                    id="date"
                    value={formData.date}
                    onChange={(val) => setFormData({ ...formData, date: val })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    className="h-12 bg-secondary/50 border-white/5 focus:border-red-500/50"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full h-12 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingId ? (
                    'Update Expense'
                  ) : (
                    'Add Expense'
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

export default ExpensesPage
