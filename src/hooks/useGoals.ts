import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { useProfileContext } from '@/context/ProfileContext'
import { getGoals, createGoal, contribuirMeta, deleteGoal } from '@/lib/db/goals'
import type { Goal } from '@/types/database'
import type { GoalFormData } from '@/lib/validations/goal'

export function useGoals() {
  const { user, loading: authLoading } = useAuthContext()
  const { setProfile } = useProfileContext()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setGoals([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    getGoals(user.id)
      .then((data) => { if (!cancelled) setGoals(data) })
      .catch((e) => {
        console.error('[useGoals] load error:', e)
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error cargando metas')
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [user?.id, authLoading, retryCount])

  const addGoal = useCallback(async (data: GoalFormData): Promise<Goal> => {
    if (!user) throw new Error('No autenticado')
    const goal = await createGoal(user.id, data)
    setGoals((prev) => [goal, ...prev])
    return goal
  }, [user])

  const contribuir = useCallback(async (goalId: string, monto: number): Promise<Goal> => {
    // El RPC valida saldo y racha; el cliente no necesita pasarle estado stale.
    const result = await contribuirMeta(goalId, monto)
    setGoals((prev) => prev.map((g) => (g.id === goalId ? result.goal : g)))
    setProfile((p) =>
      p
        ? {
            ...p,
            saldo_disponible: result.saldo_nuevo,
            racha_actual:     result.racha_actual,
          }
        : p,
    )
    return result.goal
  }, [setProfile])

  const removeGoal = useCallback(async (goalId: string): Promise<void> => {
    // eliminar_meta devuelve el saldo nuevo (monto_actual al saldo si devolverSaldo=true).
    const saldoNuevo = await deleteGoal(goalId)
    setGoals((prev) => prev.filter((g) => g.id !== goalId))
    setProfile((p) => (p ? { ...p, saldo_disponible: saldoNuevo } : p))
  }, [setProfile])

  // Derivados memoizados.
  const goalsActivas     = useMemo(() => goals.filter((g) => !g.completada), [goals])
  const goalsCompletadas = useMemo(() => goals.filter((g) => g.completada), [goals])

  return {
    goals,
    goalsActivas,
    goalsCompletadas,
    loading,
    error,
    refresh: () => setRetryCount((n) => n + 1),
    addGoal,
    contribuir,
    removeGoal,
  }
}
