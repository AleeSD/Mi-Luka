import { supabase } from '@/lib/supabase'
import type { Challenge, UserChallenge, CompletarRetoResult } from '@/types/database'

// ─── Errores tipados de retos ─────────────────────────────────────────────────

export class RetoYaAceptadoError extends Error {
  constructor() {
    super('RETO_YA_ACEPTADO_ESTA_SEMANA')
    this.name = 'RetoYaAceptadoError'
  }
}

export class RetoNoCumplidoError extends Error {
  constructor() {
    super('RETO_NO_CUMPLIDO')
    this.name = 'RetoNoCumplidoError'
  }
}

export class RetoSoloDomingoError extends Error {
  constructor() {
    super('RETO_RECLAMABLE_SOLO_DOMINGO')
    this.name = 'RetoSoloDomingoError'
  }
}

export class RetoYaCompletadoError extends Error {
  constructor() {
    super('RETO_YA_COMPLETADO')
    this.name = 'RetoYaCompletadoError'
  }
}

export class RetoFueraDeSemanaError extends Error {
  constructor() {
    super('RETO_FUERA_DE_SEMANA')
    this.name = 'RetoFueraDeSemanaError'
  }
}

function logAndMap(tag: string, raw: unknown): never {
  // Loguea el error real ANTES de mapear (cierra B3).
  console.error(`[${tag}] RPC error:`, raw)
  const msg = (raw as { message?: string } | null)?.message ?? ''
  if (msg.includes('RETO_YA_ACEPTADO_ESTA_SEMANA') || msg.includes('duplicate key')) {
    throw new RetoYaAceptadoError()
  }
  if (msg.includes('RETO_NO_CUMPLIDO'))             throw new RetoNoCumplidoError()
  if (msg.includes('RETO_RECLAMABLE_SOLO_DOMINGO')) throw new RetoSoloDomingoError()
  if (msg.includes('RETO_YA_COMPLETADO'))           throw new RetoYaCompletadoError()
  if (msg.includes('RETO_FUERA_DE_SEMANA'))         throw new RetoFueraDeSemanaError()
  throw new Error(msg || `[${tag}] No se pudo completar la operación`)
}

// ─── Lecturas ────────────────────────────────────────────────────────────────

/**
 * Retos disponibles para el usuario ESTA semana. El RPC
 * retos_de_la_semana ya excluye los que el caller ya aceptó o completó
 * en la semana en curso.
 */
export async function getRetosDeLaSemana(cantidad = 10): Promise<Challenge[]> {
  const { data, error } = await supabase.rpc('retos_de_la_semana', { p_cantidad: cantidad })
  if (error) {
    console.error('[challenges.getRetosDeLaSemana] error:', error)
    throw new Error('No se pudieron cargar los retos disponibles')
  }
  return ((data ?? []) as Challenge[])
}

/**
 * Todas las filas de user_challenges del usuario, con join al challenge.
 * El hook filtra por semana en cliente para "En curso" y "Completados".
 */
export async function getUserChallenges(userId: string): Promise<UserChallenge[]> {
  const { data, error } = await supabase
    .from('user_challenges')
    .select('*, challenge:challenges(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[challenges.getUserChallenges] error:', error)
    throw new Error('No se pudieron cargar tus retos')
  }
  return data ?? []
}

/**
 * Calcula el progreso live del reto del usuario (consultado al servidor
 * según la `medicion` del challenge). La UI lo divide entre meta_valor
 * para mostrar la barra y habilitar "Reclamar XP".
 */
export async function getProgresoReto(userChallengeId: string): Promise<number> {
  const { data, error } = await supabase.rpc('progreso_reto', { p_user_challenge_id: userChallengeId })
  if (error) {
    console.error('[challenges.getProgresoReto] error:', error)
    return 0
  }
  return Number(data ?? 0)
}

// ─── Mutaciones ──────────────────────────────────────────────────────────────

export async function aceptarReto(challengeId: string): Promise<UserChallenge> {
  const { data, error } = await supabase.rpc('aceptar_reto', { p_challenge_id: challengeId })
  if (error) logAndMap('challenges.aceptarReto', error)
  return data as UserChallenge
}

export async function completarReto(userChallengeId: string): Promise<CompletarRetoResult> {
  const { data, error } = await supabase.rpc('completar_reto', {
    p_user_challenge_id: userChallengeId,
  })
  if (error) logAndMap('challenges.completarReto', error)
  return data as CompletarRetoResult
}
