import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useAuthContext } from './AuthContext'
import { getProfile, updateProfile, uploadAvatar } from '@/lib/db/profiles'
import type { Profile } from '@/types/database'

export type SaldoChangeSource = 'user_edit' | 'spend'

/**
 * Fuente única de verdad del perfil del usuario autenticado.
 *
 * Hooks que lo consumen: useProfile, useSaldo, useGuardadito.
 * Hooks que escriben en él (vía RPC + setProfile optimista): useExpenses,
 * useGoals, useSaldo (actualizar), useGuardadito (registrarAhorro/sacar).
 *
 * Razón de existir: antes useSaldo, useGuardadito y useProfile cada uno
 * mantenía su propia copia y su propio fetch del perfil. Tras una mutación
 * (p.ej. registrar gasto desde useExpenses), solo el hook que la disparó
 * actualizaba; los demás quedaban stale hasta el siguiente mount. Esto
 * causaba inconsistencias visibles (SaldoCard mostraba el monto viejo
 * después de "Apartar al guardadito").
 */
interface ProfileContextValue {
  profile: Profile | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>
  /**
   * Origen del PRÓXIMO cambio de saldo. Quien dispare un cambio de saldo
   * (via setProfile que toca saldo_disponible) marca este ref ANTES de
   * llamar a setProfile. El watcher useSaldoNotificationWatcher lo lee
   * después del re-render y decide si dispara Banco B/C.
   *
   *   • 'user_edit' → edición manual (SaldoEditorDialog, onboarding) →
   *                   el watcher sincroniza el prev-ref pero NO dispara.
   *   • 'spend'     → gasto, contribución a meta, ahorro libre, sacar
   *                   de guardadito, eliminar gasto/meta. El watcher
   *                   dispara según la lógica de cruce.
   *
   * El watcher resetea este ref a 'spend' tras consumirlo, así el
   * default siempre vuelve a "el cambio fue un gasto/sistema".
   */
  saldoChangeSourceRef: React.MutableRefObject<SaldoChangeSource>
  update: (updates: Partial<Pick<Profile, 'nombre' | 'avatar_url'>>) => Promise<void>
  uploadProfileAvatar: (file: File) => Promise<void>
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuthContext()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const saldoChangeSourceRef = useRef<SaldoChangeSource>('spend')

  const load = useCallback(async () => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getProfile(user.id)
      setProfile(data)
    } catch (e) {
      console.error('[ProfileContext] load error:', e)
      setError(e instanceof Error ? e.message : 'Error cargando perfil')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    // Espera a que auth resuelva antes de decidir qué hacer
    if (authLoading) return
    void load()
  }, [authLoading, load])

  const update = useCallback(async (updates: Partial<Pick<Profile, 'nombre' | 'avatar_url'>>) => {
    if (!user) throw new Error('No autenticado')
    const updated = await updateProfile(user.id, updates)
    setProfile(updated)
  }, [user])

  const uploadProfileAvatar = useCallback(async (file: File) => {
    if (!user) throw new Error('No autenticado')
    const url = await uploadAvatar(user.id, file)
    const updated = await updateProfile(user.id, { avatar_url: url })
    setProfile(updated)
  }, [user])

  return (
    <ProfileContext.Provider
      value={{
        profile,
        loading,
        error,
        refresh: load,
        setProfile,
        saldoChangeSourceRef,
        update,
        uploadProfileAvatar,
      }}
    >
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfileContext() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfileContext debe usarse dentro de ProfileProvider')
  return ctx
}
