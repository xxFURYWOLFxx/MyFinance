import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Search,
  UserCog,
  Eye,
  Ban,
  CheckCircle2,
  Clock,
  MoreVertical,
  Loader2,
  Shield,
  ShieldOff,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronUp,
  DollarSign,
  X,
  Users,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import {
  adminService,
  type AdminUser,
  type UserDetail,
} from '@/services/admin.service'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'

export function AdminUsersPage() {
  const { user: currentUser, setImpersonation } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [expandedUser, setExpandedUser] = useState<number | null>(null)
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers(search?: string, status?: string) {
    try {
      setLoading(true)
      const usersRes = await adminService.getUsers(0, 100, search, status !== 'all' ? status : undefined)
      setUsers(usersRes)
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(query: string) {
    setSearchQuery(query)
    loadUsers(query, statusFilter)
  }

  function handleStatusFilter(status: string) {
    setStatusFilter(status)
    loadUsers(searchQuery, status)
  }

  async function handleExpandUser(userId: number) {
    if (expandedUser === userId) {
      setExpandedUser(null)
      setUserDetail(null)
      return
    }

    setExpandedUser(userId)
    setLoadingDetail(true)
    try {
      const detail = await adminService.getUserDetail(userId)
      setUserDetail(detail)
    } catch (err) {
      console.error('Failed to load user detail:', err)
      toast.error('Failed to load user details')
    } finally {
      setLoadingDetail(false)
    }
  }

  async function handleToggleStatus(userId: number, currentStatus: string) {
    const isActive = currentStatus !== 'active'
    setActionLoading(userId)
    try {
      await adminService.updateUserStatus(userId, isActive)
      toast.success(`User ${isActive ? 'activated' : 'deactivated'} successfully`)
      loadUsers(searchQuery, statusFilter)
      if (expandedUser === userId) {
        const detail = await adminService.getUserDetail(userId)
        setUserDetail(detail)
      }
    } catch (err) {
      console.error('Failed to update user status:', err)
      toast.error('Failed to update user status')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleChangeRole(userId: number, currentRole: string) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    setActionLoading(userId)
    try {
      await adminService.updateUserRole(userId, newRole as 'user' | 'admin')
      toast.success(`User role changed to ${newRole}`)
      loadUsers(searchQuery, statusFilter)
      if (expandedUser === userId) {
        const detail = await adminService.getUserDetail(userId)
        setUserDetail(detail)
      }
    } catch (err) {
      console.error('Failed to update user role:', err)
      toast.error('Failed to update user role')
    } finally {
      setActionLoading(null)
    }
  }

  function handleImpersonate(user: AdminUser) {
    try {
      setImpersonation({
        id: user.id,
        email: user.email,
        first_name: user.name.split(' ')[0] || null,
        last_name: user.name.split(' ').slice(1).join(' ') || null,
        role: user.role,
        is_active: user.status === 'active',
        created_at: user.created_at,
        last_login_at: user.last_login,
        base_currency: 'USD',
        timezone: 'UTC',
      })
      toast.success(`Now viewing as ${user.name}`)
    } catch {
      toast.error('Failed to impersonate user')
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle2 }
      case 'inactive':
        return { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: Clock }
      case 'suspended':
        return { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: Ban }
      default:
        return { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: Clock }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground text-sm">
            {users.length} user{users.length !== 1 ? 's' : ''} total
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-11 bg-secondary/50 border-white/5 focus:border-blue-500/50"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'inactive', 'suspended'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusFilter(status)}
              className={statusFilter === status
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0'
                : 'border-white/10 hover:bg-white/5'
              }
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Users List */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No users found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {users.map((user) => {
                const statusConfig = getStatusConfig(user.status)
                const StatusIcon = statusConfig.icon
                const isExpanded = expandedUser === user.id
                const isCurrentUser = user.id === currentUser?.id

                return (
                  <div key={user.id}>
                    <div
                      className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-all cursor-pointer"
                      onClick={() => handleExpandUser(user.id)}
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-11 w-11 border-2 border-white/10">
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-sm">
                            {user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{user.name}</p>
                            {user.role === 'admin' && (
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                                Admin
                              </Badge>
                            )}
                            {isCurrentUser && (
                              <Badge variant="secondary" className="text-xs">You</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="hidden sm:block text-right">
                          <p className="font-medium">{formatCurrency(user.total_balance)}</p>
                          <p className="text-xs text-muted-foreground">{user.transactions} txns</p>
                        </div>
                        <Badge className={`text-xs ${statusConfig.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {user.status}
                        </Badge>
                        <div className="text-muted-foreground">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-white/5 bg-white/[0.01]">
                        {loadingDetail ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                          </div>
                        ) : userDetail ? (
                          <div className="pt-4 space-y-4">
                            {/* User Info Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="p-3 rounded-xl bg-secondary/30">
                                <p className="text-xs text-muted-foreground">Total Income</p>
                                <p className="text-lg font-semibold text-green-400">
                                  {formatCurrency(userDetail.financial_summary.total_income)}
                                </p>
                                <p className="text-xs text-muted-foreground">{userDetail.financial_summary.income_count} entries</p>
                              </div>
                              <div className="p-3 rounded-xl bg-secondary/30">
                                <p className="text-xs text-muted-foreground">Total Expenses</p>
                                <p className="text-lg font-semibold text-red-400">
                                  {formatCurrency(userDetail.financial_summary.total_expenses)}
                                </p>
                                <p className="text-xs text-muted-foreground">{userDetail.financial_summary.expense_count} entries</p>
                              </div>
                              <div className="p-3 rounded-xl bg-secondary/30">
                                <p className="text-xs text-muted-foreground">Net Balance</p>
                                <p className="text-lg font-semibold">
                                  {formatCurrency(userDetail.financial_summary.net_balance)}
                                </p>
                              </div>
                              <div className="p-3 rounded-xl bg-secondary/30">
                                <p className="text-xs text-muted-foreground">Total Savings</p>
                                <p className="text-lg font-semibold text-blue-400">
                                  {formatCurrency(userDetail.financial_summary.total_savings)}
                                </p>
                              </div>
                            </div>

                            {/* Meta Info */}
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <span>Joined: {new Date(userDetail.created_at).toLocaleDateString()}</span>
                              <span>Last login: {userDetail.last_login_at ? new Date(userDetail.last_login_at).toLocaleDateString() : 'Never'}</span>
                              <span>Currency: {userDetail.base_currency}</span>
                              <span>Timezone: {userDetail.timezone}</span>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2 pt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleToggleStatus(user.id, user.status)
                                }}
                                disabled={actionLoading === user.id || isCurrentUser}
                                className="border-white/10 hover:bg-white/5"
                              >
                                {actionLoading === user.id ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : user.status === 'active' ? (
                                  <UserX className="h-4 w-4 mr-2 text-red-400" />
                                ) : (
                                  <UserCheck className="h-4 w-4 mr-2 text-green-400" />
                                )}
                                {user.status === 'active' ? 'Deactivate' : 'Activate'}
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleChangeRole(user.id, user.role)
                                }}
                                disabled={actionLoading === user.id || isCurrentUser}
                                className="border-white/10 hover:bg-white/5"
                              >
                                {user.role === 'admin' ? (
                                  <ShieldOff className="h-4 w-4 mr-2 text-orange-400" />
                                ) : (
                                  <Shield className="h-4 w-4 mr-2 text-purple-400" />
                                )}
                                {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                              </Button>

                              {!isCurrentUser && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleImpersonate(user)
                                  }}
                                  disabled={actionLoading === user.id}
                                  className="border-white/10 hover:bg-white/5"
                                >
                                  <Eye className="h-4 w-4 mr-2 text-blue-400" />
                                  View As User
                                </Button>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminUsersPage
