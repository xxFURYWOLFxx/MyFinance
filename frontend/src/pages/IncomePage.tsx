import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  TrendingUp,
  DollarSign,
  Calendar,
  Edit2,
  Trash2,
  X,
  Briefcase,
  Gift,
  PiggyBank,
  Loader2
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { incomeService } from '@/services/income.service'
import type { Income, IncomeSummary } from '@/types'

const INCOME_CATEGORIES = [
  { value: 'salary', label: 'Salary', icon: Briefcase, color: 'from-green-500 to-emerald-500' },
  { value: 'freelance', label: 'Freelance', icon: DollarSign, color: 'from-blue-500 to-cyan-500' },
  { value: 'investments', label: 'Investments', icon: TrendingUp, color: 'from-purple-500 to-pink-500' },
  { value: 'gifts', label: 'Gifts', icon: Gift, color: 'from-orange-500 to-amber-500' },
  { value: 'other', label: 'Other', icon: PiggyBank, color: 'from-gray-500 to-slate-500' },
]

export function IncomePage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [incomeList, setIncomeList] = useState<Income[]>([])
  const [summary, setSummary] = useState<IncomeSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    source: '',
    amount: '',
    category: 'salary',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [incomeData, summaryData] = await Promise.all([
        incomeService.getAll(),
        incomeService.getSummary()
      ])
      setIncomeList(incomeData)
      setSummary(summaryData)
    } catch (error) {
      console.error('Failed to load income data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.source || !formData.amount) return

    try {
      setSaving(true)
      const data = {
        source: formData.source,
        amount: parseFloat(formData.amount),
        category: formData.category,
        date: formData.date,
        notes: formData.notes || undefined
      }

      if (editingId) {
        await incomeService.update(editingId, data)
      } else {
        await incomeService.create(data)
      }

      await loadData()
      resetForm()
    } catch (error) {
      console.error('Failed to save income:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this income?')) return

    try {
      await incomeService.delete(id)
      await loadData()
    } catch (error) {
      console.error('Failed to delete income:', error)
    }
  }

  function handleEdit(income: Income) {
    setFormData({
      source: income.source,
      amount: income.amount.toString(),
      category: income.category,
      date: income.date,
      notes: income.notes || ''
    })
    setEditingId(income.id)
    setShowAddModal(true)
  }

  function resetForm() {
    setFormData({
      source: '',
      amount: '',
      category: 'salary',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    })
    setEditingId(null)
    setShowAddModal(false)
  }

  const getCategoryInfo = (categoryValue: string) => {
    return INCOME_CATEGORIES.find(c => c.value === categoryValue) || INCOME_CATEGORIES[4]
  }

  const totalIncome = summary?.total || 0
  const incomeCount = summary?.count || incomeList.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Income</h1>
          <p className="text-muted-foreground">Track and manage your income sources</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white glow"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Income
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">{incomeCount} transactions</p>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
              <Calendar className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Current period</p>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold">
                {formatCurrency(incomeCount > 0 ? totalIncome / incomeCount : 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Income List */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-400" />
            Income History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-white/5 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : incomeList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No income recorded yet</p>
              <p className="text-sm mt-1">Click "Add Income" to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incomeList.map((income) => {
                const category = getCategoryInfo(income.category)
                const CategoryIcon = category.icon
                return (
                  <div
                    key={income.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${category.color}`}>
                        <CategoryIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">{income.source}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {category.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{income.date}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-semibold text-green-400">
                        +{formatCurrency(income.amount)}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-blue-500/20 hover:text-blue-400"
                          onClick={() => handleEdit(income)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400"
                          onClick={() => handleDelete(income.id)}
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

      {/* Add/Edit Income Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="glass-card w-full max-w-md mx-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="gradient-text">
                {editingId ? 'Edit Income' : 'Add Income'}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="source">Source / Description</Label>
                  <Input
                    id="source"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    placeholder="e.g., Monthly Salary"
                    className="h-12 bg-secondary/50 border-white/5 focus:border-green-500/50"
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
                    className="h-12 bg-secondary/50 border-white/5 focus:border-green-500/50"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {INCOME_CATEGORIES.map((cat) => {
                      const Icon = cat.icon
                      const isSelected = formData.category === cat.value
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, category: cat.value })}
                          className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                            isSelected
                              ? 'bg-green-500/20 border-green-500/50'
                              : 'bg-secondary/50 border-white/5 hover:bg-secondary'
                          } border`}
                        >
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${cat.color}`}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-xs">{cat.label}</span>
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
                    className="h-12 bg-secondary/50 border-white/5 focus:border-green-500/50"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingId ? (
                    'Update Income'
                  ) : (
                    'Add Income'
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

export default IncomePage
