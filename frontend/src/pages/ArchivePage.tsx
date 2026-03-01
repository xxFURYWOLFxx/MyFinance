import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Archive,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PiggyBank,
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  FileJson,
  FileSpreadsheet,
} from 'lucide-react'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { archiveService, type MonthlyArchive, type ArchiveSummary, type MonthDetail } from '@/services/archive.service'
import { toast } from '@/stores/toastStore'

export function ArchivePage() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [archives, setArchives] = useState<MonthlyArchive[]>([])
  const [summary, setSummary] = useState<ArchiveSummary | null>(null)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())

  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedArchive, setSelectedArchive] = useState<MonthlyArchive | null>(null)
  const [monthDetail, setMonthDetail] = useState<MonthDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Export state
  const [exporting, setExporting] = useState<string | null>(null)

  useEffect(() => {
    loadArchiveData()
  }, [selectedYear])

  useEffect(() => {
    loadAvailableYears()
  }, [])

  async function loadAvailableYears() {
    try {
      const years = await archiveService.getAvailableYears()
      setAvailableYears(years)
    } catch (error) {
      console.error('Failed to load available years:', error)
    }
  }

  async function loadArchiveData() {
    try {
      setLoading(true)
      const [archivesRes, summaryRes] = await Promise.all([
        archiveService.getMonthlyArchives(selectedYear),
        archiveService.getSummary(selectedYear),
      ])
      setArchives(archivesRes)
      setSummary(summaryRes)
    } catch (error) {
      console.error('Failed to load archive data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleViewDetails(archive: MonthlyArchive) {
    setSelectedArchive(archive)
    setShowDetailModal(true)
    setLoadingDetail(true)

    try {
      const detail = await archiveService.getMonthDetail(archive.year, archive.month_number)
      setMonthDetail(detail)
    } catch (error) {
      console.error('Failed to load month details:', error)
    } finally {
      setLoadingDetail(false)
    }
  }

  async function handleExport(archive: MonthlyArchive, format: 'json' | 'csv') {
    const exportKey = `${archive.month}-${archive.year}-${format}`
    setExporting(exportKey)

    try {
      const data = await archiveService.exportMonth(archive.year, archive.month_number, format)

      // Create and download file
      const blob = new Blob([data], {
        type: format === 'json' ? 'application/json' : 'text/csv'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${archive.month}-${archive.year}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Exported ${archive.month} ${archive.year} as ${format.toUpperCase()}`)
    } catch (error) {
      console.error('Failed to export:', error)
      toast.error('Failed to export data. Please try again.')
    } finally {
      setExporting(null)
    }
  }

  const displaySummary = summary || {
    total_income: 0,
    total_expenses: 0,
    net_saved: 0,
    avg_savings_rate: 0,
    month_count: 0,
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Monthly Archive</h1>
          <p className="text-muted-foreground">Historical monthly financial summaries</p>
        </div>
        <div className="flex items-center gap-2">
          {availableYears.length > 0 && (
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="h-10 px-4 pr-10 rounded-xl bg-secondary/50 border border-white/10 focus:border-purple-500/50 focus:outline-none appearance-none cursor-pointer text-foreground"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year} className="bg-background text-foreground">{year}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-400">{formatCurrency(displaySummary.total_income)}</div>
                <p className="text-xs text-muted-foreground mt-1">{displaySummary.month_count} months</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-pink-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-400">{formatCurrency(displaySummary.total_expenses)}</div>
                <p className="text-xs text-muted-foreground mt-1">{displaySummary.month_count} months</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Saved</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold text-purple-400">{formatCurrency(displaySummary.net_saved)}</div>
                <p className="text-xs text-muted-foreground mt-1">Total savings</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Savings Rate</CardTitle>
            <PiggyBank className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold text-cyan-400">{formatPercent(displaySummary.avg_savings_rate)}</div>
                <p className="text-xs text-muted-foreground mt-1">Across all months</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Archive List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        </div>
      ) : archives.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No archive data for {selectedYear}</p>
            <p className="text-sm text-muted-foreground mt-1">Add income and expenses to see monthly archives</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {archives.map((archive) => {
            const id = `${archive.month}-${archive.year}`
            const isExpanded = expandedId === id
            const isPositive = archive.net > 0

            return (
              <Card key={id} className="glass-card overflow-hidden">
                <CardHeader
                  className="flex flex-row items-center justify-between cursor-pointer hover:bg-secondary/20 transition-colors"
                  onClick={() => toggleExpand(id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-slate-500 to-gray-600">
                      <Archive className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {archive.month} {archive.year}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {archive.top_category ? (
                          <>Top expense: {archive.top_category} ({formatCurrency(archive.top_category_amount)})</>
                        ) : (
                          'No expenses recorded'
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={`${isPositive ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                      {isPositive ? '+' : ''}{formatCurrency(archive.net)}
                    </Badge>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 border-t border-white/5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Income</p>
                        <p className="text-xl font-semibold text-green-400">
                          {formatCurrency(archive.income)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Expenses</p>
                        <p className="text-xl font-semibold text-red-400">
                          {formatCurrency(archive.expenses)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Net Saved</p>
                        <p className={`text-xl font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(archive.net)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Savings Rate</p>
                        <p className="text-xl font-semibold text-purple-400">
                          {formatPercent(archive.savings_rate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4 border-t border-white/5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/10 hover:bg-white/5"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewDetails(archive)
                        }}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/10 hover:bg-white/5"
                        disabled={exporting === `${archive.month}-${archive.year}-json`}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleExport(archive, 'json')
                        }}
                      >
                        {exporting === `${archive.month}-${archive.year}-json` ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <FileJson className="mr-2 h-4 w-4 text-blue-400" />
                        )}
                        JSON
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/10 hover:bg-white/5"
                        disabled={exporting === `${archive.month}-${archive.year}-csv`}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleExport(archive, 'csv')
                        }}
                      >
                        {exporting === `${archive.month}-${archive.year}-csv` ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="mr-2 h-4 w-4 text-green-400" />
                        )}
                        CSV
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedArchive && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-white/10 rounded-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-xl font-bold">
                {selectedArchive.month} {selectedArchive.year} Details
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDetailModal(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                </div>
              ) : monthDetail ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                      <p className="text-sm text-muted-foreground">Total Income</p>
                      <p className="text-2xl font-bold text-green-400">{formatCurrency(monthDetail.total_income)}</p>
                      <p className="text-xs text-muted-foreground mt-1">{monthDetail.income_count} transactions</p>
                    </div>
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                      <p className="text-sm text-muted-foreground">Total Expenses</p>
                      <p className="text-2xl font-bold text-red-400">{formatCurrency(monthDetail.total_expenses)}</p>
                      <p className="text-xs text-muted-foreground mt-1">{monthDetail.expense_count} transactions</p>
                    </div>
                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                      <p className="text-sm text-muted-foreground">Net Savings</p>
                      <p className={`text-2xl font-bold ${monthDetail.net > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(monthDetail.net)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{formatPercent(monthDetail.savings_rate)} savings rate</p>
                    </div>
                  </div>

                  {/* Income List */}
                  {monthDetail.income_items && monthDetail.income_items.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-400" />
                        Income ({monthDetail.income_items.length})
                      </h3>
                      <div className="space-y-2">
                        {monthDetail.income_items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                            <div>
                              <p className="font-medium">{item.source}</p>
                              <p className="text-sm text-muted-foreground">{item.category} • {item.date}</p>
                            </div>
                            <p className="font-semibold text-green-400">+{formatCurrency(item.amount)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expense List */}
                  {monthDetail.expense_items && monthDetail.expense_items.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-red-400" />
                        Expenses ({monthDetail.expense_items.length})
                      </h3>
                      <div className="space-y-2">
                        {monthDetail.expense_items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                            <div>
                              <p className="font-medium">{item.description}</p>
                              <p className="text-sm text-muted-foreground">{item.category} • {item.date}</p>
                            </div>
                            <p className="font-semibold text-red-400">-{formatCurrency(item.amount)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category Breakdown */}
                  {monthDetail.category_breakdown && monthDetail.category_breakdown.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Expense by Category</h3>
                      <div className="space-y-3">
                        {monthDetail.category_breakdown.map((cat, idx) => (
                          <div key={idx}>
                            <div className="flex justify-between text-sm mb-1">
                              <span>{cat.category}</span>
                              <span className="text-muted-foreground">
                                {formatCurrency(cat.amount)} ({cat.percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                                style={{ width: `${cat.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No detailed data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ArchivePage
