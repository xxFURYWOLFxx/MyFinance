import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  PiggyBank,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Building2,
  Landmark,
  Trash2,
  X,
  Loader2
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { savingsService } from '@/services/savings.service'
import type { SavingsAccount, SavingsTransaction } from '@/types'

const ACCOUNT_TYPES = [
  { value: 'savings', label: 'Savings Account', icon: PiggyBank, color: 'from-green-500 to-emerald-500' },
  { value: 'checking', label: 'Checking Account', icon: Wallet, color: 'from-blue-500 to-cyan-500' },
  { value: 'money_market', label: 'Money Market', icon: Building2, color: 'from-purple-500 to-pink-500' },
  { value: 'cd', label: 'Certificate of Deposit', icon: Landmark, color: 'from-orange-500 to-amber-500' },
]

export function SavingsPage() {
  const [showAddAccountModal, setShowAddAccountModal] = useState(false)
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false)
  const [accounts, setAccounts] = useState<SavingsAccount[]>([])
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Account form state
  const [accountForm, setAccountForm] = useState({
    name: '',
    account_type: 'savings',
    institution: '',
    initial_balance: ''
  })

  // Transaction form state
  const [transactionForm, setTransactionForm] = useState({
    account_id: '',
    transaction_type: 'deposit' as 'deposit' | 'withdrawal' | 'transfer' | 'interest',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const accountsData = await savingsService.getAccounts()
      setAccounts(accountsData)

      // Load transactions for all accounts
      const allTransactions: SavingsTransaction[] = []
      for (const account of accountsData) {
        const txns = await savingsService.getTransactions(account.id)
        allTransactions.push(...txns)
      }
      // Sort by date descending
      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setTransactions(allTransactions.slice(0, 10)) // Show last 10
    } catch (error) {
      console.error('Failed to load savings data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!accountForm.name) return

    try {
      setSaving(true)
      await savingsService.createAccount({
        name: accountForm.name,
        account_type: accountForm.account_type,
        institution: accountForm.institution || undefined,
        initial_balance: parseFloat(accountForm.initial_balance) || 0
      })
      await loadData()
      setAccountForm({ name: '', account_type: 'savings', institution: '', initial_balance: '' })
      setShowAddAccountModal(false)
    } catch (error) {
      console.error('Failed to create account:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateTransaction(e: React.FormEvent) {
    e.preventDefault()
    if (!transactionForm.account_id || !transactionForm.amount) return

    try {
      setSaving(true)
      await savingsService.createTransaction({
        account_id: parseInt(transactionForm.account_id),
        transaction_type: transactionForm.transaction_type,
        amount: parseFloat(transactionForm.amount),
        description: transactionForm.description || undefined,
        date: transactionForm.date
      })
      await loadData()
      setTransactionForm({
        account_id: '',
        transaction_type: 'deposit',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      })
      setShowAddTransactionModal(false)
    } catch (error) {
      console.error('Failed to create transaction:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteAccount(id: number) {
    if (!confirm('Are you sure you want to delete this account? All transactions will be lost.')) return

    try {
      await savingsService.deleteAccount(id)
      await loadData()
    } catch (error) {
      console.error('Failed to delete account:', error)
    }
  }

  const totalSavings = accounts.reduce((sum, acc) => sum + (acc.current_balance || acc.initial_balance), 0)

  const getAccountType = (typeValue: string) => {
    return ACCOUNT_TYPES.find(t => t.value === typeValue) || ACCOUNT_TYPES[0]
  }

  const getAccountName = (accountId: number) => {
    return accounts.find(a => a.id === accountId)?.name || 'Unknown'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Savings</h1>
          <p className="text-muted-foreground">Manage your savings accounts and grow your wealth</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAddAccountModal(true)}
            className="border-white/10 hover:bg-white/5"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Account
          </Button>
          <Button
            onClick={() => setShowAddTransactionModal(true)}
            disabled={accounts.length === 0}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white glow"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Total Savings Card */}
      <Card className="glass-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-blue-500/10 to-transparent" />
        <CardContent className="pt-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 glow">
                <PiggyBank className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Savings Balance</p>
                {loading ? (
                  <div className="h-10 w-32 bg-white/5 animate-pulse rounded mt-1" />
                ) : (
                  <p className="text-4xl font-bold">{formatCurrency(totalSavings)}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Accounts</p>
              <p className="text-2xl font-semibold text-purple-400">{accounts.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="glass-card h-48 animate-pulse">
              <div className="h-full bg-white/5" />
            </Card>
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            <PiggyBank className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No savings accounts yet</p>
            <p className="text-sm mt-1">Click "New Account" to create your first savings account</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map((account) => {
            const accountType = getAccountType(account.account_type || 'savings')
            const Icon = accountType.icon
            const balance = account.current_balance || account.initial_balance

            return (
              <Card key={account.id} className="glass-card group">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${accountType.color}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{account.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {accountType.label}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400"
                      onClick={() => handleDeleteAccount(account.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-bold">{formatCurrency(balance)}</span>
                    {account.institution && (
                      <span className="text-sm text-muted-foreground">{account.institution}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Recent Transactions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-400" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-white/5 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No transactions yet</p>
              <p className="text-sm mt-1">Add a transaction to see it here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => {
                const isDeposit = transaction.transaction_type === 'deposit' || transaction.transaction_type === 'interest'
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${isDeposit ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                        {isDeposit ? (
                          <ArrowUpRight className="h-5 w-5 text-green-400" />
                        ) : (
                          <ArrowDownRight className="h-5 w-5 text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{transaction.description || transaction.transaction_type}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {getAccountName(transaction.account_id)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{transaction.date}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-lg font-semibold ${isDeposit ? 'text-green-400' : 'text-red-400'}`}>
                        {isDeposit ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Account Modal */}
      {showAddAccountModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="glass-card w-full max-w-md mx-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="gradient-text">New Savings Account</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowAddAccountModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handleCreateAccount}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Account Name</Label>
                  <Input
                    id="name"
                    value={accountForm.name}
                    onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                    placeholder="e.g., Emergency Fund"
                    className="h-12 bg-secondary/50 border-white/5 focus:border-purple-500/50"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {ACCOUNT_TYPES.map((type) => {
                      const Icon = type.icon
                      const isSelected = accountForm.account_type === type.value
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setAccountForm({ ...accountForm, account_type: type.value })}
                          className={`flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                            isSelected
                              ? 'bg-purple-500/20 border-purple-500/50'
                              : 'bg-secondary/50 border-white/5 hover:bg-secondary'
                          } border`}
                        >
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${type.color}`}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-sm">{type.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="institution">Institution (Optional)</Label>
                  <Input
                    id="institution"
                    value={accountForm.institution}
                    onChange={(e) => setAccountForm({ ...accountForm, institution: e.target.value })}
                    placeholder="e.g., Chase Bank"
                    className="h-12 bg-secondary/50 border-white/5 focus:border-purple-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="balance">Initial Balance</Label>
                  <Input
                    id="balance"
                    type="number"
                    step="0.01"
                    min="0"
                    value={accountForm.initial_balance}
                    onChange={(e) => setAccountForm({ ...accountForm, initial_balance: e.target.value })}
                    placeholder="0.00"
                    className="h-12 bg-secondary/50 border-white/5 focus:border-purple-500/50"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full h-12 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </CardContent>
            </form>
          </Card>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showAddTransactionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="glass-card w-full max-w-md mx-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="gradient-text">Add Transaction</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowAddTransactionModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handleCreateTransaction}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Transaction Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTransactionForm({ ...transactionForm, transaction_type: 'deposit' })}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                        transactionForm.transaction_type === 'deposit'
                          ? 'bg-green-500/20 border-green-500/50 text-green-400'
                          : 'bg-secondary/50 border-white/5 text-muted-foreground hover:border-green-500/50'
                      }`}
                    >
                      <ArrowUpRight className="h-4 w-4" />
                      Deposit
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransactionForm({ ...transactionForm, transaction_type: 'withdrawal' })}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                        transactionForm.transaction_type === 'withdrawal'
                          ? 'bg-red-500/20 border-red-500/50 text-red-400'
                          : 'bg-secondary/50 border-white/5 text-muted-foreground hover:border-red-500/50'
                      }`}
                    >
                      <ArrowDownRight className="h-4 w-4" />
                      Withdrawal
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account">Account</Label>
                  <select
                    value={transactionForm.account_id}
                    onChange={(e) => setTransactionForm({ ...transactionForm, account_id: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl bg-secondary/50 border border-white/5 focus:border-purple-500/50 focus:outline-none"
                    required
                  >
                    <option value="">Select an account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>{account.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={transactionForm.amount}
                    onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="h-12 bg-secondary/50 border-white/5 focus:border-purple-500/50"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={transactionForm.description}
                    onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                    placeholder="e.g., Monthly savings"
                    className="h-12 bg-secondary/50 border-white/5 focus:border-purple-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <DatePicker
                    id="date"
                    value={transactionForm.date}
                    onChange={(val) => setTransactionForm({ ...transactionForm, date: val })}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={saving}
                  className={`w-full h-12 text-white ${
                    transactionForm.transaction_type === 'deposit'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                      : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'
                  }`}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Transaction'
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

export default SavingsPage
