import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Users,
  Activity,
  BarChart3,
  TrendingUp,
  DollarSign,
  Loader2,
  Eye,
  Clock,
  Shield,
  Save,
  Timer,
  Globe,
  CheckCircle2,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import {
  adminService,
  type AdminStats,
  type ActivityItem,
  type SecuritySettings,
} from '@/services/admin.service'

export function AdminDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])

  // Security settings state
  const [secLoading, setSecLoading] = useState(true)
  const [secSaving, setSecSaving] = useState(false)
  const [secSaved, setSecSaved] = useState(false)
  const [secSettings, setSecSettings] = useState<SecuritySettings>({
    access_token_expire_minutes: 30,
    refresh_token_expire_days: 7,
    ip_binding_enabled: false,
  })

  useEffect(() => {
    loadData()
    loadSecuritySettings()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [statsRes, activityRes] = await Promise.all([
        adminService.getStats(),
        adminService.getActivity(10),
      ])
      setStats(statsRes)
      setActivity(activityRes)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadSecuritySettings() {
    try {
      setSecLoading(true)
      const settings = await adminService.getSecuritySettings()
      setSecSettings(settings)
    } catch (err) {
      console.error('Failed to load security settings:', err)
    } finally {
      setSecLoading(false)
    }
  }

  async function saveSecuritySettings() {
    try {
      setSecSaving(true)
      const updated = await adminService.updateSecuritySettings(secSettings)
      setSecSettings(updated)
      setSecSaved(true)
      setTimeout(() => setSecSaved(false), 3000)
    } catch (err) {
      console.error('Failed to save security settings:', err)
    } finally {
      setSecSaving(false)
    }
  }

  const displayStats = stats || {
    total_users: 0,
    active_users: 0,
    new_users_today: 0,
    total_transactions: 0,
    total_volume: 0,
    avg_user_balance: 0,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground text-sm">System statistics at a glance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-16 bg-white/5 animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">{displayStats.total_users}</div>
                <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  +{displayStats.new_users_today} today
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
              <Activity className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-16 bg-white/5 animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-400">{displayStats.active_users}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {displayStats.total_users > 0
                    ? `${((displayStats.active_users / displayStats.total_users) * 100).toFixed(0)}% of total`
                    : '0% of total'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-16 bg-white/5 animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">{displayStats.total_transactions.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-amber-500/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Volume</CardTitle>
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {loading ? (
              <div className="h-8 w-20 bg-white/5 animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(displayStats.total_volume)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg: {formatCurrency(displayStats.avg_user_balance)}/user
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Security Settings + Recent Activity side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Security Settings */}
        <Card className="glass-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-orange-500/5" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-red-400" />
              Session & Security
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Configure JWT token expiration and IP binding for all users
            </p>
          </CardHeader>
          <CardContent className="relative space-y-5">
            {secLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-red-400" />
              </div>
            ) : (
              <>
                {/* Access Token Expiry */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Timer className="h-4 w-4 text-blue-400" />
                    Access Token Expiry
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={5}
                      max={1440}
                      value={secSettings.access_token_expire_minutes}
                      onChange={(e) =>
                        setSecSettings((s) => ({
                          ...s,
                          access_token_expire_minutes: Math.max(5, Math.min(1440, parseInt(e.target.value) || 5)),
                        }))
                      }
                      className="w-24 bg-secondary/50 border-white/10"
                    />
                    <span className="text-sm text-muted-foreground">minutes</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      ({secSettings.access_token_expire_minutes >= 60
                        ? `${(secSettings.access_token_expire_minutes / 60).toFixed(1)}h`
                        : `${secSettings.access_token_expire_minutes}m`})
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    How long until the access token expires. Range: 5 min - 24 hours.
                  </p>
                </div>

                {/* Refresh Token Expiry */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4 text-green-400" />
                    Refresh Token Expiry
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={1}
                      max={90}
                      value={secSettings.refresh_token_expire_days}
                      onChange={(e) =>
                        setSecSettings((s) => ({
                          ...s,
                          refresh_token_expire_days: Math.max(1, Math.min(90, parseInt(e.target.value) || 1)),
                        }))
                      }
                      className="w-24 bg-secondary/50 border-white/10"
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    How long until the refresh token expires. Range: 1 - 90 days.
                  </p>
                </div>

                {/* IP Binding Toggle */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Globe className="h-4 w-4 text-orange-400" />
                    IP Address Binding
                  </Label>
                  <button
                    type="button"
                    onClick={() =>
                      setSecSettings((s) => ({
                        ...s,
                        ip_binding_enabled: !s.ip_binding_enabled,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      secSettings.ip_binding_enabled
                        ? 'bg-gradient-to-r from-red-500 to-orange-500'
                        : 'bg-secondary'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                        secSettings.ip_binding_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <p className="text-xs text-muted-foreground">
                    {secSettings.ip_binding_enabled
                      ? 'Sessions are locked to the IP address they were created from. Users will need to re-login if their IP changes.'
                      : 'Sessions are not tied to IP addresses. Users can use tokens from any IP.'}
                  </p>
                </div>

                {/* Save Button */}
                <Button
                  onClick={saveSecuritySettings}
                  disabled={secSaving}
                  className={`w-full ${
                    secSaved
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                      : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700'
                  }`}
                >
                  {secSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : secSaved ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Security Settings
                    </>
                  )}
                </Button>

                <p className="text-xs text-yellow-400/80">
                  Note: Changes apply to new sessions only. Existing tokens keep their original expiration.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-green-400" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
              </div>
            ) : activity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activity.map((item, index) => {
                  const config = {
                    signup: { icon: Users, color: 'text-green-400', bg: 'bg-green-500/20', text: 'New signup' },
                    login: { icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/20', text: 'Logged in' },
                    transaction: {
                      icon: DollarSign,
                      color: 'text-purple-400',
                      bg: 'bg-purple-500/20',
                      text: item.details?.amount ? `Transaction ${formatCurrency(item.details.amount)}` : 'Transaction'
                    },
                  }[item.type] || { icon: Activity, color: 'text-gray-400', bg: 'bg-gray-500/20', text: 'Activity' }
                  const Icon = config.icon
                  const timeAgo = getTimeAgo(item.timestamp)

                  return (
                    <div key={index} className="flex items-center gap-4 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all">
                      <div className={`p-2 rounded-lg ${config.bg}`}>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.user}</p>
                        <p className="text-xs text-muted-foreground">{config.text}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {timeAgo}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
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

export default AdminDashboardPage
