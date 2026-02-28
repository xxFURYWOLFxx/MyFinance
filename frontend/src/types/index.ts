// User types
export interface User {
  id: number
  email: string
  first_name: string | null
  last_name: string | null
  role: 'user' | 'admin'
  is_active: boolean
  base_currency: string
  timezone: string
  created_at: string
  last_login_at: string | null
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  first_name?: string
  last_name?: string
}

// Income types
export interface Income {
  id: number
  user_id: number
  date: string
  source: string
  category: string
  amount: number
  currency: string
  payment_method: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface IncomeCreate {
  date: string
  source: string
  category: string
  amount: number
  currency?: string
  payment_method?: string
  notes?: string
}

// Expense types
export interface Expense {
  id: number
  user_id: number
  date: string
  description: string
  category: string
  amount: number
  currency: string
  payment_method: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ExpenseCreate {
  date: string
  description: string
  category: string
  amount: number
  currency?: string
  payment_method?: string
  notes?: string
}

// Savings types
export interface SavingsAccount {
  id: number
  user_id: number
  name: string
  account_type: string | null
  institution: string | null
  currency: string
  initial_balance: number
  is_active: boolean
  created_at: string
  current_balance?: number
}

export interface SavingsTransaction {
  id: number
  user_id: number
  account_id: number
  date: string
  transaction_type: 'deposit' | 'withdrawal' | 'transfer' | 'interest'
  amount: number
  description: string | null
  notes: string | null
  created_at: string
}

// Business/Invoice types
export interface BusinessIncome {
  id: number
  user_id: number
  date: string
  client: string
  invoice_number: string | null
  amount: number
  currency: string
  status: 'pending' | 'paid' | 'overdue' | 'partial' | 'cancelled'
  date_paid: string | null
  payment_method: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// Budget types
export interface Budget {
  id: number
  user_id: number
  name: string
  category: string
  amount: number
  period: 'weekly' | 'monthly' | 'yearly'
  start_date: string
  end_date: string | null
  rollover_enabled: boolean
  alert_threshold: number
  is_active: boolean
  created_at: string
  updated_at: string
  spent?: number
  remaining?: number
  percentage?: number
}

export interface BudgetCreate {
  name: string
  category: string
  amount: number
  period?: 'weekly' | 'monthly' | 'yearly'
  start_date: string
  end_date?: string
  rollover_enabled?: boolean
  alert_threshold?: number
}

// Goal types
export interface Goal {
  id: number
  user_id: number
  name: string
  description: string | null
  category: string | null
  target_amount: number
  current_amount: number
  currency: string
  target_date: string | null
  priority: number
  status: 'in_progress' | 'completed' | 'paused' | 'cancelled'
  linked_account_id: number | null
  created_at: string
  updated_at: string
  progress_percentage?: number
}

export interface GoalCreate {
  name: string
  description?: string
  category?: string
  target_amount: number
  currency?: string
  target_date?: string
  priority?: number
  linked_account_id?: number
}

// Investment types
export interface InvestmentAccount {
  id: number
  user_id: number
  name: string
  account_type: string | null
  institution: string | null
  currency: string
  is_active: boolean
  created_at: string
  total_value?: number
}

export interface InvestmentHolding {
  id: number
  user_id: number
  account_id: number
  symbol: string
  name: string | null
  asset_type: string | null
  quantity: number
  average_cost: number | null
  current_price: number | null
  last_price_update: string | null
  currency: string
  created_at: string
  updated_at: string
  current_value?: number
  gain_loss?: number
  gain_loss_percent?: number
}

// Debt types
export type DebtType = 'credit_card' | 'mortgage' | 'auto' | 'student' | 'personal' | 'other'

export interface Debt {
  id: number
  user_id: number
  name: string
  debt_type: DebtType | null
  creditor: string | null
  original_amount: number
  current_balance: number
  interest_rate: number | null
  minimum_payment: number | null
  due_day: number | null
  currency: string
  start_date: string | null
  expected_payoff_date: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DebtCreate {
  name: string
  debt_type?: string
  creditor?: string
  original_amount: number
  current_balance: number
  interest_rate?: number
  minimum_payment?: number
  due_day?: number
  currency?: string
  start_date?: string
}

// Recurring transaction types
export interface RecurringTransaction {
  id: number
  user_id: number
  name: string
  transaction_type: 'income' | 'expense'
  category: string
  amount: number
  currency: string
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
  start_date: string
  end_date: string | null
  next_occurrence: string | null
  last_generated: string | null
  auto_post: boolean
  reminder_days_before: number
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

// Dashboard types
export interface DashboardStats {
  total_income: number
  income_change: number
  total_expenses: number
  expense_change: number
  total_savings: number
  net_worth: number
  goals_progress: number
  active_goals: number
}

export interface CategoryBreakdown {
  category: string
  amount: number
  percentage: number
}

// Notification types
export interface Notification {
  id: number
  user_id: number
  type: string
  title: string
  message: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

// Summary types
export interface IncomeSummary {
  total: number
  by_category: Record<string, number>
  by_source: Record<string, number>
  count: number
}

export interface ExpenseSummary {
  total: number
  by_category: Record<string, number>
  count: number
}

export interface BusinessSummary {
  total_invoiced: number
  total_paid: number
  total_pending: number
  total_overdue: number
  count_by_status: Record<string, number>
}

export interface InvestmentSummary {
  total_value: number
  total_cost: number
  total_gain_loss: number
  gain_loss_percentage: number
  holdings_count: number
  by_type: Record<string, number>
}

export interface DebtSummary {
  total_original: number
  total_current: number
  total_paid: number
  monthly_payments: number
  debts_count: number
  by_type: Record<string, number>
}

export interface RecurringSummary {
  total_monthly_income: number
  total_monthly_expenses: number
  net_monthly: number
  active_count: number
  upcoming_this_week: number
}

// Goal contribution types
export interface GoalContribution {
  id: number
  goal_id: number
  user_id: number
  amount: number
  date: string
  notes: string | null
  created_at: string
}

export interface GoalContributionCreate {
  amount: number
  date: string
  notes?: string
}

// Investment transaction types
export interface InvestmentTransaction {
  id: number
  holding_id: number
  user_id: number
  transaction_type: 'buy' | 'sell' | 'dividend' | 'split'
  quantity: number
  price: number
  date: string
  fees: number
  notes: string | null
  created_at: string
}

export interface InvestmentTransactionCreate {
  holding_id: number
  transaction_type: 'buy' | 'sell' | 'dividend' | 'split'
  quantity: number
  price: number
  date: string
  fees?: number
  notes?: string
}

// Debt payment types
export interface DebtPayment {
  id: number
  debt_id: number
  user_id: number
  amount: number
  date: string
  notes: string | null
  created_at: string
}

export interface DebtPaymentCreate {
  debt_id: number
  amount: number
  date: string
  notes?: string
}

// Transaction type for recent transactions
export interface Transaction {
  id: number
  type: 'income' | 'expense'
  description: string
  category: string
  amount: number
  date: string
}

// API response types
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

export interface ApiError {
  detail: string
}

// Category options
export interface CategoryOptions {
  income: string[]
  expense: string[]
  payment_methods: string[]
  invoice_status: string[]
  goal_categories: string[]
  debt_types: string[]
  asset_types: string[]
}
