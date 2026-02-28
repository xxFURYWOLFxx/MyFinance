import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  LineChart,
  Calculator,
  TrendingUp,
  Lightbulb,
  Settings,
  DollarSign,
  Sparkles,
  Target,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ArrowDown,
  ArrowUp
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import {
  forecastingService,
  type ForecastSummary,
  type MonthlyProjection,
  type ForecastInsight,
  type ScenarioResult
} from '@/services/forecasting.service'

export function ForecastingPage() {
  const [showScenarioModal, setShowScenarioModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<ForecastSummary | null>(null)
  const [projections, setProjections] = useState<MonthlyProjection[]>([])
  const [insights, setInsights] = useState<ForecastInsight[]>([])

  // Refs for scrolling to sections
  const chartRef = useRef<HTMLDivElement>(null)
  const insightsRef = useRef<HTMLDivElement>(null)
  const [highlightChart, setHighlightChart] = useState(false)
  const [highlightInsights, setHighlightInsights] = useState(false)

  function scrollAndHighlight(ref: React.RefObject<HTMLDivElement | null>, setHighlight: (v: boolean) => void) {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    setHighlight(true)
    setTimeout(() => setHighlight(false), 2500)
  }

  // Scenario form state
  const [scenarioIncome, setScenarioIncome] = useState(7000)
  const [scenarioExpenses, setScenarioExpenses] = useState(4500)
  const [scenarioGoal, setScenarioGoal] = useState(50000)
  const [scenarioTimeframe, setScenarioTimeframe] = useState(24)
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null)
  const [calculatingScenario, setCalculatingScenario] = useState(false)

  useEffect(() => {
    loadForecastData()
  }, [])

  async function loadForecastData() {
    try {
      setLoading(true)
      setError(null)
      const [summaryRes, projectionsRes, insightsRes] = await Promise.allSettled([
        forecastingService.getSummary(),
        forecastingService.getProjection(12),
        forecastingService.getInsights(),
      ])

      if (summaryRes.status === 'fulfilled') {
        setSummary(summaryRes.value)
        setScenarioIncome(summaryRes.value.monthly_income)
        setScenarioExpenses(summaryRes.value.monthly_expenses)
        if (summaryRes.value.goal_target > 0) {
          setScenarioGoal(summaryRes.value.goal_target)
        }
      }
      if (projectionsRes.status === 'fulfilled') {
        setProjections(projectionsRes.value)
      }
      if (insightsRes.status === 'fulfilled') {
        setInsights(insightsRes.value)
      }

      // Show error only if all calls failed
      if (summaryRes.status === 'rejected' && projectionsRes.status === 'rejected' && insightsRes.status === 'rejected') {
        setError('Unable to load forecast data. Please check your connection and try again.')
      }
    } catch (err) {
      console.error('Failed to load forecast data:', err)
      setError('Unable to load forecast data. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function calculateScenario() {
    try {
      setCalculatingScenario(true)
      const result = await forecastingService.calculateScenario({
        monthly_income: scenarioIncome,
        monthly_expenses: scenarioExpenses,
        savings_goal: scenarioGoal,
        timeframe_months: scenarioTimeframe,
      })
      setScenarioResult(result)
    } catch (error) {
      console.error('Failed to calculate scenario:', error)
    } finally {
      setCalculatingScenario(false)
    }
  }

  const displaySummary = summary || {
    current_balance: 0,
    projected_balance: 0,
    monthly_income: 0,
    monthly_expenses: 0,
    monthly_savings: 0,
    savings_rate: 0,
    time_to_goal: 0,
    goal_target: 0,
  }

  const maxBalance = Math.max(...projections.map(d => d.balance), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Forecasting</h1>
          <p className="text-muted-foreground">Project your future financial position</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadForecastData}
            disabled={loading}
            className="border-white/10 hover:bg-white/5"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setShowScenarioModal(true)}
            className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white glow"
          >
            <Calculator className="mr-2 h-4 w-4" />
            What-If Scenario
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Card className="glass-card border-red-500/20 bg-red-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400 flex-1">{error}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={loadForecastData}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Forecast Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(displaySummary.current_balance)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">As of today</p>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Projected (12mo)</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold text-purple-400">{formatCurrency(displaySummary.projected_balance)}</div>
                <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  +{formatCurrency(displaySummary.projected_balance - displaySummary.current_balance)}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Savings</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-400">
                  {formatCurrency(displaySummary.monthly_savings)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{displaySummary.savings_rate.toFixed(1)}% savings rate</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-amber-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Time to Goal</CardTitle>
            <Target className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold text-orange-400">
                  {displaySummary.time_to_goal > 0 ? `${displaySummary.time_to_goal} months` : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {displaySummary.goal_target > 0 ? `To reach ${formatCurrency(displaySummary.goal_target)}` : 'Set a goal to track'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Forecast Tools */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className="glass-card hover:bg-secondary/30 transition-all cursor-pointer group"
          onClick={() => scrollAndHighlight(chartRef, setHighlightChart)}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 group-hover:scale-110 transition-transform">
                <LineChart className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Cash Flow Projection</h3>
                <p className="text-sm text-muted-foreground">View the 12-month cash flow chart below</p>
              </div>
              <ArrowDown className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="glass-card hover:bg-secondary/30 transition-all cursor-pointer group"
          onClick={() => setShowScenarioModal(true)}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 group-hover:scale-110 transition-transform">
                <Calculator className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">What-If Scenarios</h3>
                <p className="text-sm text-muted-foreground">Explore different financial scenarios</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="glass-card hover:bg-secondary/30 transition-all cursor-pointer group"
          onClick={() => scrollAndHighlight(insightsRef, setHighlightInsights)}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Trend Analysis</h3>
                <p className="text-sm text-muted-foreground">View smart insights and spending patterns</p>
              </div>
              <ArrowDown className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 12-Month Projection Chart */}
      <Card ref={chartRef} className={`glass-card scroll-mt-6 transition-all duration-700 ${highlightChart ? 'ring-2 ring-purple-400 !shadow-[0_0_30px_rgba(168,85,247,0.5)] scale-[1.01] bg-purple-500/5' : ''}`}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-purple-400" />
              12-Month Cash Flow Projection
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Based on your current income and spending patterns
            </p>
          </div>
          <Button variant="outline" size="sm" className="border-white/10 hover:bg-white/5">
            <Settings className="mr-2 h-4 w-4" />
            Configure
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            </div>
          ) : projections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No projection data available</p>
              <p className="text-sm mt-1">Add income and savings accounts to see projections</p>
            </div>
          ) : (
            <>
              <div className="relative h-64 pl-16">
                <div className="absolute inset-0 pl-16 flex items-end justify-between gap-1.5 pb-8">
                  {projections.map((data) => {
                    const height = (data.balance / maxBalance) * 100
                    return (
                      <div key={`${data.month}-${data.year}`} className="flex-1 flex flex-col items-center gap-2 group relative">
                        <div className="w-full relative flex-1 flex items-end">
                          <div
                            className="w-full bg-gradient-to-t from-purple-500 to-violet-400 rounded-t-lg transition-all hover:from-purple-400 hover:to-violet-300 cursor-pointer"
                            style={{ height: `${Math.max(height, 5)}%` }}
                          />
                          {/* Tooltip */}
                          <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-background/95 border border-white/10 rounded-lg p-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-xl pointer-events-none">
                            <p className="font-semibold">{data.month} {data.year}</p>
                            <p className="text-green-400 flex items-center gap-1"><ArrowUp className="h-3 w-3" />{formatCurrency(data.projected_income)}</p>
                            <p className="text-red-400 flex items-center gap-1"><ArrowDown className="h-3 w-3" />{formatCurrency(data.projected_expenses)}</p>
                            <p className="text-purple-400 font-medium border-t border-white/10 pt-1 mt-1">{formatCurrency(data.balance)}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{data.month}</span>
                      </div>
                    )
                  })}
                </div>
                {/* Y-axis labels */}
                <div className="absolute left-0 inset-y-0 flex flex-col justify-between text-xs text-muted-foreground pr-2 pb-8 w-16 text-right">
                  <span>{formatCurrency(maxBalance)}</span>
                  <span>{formatCurrency(maxBalance / 2)}</span>
                  <span>$0</span>
                </div>
              </div>
              {/* Legend */}
              {projections.length > 0 && (
                <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-gradient-to-t from-purple-500 to-violet-400" />
                    Projected Balance
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ArrowUp className="h-3 w-3 text-green-400" />
                    Income: {formatCurrency(projections[0]?.projected_income || 0)}/mo
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ArrowDown className="h-3 w-3 text-red-400" />
                    Expenses: {formatCurrency(projections[0]?.projected_expenses || 0)}/mo
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card ref={insightsRef} className={`glass-card scroll-mt-6 transition-all duration-700 ${highlightInsights ? 'ring-2 ring-purple-400 !shadow-[0_0_30px_rgba(168,85,247,0.5)] scale-[1.01] bg-purple-500/5' : ''}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-400" />
            Smart Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            </div>
          ) : insights.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No insights available yet</p>
              <p className="text-sm mt-1">Add more financial data to get personalized insights</p>
            </div>
          ) : (
            insights.map((insight, index) => {
              const config = {
                positive: { icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/20' },
                warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
                tip: { icon: Lightbulb, color: 'text-blue-400', bg: 'bg-blue-500/20' },
              }[insight.type] || { icon: Lightbulb, color: 'text-blue-400', bg: 'bg-blue-500/20' }
              const Icon = config.icon

              return (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 rounded-xl bg-secondary/30"
                >
                  <div className={`p-2 rounded-lg ${config.bg}`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <p className="text-sm">{insight.message}</p>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* What-If Scenario Modal */}
      {showScenarioModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="glass-card w-full max-w-lg mx-4">
            <CardHeader>
              <CardTitle className="gradient-text flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                What-If Scenario
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Adjust variables to see how they affect your financial future
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="income">Monthly Income</Label>
                  <Input
                    id="income"
                    type="number"
                    value={scenarioIncome}
                    onChange={(e) => setScenarioIncome(Number(e.target.value))}
                    className="h-12 bg-secondary/50 border-white/5 focus:border-purple-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expenses">Monthly Expenses</Label>
                  <Input
                    id="expenses"
                    type="number"
                    value={scenarioExpenses}
                    onChange={(e) => setScenarioExpenses(Number(e.target.value))}
                    className="h-12 bg-secondary/50 border-white/5 focus:border-purple-500/50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="savingsGoal">Savings Goal</Label>
                  <Input
                    id="savingsGoal"
                    type="number"
                    value={scenarioGoal}
                    onChange={(e) => setScenarioGoal(Number(e.target.value))}
                    className="h-12 bg-secondary/50 border-white/5 focus:border-purple-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeframe">Timeframe (months)</Label>
                  <Input
                    id="timeframe"
                    type="number"
                    value={scenarioTimeframe}
                    onChange={(e) => setScenarioTimeframe(Number(e.target.value))}
                    className="h-12 bg-secondary/50 border-white/5 focus:border-purple-500/50"
                  />
                </div>
              </div>

              <Button
                onClick={calculateScenario}
                disabled={calculatingScenario}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
              >
                {calculatingScenario ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Calculator className="mr-2 h-4 w-4" />
                )}
                Calculate
              </Button>

              {/* Results Preview */}
              {scenarioResult && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/10 border border-purple-500/20">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    Scenario Result
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Monthly Savings</p>
                      <p className={`text-lg font-semibold ${scenarioResult.monthly_savings >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(scenarioResult.monthly_savings)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Time to Goal</p>
                      <p className="text-lg font-semibold text-purple-400">
                        {scenarioResult.time_to_goal >= 0 ? `${scenarioResult.time_to_goal} months` : 'Not achievable'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Savings Rate</p>
                      <p className="text-lg font-semibold text-cyan-400">
                        {scenarioResult.savings_rate.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Goal Achievable</p>
                      <p className={`text-lg font-semibold ${scenarioResult.goal_achievable ? 'text-green-400' : 'text-red-400'}`}>
                        {scenarioResult.goal_achievable ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>
                  {!scenarioResult.goal_achievable && scenarioResult.shortfall > 0 && (
                    <p className="text-sm text-muted-foreground mt-3">
                      Shortfall: {formatCurrency(scenarioResult.shortfall)}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-white/10 hover:bg-white/5"
                  onClick={() => {
                    setShowScenarioModal(false)
                    setScenarioResult(null)
                  }}
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default ForecastingPage
