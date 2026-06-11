import { supabase } from '@/lib/supabase'
import type { Goal } from '@/types/database'
import type { GoalFormData } from '@/lib/validations/goal'

export async function getGoals(userId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error('No se pudieron cargar las metas')
  return data ?? []
}

export async function createGoal(userId: string, formData: GoalFormData): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: userId,
      titulo: formData.titulo,
      monto_objetivo: formData.monto_objetivo,
      monto_actual: 0,
      fecha_limite: formData.fecha_limite ?? null,
      color: formData.color,
      icono: formData.icono,
      completada: false,
    })
    .select()
    .single()

  if (error) throw new Error('No se pudo crear la meta')
  return data
}

export async function contribuirMeta(id: string, montoActual: number, monto: number, montoObjetivo: number): Promise<Goal> {
  const nuevoMonto = Math.min(montoActual + monto, montoObjetivo)
  const completada = nuevoMonto >= montoObjetivo

  const { data, error } = await supabase
    .from('goals')
    .update({ monto_actual: nuevoMonto, completada, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error('No se pudo actualizar la meta')
  return data
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from('goals').delete().eq('id', id)
  if (error) throw new Error('No se pudo eliminar la meta')
}
