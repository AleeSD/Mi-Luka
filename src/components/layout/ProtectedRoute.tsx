import { Navigate, Outlet } from 'react-router'
import { useAuthContext } from '@/context/AuthContext'
import { useSaldo } from '@/hooks/useSaldo'
import { OnboardingSaldoDialog } from '@/components/onboarding/OnboardingSaldoDialog'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Portón de la app:
 *   1) Si auth aún carga → skeleton.
 *   2) Si no hay sesión → redirige a /auth.
 *   3) Si hay sesión pero profile.saldo_configurado === false → monta
 *      OnboardingSaldoDialog sobre el Outlet. El overlay (z-50 + backdrop
 *      blur) bloquea interacción con cualquier contenido detrás, así que
 *      el acceso directo por URL profunda (p.ej. /app/add-expense) también
 *      queda gateado.
 *   4) Si todo OK → Outlet directo, sin overlay.
 *
 * Mientras el ProfileContext aún carga (saldoLoading=true) renderizamos el
 * skeleton también, para evitar el flash entre "auth ok" y "perfil leído".
 */
export function ProtectedRoute() {
  const { user, loading: authLoading } = useAuthContext()
  const { requiereOnboarding, loading: saldoLoading } = useSaldo()

  const loading = authLoading || (!!user && saldoLoading)

  if (loading) {
    return (
      <div className="min-h-screen p-4 space-y-4 max-w-md mx-auto pt-12 bg-background">
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

  return (
    <>
      <Outlet />
      {requiereOnboarding && <OnboardingSaldoDialog />}
    </>
  )
}

export function PublicOnlyRoute() {
  const { user, loading } = useAuthContext()

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        <div className="w-12 h-12 rounded-full border-4 border-white/30 border-t-white animate-spin" />
      </div>
    )
  }

  if (user) return <Navigate to="/app" replace />
  return <Outlet />
}
