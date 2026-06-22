import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import { MainLayout } from '@/components/layout/MainLayout'
import { ProtectedRoute, PublicOnlyRoute } from '@/components/layout/ProtectedRoute'

const WelcomePage    = lazy(() => import('@/pages/WelcomePage').then(m => ({ default: m.WelcomePage })))
const AuthPage       = lazy(() => import('@/pages/AuthPage').then(m => ({ default: m.AuthPage })))
const DashboardPage  = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const AddExpensePage = lazy(() => import('@/pages/AddExpensePage').then(m => ({ default: m.AddExpensePage })))
const AnalyticsPage  = lazy(() => import('@/pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })))
const GoalsPage      = lazy(() => import('@/pages/GoalsPage').then(m => ({ default: m.GoalsPage })))
const ChallengesPage = lazy(() => import('@/pages/ChallengesPage').then(m => ({ default: m.ChallengesPage })))
const BenefitsPage   = lazy(() => import('@/pages/BenefitsPage').then(m => ({ default: m.BenefitsPage })))
const ProfilePage    = lazy(() => import('@/pages/ProfilePage').then(m => ({ default: m.ProfilePage })))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: 'var(--luka-blue)', borderTopColor: 'transparent' }}
      />
    </div>
  )
}

function Page({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicOnlyRoute />,
    children: [{ index: true, element: <Page><WelcomePage /></Page> }],
  },
  {
    path: '/auth',
    element: <PublicOnlyRoute />,
    children: [{ index: true, element: <Page><AuthPage /></Page> }],
  },
  {
    path: '/app',
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { index: true,          element: <Page><DashboardPage /></Page>  },
          { path: 'add-expense',  element: <Page><AddExpensePage /></Page> },
          { path: 'add-expense/:id', element: <Page><AddExpensePage /></Page> },
          { path: 'analytics',   element: <Page><AnalyticsPage /></Page>  },
          { path: 'goals',       element: <Page><GoalsPage /></Page>      },
          { path: 'challenges',  element: <Page><ChallengesPage /></Page> },
          { path: 'benefits',    element: <Page><BenefitsPage /></Page>   },
          { path: 'profile',     element: <Page><ProfilePage /></Page>    },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
