import { useNotificationContext } from '@/context/NotificationContext'

/**
 * Wrapper amigable sobre NotificationContext. Cualquier página/componente
 * que quiera disparar una LukaNotification usa este hook.
 *
 * Ejemplo:
 *   const { notify } = useLukaNotification()
 *   notify({
 *     variant: 'bloqueo',
 *     title: '...',
 *     subtitle: '...',
 *     cta: { label: 'Actualizar saldo', onClick: () => openSaldoEditor() },
 *   })
 */
export function useLukaNotification() {
  const { notify, dismiss } = useNotificationContext()
  return { notify, dismiss }
}
