import { motion } from 'motion/react'
import { Flame } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useRacha } from '@/hooks/useRacha'

/**
 * Visualiza la racha activa del usuario. Se ubica en ChallengesPage,
 * debajo del card de Nivel.
 *
 * Dos estados:
 *  - Racha === 0  → copy motivador, "Empieza tu racha hoy", llama gris.
 *  - Racha > 0    → llama coloreada animada (motion sutil), número de
 *                   días grande, récord, próximo hito con días faltantes
 *                   y barra de progreso hacia ese hito.
 */
export function RachaCard() {
  const { rachaEfectiva, rachaMasLarga, proxHito, diasParaProxHito } = useRacha()

  // Estado vacío
  if (rachaEfectiva === 0) {
    return (
      <Card className="p-5 rounded-2xl shadow-md">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(0,0,0,0.05)' }}
          >
            <Flame className="w-6 h-6" style={{ color: 'var(--luka-text-secondary)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base" style={{ color: 'var(--luka-text-primary)' }}>
              Empieza tu racha
            </h3>
            <p className="text-sm" style={{ color: 'var(--luka-text-secondary)' }}>
              Ahorra algo hoy y vuelve mañana para sumar el primer día.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  const pctHacia = proxHito ? Math.min(rachaEfectiva / proxHito, 1) : 1

  return (
    <Card className="p-5 rounded-2xl shadow-md relative overflow-hidden">
      <div className="flex items-center gap-4 mb-4">
        {/* Llama animada */}
        <motion.div
          animate={{ scale: [1, 1.06, 1], rotate: [0, -4, 4, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md"
          style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)' }}
        >
          <Flame className="w-7 h-7 text-white" />
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <motion.span
              key={rachaEfectiva}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 18 }}
              className="text-3xl font-bold"
              style={{ color: 'var(--luka-text-primary)' }}
            >
              {rachaEfectiva}
            </motion.span>
            <span className="text-sm" style={{ color: 'var(--luka-text-secondary)' }}>
              {rachaEfectiva === 1 ? 'día ahorrando' : 'días ahorrando'}
            </span>
          </div>
          {rachaMasLarga > rachaEfectiva && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--luka-text-secondary)' }}>
              Tu récord: {rachaMasLarga} días
            </p>
          )}
        </div>
      </div>

      {/* Próximo hito */}
      {proxHito != null && diasParaProxHito != null && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs" style={{ color: 'var(--luka-text-secondary)' }}>
            <span>Próxima recompensa: {proxHito} días</span>
            <span>{diasParaProxHito === 1 ? 'falta 1 día' : `faltan ${diasParaProxHito} días`}</span>
          </div>
          <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pctHacia * 100}%` }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: 0.15 }}
              style={{ background: 'linear-gradient(90deg, #F59E0B, #EF4444)' }}
            />
          </div>
        </div>
      )}
    </Card>
  )
}
