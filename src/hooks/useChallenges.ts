import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { useProfileContext } from '@/context/ProfileContext'
import {
  getRetosDeLaSemana,
  getUserChallenges,
  getProgresoReto,
  aceptarReto,
  completarReto,
} from '@/lib/db/challenges'
import { semanaIsoLima } from '@/lib/semana'
import type { Challenge, UserChallenge, CompletarRetoResult } from '@/types/database'

export function useChallenges() {
  const { user } = useAuthContext()
  const { setProfile } = useProfileContext()
  const [retosDisponibles, setRetosDisponibles] = useState<Challenge[]>([])
  const [userChallenges,   setUserChallenges]   = useState<UserChallenge[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (!user) { setLoading(false); return }

    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([getRetosDeLaSemana(10), getUserChallenges(user.id)])
      .then(([disponibles, ucs]) => {
        if (!cancelled) {
          setRetosDisponibles(disponibles)
          setUserChallenges(ucs)
        }
      })
      .catch((e) => {
        console.error('[useChallenges] load error:', e)
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error cargando retos')
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [user, retryCount])

  // Semana ISO Lima — recalculada por mount. La UI puede confiar en este
  // valor para filtrar "En curso" del cliente, congruente con el filtro
  // que retos_de_la_semana aplica server-side.
  const semanaActual = useMemo(() => semanaIsoLima(), [])

  const accept = useCallback(async (challengeId: string): Promise<UserChallenge> => {
    const uc = await aceptarReto(challengeId)
    // Inserta en "En curso" y saca de "Disponibles".
    setUserChallenges((prev) => [uc, ...prev])
    setRetosDisponibles((prev) => prev.filter((c) => c.id !== challengeId))
    return uc
  }, [])

  const claim = useCallback(async (userChallengeId: string): Promise<CompletarRetoResult> => {
    const result = await completarReto(userChallengeId)
    // Marca completado en la lista (la UI ya no muestra "Reclamar").
    setUserChallenges((prev) =>
      prev.map((uc) =>
        uc.id === userChallengeId
          ? {
              ...uc,
              completado:     true,
              fecha_fin:      new Date().toISOString(),
              progreso_cache: result.progreso,
            }
          : uc,
      ),
    )
    // Actualiza XP y nivel en el perfil compartido (saldo no cambia).
    // Source 'spend' es lo correcto: no es una edición manual del saldo.
    setProfile((p) =>
      p
        ? {
            ...p,
            puntos_totales: result.xp_nuevo,
            nivel:          result.nivel_nuevo,
          }
        : p,
    )
    return result
  }, [setProfile])

  // ─── Derivados memoizados ─────────────────────────────────────────────
  const enCurso = useMemo(
    () => userChallenges.filter((uc) => uc.semana === semanaActual && !uc.completado),
    [userChallenges, semanaActual],
  )

  const completados = useMemo(
    () => userChallenges.filter((uc) => uc.completado),
    [userChallenges],
  )

  return {
    retosDisponibles,
    enCurso,
    completados,
    semanaActual,
    loading,
    error,
    refresh: () => setRetryCount((n) => n + 1),
    accept,
    claim,
    getProgreso: getProgresoReto,
  }
}
