import { useMemo } from 'react'
import { useProfileContext } from '@/context/ProfileContext'
import { hoyLimaDate, ayerLimaDate } from '@/lib/semana'

/**
 * Hitos canónicos sembrados en migración 0008. Se mantiene aquí también
 * como constante por si la UI necesita el orden / set rápido. Si más
 * adelante se agregan logros via migración, el catálogo dinámico
 * (useAchievements) los incorpora; este array sigue siendo válido como
 * referencia mínima.
 */
export const HITOS_RACHA = [10, 25, 50, 100, 200, 365] as const

/**
 * Estado y derivados de la racha del usuario.
 *
 *   racha_actual         — valor crudo en DB (lo que aplicar_racha haya
 *                          fijado en la última contribución/ahorro).
 *   racha_efectiva       — lo que la UI debe mostrar:
 *                            • si ultima_fecha_racha es hoy o ayer Lima,
 *                              vale racha_actual.
 *                            • si es anterior, vale 0 (la racha está
 *                              "perezosamente rota": aún no se ha
 *                              re-aplicado para marcarla a 1, pero ya
 *                              perdió continuidad).
 *
 *   proxHito             — siguiente hito del catálogo de racha
 *                          (10/25/50/100/200/365) por arriba de la racha
 *                          efectiva. null si ya está en el último.
 *   diasParaProxHito     — proxHito - racha_efectiva, o null.
 */
export interface UseRachaResult {
  rachaActual: number
  rachaEfectiva: number
  rachaMasLarga: number
  ultimaFecha: string | null
  proxHito: number | null
  diasParaProxHito: number | null
  /** True si la racha está activa hoy (contribuyó hoy) en Lima. */
  esActivaHoy: boolean
}

export function useRacha(): UseRachaResult {
  const { profile } = useProfileContext()

  const rachaActual   = Number(profile?.racha_actual ?? 0)
  const rachaMasLarga = Number(profile?.racha_mas_larga ?? 0)
  const ultimaFecha   = profile?.ultima_fecha_racha ?? null

  return useMemo(() => {
    const hoy  = hoyLimaDate()
    const ayer = ayerLimaDate()

    let rachaEfectiva = 0
    if (rachaActual > 0 && ultimaFecha) {
      if (ultimaFecha === hoy || ultimaFecha === ayer) {
        rachaEfectiva = rachaActual
      }
    }

    const proxHito = HITOS_RACHA.find((h) => h > rachaEfectiva) ?? null
    const diasParaProxHito = proxHito != null ? proxHito - rachaEfectiva : null
    const esActivaHoy = ultimaFecha === hoy

    return {
      rachaActual,
      rachaEfectiva,
      rachaMasLarga,
      ultimaFecha,
      proxHito,
      diasParaProxHito,
      esActivaHoy,
    }
  }, [rachaActual, rachaMasLarga, ultimaFecha])
}
