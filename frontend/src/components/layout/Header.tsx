import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { searchService, type SearchResult } from '@/services/search.service'
import { notificationsService, type Notification } from '@/services/notifications.service'
import { adminService } from '@/services/admin.service'
import { formatCurrency } from '@/lib/utils'
import {
  Bell,
  LogOut,
  User,
  Settings,
  Menu,
  Search,
  TrendingUp,
  TrendingDown,
  Target,
  PiggyBank,
  LineChart,
  CreditCard,
  Repeat,
  X,
  Loader2,
  AlertTriangle,
  Calendar,
  Info,
  LayoutDashboard,
  Briefcase,
  BarChart3,
  Archive,
  Shield,
  Users,
  Activity,
  Wallet,
  RefreshCw,
  FileText,
} from 'lucide-react'

interface HeaderProps {
  onMenuClick?: () => void
}

const typeIcons: Record<string, React.ElementType> = {
  income: TrendingUp,
  expense: TrendingDown,
  goal: Target,
  budget: PiggyBank,
  investment: LineChart,
  debt: CreditCard,
  recurring: Repeat,
}

const typeColors: Record<string, string> = {
  income: 'text-green-400 bg-green-500/20',
  expense: 'text-red-400 bg-red-500/20',
  goal: 'text-blue-400 bg-blue-500/20',
  budget: 'text-purple-400 bg-purple-500/20',
  investment: 'text-cyan-400 bg-cyan-500/20',
  debt: 'text-orange-400 bg-orange-500/20',
  recurring: 'text-pink-400 bg-pink-500/20',
}

const typeRoutes: Record<string, string> = {
  income: '/income',
  expense: '/expenses',
  goal: '/goals',
  budget: '/budgets',
  investment: '/investments',
  debt: '/debts',
  recurring: '/recurring',
}

const notificationIcons: Record<string, React.ElementType> = {
  budget_alert: AlertTriangle,
  goal_milestone: Target,
  bill_reminder: Calendar,
  system: Info,
  info: Info,
}

const notificationColors: Record<string, string> = {
  budget_alert: 'text-orange-400 bg-orange-500/20',
  goal_milestone: 'text-blue-400 bg-blue-500/20',
  bill_reminder: 'text-purple-400 bg-purple-500/20',
  system: 'text-gray-400 bg-gray-500/20',
  info: 'text-cyan-400 bg-cyan-500/20',
}

// Navigation pages for universal search
interface NavPage {
  title: string
  path: string
  icon: React.ElementType
  color: string
  keywords: string[]
  adminOnly?: boolean
}

