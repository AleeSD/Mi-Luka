import { useState, useEffect, useCallback } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { getChallenges, getUserChallenges, aceptarReto, completarReto } from '@/lib/db/challenges'
import type { Challenge, UserChallenge } from '@/types/database'

export function useChallenges() {
  const { user } = useAuthContext()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([getChallenges(), getUserChallenges(user.id)])
      .then(([allChallenges, userC]) => {
        if (!cancelled) {
          setChallenges(allChallenges)
          setUserChallenges(userC)
        }
      })
      .catch(e    => { if (!cancelled) setError(e instanceof Error ? e.message : 'Error cargando retos') })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [user, retryCount])

  const acceptChallenge = useCallback(async (challengeId: string): Promise<void> => {
    if (!user) throw new Error('No autenticado')
    const userChallenge = await aceptarReto(user.id, challengeId)
    setUserChallenges((prev) => [userChallenge, ...prev])
  }, [user])

  const completeChallenge = useCallback(async (userChallengeId: string, puntos: number): Promise<void> => {
    if (!user) throw new Error('No autenticado')
    await completarReto(userChallengeId, user.id, puntos)
    setUserChallenges((prev) =>
      prev.map((uc) => uc.id === userChallengeId ? { ...uc, completado: true } : uc)
    )
  }, [user])

  const acceptedIds   = new Set(userChallenges.map((uc) => uc.challenge_id))
  const disponibles   = challenges.filter((c) => !acceptedIds.has(c.id))
  const enCurso       = userChallenges.filter((uc) => !uc.completado)
  const completados   = userChallenges.filter((uc) => uc.completado)

  return {
    challenges, userChallenges, disponibles, enCurso, completados, loading, error,
    refresh: () => setRetryCount(n => n + 1),
    acceptChallenge, completeChallenge,
  }
}
