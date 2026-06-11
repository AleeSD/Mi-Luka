import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Calendar, TrendingUp, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { useGoals } from '@/hooks/useGoals'
import { goalSchema, contribucionSchema } from '@/lib/validations/goal'
import type { GoalFormData, ContribucionFormData } from '@/lib/validations/goal'
import { formatCurrency, getDiasRestantes } from '@/lib/utils'
import type { Goal } from '@/types/database'

const COLORES = ['#4F46E5', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4']

export function GoalsPage() {
  const { goalsActivas, goalsCompletadas, loading, addGoal, contribuir, removeGoal } = useGoals()
  const [showNueva, setShowNueva] = useState(false)
  const [goalContribuir, setGoalContribuir] = useState<Goal | null>(null)
  const [showCompletadas, setShowCompletadas] = useState(false)

  const goalForm = useForm<GoalFormData>({
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
      toast.error(e instanceof Error ? e.message : 'Error al contribuir')
    }
  })

  const totalActivos = goalsActivas.length
  const totalAhorrado = goalsActivas.reduce((acc, g) => acc + Number(g.monto_actual), 0)

  return (
    <div className="space-y-5 p-4 pt-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold" style={{ color: 'var(--luka-text-primary)' }}>Mis metas</h1>
          <p className="text-sm" style={{ color: 'var(--luka-text-secondary)' }}>Define y alcanza tus objetivos</p>
        </div>
        <button
          onClick={() => setShowNueva(true)}
          className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-lg hover:opacity-90 transition-all"
          style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Stats card */}
      {!loading && goalsActivas.length > 0 && (
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
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalAhorrado)}</p>
                <p className="text-xs text-white/70">Total ahorrado</p>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 text-7xl opacity-10 select-none">🎯</div>
        </Card>
      )}

      {/* Metas activas */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}
        </div>
      ) : goalsActivas.length === 0 ? (
        <Card className="rounded-2xl shadow-md overflow-hidden">
          <EmptyState
            emoji="🎯"
            title="Sin metas aún"
            description="Crea tu primera meta de ahorro y empieza a trabajar hacia ella."
            action={
              <button
                onClick={() => setShowNueva(true)}
                className="px-5 py-2.5 rounded-xl text-white text-sm font-medium"
                style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}
              >
                Nueva meta
              </button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {goalsActivas.map((goal) => {
            const pct = Math.min((Number(goal.monto_actual) / Number(goal.monto_objetivo)) * 100, 100)
            const dias = goal.fecha_limite ? getDiasRestantes(goal.fecha_limite) : null
            const faltan = Number(goal.monto_objetivo) - Number(goal.monto_actual)

            return (
              <Card key={goal.id} className="p-5 rounded-2xl shadow-md">
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: `${goal.color}18` }}
                  >
                    🎯
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate" style={{ color: 'var(--luka-text-primary)' }}>{goal.titulo}</h3>
                    <div className="flex items-center gap-2 text-sm mt-0.5" style={{ color: 'var(--luka-text-secondary)' }}>
                      {dias !== null && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {dias > 0 ? `${dias} días` : 'Vencida'}
                        </span>
                      )}
                      {dias !== null && <span>·</span>}
                      <span>Faltan {formatCurrency(faltan)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold" style={{ color: goal.color }}>{pct.toFixed(0)}%</span>
                    <button
                      onClick={() => removeGoal(goal.id).then(() => toast.success('Meta eliminada')).catch((e) => toast.error(e.message))}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 mb-4">
                  <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${goal.color}, ${goal.color}cc)` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs" style={{ color: 'var(--luka-text-secondary)' }}>
                    <span>{formatCurrency(Number(goal.monto_actual))}</span>
                    <span>{formatCurrency(Number(goal.monto_objetivo))}</span>
                  </div>
                </div>

                <button
                  onClick={() => { setGoalContribuir(goal); contribForm.reset() }}
                  className="w-full py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90"
                  style={{ background: goal.color }}
                >
                  Contribuir
                </button>
              </Card>
            )
          })}
        </div>
      )}

      {/* Metas completadas */}
      {goalsCompletadas.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompletadas(!showCompletadas)}
            className="flex items-center gap-2 text-sm font-medium mb-3"
            style={{ color: 'var(--luka-text-secondary)' }}
          >
            {showCompletadas ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Completadas ({goalsCompletadas.length})
          </button>
          {showCompletadas && (
            <div className="space-y-3">
              {goalsCompletadas.map((goal) => (
                <Card key={goal.id} className="p-4 rounded-2xl shadow-sm border-2 border-green-200 bg-green-50 dark:bg-green-950/20">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">✅</div>
                    <div className="flex-1">
                      <p className="font-medium" style={{ color: 'var(--luka-text-primary)' }}>{goal.titulo}</p>
                      <p className="text-xs text-green-600">{formatCurrency(Number(goal.monto_objetivo))} alcanzado</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
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
              {goalForm.formState.errors.fecha_limite && <p className="text-xs text-red-500">{goalForm.formState.errors.fecha_limite.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Color</Label>
              <div className="flex gap-2">
                {COLORES.map((c) => (
                  <button key={c} type="button" onClick={() => goalForm.setValue('color', c)}
                    className="w-8 h-8 rounded-full border-2 transition-all"
                    style={{ background: c, borderColor: goalForm.watch('color') === c ? '#111827' : 'transparent', transform: goalForm.watch('color') === c ? 'scale(1.2)' : 'scale(1)' }}
                  />
                ))}
              </div>
            </div>
            <button type="submit" disabled={goalForm.formState.isSubmitting}
              className="w-full py-3 rounded-xl text-white font-medium disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}>
              {goalForm.formState.isSubmitting ? 'Creando...' : 'Crear meta'}
            </button>
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
              <button type="submit" disabled={contribForm.formState.isSubmitting}
                className="w-full py-3 rounded-xl text-white font-medium disabled:opacity-50"
                style={{ background: goalContribuir.color }}>
                {contribForm.formState.isSubmitting ? 'Guardando...' : 'Añadir'}
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
