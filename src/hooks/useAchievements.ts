import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { useProfileContext } from '@/context/ProfileContext'
import { getAchievements, getUserAchievements } from '@/lib/db/achievements'
import { useRacha } from './useRacha'
import type { Achievement, UserAchievement } from '@/types/database'

export interface RecompensaItem {
  achievement: Achievement
  desbloqueado: boolean
  fechaDesbloqueado: string | null
  /** 0 si ya desbloqueado; condicion_valor - racha_efectiva si bloqueado. */
  diasRestantes: number
}

/**
 * Combina catálogo de achievements con los desbloqueados del usuario y
 * la racha efectiva para producir una lista lista para renderizar.
 *
 * Refetcha user_achievements cuando `profile.racha_actual` cambia, así
 * un desbloqueo gatillado por aplicar_racha (vía contribuir_meta o
 * registrar_ahorro_libre) aparece de inmediato sin necesidad de remount.
 */
export function useAchievements() {
  const { user } = useAuthContext()
  const { profile } = useProfileContext()
  const { rachaEfectiva } = useRacha()

  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Catálogo: se carga una vez por usuario. No depende de la racha.
  useEffect(() => {
    if (!user) { setLoading(false); return }
    let cancelled = false
    getAchievements()
      .then((data) => { if (!cancelled) setAchievements(data) })
      .catch((e) => {
        console.error('[useAchievements] catalog:', e)
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error cargando logros')
      })
    return () => { cancelled = true }
  }, [user])

  // Desbloqueados: se re-cargan cuando la racha cambia (que es cuando
  // pueden aparecer nuevos por aplicar_racha).
  useEffect(() => {
    if (!user) return
    let cancelled = false
    getUserAchievements(user.id)
      .then((data) => { if (!cancelled) setUserAchievements(data) })
      .catch((e) => {
        console.error('[useAchievements] user:', e)
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error cargando tus logros')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user, profile?.racha_actual])

  const itemsRacha = useMemo<RecompensaItem[]>(() => {
    return achievements
      .filter((a) => a.condicion_tipo === 'racha')
      .sort((a, b) => a.condicion_valor - b.condicion_valor)
      .map((a) => {
        const ua = userAchievements.find((u) => u.achievement_id === a.id)
        const desbloqueado = !!ua
        const diasRestantes = desbloqueado
          ? 0
          : Math.max(0, a.condicion_valor - rachaEfectiva)
        return {
          achievement: a,
          desbloqueado,
          fechaDesbloqueado: ua?.fecha_desbloqueado ?? null,
          diasRestantes,
        }
      })
  }, [achievements, userAchievements, rachaEfectiva])

  const refresh = useCallback(async () => {
    if (!user) return
    const data = await getUserAchievements(user.id)
    setUserAchievements(data)
  }, [user])

  return {
    items: itemsRacha,
    desbloqueadasCount: itemsRacha.filter((x) => x.desbloqueado).length,
    loading,
    error,
    refresh,
  }
}
