import { supabase } from '@/lib/supabase'
import type { Challenge, UserChallenge } from '@/types/database'

export async function getChallenges(): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('activo', true)
    .order('created_at', { ascending: false })

  if (error) throw new Error('No se pudieron cargar los retos')
  return data ?? []
}

export async function getUserChallenges(userId: string): Promise<UserChallenge[]> {
  const { data, error } = await supabase
    .from('user_challenges')
    .select('*, challenge:challenges(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error('No se pudieron cargar tus retos')
  return data ?? []
}

export async function aceptarReto(userId: string, challengeId: string): Promise<UserChallenge> {
  const { data, error } = await supabase
    .from('user_challenges')
    .insert({ user_id: userId, challenge_id: challengeId })
    .select('*, challenge:challenges(*)')
    .single()

  if (error) throw new Error('No se pudo aceptar el reto')
  return data
}

export async function completarReto(userChallengeId: string, userId: string, puntos: number): Promise<void> {
  const { error: updateError } = await supabase
    .from('user_challenges')
    .update({ completado: true, fecha_fin: new Date().toISOString() })
    .eq('id', userChallengeId)

  if (updateError) throw new Error('No se pudo completar el reto')

  const { data: profile } = await supabase
    .from('profiles')
    .select('puntos_totales')
    .eq('id', userId)
    .single()

  if (profile) {
    await supabase
      .from('profiles')
      .update({ puntos_totales: profile.puntos_totales + puntos })
      .eq('id', userId)
  }
}
