import { useState } from 'react'
import { Gift, ExternalLink, Copy, Check, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { useBenefits } from '@/hooks/useBenefits'
import { getBeneficioProximoAExpirar, formatDate } from '@/lib/utils'
import type { CategoriaBeneficio, Benefit } from '@/types/database'

const CATEGORIAS_BENEFICIO: { value: CategoriaBeneficio | 'todos'; label: string }[] = [
  { value: 'todos',        label: 'Todos' },
  { value: 'fitness',      label: 'Fitness' },
  { value: 'wellness',     label: 'Wellness' },
  { value: 'educacion',    label: 'Cursos' },
  { value: 'lifestyle',    label: 'Estilo' },
  { value: 'comida',       label: 'Comida' },
  { value: 'transporte',   label: 'Transporte' },
]

function BenefitCard({ benefit }: { benefit: Benefit }) {
  const [copied, setCopied] = useState(false)
  const proximoVencer = getBeneficioProximoAExpirar(benefit.fecha_expiracion)

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
    <Card className="p-5 rounded-2xl shadow-md relative overflow-hidden">
      {proximoVencer && (
        <div className="flex items-center gap-1 text-xs text-amber-600 mb-2">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Expira pronto</span>
        </div>
      )}
      <div className="flex items-start gap-4 mb-3">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${benefit.color}18` }}>
          <Gift className="w-7 h-7" style={{ color: benefit.color }} />
        </div>
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
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90"
          style={{ background: benefit.color }}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copiado' : 'Copiar código'}
        </button>
        <button
          className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          aria-label="Ver aliado"
        >
          <ExternalLink className="w-4 h-4" style={{ color: 'var(--luka-text-secondary)' }} />
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
        <p className="text-xs text-center" style={{ color: 'var(--luka-text-secondary)' }}>
          Código: <span className="font-mono font-semibold" style={{ color: 'var(--luka-text-primary)' }}>
            {benefit.codigo}
          </span>
        </p>
      </div>
    </Card>
  )
}

export function BenefitsPage() {
  const { benefits, loading, setCategoriaActiva } = useBenefits()
  const [filtro, setFiltro] = useState<CategoriaBeneficio | 'todos'>('todos')

  const handleFiltro = (value: CategoriaBeneficio | 'todos') => {
    setFiltro(value)
    setCategoriaActiva(value === 'todos' ? undefined : value)
  }

  return (
    <div className="space-y-5 p-4 pt-6 pb-24">
      <div>
        <h1 className="text-2xl lg:text-3xl font-semibold" style={{ color: 'var(--luka-text-primary)' }}>
          Beneficios
        </h1>
        <p className="text-sm" style={{ color: 'var(--luka-text-secondary)' }}>
          Descuentos exclusivos para usuarios Luka
        </p>
      </div>

      {/* Stats */}
      <Card
        className="p-5 rounded-2xl shadow-lg border-0 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-5 h-5 text-white" />
            <h3 className="text-white font-medium">Tus ahorros con Luka</h3>
          </div>
          <p className="text-white/80 text-sm">{benefits.length} beneficios disponibles</p>
        </div>
        <div className="absolute bottom-0 right-0 text-7xl opacity-10 select-none">🎁</div>
      </Card>

      {/* Filtros por categoría */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIAS_BENEFICIO.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => handleFiltro(value)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap flex-shrink-0"
            style={{
              background: filtro === value ? 'var(--luka-blue)' : 'transparent',
              color: filtro === value ? 'white' : 'var(--luka-text-secondary)',
              border: filtro === value ? 'none' : '1px solid #E5E7EB',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Grid de beneficios */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
        </div>
      ) : benefits.length === 0 ? (
        <Card className="rounded-2xl shadow-md">
          <EmptyState emoji="🎁" title="Sin beneficios en esta categoría" description="Prueba con otra categoría." />
        </Card>
      ) : (
        <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          {benefits.map((benefit) => (
            <BenefitCard key={benefit.id} benefit={benefit} />
          ))}
        </div>
      )}
    </div>
  )
}
