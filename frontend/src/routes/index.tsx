import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'
import { VerifyEmailPage } from '@/components/auth/VerifyEmailPage'

// Lazy load pages for better performance
import { lazy, Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const IncomePage = lazy(() => import('@/pages/IncomePage'))
const ExpensesPage = lazy(() => import('@/pages/ExpensesPage'))
const SavingsPage = lazy(() => import('@/pages/SavingsPage'))
const BusinessPage = lazy(() => import('@/pages/BusinessPage'))
const BudgetsPage = lazy(() => import('@/pages/BudgetsPage'))
const GoalsPage = lazy(() => import('@/pages/GoalsPage'))
const InvestmentsPage = lazy(() => import('@/pages/InvestmentsPage'))
const DebtsPage = lazy(() => import('@/pages/DebtsPage'))
const RecurringPage = lazy(() => import('@/pages/RecurringPage'))
const ReportsPage = lazy(() => import('@/pages/ReportsPage'))
const ForecastingPage = lazy(() => import('@/pages/ForecastingPage'))
const ArchivePage = lazy(() => import('@/pages/ArchivePage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))

// Admin creation (localhost only)
const CreateAdminPage = lazy(() => import('@/pages/CreateAdminPage'))

// Admin sub-pages
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'))
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'))
const AdminActivityPage = lazy(() => import('@/pages/admin/AdminActivityPage'))
const AdminAnalyticsPage = lazy(() => import('@/pages/admin/AdminAnalyticsPage'))
const AdminAlertsPage = lazy(() => import('@/pages/admin/AdminAlertsPage'))

function PageLoader() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-1/3" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

const router = createBrowserRouter([
  // Public routes
  {
    path: '/login',
    element: <LoginForm />,
  },
  {
    path: '/register',
    element: <RegisterForm />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordForm />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordForm />,
  },
  {
    path: '/verify-email',
    element: <VerifyEmailPage />,
  },
  {
    path: '/create-admin',
    element: (
      <SuspenseWrapper>
        <CreateAdminPage />
      </SuspenseWrapper>
    ),
  },

  // Protected routes with layout
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <SuspenseWrapper>
            <DashboardPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'income',
        element: (
          <SuspenseWrapper>
            <IncomePage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'expenses',
        element: (
          <SuspenseWrapper>
            <ExpensesPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'savings',
        element: (
          <SuspenseWrapper>
            <SavingsPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'business',
        element: (
          <SuspenseWrapper>
            <BusinessPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'budgets',
        element: (
          <SuspenseWrapper>
            <BudgetsPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'goals',
        element: (
          <SuspenseWrapper>
            <GoalsPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'investments',
        element: (
          <SuspenseWrapper>
            <InvestmentsPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'debts',
        element: (
          <SuspenseWrapper>
            <DebtsPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'recurring',
        element: (
          <SuspenseWrapper>
            <RecurringPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'reports',
        element: (
          <SuspenseWrapper>
            <ReportsPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'forecasting',
        element: (
          <SuspenseWrapper>
            <ForecastingPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'archive',
        element: (
          <SuspenseWrapper>
            <ArchivePage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'settings',
        element: (
          <SuspenseWrapper>
            <SettingsPage />
          </SuspenseWrapper>
        ),
      },
      // Admin pages - flat routes, each protected
      {
        path: 'admin',
        element: <Navigate to="/admin/dashboard" replace />,
      },
      {
        path: 'admin/dashboard',
        element: (
          <ProtectedRoute requireAdmin>
            <SuspenseWrapper>
              <AdminDashboardPage />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/users',
        element: (
          <ProtectedRoute requireAdmin>
            <SuspenseWrapper>
              <AdminUsersPage />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/activity',
        element: (
          <ProtectedRoute requireAdmin>
            <SuspenseWrapper>
              <AdminActivityPage />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/analytics',
        element: (
          <ProtectedRoute requireAdmin>
            <SuspenseWrapper>
              <AdminAnalyticsPage />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/alerts',
        element: (
          <ProtectedRoute requireAdmin>
            <SuspenseWrapper>
              <AdminAlertsPage />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
    ],
  },

  // Catch all redirect
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}

export default AppRouter
