import { useState, useEffect, useCallback } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { getProfile, updateProfile, uploadAvatar } from '@/lib/db/profiles'
import type { Profile } from '@/types/database'

export function useProfile() {
  const { user } = useAuthContext()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await getProfile(user.id)
      setProfile(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando perfil')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  const update = useCallback(async (updates: Partial<Pick<Profile, 'nombre' | 'avatar_url'>>): Promise<void> => {
    if (!user) throw new Error('No autenticado')
    const updated = await updateProfile(user.id, updates)
    setProfile(updated)
  }, [user])

  const uploadProfileAvatar = useCallback(async (file: File): Promise<void> => {
    if (!user) throw new Error('No autenticado')
    const url = await uploadAvatar(user.id, file)
    const updated = await updateProfile(user.id, { avatar_url: url })
    setProfile(updated)
  }, [user])

  return { profile, loading, error, refresh: load, update, uploadProfileAvatar }
}
