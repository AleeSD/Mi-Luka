import { useEffect, useRef } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { useProfileContext } from '@/context/ProfileContext'
import { useLukaNotification } from './useLukaNotification'
import { getAchievements, getUserAchievements } from '@/lib/db/achievements'
import type { Achievement } from '@/types/database'

/**
 * Watcher de cruces de hito de racha. Se monta una sola vez en
 * MainLayout, espejo de useSaldoNotificationWatcher.
 *
 * Reglas:
 *   • `prevRachaRef` arranca en null y NO dispara en la primera carga.
 *     Esto evita avisar al usuario en cada login por logros que ya tenía.
 *   • Solo dispara cuando curr > prev (la racha subió). Si bajó (rotura)
 *     o se mantuvo, no notifica.
 *   • Detecta el hito atravesado: el primer logro de tipo 'racha' con
 *     `prev < condicion_valor <= curr`.
 *   • Una sola vez por hito por usuario: `notifiedIdsRef` empieza con
 *     los achievement_id ya desbloqueados en DB. Si el usuario quema su
 *     racha y la reconstruye hasta 10 otra vez, NO re-notifica.
 *   • profile null (logout) resetea ambos refs para evitar fugas entre
 *     usuarios.
 */
export function useRachaNotificationWatcher() {
  const { user } = useAuthContext()
  const { profile } = useProfileContext()
  const { notify } = useLukaNotification()
  const prevRachaRef     = useRef<number | null>(null)
  const achievementsRef  = useRef<Achievement[]>([])
  const notifiedIdsRef   = useRef<Set<string>>(new Set())
  const loadedRef        = useRef(false)

  // Carga catálogo + ya-desbloqueados una vez por usuario.
  useEffect(() => {
    if (!user) {
      achievementsRef.current = []
      notifiedIdsRef.current  = new Set()
      loadedRef.current       = false
      return
    }
    let cancelled = false
    Promise.all([getAchievements(), getUserAchievements(user.id)])
      .then(([as, uas]) => {
        if (cancelled) return
        achievementsRef.current = as.filter((x) => x.condicion_tipo === 'racha')
        notifiedIdsRef.current  = new Set(uas.map((ua) => ua.achievement_id))
        loadedRef.current       = true
      })
      .catch((e) => console.error('[useRachaNotificationWatcher] load:', e))
    return () => { cancelled = true }
  }, [user])

  // Reacciona a cambios de racha_actual.
  useEffect(() => {
    if (!profile) {
      prevRachaRef.current = null
      return
    }
    const curr = Number(profile.racha_actual ?? 0)
    const prev = prevRachaRef.current
    prevRachaRef.current = curr

    if (prev === null) return            // primera carga
    if (curr <= prev) return              // bajó o quedó igual
    if (!loadedRef.current) return        // aún no llegó catálogo

    const achievements = achievementsRef.current
    // Busca el PRIMER hito cuyo umbral cayó dentro del salto y que no
    // hayamos notificado ya. Para múltiples cruces de una sola subida
    // (raro: aplicar_racha siempre sube de 1 en 1), notificamos solo
    // el más alto en ese paso.
    const crossed = achievements
      .filter((a) =>
        a.condicion_valor > prev &&
        a.condicion_valor <= curr &&
        !notifiedIdsRef.current.has(a.id),
      )
      .sort((a, b) => b.condicion_valor - a.condicion_valor)[0]

    if (!crossed) return

    notify({
      variant: 'racha_hito',
      title:   `¡Racha de ${crossed.condicion_valor} días! 🔥`,
      subtitle: `Desbloqueaste "${crossed.titulo}"`,
      duration: 7000,
    })
    notifiedIdsRef.current.add(crossed.id)
  }, [profile, notify])
}
