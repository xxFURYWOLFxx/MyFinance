import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Download,
  FileText,
  PieChart,
  BarChart3,
  LineChart,
  TrendingUp,
  FileSpreadsheet,
  Printer,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { reportsService, type ReportsSummary, type MonthlyData, type CategoryData } from '@/services/reports.service'
import { toast } from '@/stores/toastStore'

const reportTypes = [
  {
    id: 'income-expenses',
    name: 'Income vs Expenses',
    description: 'Compare income and expenses over time',
    icon: BarChart3,
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'categories',
    name: 'Category Breakdown',
    description: 'See where your money goes by category',
    icon: PieChart,
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: 'net-worth',
    name: 'Net Worth',
    description: 'Track your total net worth over time',
    icon: TrendingUp,
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'cash-flow',
    name: 'Cash Flow',
    description: 'Analyze your cash flow patterns',
    icon: LineChart,
    color: 'from-orange-500 to-amber-500'
  },
  {
    id: 'yearly',
    name: 'Year-over-Year',
    description: 'Compare performance across years',
    icon: FileText,
    color: 'from-red-500 to-pink-500'
  },
]

export function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState('income-expenses')
  const [timeRange, setTimeRange] = useState('6m')
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<ReportsSummary | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [exporting, setExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadReportData()
  }, [selectedReport, timeRange])

  async function loadReportData() {
    try {
      setLoading(true)
      const [summaryRes, monthlyRes, categoryRes] = await Promise.all([
        reportsService.getSummary(),
        reportsService.getMonthlyData(),
        reportsService.getCategoryBreakdown('expense'),
      ])
      setSummary(summaryRes)
      setMonthlyData(filterMonthlyData(monthlyRes, timeRange))
      setCategoryData(categoryRes)
    } catch (error) {
      console.error('Failed to load report data:', error)
    } finally {
      setLoading(false)
    }
  }

  function filterMonthlyData(data: MonthlyData[], range: string): MonthlyData[] {
    const monthsMap: Record<string, number> = {
      '1m': 1,
      '3m': 3,
      '6m': 6,
      '1y': 12,
      'all': 12,
    }
    const months = monthsMap[range] || 6
    const currentMonth = new Date().getMonth() + 1
    return data.filter(d => {
      const monthDiff = currentMonth - d.month_num
      return monthDiff >= 0 && monthDiff < months
    })
  }

  function handlePrint() {
    window.print()
    setExportSuccess('Sent to printer!')
    setTimeout(() => setExportSuccess(null), 3000)
  }

  async function handleExport(format: 'csv' | 'pdf') {
    try {
      setExporting(true)

      if (format === 'csv') {
        // Create CSV content
        let csvContent = `Finance Report - ${selectedReport}\n`
        csvContent += `Generated: ${new Date().toLocaleDateString()}\n`
        csvContent += `Time Range: ${timeRange.toUpperCase()}\n\n`

        // Summary section
        csvContent += `=== Summary ===\n`
        csvContent += `Total Income,${displaySummary.total_income}\n`
        csvContent += `Total Expenses,${displaySummary.total_expenses}\n`
        csvContent += `Net Savings,${displaySummary.net_savings}\n`
        csvContent += `Savings Rate,${displaySummary.savings_rate}%\n\n`

        // Monthly data
        csvContent += `=== Monthly Data ===\n`
        csvContent += `Month,Income,Expenses,Net\n`
        monthlyData.forEach(d => {
          csvContent += `${d.month},${d.income},${d.expenses},${d.net}\n`
        })

        if (categoryData.length > 0) {
          csvContent += `\n=== Category Breakdown ===\n`
          csvContent += `Category,Amount,Percentage\n`
          categoryData.forEach(c => {
            csvContent += `${c.category},${c.amount},${c.percentage}%\n`
          })
        }

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `finance-report-${selectedReport}-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        setExportSuccess('CSV exported successfully!')
      } else if (format === 'pdf') {
        // For PDF, we'll create a printable HTML and trigger print
        // Or create a simple text-based PDF alternative
        const pdfContent = `
FINANCE REPORT
==============

Report Type: ${selectedReport.replace('-', ' ').toUpperCase()}
Generated: ${new Date().toLocaleDateString()}
Time Range: ${timeRange.toUpperCase()}

SUMMARY
-------
Total Income:    $${displaySummary.total_income.toLocaleString()}
Total Expenses:  $${displaySummary.total_expenses.toLocaleString()}
Net Savings:     $${displaySummary.net_savings.toLocaleString()}
Savings Rate:    ${displaySummary.savings_rate.toFixed(1)}%

MONTHLY BREAKDOWN
-----------------
${monthlyData.map(d => `${d.month}: Income $${d.income.toLocaleString()} | Expenses $${d.expenses.toLocaleString()} | Net ${d.net >= 0 ? '+' : ''}$${d.net.toLocaleString()}`).join('\n')}

${categoryData.length > 0 ? `
CATEGORY BREAKDOWN
------------------
${categoryData.map(c => `${c.category}: $${c.amount.toLocaleString()} (${c.percentage.toFixed(1)}%)`).join('\n')}
` : ''}
        `

        const blob = new Blob([pdfContent], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `finance-report-${selectedReport}-${new Date().toISOString().split('T')[0]}.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        setExportSuccess('Report exported successfully!')
      }

      setTimeout(() => setExportSuccess(null), 3000)
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export report. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  async function handleHeaderExport() {
    await handleExport('csv')
  }

  const displaySummary = summary || {
    total_income: 0,
    total_expenses: 0,
    net_savings: 0,
    savings_rate: 0,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Reports</h1>
          <p className="text-muted-foreground">Analyze your financial data with detailed reports</p>
        </div>
        <div className="flex items-center gap-2">
          {exportSuccess && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-sm">
              <CheckCircle className="h-4 w-4" />
              {exportSuccess}
            </div>
          )}
          <Button
            variant="outline"
            className="border-white/10 hover:bg-white/5"
            onClick={handlePrint}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
            onClick={handleHeaderExport}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold text-green-400">{formatCurrency(displaySummary.total_income)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Year to date</p>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-pink-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold text-red-400">{formatCurrency(displaySummary.total_expenses)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Year to date</p>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Savings</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold text-purple-400">{formatCurrency(displaySummary.net_savings)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Year to date</p>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Savings Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold text-cyan-400">{displaySummary.savings_rate.toFixed(1)}%</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Of income saved</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Type Selection */}
      <div className="grid gap-4 md:grid-cols-5">
        {reportTypes.map((report) => {
          const Icon = report.icon
          const isSelected = selectedReport === report.id
          return (
            <Card
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className={`glass-card cursor-pointer transition-all ${
                isSelected
                  ? 'ring-2 ring-purple-500/50 border-purple-500/30'
                  : 'hover:bg-secondary/50'
              }`}
            >
              <CardContent className="pt-6 text-center">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${report.color} mb-3`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <p className="font-medium text-sm">{report.name}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Report Content */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-400" />
              Income vs Expenses Report
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Monthly comparison of your income and expenses
            </p>
          </div>
          <div className="flex gap-2">
            {['1m', '3m', '6m', '1y', 'all'].map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range)}
                className={timeRange === range
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-0'
                  : 'border-white/10 hover:bg-white/5'
                }
              >
                {range.toUpperCase()}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            </div>
          ) : monthlyData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No data available for the selected period</p>
              <p className="text-sm mt-1">Add some income and expenses to see the report</p>
            </div>
          ) : (
            <div className="space-y-4">
              {monthlyData.map((data) => {
                const maxValue = Math.max(...monthlyData.map(d => Math.max(d.income, d.expenses)), 1)
                return (
                  <div key={data.month} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium w-12">{data.month}</span>
                      <div className="flex-1 mx-4 space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="h-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded"
                               style={{ width: `${(data.income / maxValue) * 100}%` }} />
                          <span className="text-xs text-green-400 w-20">{formatCurrency(data.income)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-4 bg-gradient-to-r from-red-500 to-pink-500 rounded"
                               style={{ width: `${(data.expenses / maxValue) * 100}%` }} />
                          <span className="text-xs text-red-400 w-20">{formatCurrency(data.expenses)}</span>
                        </div>
                      </div>
                      <span className={`text-sm font-medium w-20 text-right ${
                        data.net >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {data.net >= 0 ? '+' : ''}{formatCurrency(data.net)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-r from-green-500 to-emerald-500" />
              <span className="text-sm text-muted-foreground">Income</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-r from-red-500 to-pink-500" />
              <span className="text-sm text-muted-foreground">Expenses</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      {selectedReport === 'categories' && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-purple-400" />
              Expense Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
              </div>
            ) : categoryData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No expense data available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {categoryData.map((cat) => (
                  <div key={cat.category} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{cat.category}</span>
                      <span>{formatCurrency(cat.amount)} ({cat.percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Export Options */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-400" />
            Export Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button
              variant="outline"
              className="h-16 border-white/10 hover:bg-white/5 flex-col gap-1"
              onClick={() => handleExport('csv')}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-5 w-5 text-green-400" />
              )}
              <span>Export as CSV</span>
            </Button>
            <Button
              variant="outline"
              className="h-16 border-white/10 hover:bg-white/5 flex-col gap-1"
              onClick={() => handleExport('pdf')}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <FileText className="h-5 w-5 text-red-400" />
              )}
              <span>Export as Text</span>
            </Button>
            <Button
              variant="outline"
              className="h-16 border-white/10 hover:bg-white/5 flex-col gap-1"
              onClick={handlePrint}
            >
              <Printer className="h-5 w-5 text-blue-400" />
              <span>Print Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ReportsPage
