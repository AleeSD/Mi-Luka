import { supabase } from '@/lib/supabase'
import type { RegistrarGastoResult, EditarGastoResult, ContribuirMetaResult } from '@/types/database'
import type { ExpenseFormData } from '@/lib/validations/expense'

// ─── Error classes ────────────────────────────────────────────────────────────

export class SaldoInsuficienteError extends Error {
  constructor() {
    super('SALDO_INSUFICIENTE')
    this.name = 'SaldoInsuficienteError'
  }
}

export class SaldoNoConfiguradoError extends Error {
  constructor() {
    super('SALDO_NO_CONFIGURADO')
    this.name = 'SaldoNoConfiguradoError'
  }
}

export class GuardaditoInsuficienteError extends Error {
  constructor() {
    super('GUARDADITO_INSUFICIENTE')
    this.name = 'GuardaditoInsuficienteError'
  }
}

// ─── Internal mapper ──────────────────────────────────────────────────────────

function mapRpcError(raw: unknown): never {
  // Loguea SIEMPRE el error real ANTES de mapear (cierra B3 del análisis).
  console.error('[RPC error]', raw)
  const msg = (raw as { message?: string })?.message ?? ''
  if (msg.includes('SALDO_INSUFICIENTE'))      throw new SaldoInsuficienteError()
  if (msg.includes('SALDO_NO_CONFIGURADO'))    throw new SaldoNoConfiguradoError()
  if (msg.includes('GUARDADITO_INSUFICIENTE')) throw new GuardaditoInsuficienteError()
  // Si no coincide con ninguna regla de negocio conocida, propaga el
  // mensaje real (no lo escondas detrás de un genérico).
  throw new Error(msg || 'Error inesperado. Intenta de nuevo.')
}

// ─── actualizar_saldo ─────────────────────────────────────────────────────────

export async function actualizarSaldo(monto: number): Promise<number> {
  const { data, error } = await supabase.rpc('actualizar_saldo', { p_monto: monto })
  if (error) mapRpcError(error)
  return Number(data)
}

// ─── registrar_gasto ──────────────────────────────────────────────────────────

export async function registrarGasto(formData: ExpenseFormData): Promise<RegistrarGastoResult> {
  const { data, error } = await supabase.rpc('registrar_gasto', {
    p_monto:       formData.monto,
    p_categoria:   formData.categoria,
    p_descripcion: formData.descripcion,
    p_fecha:       formData.fecha,
    p_notas:       formData.notas ?? null,
  })
  if (error) mapRpcError(error)
  const row = data as RegistrarGastoResult
  return {
    expense:    row.expense,
    saldo_nuevo: Number(row.saldo_nuevo),
  }
}

// ─── editar_gasto ─────────────────────────────────────────────────────────────

export async function editarGasto(expenseId: string, formData: Partial<ExpenseFormData>): Promise<EditarGastoResult> {
  const { data, error } = await supabase.rpc('editar_gasto', {
    p_expense_id:  expenseId,
    p_monto:       formData.monto!,
    p_categoria:   formData.categoria!,
    p_descripcion: formData.descripcion!,
    p_fecha:       formData.fecha!,
    p_notas:       formData.notas ?? null,
  })
  if (error) mapRpcError(error)
  const row = data as EditarGastoResult
  return {
    expense:    row.expense,
    saldo_nuevo: Number(row.saldo_nuevo),
  }
}

// ─── eliminar_gasto ───────────────────────────────────────────────────────────

export async function eliminarGasto(expenseId: string): Promise<number> {
  const { data, error } = await supabase.rpc('eliminar_gasto', { p_expense_id: expenseId })
  if (error) mapRpcError(error)
  return Number(data)
}

// ─── contribuir_meta ──────────────────────────────────────────────────────────

export async function contribuirMeta(goalId: string, monto: number): Promise<ContribuirMetaResult> {
  const { data, error } = await supabase.rpc('contribuir_meta', {
    p_goal_id: goalId,
    p_monto:   monto,
  })
  if (error) mapRpcError(error)
  const row = data as ContribuirMetaResult
  return {
    goal:           row.goal,
    saldo_nuevo:     Number(row.saldo_nuevo),
    monto_aplicado:  Number(row.monto_aplicado),
    racha_actual:    Number(row.racha_actual),
  }
}

// ─── eliminar_meta ────────────────────────────────────────────────────────────

export async function eliminarMeta(goalId: string, devolverSaldo = true): Promise<number> {
  const { data, error } = await supabase.rpc('eliminar_meta', {
    p_goal_id:        goalId,
    p_devolver_saldo: devolverSaldo,
  })
  if (error) mapRpcError(error)
  return Number(data)
}
