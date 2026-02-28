import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useAuthStore } from '@/stores/authStore'
import { Skeleton } from '@/components/ui/skeleton'
import { Eye, X } from 'lucide-react'

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { fetchCurrentUser, isLoading, user, impersonatingUser, setImpersonation } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      fetchCurrentUser()
    }
  }, [fetchCurrentUser, user])

  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex">
        {/* Sidebar skeleton */}
        <div className="w-64 border-r bg-card p-4 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-6 w-2/3" />
        </div>
        {/* Main content skeleton */}
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <div className="grid grid-cols-4 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar
              collapsed={false}
              onToggle={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Impersonation banner */}
        {impersonatingUser && (
          <div className="relative z-[200] bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium shadow-lg">
            <Eye className="h-4 w-4" />
            <span>
              You are viewing as <strong>{impersonatingUser.first_name || impersonatingUser.email}</strong>
            </span>
            <button
              onClick={() => {
                setImpersonation(null)
                navigate('/')
              }}
              className="ml-2 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white font-medium text-xs"
            >
              <X className="h-3 w-3" />
              Exit View
            </button>
          </div>
        )}

        <Header onMenuClick={() => setMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
