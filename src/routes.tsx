import { createBrowserRouter, Navigate } from 'react-router'
import { WelcomePage } from '@/pages/WelcomePage'
import { AuthPage } from '@/pages/AuthPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { AddExpensePage } from '@/pages/AddExpensePage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { GoalsPage } from '@/pages/GoalsPage'
import { ChallengesPage } from '@/pages/ChallengesPage'
import { BenefitsPage } from '@/pages/BenefitsPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { MainLayout } from '@/components/layout/MainLayout'
import { ProtectedRoute, PublicOnlyRoute } from '@/components/layout/ProtectedRoute'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicOnlyRoute />,
    children: [{ index: true, element: <WelcomePage /> }],
  },
  {
    path: '/auth',
    element: <PublicOnlyRoute />,
    children: [{ index: true, element: <AuthPage /> }],
  },
  {
    path: '/app',
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'add-expense',     element: <AddExpensePage /> },
          { path: 'add-expense/:id', element: <AddExpensePage /> },
          { path: 'analytics',       element: <AnalyticsPage /> },
          { path: 'goals',           element: <GoalsPage /> },
          { path: 'challenges',      element: <ChallengesPage /> },
          { path: 'benefits',        element: <BenefitsPage /> },
          { path: 'profile',         element: <ProfilePage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
