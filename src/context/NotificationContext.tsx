import { createContext, useContext, useState, useCallback, useRef } from 'react'

export type NotificationVariant = 'bloqueo' | 'saldo_cero' | 'saldo_bajo' | 'racha_hito'

export interface NotificationData {
  id: string
  variant: NotificationVariant
  title: string
  subtitle?: string
  cta?: { label: string; onClick: () => void }
  /** Duración del auto-dismiss en ms. Por defecto 5000. */
  duration?: number
}

interface NotificationContextValue {
  current: NotificationData | null
  notify: (data: Omit<NotificationData, 'id'>) => void
  dismiss: () => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

/**
 * Cola simple de "una notificación a la vez". Si llega una nueva mientras
 * hay otra visible, la reemplaza (estrategia simple coherente con el
 * brief: "encola o reemplaza con criterio sensato"). Reemplazar es
 * acertado porque las notificaciones son time-sensitive: encolar haría
 * que el usuario viera una alerta "saldo en 0" 10 segundos después de
 * cuando realmente pasó.
 *
 * El AnimatePresence en LukaNotificationHost se encarga del crossfade
 * entre la vieja y la nueva.
 */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<NotificationData | null>(null)
  const counterRef = useRef(0)

  const notify = useCallback((data: Omit<NotificationData, 'id'>) => {
    counterRef.current += 1
    setCurrent({ ...data, id: `n${counterRef.current}` })
  }, [])

  const dismiss = useCallback(() => setCurrent(null), [])

  return (
    <NotificationContext.Provider value={{ current, notify, dismiss }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotificationContext() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotificationContext debe usarse dentro de NotificationProvider')
  return ctx
}
