import { supabase } from '@/lib/supabase'
import type { RegistrarAhorroLibreResult, SacarDeGuardaditoResult } from '@/types/database'
import { SaldoInsuficienteError, SaldoNoConfiguradoError, GuardaditoInsuficienteError } from '@/lib/db/balance'

function mapRpcError(raw: unknown): never {
  console.error('[RPC error]', raw)
  const msg = (raw as { message?: string })?.message ?? ''
  if (msg.includes('SALDO_INSUFICIENTE'))      throw new SaldoInsuficienteError()
  if (msg.includes('SALDO_NO_CONFIGURADO'))    throw new SaldoNoConfiguradoError()
  if (msg.includes('GUARDADITO_INSUFICIENTE')) throw new GuardaditoInsuficienteError()
  throw new Error(msg || 'Error inesperado. Intenta de nuevo.')
}

export async function registrarAhorroLibre(monto: number): Promise<RegistrarAhorroLibreResult> {
  const { data, error } = await supabase.rpc('registrar_ahorro_libre', { p_monto: monto })
  if (error) mapRpcError(error)
  const row = data as RegistrarAhorroLibreResult
  return {
    saldo_nuevo:      Number(row.saldo_nuevo),
    guardadito_nuevo: Number(row.guardadito_nuevo),
    racha_actual:     Number(row.racha_actual),
  }
}

export async function sacarDeGuardadito(monto: number): Promise<SacarDeGuardaditoResult> {
  const { data, error } = await supabase.rpc('sacar_de_guardadito', { p_monto: monto })
  if (error) mapRpcError(error)
  const row = data as SacarDeGuardaditoResult
  return {
    saldo_nuevo:      Number(row.saldo_nuevo),
    guardadito_nuevo: Number(row.guardadito_nuevo),
  }
}
