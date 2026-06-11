import { useState, useEffect, useCallback } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { getGoals, createGoal, contribuirMeta, deleteGoal } from '@/lib/db/goals'
import type { Goal } from '@/types/database'
import type { GoalFormData } from '@/lib/validations/goal'

export function useGoals() {
  const { user } = useAuthContext()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const data = await getGoals(user.id)
      setGoals(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando metas')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  const addGoal = useCallback(async (data: GoalFormData): Promise<Goal> => {
    if (!user) throw new Error('No autenticado')
    const goal = await createGoal(user.id, data)
    setGoals((prev) => [goal, ...prev])
    return goal
  }, [user])

  const contribuir = useCallback(async (goalId: string, monto: number): Promise<Goal> => {
    const goal = goals.find((g) => g.id === goalId)
    if (!goal) throw new Error('Meta no encontrada')
    const updated = await contribuirMeta(goalId, Number(goal.monto_actual), monto, Number(goal.monto_objetivo))
    setGoals((prev) => prev.map((g) => g.id === goalId ? updated : g))
    return updated
  }, [goals])

  const removeGoal = useCallback(async (goalId: string): Promise<void> => {
    await deleteGoal(goalId)
    setGoals((prev) => prev.filter((g) => g.id !== goalId))
  }, [])

  const goalsActivas = goals.filter((g) => !g.completada)
  const goalsCompletadas = goals.filter((g) => g.completada)

  return { goals, goalsActivas, goalsCompletadas, loading, error, refresh: load, addGoal, contribuir, removeGoal }
}
