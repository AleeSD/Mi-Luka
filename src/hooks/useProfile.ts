import { useProfileContext } from '@/context/ProfileContext'

/**
 * Compatibilidad hacia atrás: cualquier consumidor que ya usaba useProfile
 * sigue funcionando sin cambios. Internamente delega al ProfileContext
 * para que todos compartan estado.
 */
export function useProfile() {
  return useProfileContext()
}
