import { supabase } from '@/lib/supabase'
import type { Expense } from '@/types/database'
import type { ExpenseFormData } from '@/lib/validations/expense'

export async function getExpenses(userId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error('No se pudieron cargar los gastos')
  return data ?? []
}

export async function getExpenseById(id: string): Promise<Expense | null> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function createExpense(userId: string, formData: ExpenseFormData): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      user_id: userId,
      monto: formData.monto,
      categoria: formData.categoria,
      descripcion: formData.descripcion,
      fecha: formData.fecha,
      notas: formData.notas ?? null,
    })
    .select()
    .single()

  if (error) throw new Error('No se pudo registrar el gasto')
  return data
}

export async function updateExpense(id: string, formData: Partial<ExpenseFormData>): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .update({
      monto: formData.monto,
      categoria: formData.categoria,
      descripcion: formData.descripcion,
      fecha: formData.fecha,
      notas: formData.notas ?? null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error('No se pudo actualizar el gasto')
  return data
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw new Error('No se pudo eliminar el gasto')
}
