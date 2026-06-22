import { supabase } from '@/lib/supabase'
import type { Achievement, UserAchievement } from '@/types/database'

/**
 * Catálogo completo de logros. Hoy solo `condicion_tipo='racha'` está
 * sembrado (migración 0008: 10/25/50/100/200/365 días), pero el query
 * los devuelve a todos para mantener la API abierta a futuros tipos.
 */
export async function getAchievements(): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .order('condicion_valor', { ascending: true })
  if (error) {
    console.error('[achievements.getAchievements] error:', error)
    throw new Error('No se pudieron cargar los logros')
  }
  return data ?? []
}

/**
 * Logros desbloqueados por el usuario. aplicar_racha (RPC, migración
 * 0006) los inserta server-side dentro de la misma transacción que
 * incrementa la racha. El cliente solo lee.
 */
export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('*, achievement:achievements(*)')
    .eq('user_id', userId)
    .order('fecha_desbloqueado', { ascending: false })
  if (error) {
    console.error('[achievements.getUserAchievements] error:', error)
    throw new Error('No se pudieron cargar tus logros')
  }
  return data ?? []
}
