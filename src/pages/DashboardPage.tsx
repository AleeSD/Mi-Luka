import { useNavigate } from 'react-router'
import { PlusCircle, Target, Sparkles, TrendingDown, TrendingUp, RefreshCw, Trophy, Gift } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { motion } from 'motion/react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { EmptyState } from '@/components/shared/EmptyState'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { useAuthContext } from '@/context/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useExpenses } from '@/hooks/useExpenses'
import { useGoals } from '@/hooks/useGoals'
import { CATEGORIAS, formatCurrency, formatDate } from '@/lib/utils'
import type { CategoriaGasto } from '@/types/database'

const pageVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95, y: 14 },
  show:   { opacity: 1, scale: 1,    y: 0,  transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } },
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const { profile, loading: profileLoading } = useProfile()
  const { expenses, loading: expensesLoading, totalMes, refresh } = useExpenses()
  const { goalsActivas, loading: goalsLoading } = useGoals()

  const loading = profileLoading || expensesLoading

  const nombre        = profile?.nombre ?? user?.user_metadata?.nombre ?? 'Usuario'
  const recentExpenses = expenses.slice(0, 5)

  const hoy = new Date()
  const gastosMes = expenses.filter((e) => {
    const f = new Date(e.fecha)
    return f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear()
  })

  const porCategoria = Object.entries(
    gastosMes.reduce<Record<string, number>>((acc, e) => {
      acc[e.categoria] = (acc[e.categoria] ?? 0) + Number(e.monto)
      return acc
    }, {})
  ).map(([cat, value]) => ({
    name:  CATEGORIAS[cat as CategoriaGasto]?.label ?? cat,
    value,
    color: CATEGORIAS[cat as CategoriaGasto]?.color ?? '#6B7280',
  }))

  const totalAhorrado = goalsActivas.reduce((acc, g) => acc + Number(g.monto_actual), 0)

  return (
    <motion.div
      className="space-y-5 p-4 pt-6"
      variants={pageVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          {loading ? (
            <Skeleton className="h-7 w-44 rounded-xl" />
          ) : (
            <h1 className="text-2xl lg:text-3xl font-semibold" style={{ color: 'var(--luka-text-primary)' }}>
              Hola, {nombre} 👋
            </h1>
          )}
          <p className="text-sm mt-1" style={{ color: 'var(--luka-text-secondary)' }}>
            {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <motion.button
          onClick={refresh}
          whileHover={{ rotate: 180 }}
          whileTap={{ scale: 0.85 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className="w-5 h-5" style={{ color: 'var(--luka-text-secondary)' }} />
        </motion.button>
      </motion.div>

      {/* Balance Card */}
      <motion.div variants={scaleIn}>
        {loading ? (
          <Skeleton className="h-36 w-full rounded-2xl" />
        ) : (
          <motion.div
            whileHover={{ scale: 1.01, y: -2 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <Card
              className="p-6 rounded-2xl shadow-lg relative overflow-hidden border-0"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              <div className="relative z-10">
                <p className="text-white/80 text-sm mb-1">Gastos del mes</p>
                <h2 className="text-4xl lg:text-5xl text-white font-bold mb-4">
                  {formatCurrency(totalMes)}
                </h2>
                <div className="flex gap-3">
                  <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-xl p-3">
                    <p className="text-white/80 text-xs flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" /> Gastos
                    </p>
                    <p className="text-white text-lg font-semibold">{formatCurrency(totalMes)}</p>
                  </div>
                  <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-xl p-3">
                    <p className="text-white/80 text-xs flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Ahorrado
                    </p>
                    <p className="text-white text-lg font-semibold">{formatCurrency(totalAhorrado)}</p>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12" />
            </Card>
          </motion.div>
        )}
      </motion.div>

      {/* Quick Actions — inner spring stagger */}
      <motion.div
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}
        className="grid grid-cols-3 gap-3"
      >
        {[
          { label: 'Agregar', icon: PlusCircle, color: '#4F46E5', path: '/app/add-expense' },
          { label: 'Metas',   icon: Target,     color: '#10B981', path: '/app/goals' },
          { label: 'Retos',   icon: Sparkles,   color: '#8B5CF6', path: '/app/challenges' },
        ].map(({ label, icon: Icon, color, path }) => (
          <motion.button
            key={path}
            onClick={() => navigate(path)}
            variants={{
              hidden: { opacity: 0, scale: 0.72, y: 10 },
              show:   { opacity: 1, scale: 1,    y: 0,  transition: { type: 'spring', stiffness: 260, damping: 20 } },
            }}
            whileHover={{ scale: 1.07, y: -3, boxShadow: '0 10px 28px rgba(0,0,0,0.26)' }}
            whileTap={{ scale: 0.93 }}
            className="flex flex-col items-center gap-2 py-4 rounded-xl text-white font-medium"
            style={{ background: color }}
          >
            <Icon className="w-6 h-6" />
            <span className="text-xs">{label}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Metas Activas preview */}
      {!goalsLoading && goalsActivas.length > 0 && (
        <motion.div variants={fadeUp} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium" style={{ color: 'var(--luka-text-primary)' }}>Mis metas</h3>
            <button onClick={() => navigate('/app/goals')} className="text-sm" style={{ color: 'var(--luka-blue)' }}>
              Ver todas
            </button>
          </div>
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
          >
            {goalsActivas.slice(0, 2).map((goal) => {
              const pct = Math.min((Number(goal.monto_actual) / Number(goal.monto_objetivo)) * 100, 100)
              return (
                <motion.div
                  key={goal.id}
                  variants={{
                    hidden: { opacity: 0, x: 18 },
                    show:   { opacity: 1, x: 0,  transition: { duration: 0.32, ease: 'easeOut' } },
                  }}
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.18 }}
                  className="mb-3"
                >
                  <Card className="p-4 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium" style={{ color: 'var(--luka-text-primary)' }}>{goal.titulo}</p>
                      <span className="text-sm font-semibold" style={{ color: goal.color }}>{pct.toFixed(0)}%</span>
                    </div>
                    <Progress value={pct} className="h-2 mb-1" />
                    <p className="text-xs text-right" style={{ color: 'var(--luka-text-secondary)' }}>
                      {formatCurrency(Number(goal.monto_actual))} de {formatCurrency(Number(goal.monto_objetivo))}
                    </p>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </motion.div>
      )}

      {/* Pie chart gastos por categoría */}
      {!expensesLoading && porCategoria.length > 0 && (
        <motion.div variants={fadeUp}>
          <Card className="p-5 rounded-2xl shadow-md">
            <h3 className="mb-4 font-medium" style={{ color: 'var(--luka-text-primary)' }}>Gastos por categoría</h3>
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={porCategoria} cx="50%" cy="50%" innerRadius={42} outerRadius={65} dataKey="value" paddingAngle={2}>
                      {porCategoria.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <motion.div
                className="flex-1 space-y-2 min-w-0"
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } } }}
              >
                {porCategoria.slice(0, 5).map((item) => (
                  <motion.div
                    key={item.name}
                    variants={{
                      hidden: { opacity: 0, x: 12 },
                      show:   { opacity: 1, x: 0,  transition: { duration: 0.25 } },
                    }}
                    className="flex items-center gap-2"
                  >
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                    <span className="text-xs truncate flex-1" style={{ color: 'var(--luka-text-secondary)' }}>{item.name}</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--luka-text-primary)' }}>{formatCurrency(item.value)}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Gastos Recientes */}
      <motion.div variants={fadeUp}>
        <Card className="p-5 rounded-2xl shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium" style={{ color: 'var(--luka-text-primary)' }}>Gastos recientes</h3>
            <button onClick={() => navigate('/app/analytics')} className="text-sm" style={{ color: 'var(--luka-blue)' }}>
              Ver todos
            </button>
          </div>

          {expensesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                  <Skeleton className="h-4 w-16 rounded" />
                </div>
              ))}
            </div>
          ) : recentExpenses.length === 0 ? (
            <EmptyState
              emoji="💸"
              title="Aún no hay gastos"
              description="Registra tu primer gasto para empezar a controlar tus finanzas."
              action={
                <button
                  onClick={() => navigate('/app/add-expense')}
                  className="px-5 py-2.5 rounded-xl text-white text-sm font-medium"
                  style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}
                >
                  Agregar gasto
                </button>
              }
            />
          ) : (
            <motion.div
              className="space-y-1"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
            >
              {recentExpenses.map((expense) => (
                <motion.button
                  key={expense.id}
                  onClick={() => navigate(`/app/add-expense/${expense.id}`)}
                  variants={{
                    hidden: { opacity: 0, x: -14 },
                    show:   { opacity: 1, x: 0,   transition: { duration: 0.28, ease: 'easeOut' } },
                  }}
                  whileHover={{ x: 4, backgroundColor: 'rgba(79,70,229,0.045)' }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ duration: 0.15 }}
                  className="w-full flex items-center gap-3 rounded-xl p-2 -mx-2"
                >
                  <CategoryIcon categoria={expense.categoria} size="md" />
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--luka-text-primary)' }}>
                      {expense.descripcion}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--luka-text-secondary)' }}>
                      {CATEGORIAS[expense.categoria].label} · {formatDate(expense.fecha, 'dd MMM')}
                    </p>
                  </div>
                  <p className="text-sm font-semibold flex-shrink-0" style={{ color: 'var(--luka-text-primary)' }}>
                    -{formatCurrency(Number(expense.monto))}
                  </p>
                </motion.button>
              ))}
            </motion.div>
          )}
        </Card>
      </motion.div>

      {/* Cards acceso rápido */}
      <motion.div
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
        className="grid grid-cols-2 gap-3"
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, scale: 0.88, y: 14 },
            show:   { opacity: 1, scale: 1,    y: 0,  transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] } },
          }}
          whileHover={{ y: -5, boxShadow: '0 14px 36px rgba(139,92,246,0.2)' }}
          transition={{ duration: 0.2 }}
        >
          <Card
            className="p-4 rounded-2xl shadow-md cursor-pointer border h-full"
            onClick={() => navigate('/app/challenges')}
            style={{ borderColor: '#8B5CF640', background: 'rgba(139,92,246,0.04)' }}
          >
            <div className="flex items-start justify-between mb-2">
              <Trophy className="w-7 h-7" style={{ color: 'var(--luka-purple)' }} />
              <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: '#8B5CF6' }}>Activos</span>
            </div>
            <h4 className="text-sm font-medium mb-1" style={{ color: 'var(--luka-text-primary)' }}>Retos</h4>
            <p className="text-xs" style={{ color: 'var(--luka-text-secondary)' }}>Completa desafíos y gana puntos</p>
          </Card>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, scale: 0.88, y: 14 },
            show:   { opacity: 1, scale: 1,    y: 0,  transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] } },
          }}
          whileHover={{ y: -5, boxShadow: '0 14px 36px rgba(245,158,11,0.2)' }}
          transition={{ duration: 0.2 }}
        >
          <Card
            className="p-4 rounded-2xl shadow-md cursor-pointer border h-full"
            onClick={() => navigate('/app/benefits')}
            style={{ borderColor: '#F59E0B40', background: 'rgba(245,158,11,0.04)' }}
          >
            <div className="flex items-start justify-between mb-2">
              <Gift className="w-7 h-7" style={{ color: '#F59E0B' }} />
              <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: '#F59E0B' }}>Nuevo</span>
            </div>
            <h4 className="text-sm font-medium mb-1" style={{ color: 'var(--luka-text-primary)' }}>Beneficios</h4>
            <p className="text-xs" style={{ color: 'var(--luka-text-secondary)' }}>Descuentos exclusivos para ti</p>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
