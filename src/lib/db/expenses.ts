import { supabase } from '@/lib/supabase'
import type { Expense, RegistrarGastoResult, EditarGastoResult } from '@/types/database'
import type { ExpenseFormData } from '@/lib/validations/expense'
import { registrarGasto, editarGasto, eliminarGasto } from '@/lib/db/balance'

export async function getExpenses(userId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[expenses.getExpenses] error:', error)
    throw new Error('No se pudieron cargar los gastos')
  }
  return data ?? []
}

export async function getExpenseById(id: string): Promise<Expense | null> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('[expenses.getExpenseById] error:', error)
    return null
  }
  return data
}

// ─── Mutaciones — devuelven el saldo nuevo para que el hook actualice el perfil ──

export async function createExpense(
  _userId: string,
  formData: ExpenseFormData,
): Promise<RegistrarGastoResult> {
  return await registrarGasto(formData)
}

export async function updateExpense(
  id: string,
  formData: ExpenseFormData,
): Promise<EditarGastoResult> {
  return await editarGasto(id, formData)
}

export async function deleteExpense(id: string): Promise<number> {
  return await eliminarGasto(id)
}
