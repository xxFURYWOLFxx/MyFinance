import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  Edit2,
  Trash2,
  X,
  TrendingUp,
  Loader2
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { businessService } from '@/services/business.service'
import type { BusinessIncome, BusinessSummary } from '@/types'

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
  paid: { label: 'Paid', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle2 },
  overdue: { label: 'Overdue', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertCircle },
  partial: { label: 'Partial', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Send },
  cancelled: { label: 'Cancelled', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: FileText },
}

export function BusinessPage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [invoices, setInvoices] = useState<BusinessIncome[]>([])
  const [summary, setSummary] = useState<BusinessSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    client: '',
    invoice_number: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    status: 'pending' as BusinessIncome['status'],
    notes: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [invoicesData, summaryData] = await Promise.all([
        businessService.getAll(),
        businessService.getSummary()
      ])
      setInvoices(invoicesData)
      setSummary(summaryData)
    } catch (error) {
      console.error('Failed to load business data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.client || !formData.amount) return

    try {
      setSaving(true)
      const data = {
        client: formData.client,
        invoice_number: formData.invoice_number || undefined,
        amount: parseFloat(formData.amount),
        date: formData.date,
        status: formData.status,
        notes: formData.notes || undefined
      }

      if (editingId) {
        await businessService.update(editingId, data)
      } else {
        await businessService.create(data)
      }

      await loadData()
      resetForm()
    } catch (error) {
      console.error('Failed to save invoice:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this invoice?')) return

    try {
      await businessService.delete(id)
      await loadData()
    } catch (error) {
      console.error('Failed to delete invoice:', error)
    }
  }

  function handleEdit(invoice: BusinessIncome) {
    setFormData({
      client: invoice.client,
      invoice_number: invoice.invoice_number || '',
      amount: invoice.amount.toString(),
      date: invoice.date,
      status: invoice.status,
      notes: invoice.notes || ''
    })
    setEditingId(invoice.id)
    setShowAddModal(true)
  }

  function resetForm() {
    setFormData({
      client: '',
      invoice_number: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      notes: ''
    })
    setEditingId(null)
    setShowAddModal(false)
  }

  const totalInvoiced = summary?.total_invoiced || 0
  const paidAmount = summary?.total_paid || 0
  const pendingAmount = summary?.total_pending || 0
  const overdueAmount = summary?.total_overdue || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Business Income</h1>
          <p className="text-muted-foreground">Track invoices and client payments</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white glow"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Invoice
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoiced</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
              <FileText className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(totalInvoiced)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">{invoices.length} invoices</p>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
              <CheckCircle2 className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold text-green-400">{formatCurrency(paidAmount)}</div>
            )}
            <p className="text-xs text-green-400/70 mt-1">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              {totalInvoiced > 0 ? ((paidAmount / totalInvoiced) * 100).toFixed(0) : 0}% collected
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500">
              <Clock className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold text-yellow-400">{formatCurrency(pendingAmount)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-pink-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-pink-500">
              <AlertCircle className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold text-red-400">{formatCurrency(overdueAmount)}</div>
            )}
            <p className="text-xs text-red-400/70 mt-1">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices List */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-400" />
            Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-white/5 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No invoices yet</p>
              <p className="text-sm mt-1">Click "New Invoice" to create your first invoice</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => {
                const statusConfig = STATUS_CONFIG[invoice.status]
                const StatusIcon = statusConfig.icon
                return (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-indigo-500/20">
                        <FileText className="h-5 w-5 text-indigo-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{invoice.invoice_number || 'No #'}</p>
                          <Badge className={`text-xs ${statusConfig.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-muted-foreground">{invoice.client}</span>
                          <span className="text-xs text-muted-foreground">• {invoice.date}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-semibold">{formatCurrency(invoice.amount)}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-blue-500/20 hover:text-blue-400"
                          onClick={() => handleEdit(invoice)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400"
                          onClick={() => handleDelete(invoice.id)}
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

      {/* Add/Edit Invoice Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="glass-card w-full max-w-lg mx-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="gradient-text">
                {editingId ? 'Edit Invoice' : 'New Invoice'}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoiceNumber">Invoice Number</Label>
                    <Input
                      id="invoiceNumber"
                      value={formData.invoice_number}
                      onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                      placeholder="INV-001"
                      className="h-12 bg-secondary/50 border-white/5 focus:border-indigo-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client">Client</Label>
                    <Input
                      id="client"
                      value={formData.client}
                      onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                      placeholder="Client name"
                      className="h-12 bg-secondary/50 border-white/5 focus:border-indigo-500/50"
                      required
                    />
                  </div>
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
                      className="h-12 bg-secondary/50 border-white/5 focus:border-indigo-500/50"
                      required
                    />
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
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['pending', 'paid', 'overdue'] as const).map((status) => {
                      const config = STATUS_CONFIG[status]
                      const Icon = config.icon
                      const isSelected = formData.status === status
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setFormData({ ...formData, status })}
                          className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                            isSelected ? config.color : 'bg-secondary/50 border-white/5'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="text-sm">{config.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    className="h-12 bg-secondary/50 border-white/5 focus:border-indigo-500/50"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full h-12 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingId ? (
                    'Update Invoice'
                  ) : (
                    'Create Invoice'
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

export default BusinessPage
