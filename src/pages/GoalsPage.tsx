import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Calendar, TrendingUp, ChevronDown, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { isMobile, fadeUp, scaleIn } from '@/lib/motion-utils'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { useGoals } from '@/hooks/useGoals'
import { useSaldo } from '@/hooks/useSaldo'
import { useLukaNotification } from '@/hooks/useLukaNotification'
import { useSaldoEditor } from '@/context/SaldoEditorContext'
import { SaldoInsuficienteError } from '@/lib/db/balance'
import { mensajeBloqueoDinamico } from '@/lib/mensajes'
import { goalSchema, contribucionSchema } from '@/lib/validations/goal'
import type { GoalFormData, ContribucionFormData } from '@/lib/validations/goal'
import { formatCurrency, getDiasRestantes } from '@/lib/utils'
import type { Goal } from '@/types/database'

const COLORES = ['#4F46E5', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4']

const pageVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
}

// fadeUp + scaleIn from motion-utils: desktop = full animation, mobile = fade-only

const goalCardVariants = isMobile
  ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.32 } } }
  : { hidden: { opacity: 0, x: 20, y: 6 }, show: { opacity: 1, x: 0, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } } }

export function GoalsPage() {
  const { goalsActivas, goalsCompletadas, loading, addGoal, contribuir, removeGoal } = useGoals()
  const { saldoDisponible } = useSaldo()
  const { notify } = useLukaNotification()
  const { open: openSaldoEditor } = useSaldoEditor()
  const [showNueva, setShowNueva]           = useState(false)
  const [goalContribuir, setGoalContribuir] = useState<Goal | null>(null)
  const [showCompletadas, setShowCompletadas] = useState(false)

  const goalForm  = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: { color: '#4F46E5', icono: 'target' },
  })

  const contribForm = useForm<ContribucionFormData>({
    resolver: zodResolver(contribucionSchema),
  })

  const onCreateGoal = goalForm.handleSubmit(async (data) => {
    try {
      await addGoal(data)
      toast.success('¡Meta creada!')
      setShowNueva(false)
      goalForm.reset({ color: '#4F46E5', icono: 'target' })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al crear la meta')
    }
  })

  const onContribuir = contribForm.handleSubmit(async (data) => {
    if (!goalContribuir) return
    try {
      const updated = await contribuir(goalContribuir.id, data.monto)
      if (updated.completada) {
        confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } })
        toast.success('🎉 ¡Meta completada! ¡Felicitaciones!')
      } else {
        toast.success(`+${formatCurrency(data.monto)} añadido`)
      }
      setGoalContribuir(null)
      contribForm.reset()
    } catch (e) {
      if (e instanceof SaldoInsuficienteError) {
        const msg = mensajeBloqueoDinamico(saldoDisponible, data.monto)
        notify({
          variant: 'bloqueo',
          title: msg.title,
          subtitle: msg.subtitle,
          cta: { label: 'Actualizar saldo', onClick: openSaldoEditor },
        })
      } else {
        console.error('[GoalsPage] contribuir error:', e)
        toast.error(e instanceof Error ? e.message : 'Error al contribuir')
      }
    }
  })

  const totalActivos  = goalsActivas.length
  const totalAhorrado = goalsActivas.reduce((acc, g) => acc + Number(g.monto_actual), 0)

  return (
    <motion.div
      className="space-y-5 p-4 pt-6 pb-24"
      variants={pageVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold" style={{ color: 'var(--luka-text-primary)' }}>Mis metas</h1>
          <p className="text-sm" style={{ color: 'var(--luka-text-secondary)' }}>Define y alcanza tus objetivos</p>
        </div>
        <motion.button
          onClick={() => setShowNueva(true)}
          aria-label="Nueva meta"
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-lg"
          style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}
        >
          <Plus className="w-5 h-5" />
        </motion.button>
      </motion.div>

      {/* Stats card */}
      {!loading && goalsActivas.length > 0 && (
        <motion.div variants={scaleIn} initial="hidden" animate="show">
          <motion.div
            whileHover={{ scale: 1.01, y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <Card
              className="p-6 rounded-2xl shadow-lg border-0 relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
            >
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-white" />
                  <h3 className="text-white font-medium">¡Vas muy bien!</h3>
                </div>
                <div className="flex gap-6 text-white">
                  <div>
                    <p className="text-2xl font-bold">{totalActivos}</p>
                    <p className="text-xs text-white/70">Metas activas</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold break-all">{formatCurrency(totalAhorrado)}</p>
                    <p className="text-xs text-white/70">Total ahorrado</p>
                  </div>
                </div>
              </div>
              <motion.div
                animate={{ rotate: [0, 8, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, repeatDelay: 8, ease: 'easeInOut', delay: 1 }}
                className="absolute bottom-0 right-0 text-7xl opacity-10 select-none"
              >
                🎯
              </motion.div>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* Metas activas */}
      {loading ? (
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}
        </motion.div>
      ) : goalsActivas.length === 0 ? (
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <Card className="rounded-2xl shadow-md overflow-hidden">
            <EmptyState
              emoji="🎯"
              title="Sin metas aún"
              description="Crea tu primera meta de ahorro y empieza a trabajar hacia ella."
              action={
                <motion.button
                  onClick={() => setShowNueva(true)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-5 py-2.5 rounded-xl text-white text-sm font-medium"
                  style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}
                >
                  Nueva meta
                </motion.button>
              }
            />
          </Card>
        </motion.div>
      ) : (
        <motion.div
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {goalsActivas.map((goal) => {
            const pct  = Math.min((Number(goal.monto_actual) / Number(goal.monto_objetivo)) * 100, 100)
            const dias  = goal.fecha_limite ? getDiasRestantes(goal.fecha_limite) : null
            const faltan = Number(goal.monto_objetivo) - Number(goal.monto_actual)

            return (
              <motion.div
                key={goal.id}
                variants={goalCardVariants}
                whileHover={{ y: -3, boxShadow: '0 10px 28px rgba(0,0,0,0.1)' }}
              >
                <Card className="p-5 rounded-2xl shadow-md">
                  <div className="flex items-start gap-3 mb-4">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ background: `${goal.color}18` }}
                    >
                      🎯
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate" style={{ color: 'var(--luka-text-primary)' }}>{goal.titulo}</h3>
                      <div className="flex items-center gap-1.5 text-sm mt-0.5 min-w-0 flex-wrap" style={{ color: 'var(--luka-text-secondary)' }}>
                        {dias !== null && (
                          <span className="flex items-center gap-1 shrink-0">
                            <Calendar className="w-3.5 h-3.5" />
                            {dias > 0 ? `${dias} días` : 'Vencida'}
                          </span>
                        )}
                        {dias !== null && <span>·</span>}
                        <span className="truncate">Faltan {formatCurrency(faltan)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold" style={{ color: goal.color }}>{pct.toFixed(0)}%</span>
                      <motion.button
                        onClick={() => removeGoal(goal.id).then(() => toast.success('Meta eliminada')).catch((e) => toast.error(e.message))}
                        aria-label="Eliminar meta"
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.85 }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-4">
                    <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: 0.2 }}
                        style={{ background: `linear-gradient(90deg, ${goal.color}, ${goal.color}cc)` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs" style={{ color: 'var(--luka-text-secondary)' }}>
                      <span>{formatCurrency(Number(goal.monto_actual))}</span>
                      <span>{formatCurrency(Number(goal.monto_objetivo))}</span>
                    </div>
                  </div>

                  <motion.button
                    onClick={() => { setGoalContribuir(goal); contribForm.reset() }}
                    whileHover={{ scale: 1.03, opacity: 0.9 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    className="w-full py-2.5 rounded-xl text-white text-sm font-medium"
                    style={{ background: goal.color }}
                  >
                    Contribuir
                  </motion.button>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Metas completadas */}
      {goalsCompletadas.length > 0 && (
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <motion.button
            onClick={() => setShowCompletadas(!showCompletadas)}
            whileHover={{ x: 2 }}
            className="flex items-center gap-2 text-sm font-medium mb-3"
            style={{ color: 'var(--luka-text-secondary)' }}
          >
            <motion.div
              animate={{ rotate: showCompletadas ? 180 : 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <ChevronDown className="w-4 h-4" />
            </motion.div>
            Completadas ({goalsCompletadas.length})
          </motion.button>
          <AnimatePresence>
            {showCompletadas && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden space-y-3"
              >
                {goalsCompletadas.map((goal, i) => (
                  <motion.div
                    key={goal.id}
                    initial={isMobile ? { opacity: 0 } : { opacity: 0, x: -10 }}
                    animate={isMobile ? { opacity: 1 } : { opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.25 }}
                  >
                    <Card className="p-4 rounded-2xl shadow-sm border-2 border-green-200 bg-green-50 dark:bg-green-950/20">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">✅</div>
                        <div className="flex-1">
                          <p className="font-medium" style={{ color: 'var(--luka-text-primary)' }}>{goal.titulo}</p>
                          <p className="text-xs text-green-600">{formatCurrency(Number(goal.monto_objetivo))} alcanzado</p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Dialog nueva meta */}
      <Dialog open={showNueva} onOpenChange={setShowNueva}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Nueva meta</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreateGoal} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input placeholder="Ej: Viaje a Europa" className="rounded-xl" {...goalForm.register('titulo')} />
              {goalForm.formState.errors.titulo && <p className="text-xs text-red-500">{goalForm.formState.errors.titulo.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Monto objetivo (S/)</Label>
              <Input type="number" step="0.01" placeholder="0.00" className="rounded-xl"
                {...goalForm.register('monto_objetivo', { valueAsNumber: true })} />
              {goalForm.formState.errors.monto_objetivo && <p className="text-xs text-red-500">{goalForm.formState.errors.monto_objetivo.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Fecha límite <span className="font-normal text-xs text-gray-400">(opcional)</span></Label>
              <Input type="date" className="rounded-xl" {...goalForm.register('fecha_limite')} />
            </div>
            <div className="space-y-1">
              <Label>Color</Label>
              <div className="flex gap-2">
                {COLORES.map((c) => (
                  <motion.button
                    key={c}
                    type="button"
                    onClick={() => goalForm.setValue('color', c)}
                    aria-label={`Color ${c}`}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    animate={{ scale: goalForm.watch('color') === c ? 1.25 : 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    className="w-8 h-8 rounded-full border-2"
                    style={{ background: c, borderColor: goalForm.watch('color') === c ? '#111827' : 'transparent' }}
                  />
                ))}
              </div>
            </div>
            <motion.button
              type="submit"
              disabled={goalForm.formState.isSubmitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 rounded-xl text-white font-medium disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}
            >
              {goalForm.formState.isSubmitting ? 'Creando...' : 'Crear meta'}
            </motion.button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog contribuir */}
      <Dialog open={Boolean(goalContribuir)} onOpenChange={() => setGoalContribuir(null)}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Contribuir a: {goalContribuir?.titulo}</DialogTitle>
          </DialogHeader>
          {goalContribuir && (
            <form onSubmit={onContribuir} className="space-y-4 mt-2">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-sm text-center" style={{ color: 'var(--luka-text-secondary)' }}>
                  Disponible: {formatCurrency(Number(goalContribuir.monto_objetivo) - Number(goalContribuir.monto_actual))}
                </p>
              </div>
              <div className="space-y-1">
                <Label>Monto a añadir (S/)</Label>
                <Input type="number" step="0.01" placeholder="0.00" className="rounded-xl"
                  {...contribForm.register('monto', { valueAsNumber: true })} />
                {contribForm.formState.errors.monto && <p className="text-xs text-red-500">{contribForm.formState.errors.monto.message}</p>}
              </div>
              <motion.button
                type="submit"
                disabled={contribForm.formState.isSubmitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-3 rounded-xl text-white font-medium disabled:opacity-50"
                style={{ background: goalContribuir.color }}
              >
                {contribForm.formState.isSubmitting ? 'Guardando...' : 'Añadir'}
              </motion.button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
