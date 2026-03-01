import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Briefcase,
  Home,
  Tv,
  Smartphone,
  Car,
  Dumbbell,
  Wifi,
  Edit2,
  Trash2,
  X,
  Play,
  Pause,
  Clock,
  Loader2
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { recurringService } from '@/services/recurring.service'
import type { RecurringTransaction, RecurringSummary } from '@/types'

const RECURRING_CATEGORIES = [
  { value: 'employment', label: 'Employment', icon: Briefcase, color: 'from-green-500 to-emerald-500' },
  { value: 'housing', label: 'Housing', icon: Home, color: 'from-blue-500 to-cyan-500' },
  { value: 'subscriptions', label: 'Subscriptions', icon: Tv, color: 'from-purple-500 to-pink-500' },
  { value: 'utilities', label: 'Utilities', icon: Wifi, color: 'from-yellow-500 to-orange-500' },
  { value: 'transport', label: 'Transport', icon: Car, color: 'from-indigo-500 to-purple-500' },
  { value: 'health', label: 'Health', icon: Dumbbell, color: 'from-red-500 to-pink-500' },
  { value: 'phone', label: 'Phone/Internet', icon: Smartphone, color: 'from-cyan-500 to-blue-500' },
]

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]

export function RecurringPage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([])
  const [summary, setSummary] = useState<RecurringSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    transaction_type: 'income' as 'income' | 'expense',
    category: 'employment',
    amount: '',
    frequency: 'monthly' as RecurringTransaction['frequency'],
    start_date: new Date().toISOString().split('T')[0],
    next_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [recurringData, summaryData] = await Promise.all([
        recurringService.getAll(undefined, true),
        recurringService.getSummary()
      ])
      setRecurring(recurringData)
      setSummary(summaryData)
    } catch (error) {
      console.error('Failed to load recurring data:', error)
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
        transaction_type: formData.transaction_type,
        category: formData.category,
        amount: parseFloat(formData.amount),
        frequency: formData.frequency,
        start_date: formData.start_date,
        next_occurrence: formData.next_date
      }

      if (editingId) {
        await recurringService.update(editingId, data)
      } else {
        await recurringService.create(data)
      }

      await loadData()
      resetForm()
    } catch (error) {
      console.error('Failed to save recurring:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(item: RecurringTransaction) {
    try {
      await recurringService.update(item.id, { is_active: !item.is_active })
      await loadData()
    } catch (error) {
      console.error('Failed to toggle recurring:', error)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this recurring transaction?')) return

    try {
      await recurringService.delete(id)
      await loadData()
    } catch (error) {
      console.error('Failed to delete recurring:', error)
    }
  }

  function handleEdit(item: RecurringTransaction) {
    setFormData({
      name: item.name,
      transaction_type: item.transaction_type,
      category: item.category,
      amount: item.amount.toString(),
      frequency: item.frequency,
      start_date: item.start_date,
      next_date: item.next_occurrence || item.start_date
    })
    setEditingId(item.id)
    setShowAddModal(true)
  }

  function resetForm() {
    setFormData({
      name: '',
      transaction_type: 'income',
      category: 'employment',
      amount: '',
      frequency: 'monthly',
      start_date: new Date().toISOString().split('T')[0],
      next_date: new Date().toISOString().split('T')[0]
    })
    setEditingId(null)
    setShowAddModal(false)
  }

  const activeRecurring = recurring.filter(r => r.is_active)
  const monthlyIncome = summary?.total_monthly_income || 0
  const monthlyExpenses = summary?.total_monthly_expenses || 0
  const netCashFlow = summary?.net_monthly || 0

  const filteredRecurring = recurring.filter(r => {
    if (filter === 'all') return true
    return r.transaction_type === filter
  })

  const getCategoryInfo = (categoryValue: string) => {
    return RECURRING_CATEGORIES.find(c => c.value === categoryValue) || RECURRING_CATEGORIES[0]
  }

  const getNextDateStatus = (nextDate: string | null) => {
    if (!nextDate) return { label: 'No date', color: 'text-muted-foreground' }
    const today = new Date()
    const next = new Date(nextDate)
    const diffDays = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return { label: 'Overdue', color: 'text-red-400' }
    if (diffDays <= 3) return { label: 'Soon', color: 'text-yellow-400' }
    if (diffDays <= 7) return { label: 'This week', color: 'text-blue-400' }
    return { label: `${diffDays} days`, color: 'text-muted-foreground' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Recurring Transactions</h1>
          <p className="text-muted-foreground">Manage your recurring income and expenses</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white glow"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Recurring
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Income</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
              <ArrowUpRight className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold text-green-400">+{formatCurrency(monthlyIncome)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {activeRecurring.filter(r => r.transaction_type === 'income').length} sources
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-pink-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Expenses</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-pink-500">
              <ArrowDownRight className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold text-red-400">-{formatCurrency(monthlyExpenses)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {activeRecurring.filter(r => r.transaction_type === 'expense').length} bills
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-br ${netCashFlow >= 0 ? 'from-purple-500/10 to-blue-500/5' : 'from-orange-500/10 to-red-500/5'}`} />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Cash Flow</CardTitle>
            <div className={`p-2 rounded-lg bg-gradient-to-br ${netCashFlow >= 0 ? 'from-purple-500 to-blue-500' : 'from-orange-500 to-red-500'}`}>
              <DollarSign className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <div className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-purple-400' : 'text-orange-400'}`}>
                {netCashFlow >= 0 ? '+' : ''}{formatCurrency(netCashFlow)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Per month</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'income', 'expense'] as const).map((tab) => (
          <Button
            key={tab}
            variant={filter === tab ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(tab)}
            className={filter === tab
              ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-0'
              : 'border-white/10 hover:bg-white/5'
            }
          >
            {tab === 'all' ? 'All' : tab === 'income' ? 'Income' : 'Expenses'}
          </Button>
        ))}
      </div>

      {/* Recurring List */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-teal-400" />
            Recurring Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-white/5 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : filteredRecurring.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recurring transactions</p>
              <p className="text-sm mt-1">Click "Add Recurring" to set up recurring income or expenses</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecurring.map((item) => {
                const category = getCategoryInfo(item.category)
                const CategoryIcon = category.icon
                const isIncome = item.transaction_type === 'income'
                const dateStatus = getNextDateStatus(item.next_occurrence)

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all group ${!item.is_active ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${category.color}`}>
                        <CategoryIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{item.name}</p>
                          {!item.is_active && (
                            <Badge variant="secondary" className="text-xs">Paused</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">{item.frequency}</Badge>
                          <span className={`text-xs flex items-center gap-1 ${dateStatus.color}`}>
                            <Clock className="h-3 w-3" />
                            {dateStatus.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`text-lg font-semibold ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
                          {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Next: {item.next_occurrence ? new Date(item.next_occurrence).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(item)}
                          className={`h-8 w-8 ${item.is_active ? 'hover:bg-yellow-500/20 hover:text-yellow-400' : 'hover:bg-green-500/20 hover:text-green-400'}`}
                        >
                          {item.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-blue-500/20 hover:text-blue-400"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400"
                          onClick={() => handleDelete(item.id)}
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

      {/* Add/Edit Recurring Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="glass-card w-full max-w-md mx-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="gradient-text">
                {editingId ? 'Edit Recurring' : 'Add Recurring Transaction'}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Transaction Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, transaction_type: 'income' })}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                        formData.transaction_type === 'income'
                          ? 'bg-green-500/20 border-green-500/50 text-green-400'
                          : 'bg-secondary/50 border-white/5 text-muted-foreground hover:border-green-500/50'
                      }`}
                    >
                      <ArrowUpRight className="h-4 w-4" />
                      Income
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, transaction_type: 'expense' })}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                        formData.transaction_type === 'expense'
                          ? 'bg-red-500/20 border-red-500/50 text-red-400'
                          : 'bg-secondary/50 border-white/5 text-muted-foreground hover:border-red-500/50'
                      }`}
                    >
                      <ArrowDownRight className="h-4 w-4" />
                      Expense
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Monthly Salary"
                    className="h-12 bg-secondary/50 border-white/5 focus:border-teal-500/50"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                      className="h-12 bg-secondary/50 border-white/5 focus:border-teal-500/50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency</Label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                      className="w-full h-12 px-4 rounded-xl bg-secondary/50 border border-white/5 focus:border-teal-500/50 focus:outline-none"
                    >
                      {FREQUENCIES.map((freq) => (
                        <option key={freq.value} value={freq.value}>{freq.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {RECURRING_CATEGORIES.map((cat) => {
                      const Icon = cat.icon
                      const isSelected = formData.category === cat.value
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, category: cat.value })}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                            isSelected
                              ? 'bg-teal-500/20 border-teal-500/50'
                              : 'bg-secondary/50 border-white/5 hover:bg-secondary'
                          } border`}
                        >
                          <div className={`p-1.5 rounded-lg bg-gradient-to-br ${cat.color}`}>
                            <Icon className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-[9px]">{cat.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <DatePicker
                    id="startDate"
                    value={formData.start_date}
                    onChange={(val) => setFormData({ ...formData, start_date: val, next_date: val })}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full h-12 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingId ? (
                    'Update Recurring'
                  ) : (
                    'Add Recurring'
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

export default RecurringPage
