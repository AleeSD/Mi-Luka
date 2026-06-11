import { Navigate, Outlet } from 'react-router'
import { useAuthContext } from '@/context/AuthContext'
import { Skeleton } from '@/components/ui/skeleton'

export function ProtectedRoute() {
  const { user, loading } = useAuthContext()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] p-4 space-y-4 max-w-md mx-auto pt-12">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  if (!user) return <Navigate to="/auth" replace />
  return <Outlet />
}

export function PublicOnlyRoute() {
  const { user, loading } = useAuthContext()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="w-12 h-12 rounded-full border-4 border-white/30 border-t-white animate-spin" />
      </div>
    )
  }

  if (user) return <Navigate to="/app" replace />
  return <Outlet />
}
