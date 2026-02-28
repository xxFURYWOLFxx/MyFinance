import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  Users,
  Eye,
  DollarSign,
  Loader2,
  Clock,
  RefreshCw,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { adminService, type ActivityItem } from '@/services/admin.service'

export function AdminActivityPage() {
  const [loading, setLoading] = useState(true)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [limit, setLimit] = useState(20)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    loadActivity()
  }, [limit])

  async function loadActivity() {
    try {
      setLoading(true)
      const data = await adminService.getActivity(limit)
      setActivity(data)
    } catch (err) {
      console.error('Failed to load activity:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredActivity = filter === 'all'
    ? activity
    : activity.filter(item => item.type === filter)

  const activityConfig: Record<string, { icon: typeof Activity; color: string; bg: string; label: string }> = {
    signup: { icon: Users, color: 'text-green-400', bg: 'bg-green-500/20', label: 'New Signup' },
    login: { icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Login' },
    transaction: { icon: DollarSign, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Transaction' },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Activity Log</h1>
          <p className="text-muted-foreground text-sm">Recent system events and user actions</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadActivity}
          disabled={loading}
          className="border-white/10 hover:bg-white/5"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { value: 'all', label: 'All' },
          { value: 'signup', label: 'Signups' },
          { value: 'login', label: 'Logins' },
          { value: 'transaction', label: 'Transactions' },
        ].map((option) => (
          <Button
            key={option.value}
            variant={filter === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(option.value)}
            className={filter === option.value
              ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0'
              : 'border-white/10 hover:bg-white/5'
            }
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Activity List */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            </div>
          ) : filteredActivity.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No activity found</p>
              <p className="text-sm">Try changing the filter or check back later</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredActivity.map((item, index) => {
                const config = activityConfig[item.type] || {
                  icon: Activity, color: 'text-gray-400', bg: 'bg-gray-500/20', label: 'Unknown'
                }
                const Icon = config.icon
                const timeAgo = getTimeAgo(item.timestamp)
                const fullTime = new Date(item.timestamp).toLocaleString()

                return (
                  <div key={index} className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-all">
                    <div className={`p-2.5 rounded-xl ${config.bg}`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.user}</p>
                        <Badge variant="secondary" className="text-xs">
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.type === 'transaction' && item.details?.amount
                          ? `${item.details.transaction_type === 'income' ? 'Received' : 'Spent'} ${formatCurrency(item.details.amount)}`
                          : item.type === 'signup'
                            ? 'Created a new account'
                            : 'Logged into the system'
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeAgo}
                      </p>
                      <p className="text-xs text-muted-foreground/50">{fullTime}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Load More */}
      {filteredActivity.length >= limit && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => setLimit(prev => prev + 20)}
            className="border-white/10 hover:bg-white/5"
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}

function getTimeAgo(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

export default AdminActivityPage
