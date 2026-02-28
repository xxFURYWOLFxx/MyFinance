import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  Activity,
  Info,
  Loader2,
  RefreshCw,
  Bell,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { adminService, type SystemAlert } from '@/services/admin.service'

export function AdminAlertsPage() {
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState<SystemAlert[]>([])

  useEffect(() => {
    loadAlerts()
  }, [])

  async function loadAlerts() {
    try {
      setLoading(true)
      const data = await adminService.getAlerts()
      setAlerts(data)
    } catch (err) {
      console.error('Failed to load alerts:', err)
    } finally {
      setLoading(false)
    }
  }

  const alertConfig: Record<string, { icon: typeof AlertTriangle; color: string; bg: string; border: string; label: string }> = {
    warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', label: 'Warning' },
    info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Info' },
    error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Error' },
  }

  const warningCount = alerts.filter(a => a.type === 'warning').length
  const errorCount = alerts.filter(a => a.type === 'error').length
  const infoCount = alerts.filter(a => a.type === 'info').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Alerts</h1>
          <p className="text-muted-foreground text-sm">
            {alerts.length} alert{alerts.length !== 1 ? 's' : ''} active
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadAlerts}
          disabled={loading}
          className="border-white/10 hover:bg-white/5"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 grid-cols-3">
        <Card className="glass-card border-red-500/20">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-400">{errorCount}</p>
            <p className="text-sm text-muted-foreground">Errors</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-yellow-500/20">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-yellow-400">{warningCount}</p>
            <p className="text-sm text-muted-foreground">Warnings</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-blue-500/20">
          <CardContent className="pt-6 text-center">
            <Info className="h-8 w-8 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-400">{infoCount}</p>
            <p className="text-sm text-muted-foreground">Info</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        </div>
      ) : alerts.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <p className="text-xl font-semibold text-green-400">All Clear</p>
            <p className="text-muted-foreground mt-1">No system alerts at this time</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, index) => {
            const config = alertConfig[alert.type] || alertConfig.info
            const Icon = config.icon
            return (
              <Card key={index} className={`glass-card ${config.border}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-xl ${config.bg}`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`font-semibold ${config.color}`}>{alert.title}</p>
                        <Badge variant="secondary" className="text-xs">
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AdminAlertsPage
