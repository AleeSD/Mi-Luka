import { useState } from 'react'
import { Gift, ExternalLink, Copy, Check, AlertCircle } from 'lucide-react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { useBenefits } from '@/hooks/useBenefits'
import { getBeneficioProximoAExpirar, formatDate } from '@/lib/utils'
import type { CategoriaBeneficio, Benefit } from '@/types/database'

const CATEGORIAS_BENEFICIO: { value: CategoriaBeneficio | 'todos'; label: string }[] = [
  { value: 'todos',      label: 'Todos'      },
  { value: 'fitness',    label: 'Fitness'    },
  { value: 'wellness',   label: 'Wellness'   },
  { value: 'educacion',  label: 'Cursos'     },
  { value: 'lifestyle',  label: 'Estilo'     },
  { value: 'comida',     label: 'Comida'     },
  { value: 'transporte', label: 'Transporte' },
]

const pageVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.94, y: 10 },
  show:   { opacity: 1, scale: 1,    y: 0,  transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
}

function BenefitCard({ benefit, index }: { benefit: Benefit; index: number }) {
  const [copied, setCopied]   = useState(false)
  const proximoVencer          = getBeneficioProximoAExpirar(benefit.fecha_expiracion)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(benefit.codigo)
    } catch {
      const el = document.createElement('textarea')
      el.value = benefit.codigo
      el.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    toast.success(`Código ${benefit.codigo} copiado`)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: index * 0.05 }}
      whileHover={{ y: -4, boxShadow: `0 12px 32px ${benefit.color}22` }}
    >
      <Card className="p-5 rounded-2xl shadow-md relative overflow-hidden">
        {proximoVencer && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-1 text-xs text-amber-600 mb-2"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Expira pronto</span>
          </motion.div>
        )}
        <div className="flex items-start gap-4 mb-3">
          <motion.div
            whileHover={{ scale: 1.12, rotate: 6 }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${benefit.color}18` }}
          >
            <Gift className="w-7 h-7" style={{ color: benefit.color }} />
          </motion.div>
          <div className="flex-1 min-w-0">
            <Badge className="mb-1.5 rounded-full text-xs" style={{ background: benefit.color }}>
              {benefit.descuento}
            </Badge>
            <h4 className="font-semibold text-sm leading-tight" style={{ color: 'var(--luka-text-primary)' }}>
              {benefit.titulo}
            </h4>
            <p className="text-xs mt-0.5" style={{ color: 'var(--luka-text-secondary)' }}>{benefit.nombre_aliado}</p>
          </div>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--luka-text-secondary)' }}>{benefit.descripcion}</p>

        {benefit.fecha_expiracion && (
          <p className="text-xs mb-3" style={{ color: 'var(--luka-text-secondary)' }}>
            Válido hasta: {formatDate(benefit.fecha_expiracion, 'dd MMM yyyy')}
          </p>
        )}

        <div className="flex gap-2">
          <motion.button
            onClick={handleCopy}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-medium"
            style={{ background: benefit.color }}
          >
            <motion.div
              animate={{ rotate: copied ? [0, -10, 10, 0] : 0 }}
              transition={{ duration: 0.3 }}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </motion.div>
            {copied ? 'Copiado' : 'Copiar código'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            aria-label="Ver aliado"
          >
            <ExternalLink className="w-4 h-4" style={{ color: 'var(--luka-text-secondary)' }} />
          </motion.button>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-center" style={{ color: 'var(--luka-text-secondary)' }}>
            Código: <span className="font-mono font-semibold" style={{ color: 'var(--luka-text-primary)' }}>
              {benefit.codigo}
            </span>
          </p>
        </div>
      </Card>
    </motion.div>
  )
}

export function BenefitsPage() {
  const { benefits, loading, error, setCategoriaActiva, refresh } = useBenefits()
  const [filtro, setFiltro] = useState<CategoriaBeneficio | 'todos'>('todos')

  const handleFiltro = (value: CategoriaBeneficio | 'todos') => {
    setFiltro(value)
    setCategoriaActiva(value === 'todos' ? undefined : value)
  }

  return (
    <motion.div
      className="space-y-5 p-4 pt-6 pb-24"
      variants={pageVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl lg:text-3xl font-semibold" style={{ color: 'var(--luka-text-primary)' }}>
          Beneficios
        </h1>
        <p className="text-sm" style={{ color: 'var(--luka-text-secondary)' }}>
          Descuentos exclusivos para usuarios Luka
        </p>
      </motion.div>

      {/* Stats card */}
      <motion.div variants={scaleIn}>
        <motion.div
          whileHover={{ scale: 1.01, y: -2 }}
          transition={{ duration: 0.2 }}
        >
          <Card
            className="p-5 rounded-2xl shadow-lg border-0 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}
          >
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <motion.div
                  animate={{ rotate: [0, 10, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                >
                  <Gift className="w-5 h-5 text-white" />
                </motion.div>
                <h3 className="text-white font-medium">Tus ahorros con Luka</h3>
              </div>
              <p className="text-white/80 text-sm">{benefits.length} beneficios disponibles</p>
            </div>
            <div className="absolute bottom-0 right-0 text-7xl opacity-10 select-none">🎁</div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Filtros — stagger */}
      <motion.div
        variants={fadeUp}
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
      >
        <motion.div
          className="flex gap-2"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        >
          {CATEGORIAS_BENEFICIO.map(({ value, label }) => {
            const active = filtro === value
            return (
              <motion.button
                key={value}
                onClick={() => handleFiltro(value)}
                variants={{
                  hidden: { opacity: 0, scale: 0.85 },
                  show:   { opacity: 1, scale: 1, transition: { duration: 0.22 } },
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 relative"
                style={{ color: active ? 'white' : 'var(--luka-text-secondary)' }}
              >
                {active && (
                  <motion.span
                    layoutId="filter-indicator"
                    className="absolute inset-0 rounded-full"
                    style={{ background: 'var(--luka-blue)' }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                {!active && (
                  <span className="absolute inset-0 rounded-full border border-gray-200 dark:border-gray-700" />
                )}
                <span className="relative z-10">{label}</span>
              </motion.button>
            )
          })}
        </motion.div>
      </motion.div>

      {/* Grid de beneficios */}
      {error ? (
        <motion.div variants={fadeUp}>
          <Card className="rounded-2xl shadow-md p-6 flex flex-col items-center gap-3 text-center">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="font-medium" style={{ color: 'var(--luka-text-primary)' }}>No se pudieron cargar los beneficios</p>
            <p className="text-sm" style={{ color: 'var(--luka-text-secondary)' }}>{error}</p>
            <motion.button
              onClick={refresh}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              className="mt-1 px-5 py-2 rounded-xl text-white text-sm font-medium"
              style={{ background: 'var(--luka-blue)' }}
            >
              Reintentar
            </motion.button>
          </Card>
        </motion.div>
      ) : loading ? (
        <motion.div variants={fadeUp} className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
        </motion.div>
      ) : benefits.length === 0 ? (
        <motion.div variants={fadeUp}>
          <Card className="rounded-2xl shadow-md">
            <EmptyState emoji="🎁" title="Sin beneficios en esta categoría" description="Prueba con otra categoría." />
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          {benefits.map((benefit, i) => (
            <BenefitCard key={benefit.id} benefit={benefit} index={i} />
          ))}
        </div>
      )}
    </motion.div>
  )
}
