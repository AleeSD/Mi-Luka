import { useCallback } from 'react'
import { useProfileContext } from '@/context/ProfileContext'
import { registrarAhorroLibre, sacarDeGuardadito } from '@/lib/db/guardadito'
import type { RegistrarAhorroLibreResult, SacarDeGuardaditoResult } from '@/types/database'

export function useGuardadito() {
  const { profile, loading, setProfile, refresh } = useProfileContext()

  const montoGuardadito = Number(profile?.monto_guardadito ?? 0)
  const saldoDisponible = Number(profile?.saldo_disponible ?? 0)

  const registrarAhorro = useCallback(
    async (monto: number): Promise<RegistrarAhorroLibreResult> => {
      const result = await registrarAhorroLibre(monto)
      // El RPC también alimenta la racha (vía aplicar_racha). Reflejamos los tres
      // contadores en el perfil compartido para que SaldoCard, GuardaditoCard,
      // ChallengesPage y ProfilePage queden sincronizados sin refetch.
      setProfile((p) =>
        p
          ? {
              ...p,
              saldo_disponible: result.saldo_nuevo,
              monto_guardadito: result.guardadito_nuevo,
              racha_actual: result.racha_actual,
            }
          : p,
      )
      return result
    },
    [setProfile],
  )

  const sacar = useCallback(
    async (monto: number): Promise<SacarDeGuardaditoResult> => {
      const result = await sacarDeGuardadito(monto)
      // Sacar NO toca la racha (sacar no es ahorrar).
      setProfile((p) =>
        p
          ? {
              ...p,
              saldo_disponible: result.saldo_nuevo,
              monto_guardadito: result.guardadito_nuevo,
            }
          : p,
      )
      return result
    },
    [setProfile],
  )

  return {
    montoGuardadito,
    saldoDisponible,
    loading,
    refresh,
    registrarAhorro,
    sacar,
  }
}
