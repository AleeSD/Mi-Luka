import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) return null
  return data
}

export async function updateProfile(userId: string, updates: Partial<Pick<Profile, 'nombre' | 'avatar_url'>>): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw new Error('No se pudo actualizar el perfil')
  return data
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `avatars/${userId}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true })

  if (uploadError) throw new Error('No se pudo subir la imagen')

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}
