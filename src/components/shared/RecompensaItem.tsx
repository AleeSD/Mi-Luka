import { Flame, Sparkles, Trophy, Crown, Star, Medal, Lock } from 'lucide-react'
import { motion } from 'motion/react'
import type { RecompensaItem as RecompensaItemData } from '@/hooks/useAchievements'

/**
 * Mapeo del campo `achievements.icono` (texto sembrado en 0008) a un
 * ícono de lucide. Si llega un icono no esperado, fallback a Trophy.
 */
const ICONOS: Record<string, React.ElementType> = {
  flame:    Flame,
  sparkles: Sparkles,
  trophy:   Trophy,
  crown:    Crown,
  star:     Star,
  medal:    Medal,
}

function iconoPara(nombre: string): React.ElementType {
  return ICONOS[nombre] ?? Trophy
}

/**
 * Tarjeta compacta de recompensa. Se usa en la sección colapsable de
 * Recompensas en ProfilePage (grid 3 columnas).
 *
 *  - Desbloqueado: a color (luka-purple), ícono iluminado, "✓".
 *  - Bloqueado: gris + candado, "faltan X días".
 */
export function RecompensaItem({ item }: { item: RecompensaItemData }) {
  const { achievement, desbloqueado, diasRestantes } = item
  const Icon = iconoPara(achievement.icono)

  return (
    <motion.div
      whileHover={desbloqueado ? { y: -2 } : undefined}
      transition={{ duration: 0.18 }}
      className="rounded-xl p-3 text-center border"
      style={
        desbloqueado
          ? {
              borderColor: 'rgba(139,92,246,0.3)',
              background:  'rgba(139,92,246,0.06)',
            }
          : {
              borderColor: 'rgba(0,0,0,0.06)',
              background:  'var(--luka-surface)',
              opacity:     0.6,
            }
      }
    >
      <div className="relative inline-flex">
        <Icon
          className="w-7 h-7"
          style={{ color: desbloqueado ? '#8B5CF6' : 'var(--luka-text-secondary)' }}
        />
        {!desbloqueado && (
          <Lock
            className="w-3 h-3 absolute -bottom-0.5 -right-0.5"
            style={{ color: 'var(--luka-text-secondary)' }}
          />
        )}
      </div>
      <p
        className="text-sm font-semibold mt-1.5"
        style={{ color: desbloqueado ? 'var(--luka-text-primary)' : 'var(--luka-text-secondary)' }}
      >
        {achievement.condicion_valor} días
      </p>
      <p
        className="text-[10px] leading-tight mt-0.5"
        style={{ color: 'var(--luka-text-secondary)' }}
      >
        {desbloqueado
          ? '✓ desbloqueado'
          : diasRestantes === 0
            ? '¡A reclamar!'
            : `faltan ${diasRestantes}d`}
      </p>
    </motion.div>
  )
}
