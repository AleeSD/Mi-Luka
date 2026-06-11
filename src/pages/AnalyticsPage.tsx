import { useState, useMemo } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts'
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { useExpenses } from '@/hooks/useExpenses'
import { CATEGORIAS, formatCurrency } from '@/lib/utils'
import type { CategoriaGasto } from '@/types/database'

type Periodo = 'semana' | 'mes' | 'año'

export function AnalyticsPage() {
  const { expenses, loading } = useExpenses()
  const [periodo, setPeriodo] = useState<Periodo>('mes')

  const { gastosFiltrados, comparacion } = useMemo(() => {
    const hoy = new Date()
    let start: Date, end: Date, prevStart: Date, prevEnd: Date

    if (periodo === 'semana') {
      start = startOfWeek(hoy, { weekStartsOn: 1 })
      end = hoy
      prevStart = addDays(start, -7)
      prevEnd = addDays(end, -7)
    } else if (periodo === 'mes') {
      start = startOfMonth(hoy)
      end = endOfMonth(hoy)
      prevStart = startOfMonth(subMonths(hoy, 1))
      prevEnd = endOfMonth(subMonths(hoy, 1))
    } else {
      start = new Date(hoy.getFullYear(), 0, 1)
      end = hoy
      prevStart = new Date(hoy.getFullYear() - 1, 0, 1)
      prevEnd = new Date(hoy.getFullYear() - 1, 11, 31)
    }

    const filtro = (e: typeof expenses[0]) => {
      const f = new Date(e.fecha)
      return f >= start && f <= end
    }
    const filtroPrev = (e: typeof expenses[0]) => {
      const f = new Date(e.fecha)
      return f >= prevStart && f <= prevEnd
    }

    const gastosFiltrados = expenses.filter(filtro)
    const gastosPrev = expenses.filter(filtroPrev)

    const totalActual = gastosFiltrados.reduce((acc, e) => acc + Number(e.monto), 0)
    const totalPrev = gastosPrev.reduce((acc, e) => acc + Number(e.monto), 0)
    const pct = totalPrev > 0 ? ((totalActual - totalPrev) / totalPrev) * 100 : 0

    return { gastosFiltrados, comparacion: { pct, totalActual, totalPrev } }
  }, [expenses, periodo])

  const porCategoria = useMemo(() => {
    const map: Record<string, number> = {}
    gastosFiltrados.forEach((e) => {
      map[e.categoria] = (map[e.categoria] ?? 0) + Number(e.monto)
    })
    return Object.entries(map)
      .map(([cat, value]) => ({
        name: CATEGORIAS[cat as CategoriaGasto]?.label ?? cat,
        value,
        color: CATEGORIAS[cat as CategoriaGasto]?.color ?? '#6B7280',
      }))
      .sort((a, b) => b.value - a.value)
  }, [gastosFiltrados])

  const totalGastos = gastosFiltrados.reduce((acc, e) => acc + Number(e.monto), 0)
  const promedioDiario = gastosFiltrados.length > 0 ? totalGastos / 30 : 0
  const topCategoria = porCategoria[0]

  // Datos para el gráfico de barras (días de la semana o mes)
  const barData = useMemo(() => {
    if (periodo === 'semana') {
      const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
      return dias.map((dia, i) => {
        const dayGastos = gastosFiltrados.filter((e) => new Date(e.fecha).getDay() === (i + 1) % 7)
        return { label: dia, amount: dayGastos.reduce((acc, e) => acc + Number(e.monto), 0) }
      })
    }
    // Últimos 6 meses
    return Array.from({ length: 6 }).map((_, i) => {
      const mes = subMonths(new Date(), 5 - i)
      const gastosMes = expenses.filter((e) => {
        const f = new Date(e.fecha)
        return f.getMonth() === mes.getMonth() && f.getFullYear() === mes.getFullYear()
      })
      return {
        label: format(mes, 'MMM', { locale: es }),
        amount: gastosMes.reduce((acc, e) => acc + Number(e.monto), 0),
      }
    })
  }, [gastosFiltrados, expenses, periodo])

  return (
    <div className="space-y-5 p-4 pt-6 pb-24">
      <div>
        <h1 className="text-2xl lg:text-3xl font-semibold" style={{ color: 'var(--luka-text-primary)' }}>Análisis</h1>
        <p className="text-sm" style={{ color: 'var(--luka-text-secondary)' }}>Comprende tus patrones de gasto</p>
      </div>

      {/* Selector de período */}
      <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        {(['semana', 'mes', 'año'] as Periodo[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className="flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all"
            style={{
              background: periodo === p ? 'white' : 'transparent',
              color: periodo === p ? 'var(--luka-blue)' : 'var(--luka-text-secondary)',
              boxShadow: periodo === p ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {p === 'año' ? 'Año' : p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Resumen */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <Card className="p-4 rounded-2xl shadow-sm">
            <p className="text-xs mb-1" style={{ color: 'var(--luka-text-secondary)' }}>Total gastado</p>
            <p className="text-xl font-bold" style={{ color: 'var(--luka-text-primary)' }}>{formatCurrency(totalGastos)}</p>
            <div className="flex items-center gap-1 mt-1"
              style={{ color: comparacion.pct <= 0 ? 'var(--luka-green)' : '#EF4444' }}>
              {comparacion.pct <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
              <span className="text-xs">{Math.abs(comparacion.pct).toFixed(0)}% vs anterior</span>
            </div>
          </Card>
          <Card className="p-4 rounded-2xl shadow-sm">
            <p className="text-xs mb-1" style={{ color: 'var(--luka-text-secondary)' }}>Promedio diario</p>
            <p className="text-xl font-bold" style={{ color: 'var(--luka-text-primary)' }}>{formatCurrency(promedioDiario)}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--luka-text-secondary)' }}>{gastosFiltrados.length} gastos</p>
          </Card>
          {topCategoria && (
            <Card className="p-4 rounded-2xl shadow-sm col-span-2 lg:col-span-1">
              <p className="text-xs mb-1" style={{ color: 'var(--luka-text-secondary)' }}>Categoría top</p>
              <p className="text-base font-bold" style={{ color: 'var(--luka-text-primary)' }}>{topCategoria.name}</p>
              <p className="text-xs mt-1" style={{ color: topCategoria.color }}>{formatCurrency(topCategoria.value)}</p>
            </Card>
          )}
        </div>
      )}

      {/* Gráficos */}
      {loading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : gastosFiltrados.length === 0 ? (
        <Card className="p-6 rounded-2xl shadow-md">
          <EmptyState emoji="📊" title="Sin datos en este período" description="Agrega gastos para ver tus estadísticas aquí." />
        </Card>
      ) : (
        <div className="lg:grid lg:grid-cols-2 lg:gap-4 space-y-4 lg:space-y-0">
          {/* Barras */}
          <Card className="p-5 rounded-2xl shadow-md">
            <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--luka-text-primary)' }}>
              Gastos por período
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData}>
                <XAxis dataKey="label" stroke="#9CA3AF" fontSize={11} />
                <YAxis stroke="#9CA3AF" fontSize={11} tickFormatter={(v) => `S/${v}`} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), 'Gasto']} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} fill="url(#barGradient)">
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4F46E5" />
                      <stop offset="100%" stopColor="#8B5CF6" />
                    </linearGradient>
                  </defs>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Pie */}
          <Card className="p-5 rounded-2xl shadow-md">
            <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--luka-text-primary)' }}>
              Por categoría
            </h3>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie data={porCategoria} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={2}>
                    {porCategoria.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 min-w-0">
                {porCategoria.slice(0, 5).map((item) => {
                  const pct = totalGastos > 0 ? (item.value / totalGastos) * 100 : 0
                  return (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                      <span className="text-xs flex-1 truncate" style={{ color: 'var(--luka-text-secondary)' }}>{item.name}</span>
                      <span className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--luka-text-primary)' }}>
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Desglose detallado */}
      {!loading && porCategoria.length > 0 && (
        <Card className="p-5 rounded-2xl shadow-md">
          <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--luka-text-primary)' }}>Desglose detallado</h3>
          <div className="space-y-3">
            {porCategoria.map((cat) => {
              const pct = totalGastos > 0 ? (cat.value / totalGastos) * 100 : 0
              return (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
                      <span className="text-sm" style={{ color: 'var(--luka-text-primary)' }}>{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium" style={{ color: 'var(--luka-text-primary)' }}>
                        {formatCurrency(cat.value)}
                      </span>
                      <span className="text-xs w-10 text-right" style={{ color: 'var(--luka-text-secondary)' }}>
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: cat.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
