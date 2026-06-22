import { useMemo, useCallback } from 'react'
import { useProfileContext } from '@/context/ProfileContext'
import { actualizarSaldo } from '@/lib/db/balance'

export function useSaldo() {
  const { profile, loading, setProfile, refresh, saldoChangeSourceRef } = useProfileContext()

  const saldoDisponible  = Number(profile?.saldo_disponible ?? 0)
  const saldoConfigurado = profile?.saldo_configurado ?? false

  // Solo "requiere onboarding" si el perfil ya cargó y la bandera es false.
  // Si profile sigue null (loading), no disparamos el gate.
  const requiereOnboarding = useMemo(
    () => !loading && !!profile && !saldoConfigurado,
    [loading, profile, saldoConfigurado],
  )

  const actualizar = useCallback(async (monto: number): Promise<number> => {
    const nuevo = await actualizarSaldo(monto)
    // Marca el cambio como edición manual ANTES de setProfile, para que el
    // watcher (useSaldoNotificationWatcher) lo identifique tras el re-render
    // y NO dispare Banco B/C.
    saldoChangeSourceRef.current = 'user_edit'
    setProfile((p) => (p ? { ...p, saldo_disponible: nuevo, saldo_configurado: true } : p))
    return nuevo
  }, [setProfile, saldoChangeSourceRef])

  return {
    saldoDisponible,
    saldoConfigurado,
    requiereOnboarding,
    loading,
    refresh,
    actualizar,
  }
}