const navPages: NavPage[] = [
  { title: 'Dashboard', path: '/', icon: LayoutDashboard, color: 'text-blue-400 bg-blue-500/20', keywords: ['dashboard', 'home', 'overview'] },
  { title: 'Income', path: '/income', icon: TrendingUp, color: 'text-green-400 bg-green-500/20', keywords: ['income', 'earnings', 'salary', 'revenue'] },
  { title: 'Expenses', path: '/expenses', icon: TrendingDown, color: 'text-red-400 bg-red-500/20', keywords: ['expenses', 'spending', 'costs'] },
  { title: 'Savings', path: '/savings', icon: PiggyBank, color: 'text-emerald-400 bg-emerald-500/20', keywords: ['savings', 'save', 'piggy'] },
  { title: 'Business', path: '/business', icon: Briefcase, color: 'text-amber-400 bg-amber-500/20', keywords: ['business', 'company'] },
  { title: 'Budgets', path: '/budgets', icon: Wallet, color: 'text-purple-400 bg-purple-500/20', keywords: ['budgets', 'budget', 'planning'] },
  { title: 'Goals', path: '/goals', icon: Target, color: 'text-blue-400 bg-blue-500/20', keywords: ['goals', 'targets', 'milestones'] },
  { title: 'Investments', path: '/investments', icon: BarChart3, color: 'text-cyan-400 bg-cyan-500/20', keywords: ['investments', 'invest', 'stocks', 'portfolio'] },
  { title: 'Debts', path: '/debts', icon: CreditCard, color: 'text-orange-400 bg-orange-500/20', keywords: ['debts', 'loans', 'owe', 'credit'] },
  { title: 'Recurring', path: '/recurring', icon: RefreshCw, color: 'text-pink-400 bg-pink-500/20', keywords: ['recurring', 'subscriptions', 'repeat'] },
  { title: 'Reports', path: '/reports', icon: FileText, color: 'text-indigo-400 bg-indigo-500/20', keywords: ['reports', 'analytics', 'charts'] },
  { title: 'Forecasting', path: '/forecasting', icon: LineChart, color: 'text-violet-400 bg-violet-500/20', keywords: ['forecasting', 'forecast', 'predict', 'projection'] },
  { title: 'Archive', path: '/archive', icon: Archive, color: 'text-gray-400 bg-gray-500/20', keywords: ['archive', 'archived', 'old', 'history'] },
  { title: 'Settings', path: '/settings', icon: Settings, color: 'text-gray-400 bg-gray-500/20', keywords: ['settings', 'preferences', 'profile', 'account', 'password', 'theme', 'notifications'] },
  { title: 'Admin Dashboard', path: '/admin/dashboard', icon: Shield, color: 'text-red-400 bg-red-500/20', keywords: ['admin', 'administration', 'system'], adminOnly: true },
  { title: 'Admin Users', path: '/admin/users', icon: Users, color: 'text-red-400 bg-red-500/20', keywords: ['admin users', 'user management', 'manage users'], adminOnly: true },
  { title: 'Admin Activity', path: '/admin/activity', icon: Activity, color: 'text-red-400 bg-red-500/20', keywords: ['admin activity', 'activity log', 'system log'], adminOnly: true },
  { title: 'Admin Analytics', path: '/admin/analytics', icon: BarChart3, color: 'text-red-400 bg-red-500/20', keywords: ['admin analytics', 'system analytics'], adminOnly: true },
  { title: 'Admin Alerts', path: '/admin/alerts', icon: AlertTriangle, color: 'text-red-400 bg-red-500/20', keywords: ['admin alerts', 'system alerts'], adminOnly: true },
]

