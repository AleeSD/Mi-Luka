import { supabase } from '@/lib/supabase'
import type { Goal, ContribuirMetaResult } from '@/types/database'
import type { GoalFormData } from '@/lib/validations/goal'
import { sanitizeText } from '@/lib/utils'
import { contribuirMeta as contribuirMetaRpc, eliminarMeta } from '@/lib/db/balance'

export async function getGoals(userId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[goals.getGoals] error:', error)
    throw new Error('No se pudieron cargar las metas')
  }
  return data ?? []
}

export async function createGoal(userId: string, formData: GoalFormData): Promise<Goal> {
  // Sanitiza el título antes de persistir (cierra el hueco identificado en B4).
  const tituloLimpio = sanitizeText(formData.titulo).normalize('NFC')

  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id:        userId,
      titulo:         tituloLimpio,
      monto_objetivo: formData.monto_objetivo,
      monto_actual:   0,
      fecha_limite:   formData.fecha_limite ?? null,
      color:          formData.color,
      icono:          formData.icono,
      completada:     false,
    })
    .select()
    .single()

  if (error) {
    console.error('[goals.createGoal] error:', error)
    throw new Error('No se pudo crear la meta')
  }
  return data
}

// contribuir_meta: el RPC también dispara aplicar_racha y devuelve la
// racha_actual nueva. Propagamos el resultado completo para que el hook
// actualice perfil (saldo + racha) en una sola pasada.
export async function contribuirMeta(goalId: string, monto: number): Promise<ContribuirMetaResult> {
  return await contribuirMetaRpc(goalId, monto)
}

// eliminar_meta con devolverSaldo=true (decisión §2.A del plan).
// Devuelve el saldo nuevo para que el hook lo aplique al perfil.
export async function deleteGoal(goalId: string): Promise<number> {
  return await eliminarMeta(goalId, true)
}
