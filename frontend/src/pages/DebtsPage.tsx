import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  CreditCard,
  Building2,
  Car,
  Home,
  GraduationCap,
  Wallet,
  Calendar,
  DollarSign,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  Zap,
  Loader2
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { debtsService } from '@/services/debts.service'
import type { Debt, DebtSummary } from '@/types'

const DEBT_TYPES = [
  { value: 'credit_card', label: 'Credit Card', icon: CreditCard, color: 'from-red-500 to-pink-500' },
  { value: 'mortgage', label: 'Mortgage', icon: Home, color: 'from-blue-500 to-cyan-500' },
  { value: 'auto', label: 'Auto Loan', icon: Car, color: 'from-purple-500 to-indigo-500' },
  { value: 'student', label: 'Student Loan', icon: GraduationCap, color: 'from-green-500 to-emerald-500' },
  { value: 'personal', label: 'Personal Loan', icon: Wallet, color: 'from-orange-500 to-amber-500' },
  { value: 'other', label: 'Other', icon: Building2, color: 'from-gray-500 to-slate-500' },
]

export function DebtsPage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState<number | null>(null)
  const [debts, setDebts] = useState<Debt[]>([])
  const [summary, setSummary] = useState<DebtSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  // Debt form state
  const [formData, setFormData] = useState({
    name: '',
    debt_type: 'credit_card' as NonNullable<Debt['debt_type']>,
    original_amount: '',
    current_balance: '',
    interest_rate: '',
    minimum_payment: '',
    due_day: ''
  })

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [debtsData, summaryData] = await Promise.all([
        debtsService.getAll(),
        debtsService.getSummary()
      ])
      setDebts(debtsData)
      setSummary(summaryData)
    } catch (error) {
      console.error('Failed to load debts data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name || !formData.original_amount || !formData.current_balance) return

    try {
      setSaving(true)
      const data = {
        name: formData.name,
        debt_type: formData.debt_type,
        original_amount: parseFloat(formData.original_amount),
        current_balance: parseFloat(formData.current_balance),
        interest_rate: parseFloat(formData.interest_rate) || 0,
        minimum_payment: parseFloat(formData.minimum_payment) || 0,
        due_day: parseInt(formData.due_day) || undefined
      }

      if (editingId) {
        await debtsService.update(editingId, data)
      } else {
        await debtsService.create(data)
      }

      await loadData()
      resetForm()
    } catch (error) {
      console.error('Failed to save debt:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault()
    if (!showPaymentModal || !paymentAmount) return

    try {
      setSaving(true)
      await debtsService.addPayment(showPaymentModal, {
        debt_id: showPaymentModal,
        amount: parseFloat(paymentAmount),
        date: paymentDate
      })
      await loadData()
      setShowPaymentModal(null)
      setPaymentAmount('')
      setPaymentDate(new Date().toISOString().split('T')[0])
    } catch (error) {
      console.error('Failed to add payment:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this debt?')) return

    try {
      await debtsService.delete(id)
      await loadData()
    } catch (error) {
      console.error('Failed to delete debt:', error)
    }
  }

  function handleEdit(debt: Debt) {
    setFormData({
      name: debt.name,
      debt_type: (debt.debt_type as any) || 'other',
      original_amount: debt.original_amount.toString(),
      current_balance: debt.current_balance.toString(),
      interest_rate: (debt.interest_rate || 0).toString(),
      minimum_payment: (debt.minimum_payment || 0).toString(),
      due_day: (debt.due_day || '').toString()
    })
    setEditingId(debt.id)
    setShowAddModal(true)
  }

  function resetForm() {
    setFormData({
      name: '',
      debt_type: 'credit_card',
      original_amount: '',
      current_balance: '',
      interest_rate: '',
      minimum_payment: '',
      due_day: ''
    })
    setEditingId(null)
    setShowAddModal(false)
  }

  const totalDebt = summary?.total_current || 0
  const totalOriginal = summary?.total_original || 0
  const totalPaid = summary?.total_paid || 0
  const paidPercent = totalOriginal > 0 ? (totalPaid / totalOriginal) * 100 : 0
  const totalMinPayment = summary?.monthly_payments || 0
  const highestRate = debts.length > 0 ? Math.max(...debts.map(d => d.interest_rate || 0)) : 0

  const getTypeInfo = (typeValue: string | null) => {
    return DEBT_TYPES.find(t => t.value === typeValue) || DEBT_TYPES[5]
  }

  // Find highest rate debt for avalanche recommendation
  const highestRateDebt = debts.reduce((highest, current) =>
    (current.interest_rate || 0) > (highest?.interest_rate || 0) ? current : highest
  , debts[0])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Debt Management</h1>
          <p className="text-muted-foreground">Track and pay down your debts</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white glow"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Debt
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card overflow-hidden md:col-span-2">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-pink-500/5" />
          <CardContent className="pt-6 relative">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-red-500 to-pink-500">
                <CreditCard className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Total Debt Balance</p>
                {loading ? (
                  <div className="h-10 w-32 bg-white/5 animate-pulse rounded mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-red-400">{formatCurrency(totalDebt)}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Progress value={paidPercent} className="h-2 flex-1 bg-white/10" />
                  <span className="text-xs text-muted-foreground">{paidPercent.toFixed(0)}% paid</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-amber-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Minimum</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
              <Calendar className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(totalMinPayment)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Total payments due</p>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-red-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Highest Rate</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-red-500">
              <AlertTriangle className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-16 bg-white/5 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold text-yellow-400">{highestRate}%</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">APR</p>
          </CardContent>
        </Card>
      </div>

      {/* Payoff Strategy */}
      {highestRateDebt && highestRateDebt.interest_rate && highestRateDebt.interest_rate > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              Recommended: Avalanche Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Focus extra payments on highest interest debt first to minimize total interest paid.
            </p>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${getTypeInfo(highestRateDebt.debt_type).color}`}>
                {(() => {
                  const Icon = getTypeInfo(highestRateDebt.debt_type).icon
                  return <Icon className="h-5 w-5 text-white" />
                })()}
              </div>
              <div className="flex-1">
                <p className="font-medium">{highestRateDebt.name}</p>
                <p className="text-sm text-muted-foreground">{highestRateDebt.interest_rate}% APR - Highest priority</p>
              </div>
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Priority #1</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debts List */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="glass-card h-64 animate-pulse">
              <div className="h-full bg-white/5" />
            </Card>
          ))}
        </div>
      ) : debts.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No debts tracked yet</p>
            <p className="text-sm mt-1">Click "Add Debt" to start tracking your debts</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {debts.map((debt) => {
            const typeInfo = getTypeInfo(debt.debt_type)
            const TypeIcon = typeInfo.icon
            const paidAmount = debt.original_amount - debt.current_balance
            const debtPaidPercent = (paidAmount / debt.original_amount) * 100

            return (
              <Card key={debt.id} className="glass-card group">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${typeInfo.color}`}>
                      <TypeIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{debt.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">{typeInfo.label}</Badge>
                        {debt.interest_rate && debt.interest_rate > 0 && (
                          <Badge variant="outline" className="text-xs text-red-400 border-red-400/30">
                            {debt.interest_rate}% APR
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-blue-500/20 hover:text-blue-400"
                      onClick={() => handleEdit(debt)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400"
                      onClick={() => handleDelete(debt.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold text-red-400">{formatCurrency(debt.current_balance)}</p>
                      <p className="text-sm text-muted-foreground">of {formatCurrency(debt.original_amount)} original</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-green-400">{formatCurrency(paidAmount)}</p>
                      <p className="text-xs text-muted-foreground">paid off</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Progress value={debtPaidPercent} className="h-3 bg-white/10" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{debtPaidPercent.toFixed(0)}% paid</span>
                      {debt.due_day && <span>Due: {debt.due_day}th of month</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
                    <div>
                      <p className="text-sm text-muted-foreground">Minimum Payment</p>
                      <p className="font-semibold">{formatCurrency(debt.minimum_payment || 0)}/mo</p>
                    </div>
                    <Button
                      onClick={() => setShowPaymentModal(debt.id)}
                      size="sm"
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      Make Payment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add/Edit Debt Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="glass-card w-full max-w-md mx-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="gradient-text">
                {editingId ? 'Edit Debt' : 'Add Debt'}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Debt Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Chase Credit Card"
                    className="h-12 bg-secondary/50 border-white/5 focus:border-red-500/50"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Debt Type</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {DEBT_TYPES.map((type) => {
                      const Icon = type.icon
                      const isSelected = formData.debt_type === type.value
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, debt_type: type.value as any })}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                            isSelected
                              ? 'bg-red-500/20 border-red-500/50'
                              : 'bg-secondary/50 border-white/5 hover:bg-secondary'
                          } border`}
                        >
                          <div className={`p-1.5 rounded-lg bg-gradient-to-br ${type.color}`}>
                            <Icon className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-[10px]">{type.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="original">Original Amount</Label>
                    <Input
                      id="original"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.original_amount}
                      onChange={(e) => setFormData({ ...formData, original_amount: e.target.value })}
                      placeholder="0.00"
                      className="h-12 bg-secondary/50 border-white/5 focus:border-red-500/50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="balance">Current Balance</Label>
                    <Input
                      id="balance"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.current_balance}
                      onChange={(e) => setFormData({ ...formData, current_balance: e.target.value })}
                      placeholder="0.00"
                      className="h-12 bg-secondary/50 border-white/5 focus:border-red-500/50"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rate">Interest Rate (APR %)</Label>
                    <Input
                      id="rate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.interest_rate}
                      onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                      placeholder="0.00"
                      className="h-12 bg-secondary/50 border-white/5 focus:border-red-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minPayment">Minimum Payment</Label>
                    <Input
                      id="minPayment"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.minimum_payment}
                      onChange={(e) => setFormData({ ...formData, minimum_payment: e.target.value })}
                      placeholder="0.00"
                      className="h-12 bg-secondary/50 border-white/5 focus:border-red-500/50"
                    />
                  </div>
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
                    'Update Debt'
                  ) : (
                    'Add Debt'
                  )}
                </Button>
              </CardContent>
            </form>
          </Card>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="glass-card w-full max-w-sm mx-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="gradient-text">Make Payment</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowPaymentModal(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handlePayment}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="payment">Payment Amount</Label>
                  <Input
                    id="payment"
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-12 bg-secondary/50 border-white/5 focus:border-green-500/50"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Payment Date</Label>
                  <DatePicker
                    id="paymentDate"
                    value={paymentDate}
                    onChange={(val) => setPaymentDate(val)}
                    required
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
                      Recording...
                    </>
                  ) : (
                    'Record Payment'
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

export default DebtsPage
