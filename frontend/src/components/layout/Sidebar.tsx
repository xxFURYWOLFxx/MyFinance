import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Briefcase,
  Target,
  Wallet,
  CreditCard,
  RefreshCw,
  BarChart3,
  LineChart,
  Archive,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Users,
  Activity,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  adminOnly?: boolean
}

const mainNavItems: NavItem[] = [
  { to: '/', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard' },
  { to: '/income', icon: <TrendingUp className="h-5 w-5" />, label: 'Income' },
  { to: '/expenses', icon: <TrendingDown className="h-5 w-5" />, label: 'Expenses' },
  { to: '/savings', icon: <PiggyBank className="h-5 w-5" />, label: 'Savings' },
  { to: '/business', icon: <Briefcase className="h-5 w-5" />, label: 'Business' },
]

const planningNavItems: NavItem[] = [
  { to: '/budgets', icon: <Wallet className="h-5 w-5" />, label: 'Budgets' },
  { to: '/goals', icon: <Target className="h-5 w-5" />, label: 'Goals' },
  { to: '/investments', icon: <BarChart3 className="h-5 w-5" />, label: 'Investments' },
  { to: '/debts', icon: <CreditCard className="h-5 w-5" />, label: 'Debts' },
  { to: '/recurring', icon: <RefreshCw className="h-5 w-5" />, label: 'Recurring' },
]

const analyticsNavItems: NavItem[] = [
  { to: '/reports', icon: <BarChart3 className="h-5 w-5" />, label: 'Reports' },
  { to: '/forecasting', icon: <LineChart className="h-5 w-5" />, label: 'Forecasting' },
  { to: '/archive', icon: <Archive className="h-5 w-5" />, label: 'Archive' },
]

const adminNavItems: NavItem[] = [
  { to: '/admin/dashboard', icon: <Shield className="h-5 w-5" />, label: 'Overview', adminOnly: true },
  { to: '/admin/users', icon: <Users className="h-5 w-5" />, label: 'Users', adminOnly: true },
  { to: '/admin/activity', icon: <Activity className="h-5 w-5" />, label: 'Activity', adminOnly: true },
  { to: '/admin/analytics', icon: <BarChart3 className="h-5 w-5" />, label: 'Analytics', adminOnly: true },
  { to: '/admin/alerts', icon: <AlertTriangle className="h-5 w-5" />, label: 'Alerts', adminOnly: true },
]

const bottomNavItems: NavItem[] = [
  { to: '/settings', icon: <Settings className="h-5 w-5" />, label: 'Settings' },
]

function NavSection({ items, title, collapsed }: { items: NavItem[]; title?: string; collapsed: boolean }) {
  const { user } = useAuthStore()

  const filteredItems = items.filter((item) => !item.adminOnly || user?.role === 'admin')

  if (filteredItems.length === 0) return null

  return (
    <div className="space-y-1">
      {title && !collapsed && (
        <h3 className="px-3 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-2">
          {title}
        </h3>
      )}
      {filteredItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white border border-purple-500/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
              collapsed && 'justify-center px-2'
            )
          }
          title={collapsed ? item.label : undefined}
        >
          <span className={cn(
            'transition-colors',
            'group-[.active]:text-purple-400'
          )}>
            {item.icon}
          </span>
          {!collapsed && <span>{item.label}</span>}
        </NavLink>
      ))}
    </div>
  )
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex flex-col glass-card border-r border-white/5 transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-white/5',
        collapsed && 'justify-center px-2'
      )}>
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg gradient-text">MyFinance</span>
          </div>
        ) : (
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-6">
        <NavSection items={mainNavItems} collapsed={collapsed} />

        <div className={cn('border-t border-white/5', collapsed && 'mx-2')} />

        <NavSection items={planningNavItems} title="Planning" collapsed={collapsed} />

        <div className={cn('border-t border-white/5', collapsed && 'mx-2')} />

        <NavSection items={analyticsNavItems} title="Analytics" collapsed={collapsed} />

        <div className={cn('border-t border-white/5', collapsed && 'mx-2')} />

        <NavSection items={adminNavItems} title="Administration" collapsed={collapsed} />
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-white/5 space-y-1">
        <NavSection items={bottomNavItems} collapsed={collapsed} />

        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            'w-full mt-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-xl',
            collapsed ? 'px-2' : 'justify-start'
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}

export default Sidebar
