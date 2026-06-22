import { AnimatePresence } from 'motion/react'
import { useNotificationContext } from '@/context/NotificationContext'
import { LukaNotification } from './LukaNotification'

/**
 * Host único de LukaNotification. Se monta una sola vez en MainLayout —
 * NO en cada página — para que la notificación persista al navegar entre
 * rutas y para evitar duplicados visuales.
 *
 * El AnimatePresence con mode por defecto permite crossfade cuando una
 * notificación reemplaza a otra (cambia el key porque cambia el id).
 */
export function LukaNotificationHost() {
  const { current, dismiss } = useNotificationContext()

  return (
    <AnimatePresence>
      {current && (
        <LukaNotification key={current.id} data={current} onDismiss={dismiss} />
      )}
    </AnimatePresence>
  )
}