interface UnifiedResult {
  id: string
  type: 'page' | 'financial' | 'user'
  title: string
  subtitle?: string
  icon: React.ElementType
  color: string
  amount?: number
  path: string
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate()
  const { user, logout, impersonatingUser, setImpersonation } = useAuthStore()
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [financialResults, setFinancialResults] = useState<SearchResult[]>([])
  const [adminUsers, setAdminUsers] = useState<{ id: number; name: string; email: string }[]>([])
  const [showResults, setShowResults] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)

  const isAdmin = user?.role === 'admin'

  // Ctrl+K / Cmd+K keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        setShowResults(false)
        searchInputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close search results and notifications when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load unread count on mount and periodically
  useEffect(() => {
    loadUnreadCount()
    const interval = setInterval(loadUnreadCount, 60000)
    return () => clearInterval(interval)
  }, [])

  async function loadUnreadCount() {
    try {
      const count = await notificationsService.getUnreadCount()
      setUnreadCount(count)
    } catch (error) {
      console.error('Failed to load notification count:', error)
    }
  }

  async function loadNotifications() {
    setLoadingNotifications(true)
    try {
      const data = await notificationsService.getNotifications(20)
      setNotifications(data)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoadingNotifications(false)
    }
  }

  function handleNotificationClick(notification: Notification) {
    if (notification.link) {
      navigate(notification.link)
    }
    if (notification.id > 0) {
      notificationsService.markAsRead(notification.id)
    }
    setShowNotifications(false)
    loadUnreadCount()
  }

  async function handleMarkAllRead() {
    try {
      await notificationsService.markAllAsRead()
      setNotifications(notifications.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  function toggleNotifications() {
    if (!showNotifications) {
      loadNotifications()
    }
    setShowNotifications(!showNotifications)
  }

  // Debounced search across all sources
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchQuery.trim().length < 2) {
      setFinancialResults([])
      setAdminUsers([])
      setShowResults(false)
      return
    }

    setShowResults(true)

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const promises: Promise<void>[] = []

        // Financial data search
        promises.push(
          searchService.search(searchQuery).then(response => {
            setFinancialResults(response.results)
          }).catch(() => setFinancialResults([]))
        )

        // Admin user search (only for admins)
        if (isAdmin) {
          promises.push(
            adminService.getUsers(0, 5, searchQuery).then(users => {
              setAdminUsers(users.map(u => ({ id: u.id, name: u.name, email: u.email })))
            }).catch(() => setAdminUsers([]))
          )
        }

        await Promise.all(promises)
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, isAdmin])

  // Build unified search results
  const unifiedResults = useMemo(() => {
    const results: UnifiedResult[] = []
    const query = searchQuery.toLowerCase().trim()
    if (query.length < 2) return results

    // 1. Page navigation results
    const matchedPages = navPages.filter(page => {
      if (page.adminOnly && !isAdmin) return false
      return (
        page.title.toLowerCase().includes(query) ||
        page.keywords.some(kw => kw.includes(query))
      )
    })
    matchedPages.forEach(page => {
      results.push({
        id: `page-${page.path}`,
        type: 'page',
        title: page.title,
        subtitle: 'Navigate to page',
        icon: page.icon,
        color: page.color,
        path: page.path,
      })
    })

    // 2. Admin user results
    adminUsers.forEach(u => {
      results.push({
        id: `user-${u.id}`,
        type: 'user',
        title: u.name,
        subtitle: u.email,
        icon: User,
        color: 'text-blue-400 bg-blue-500/20',
        path: '/admin/users',
      })
    })

    // 3. Financial data results
    financialResults.forEach(r => {
      results.push({
        id: `fin-${r.type}-${r.id}`,
        type: 'financial',
        title: r.title,
        subtitle: r.category || r.description,
        icon: typeIcons[r.type] || Search,
        color: typeColors[r.type] || 'text-gray-400 bg-gray-500/20',
        amount: r.amount,
        path: typeRoutes[r.type] || '/',
      })
    })

    return results
  }, [searchQuery, financialResults, adminUsers, isAdmin])

  function handleResultClick(result: UnifiedResult) {
    navigate(result.path)
    setSearchQuery('')
    setShowResults(false)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const displayUser = impersonatingUser || user
  const initials = displayUser
    ? `${displayUser.first_name?.[0] || ''}${displayUser.last_name?.[0] || displayUser.email[0]}`.toUpperCase()
    : '?'

  // Group results by type
  const pageResults = unifiedResults.filter(r => r.type === 'page')
  const userResults = unifiedResults.filter(r => r.type === 'user')
  const finResults = unifiedResults.filter(r => r.type === 'financial')
  const hasResults = unifiedResults.length > 0

  return (
    <header className="h-16 border-b border-white/5 glass-card px-4 flex items-center justify-between relative z-[60]">
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden hover:bg-white/5"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Universal Search bar */}
        <div ref={searchRef} className="hidden md:block relative">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-muted-foreground focus-within:border-purple-500/30 focus-within:bg-white/[0.07] transition-all">
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search everything..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
              className="bg-transparent border-none outline-none text-sm w-56 placeholder:text-muted-foreground/50 text-foreground"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setShowResults(false)
                }}
                className="hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            {!searchQuery && (
              <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">Ctrl</span>K
              </kbd>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showResults && searchQuery.length >= 2 && (
            <div className="absolute top-full left-0 mt-2 w-96 bg-background/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl overflow-hidden z-[150]">
              <div className="max-h-[420px] overflow-y-auto">
                {searching && !hasResults && (
                  <div className="flex items-center justify-center p-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}

                {/* Pages section */}
                {pageResults.length > 0 && (
                  <>
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider bg-white/[0.02]">
                      Pages
                    </div>
                    {pageResults.map((result) => {
                      const Icon = result.icon
                      return (
                        <button
                          key={result.id}
                          onClick={() => handleResultClick(result)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
                        >
                          <div className={`p-1.5 rounded-lg ${result.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{result.title}</p>
                            <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                          </div>
                        </button>
                      )
                    })}
                  </>
                )}

                {/* Users section */}
                {userResults.length > 0 && (
                  <>
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider bg-white/[0.02]">
                      Users
                    </div>
                    {userResults.map((result) => {
                      const Icon = result.icon
                      return (
                        <button
                          key={result.id}
                          onClick={() => handleResultClick(result)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
                        >
                          <div className={`p-1.5 rounded-lg ${result.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{result.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                          </div>
                        </button>
                      )
                    })}
                  </>
                )}

                {/* Financial data section */}
                {finResults.length > 0 && (
                  <>
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider bg-white/[0.02]">
                      Financial Data
                    </div>
                    {finResults.map((result) => {
                      const Icon = result.icon
                      return (
                        <button
                          key={result.id}
                          onClick={() => handleResultClick(result)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
                        >
                          <div className={`p-1.5 rounded-lg ${result.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{result.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                          </div>
                          {result.amount !== undefined && (
                            <span className="text-sm font-medium text-foreground">
                              {formatCurrency(result.amount)}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </>
                )}

                {/* No results */}
                {!searching && !hasResults && searchQuery.length >= 2 && (
                  <div className="p-6 text-center">
                    <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No results for "{searchQuery}"</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Try searching for pages, transactions, or users</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {impersonatingUser && (
          <div className="flex items-center gap-2">
            <Badge variant="warning" className="gap-1">
              <User className="h-3 w-3" />
              Viewing as {impersonatingUser.email}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setImpersonation(null)
                navigate('/')
              }}
              className="h-7 px-2.5 text-xs border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 gap-1"
            >
              <X className="h-3 w-3" />
              Stop Viewing
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        {/* Notifications */}
        <div ref={notificationRef} className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleNotifications}
            className="relative hover:bg-white/5 rounded-xl"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-purple-500 rounded-full ring-2 ring-background flex items-center justify-center text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-background/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl overflow-hidden z-[150]">
              <div className="flex items-center justify-between p-3 border-b border-white/5">
                <h3 className="font-semibold text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-purple-400 hover:text-purple-300"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {loadingNotifications ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notifications</p>
                  </div>
                ) : (
                  notifications.map((notification) => {
                    const Icon = notificationIcons[notification.notification_type] || Info
                    const colorClass = notificationColors[notification.notification_type] || 'text-gray-400 bg-gray-500/20'
                    return (
                      <button
                        key={`${notification.notification_type}-${notification.id}`}
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full flex items-start gap-3 p-3 hover:bg-white/5 transition-colors text-left ${
                          !notification.is_read ? 'bg-purple-500/5' : ''
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${colorClass} mt-0.5`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!notification.is_read ? 'font-medium' : ''} text-foreground`}>
                            {notification.title}
                          </p>
                          {notification.message && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {notification.message}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            {new Date(notification.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
                        )}
                      </button>
                    )
                  })
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-2 border-t border-white/5">
                  <button
                    onClick={() => {
                      navigate('/settings')
                      setShowNotifications(false)
                    }}
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-2"
                  >
                    Notification Settings
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Settings */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/settings')}
          className="hover:bg-white/5 rounded-xl"
        >
          <Settings className="h-5 w-5 text-muted-foreground" />
        </Button>

        {/* Divider */}
        <div className="w-px h-8 bg-white/10 mx-2" />

        {/* User menu */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-foreground">
              {displayUser?.first_name || displayUser?.email?.split('@')[0]}
            </p>
            <p className="text-xs text-muted-foreground">
              {displayUser?.role === 'admin' ? 'Administrator' : 'Member'}
            </p>
          </div>

          <Avatar className="h-9 w-9 ring-2 ring-purple-500/20">
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            title="Logout"
            className="hover:bg-white/5 rounded-xl text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}

export default Header
