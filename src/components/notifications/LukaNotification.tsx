import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { X, AlertCircle, Wallet, TrendingDown, Flame } from 'lucide-react'
import type { NotificationData, NotificationVariant } from '@/context/NotificationContext'

interface Props {
  data: NotificationData
  onDismiss: () => void
}

/**
 * Card de notificación inferior estilo "isla" de iOS. Slide-up desde
 * el borde inferior, sombra suave, drag-to-dismiss y auto-dismiss
 * pausable.
 *
 * Posición: fixed bottom con offset suficiente para no chocar con el
 * bottom-nav de MainLayout (que es lg:hidden, fijado a bottom-0 con
 * safe-area). En desktop sin nav la card se sienta cómoda más arriba.
 *
 * Accesibilidad: role="alert" para bloqueo/saldo_cero (assertive);
 * role="status" para saldo_bajo (polite). Escape cierra. No atrapa
 * el foco (no es modal).
 */

type VariantStyle = {
  icon: React.ElementType
  iconColor: string
  iconBg: string
  border: string
  role: 'alert' | 'status'
  ariaLive: 'assertive' | 'polite'
}

const VARIANT_STYLES: Record<NotificationVariant, VariantStyle> = {
  bloqueo: {
    icon:      AlertCircle,
    iconColor: '#EF4444',
    iconBg:    'rgba(239,68,68,0.12)',
    border:    'rgba(239,68,68,0.18)',
    role:      'alert',
    ariaLive:  'assertive',
  },
  saldo_cero: {
    icon:      Wallet,
    iconColor: '#F59E0B',
    iconBg:    'rgba(245,158,11,0.12)',
    border:    'rgba(245,158,11,0.22)',
    role:      'alert',
    ariaLive:  'assertive',
  },
  saldo_bajo: {
    icon:      TrendingDown,
    iconColor: '#F59E0B',
    iconBg:    'rgba(245,158,11,0.12)',
    border:    'rgba(245,158,11,0.18)',
    role:      'status',
    ariaLive:  'polite',
  },
  racha_hito: {
    icon:      Flame,
    iconColor: '#EF4444',
    iconBg:    'rgba(245,158,11,0.16)',
    border:    'rgba(245,158,11,0.28)',
    role:      'status',
    ariaLive:  'polite',
  },
}

export function LukaNotification({ data, onDismiss }: Props) {
  const [paused, setPaused] = useState(false)
  const duration = data.duration ?? 5000
  const style = VARIANT_STYLES[data.variant]

  // Auto-dismiss con pausa al estar tocando/hovering.
  useEffect(() => {
    if (paused) return
    const t = setTimeout(onDismiss, duration)
    return () => clearTimeout(t)
  }, [paused, onDismiss, duration, data.id])

  // Dismiss por teclado (Escape).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDismiss])

  const Icon = style.icon

  const handleCta = () => {
    data.cta?.onClick()
    onDismiss()
  }

  return (
    <motion.div
      role={style.role}
      aria-live={style.ariaLive}
      initial={{ y: 140, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 140, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 360, damping: 30, mass: 0.9 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 200 }}
      dragElastic={{ top: 0, bottom: 0.6 }}
      dragSnapToOrigin
      onDragEnd={(_, info) => {
        if (info.offset.y > 60 || info.velocity.y > 400) onDismiss()
      }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onPointerDown={() => setPaused(true)}
      className="luka-notification-bottom fixed left-3 right-3 mx-auto z-[60] max-w-md rounded-2xl px-4 pt-4 pb-3 shadow-2xl border touch-none select-none cursor-grab active:cursor-grabbing"
      style={{
        background: 'var(--luka-surface)',
        borderColor: style.border,
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter:       'blur(20px)',
      }}
    >
      {/* Grab handle estilo iOS */}
      <div
        aria-hidden
        className="absolute top-1.5 left-1/2 -translate-x-1/2 w-9 h-1 rounded-full pointer-events-none"
        style={{ background: 'var(--luka-text-secondary)', opacity: 0.35 }}
      />

      <div className="flex items-start gap-3 mt-1.5">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: style.iconBg }}
        >
          <Icon className="w-5 h-5" style={{ color: style.iconColor }} />
        </div>

        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold leading-snug"
            style={{ color: 'var(--luka-text-primary)' }}
          >
            {data.title}
          </p>
          {data.subtitle && (
            <p
              className="text-xs mt-0.5 leading-snug"
              style={{ color: 'var(--luka-text-secondary)' }}
            >
              {data.subtitle}
            </p>
          )}
          {data.cta && (
            <motion.button
              type="button"
              onClick={handleCta}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 420, damping: 18 }}
              className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}
            >
              {data.cta.label}
            </motion.button>
          )}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar notificación"
          className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X className="w-4 h-4" style={{ color: 'var(--luka-text-secondary)' }} />
        </button>
      </div>
    </motion.div>
  )
}
