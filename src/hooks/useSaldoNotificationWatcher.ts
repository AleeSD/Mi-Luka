import { useEffect, useRef } from 'react'
import { useProfileContext } from '@/context/ProfileContext'
import { useLukaNotification } from './useLukaNotification'
import { BANCO_B_SALDO_CERO, BANCO_C_SALDO_BAJO, pickRandom } from '@/lib/mensajes'

/**
 * Constante editable que controla el umbral por defecto si el perfil no
 * tiene uno definido. profiles.umbral_saldo_bajo (migración 0002) ya
 * existe con default 50, así que esto rara vez se usa.
 */
const UMBRAL_SALDO_BAJO_FALLBACK = 50

/**
 * Watcher que detecta CRUCES del saldo, no estados absolutos. Se monta
 * una sola vez en MainLayout (vive mientras el usuario esté dentro de
 * /app/*).
 *
 * Reglas:
 *  - Mantiene el saldo previo en un useRef. Primera carga (prev = null)
 *    NO dispara.
 *  - Solo dispara si transición:
 *      • prev > 0  → curr === 0           → Banco B.
 *      • prev > U  → 0 < curr <= umbral   → Banco C.
 *  - Saldo cero y saldo bajo son mutuamente excluyentes en un evento.
 *  - profile = null (logout) resetea el ref para evitar falsos positivos
 *    al cambiar de usuario.
 *  - **Origen del cambio**: si el cambio vino de una EDICIÓN MANUAL del
 *    saldo (SaldoEditorDialog o OnboardingSaldoDialog), el watcher
 *    sincroniza el prev-ref pero NO dispara. Solo los cambios por
 *    gasto/contribución/ahorro disparan B/C.
 *
 *    El ref `saldoChangeSourceRef` del ProfileContext es la marca: por
 *    default vale 'spend' (cualquier cambio derivado de un RPC). useSaldo.
 *    actualizar lo setea a 'user_edit' justo antes de su setProfile.
 *    Aquí lo consumimos y lo reseteamos a 'spend' para el próximo evento.
 */
export function useSaldoNotificationWatcher() {
  const { profile, saldoChangeSourceRef } = useProfileContext()
  const { notify } = useLukaNotification()
  const prevSaldoRef = useRef<number | null>(null)

  useEffect(() => {
    if (!profile) {
      prevSaldoRef.current = null
      return
    }

    const curr = Number(profile.saldo_disponible)
    const prev = prevSaldoRef.current
    // Siempre sincronizamos el ref al nuevo valor, ANTES de cualquier
    // return temprano. Así un gasto POSTERIOR que cruce el umbral sí
    // dispara desde la base correcta.
    prevSaldoRef.current = curr

    // Consume y resetea el origen del cambio. Importante hacerlo aquí
    // (no antes ni después de los returns) para no perder la señal.
    const source = saldoChangeSourceRef.current
    saldoChangeSourceRef.current = 'spend'

    if (prev === null) return        // primera carga → no disparar
    if (prev === curr) return         // no hay cambio efectivo

    // Edición manual: ref ya sincronizado arriba; no disparamos.
    if (source === 'user_edit') return

    const umbral = Number(profile.umbral_saldo_bajo) || UMBRAL_SALDO_BAJO_FALLBACK

    if (prev > 0 && curr === 0) {
      notify({
        variant: 'saldo_cero',
        title: pickRandom(BANCO_B_SALDO_CERO),
      })
    } else if (prev > umbral && curr > 0 && curr <= umbral) {
      notify({
        variant: 'saldo_bajo',
        title: pickRandom(BANCO_C_SALDO_BAJO),
      })
    }
  }, [profile, notify, saldoChangeSourceRef])
}
