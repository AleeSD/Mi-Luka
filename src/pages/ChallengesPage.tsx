import { useEffect, useMemo, useState } from 'react'
import {
  Trophy, Award, Zap, Star, Target, Flame, Check,
  Clock, Sparkles,
} from 'lucide-react'
import { motion } from 'motion/react'
import { isMobile, fadeUp, scaleIn } from '@/lib/motion-utils'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { RachaCard } from '@/components/shared/RachaCard'
import { useChallenges } from '@/hooks/useChallenges'
import { useProfile } from '@/hooks/useProfile'
import { progresoNivel } from '@/lib/leveling'
import { formatearSemana, esDomingoLima } from '@/lib/semana'
import { formatCurrency } from '@/lib/utils'
import {
  RetoYaAceptadoError, RetoNoCumplidoError, RetoSoloDomingoError,
  RetoYaCompletadoError, RetoFueraDeSemanaError,
} from '@/lib/db/challenges'
import type { Challenge, UserChallenge, Medicion } from '@/types/database'

// ─── Mediciones que solo se reclaman el domingo (guard server-side en
// completar_reto; aquí lo replicamos en la UI para etiquetar bien) ────
const MEDICIONES_SOLO_DOMINGO: Medicion[] = [
  'gasto_total_max_semana',
  'sin_categoria_semana',
  'saldo_positivo_fin_semana',
]

const DIFICULTAD_COLORS: Record<string, string> = {
  facil:   '#10B981',
  media:   '#F59E0B',
  dificil: '#EF4444',
}

const CATEGORIA_ICONS: Record<string, React.ElementType> = {
  ahorro:   Target,
  control:  Sparkles,
  registro: Flame,
  progreso: Zap,
}

function iconParaCategoria(cat: string | null | undefined): React.ElementType {
  return CATEGORIA_ICONS[cat ?? ''] ?? Trophy
}

// ─── Formatea el "X / Y" según el tipo de medición ──────────────────────
function formatearProgreso(challenge: Challenge, progreso: number): string {
  const meta = Number(challenge.meta_valor ?? 0)
  switch (challenge.medicion) {
    case 'ahorro_monto_semana':
    case 'gasto_total_max_semana':
      return `${formatCurrency(progreso)} / ${formatCurrency(meta)}`
    case 'ahorro_count_semana':
    case 'gastos_count_semana':
      return `${progreso} / ${meta}`
    case 'ahorro_dias_distintos_semana':
    case 'dias_sin_gasto_semana':
    case 'gastos_dias_seguidos':
    case 'gastos_dias_distintos_semana':
      return `${progreso} / ${meta} días`
    case 'racha_minima':
      return `${progreso} / ${meta} días de racha`
    case 'meta_completada_semana':
      return progreso >= meta ? '¡Completado!' : 'Aún no'
    case 'subir_nivel_semana':
      return progreso >= 1 ? '¡Listo!' : 'Aún no'
    case 'saldo_positivo_fin_semana':
      return progreso >= 1 ? 'Saldo > S/ 0' : 'Saldo en S/ 0'
    case 'sin_categoria_semana': {
      // Para retos antagónicos (meta_valor = 0), progreso > 0 = fallado.
      const param = challenge.parametro ? ` en ${challenge.parametro}` : ''
      return progreso === 0 ? `0 gastos${param} ✓` : `${progreso} gastos${param}`
    }
    default:
      return `${progreso} / ${meta}`
  }
}

// Sin_categoria_semana cumple cuando progreso es EXACTAMENTE 0; el resto
// cumple cuando progreso >= meta_valor. gasto_total_max_semana cumple
// cuando progreso <= meta (y se reclama el domingo).
function reglaCumplida(challenge: Challenge, progreso: number): boolean {
  const meta = Number(challenge.meta_valor ?? 0)
  switch (challenge.medicion) {
    case 'sin_categoria_semana':
      return progreso === 0
    case 'gasto_total_max_semana':
      return progreso <= meta
    default:
      return progreso >= meta
  }
}

/**
 * "Fallido": el reto antagónico ya no puede cumplirse, incluso si la
 * semana sigue corriendo. Es irreversible: ningún evento futuro va a
 * bajar el contador. El RPC `completar_reto` ya rechaza estos casos con
 * RETO_NO_CUMPLIDO; aquí lo replicamos en cliente para mostrar un
 * estado UI distinto en vez de una barra roja a medias.
 *
 *   - gasto_total_max_semana → progreso > meta (excediste el techo).
 *   - sin_categoria_semana   → progreso > 0 (al menos un gasto en
 *                              la categoría prohibida).
 *   - resto                  → nunca "fallido" en cliente; siguen vivos
 *                              hasta el cierre de la semana.
 */
function retoFallido(challenge: Challenge, progreso: number): boolean {
  const meta = Number(challenge.meta_valor ?? 0)
  switch (challenge.medicion) {
    case 'gasto_total_max_semana':
      return progreso > meta
    case 'sin_categoria_semana':
      return progreso > 0
    default:
      return false
  }
}

// ─── Animaciones ────────────────────────────────────────────────────────
const pageVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
}

const challengeItemVariant = isMobile
  ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.28 } } }
  : { hidden: { opacity: 0, y: 12, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } } }

const completadoItemVariant = isMobile
  ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.28 } } }
  : { hidden: { opacity: 0, scale: 0.92 }, show: { opacity: 1, scale: 1, transition: { duration: 0.3 } } }

// ─── Página ─────────────────────────────────────────────────────────────
export function ChallengesPage() {
  const {
    retosDisponibles, enCurso, completados, semanaActual, loading,
    accept, claim, getProgreso, refresh,
  } = useChallenges()
  const { profile } = useProfile()

  const puntos = profile?.puntos_totales ?? 0
  const prog   = progresoNivel(puntos)

  const [accepting, setAccepting] = useState<string | null>(null)
  const [claiming,  setClaiming]  = useState<string | null>(null)

  // ─── Progreso live por reto en curso ────────────────────────────────
  // Mapa userChallenge.id → progreso. Refetcheamos cuando enCurso cambia
  // o cuando el perfil cambia (porque retos como "subir_nivel_semana"
  // o "racha_minima" dependen directamente del perfil).
  const [progresos, setProgresos] = useState<Record<string, number>>({})
  const profileSignal = useMemo(
    () => `${profile?.puntos_totales ?? 0}|${profile?.nivel ?? 0}|${profile?.racha_actual ?? 0}|${profile?.saldo_disponible ?? 0}`,
    [profile?.puntos_totales, profile?.nivel, profile?.racha_actual, profile?.saldo_disponible],
  )

  useEffect(() => {
    if (enCurso.length === 0) {
      setProgresos({})
      return
    }
    let cancelled = false
    Promise.all(
      enCurso.map((uc) =>
        getProgreso(uc.id).then((p): [string, number] => [uc.id, p]),
      ),
    )
      .then((pairs) => {
        if (!cancelled) setProgresos(Object.fromEntries(pairs))
      })
      .catch((e) => console.error('[ChallengesPage] fetch progresos:', e))
    return () => { cancelled = true }
  }, [enCurso, profileSignal, getProgreso])

  // ─── Acciones ───────────────────────────────────────────────────────
  const esDomingo = esDomingoLima()

  const handleAccept = async (c: Challenge) => {
    setAccepting(c.id)
    try {
      await accept(c.id)
      toast.success(`¡Aceptaste "${c.titulo}"!`)
    } catch (e) {
      if (e instanceof RetoYaAceptadoError) {
        toast.error('Ya aceptaste este reto esta semana', {
          description: 'Vuelve la próxima semana para intentarlo de nuevo.',
        })
        refresh()
      } else {
        console.error('[ChallengesPage] accept:', e)
        toast.error(e instanceof Error ? e.message : 'No se pudo aceptar el reto')
      }
    } finally {
      setAccepting(null)
    }
  }

  const handleClaim = async (uc: UserChallenge) => {
    const challenge = uc.challenge
    if (!challenge) return
    setClaiming(uc.id)
    try {
      const result = await claim(uc.id)
      confetti({ particleCount: 110, spread: 80, origin: { y: 0.55 } })
      toast.success(`+${challenge.puntos} XP — ${challenge.titulo}`)
      if (result.subio_de_nivel) {
        // Pequeña pausa para que el toast de XP se vea primero.
        window.setTimeout(() => {
          confetti({ particleCount: 160, spread: 110, origin: { y: 0.4 } })
          toast.success(`¡Subiste al nivel ${result.nivel_nuevo}! 🎉`, { duration: 6000 })
        }, 350)
      }
    } catch (e) {
      if (e instanceof RetoSoloDomingoError) {
        toast.error('Este reto solo se reclama el domingo', {
          description: 'Vuelve al cierre de la semana en hora Lima.',
        })
      } else if (e instanceof RetoNoCumplidoError) {
        toast.error('Aún no cumples este reto', {
          description: 'Revisa tu progreso parcial y vuelve cuando llegues a la meta.',
        })
        refresh()
      } else if (e instanceof RetoYaCompletadoError) {
        toast.error('Este reto ya fue completado')
        refresh()
      } else if (e instanceof RetoFueraDeSemanaError) {
        toast.error('Este reto es de otra semana')
        refresh()
      } else {
        console.error('[ChallengesPage] claim:', e)
        toast.error(e instanceof Error ? e.message : 'No se pudo reclamar el reto')
      }
    } finally {
      setClaiming(null)
    }
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
          Retos
        </h1>
        <p className="text-sm" style={{ color: 'var(--luka-text-secondary)' }}>
          {formatearSemana(semanaActual)} · Completa retos y sube de nivel
        </p>
      </motion.div>

      {/* ─── Nivel card (curva cuadrática real, conectada al perfil) ─── */}
      <motion.div variants={scaleIn}>
        <motion.div
          whileHover={{ scale: 1.01, y: -2 }}
          transition={{ duration: 0.2 }}
        >
          <Card
            className="p-6 rounded-2xl shadow-lg border-0 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)' }}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white/80 text-sm mb-1">Tu nivel</p>
                  <h2 className="text-4xl text-white font-bold">Nivel {prog.nivel}</h2>
                </div>
                <motion.div
                  animate={{ rotate: [0, -12, 12, -6, 6, 0] }}
                  transition={{ duration: 2.5, delay: 0.8, repeat: Infinity, repeatDelay: 5, ease: 'easeInOut' }}
                  className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center"
                >
                  <Trophy className="w-7 h-7 text-white" />
                </motion.div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-white/80 text-sm">
                  <span>{prog.xpEnNivel} XP</span>
                  <span>{prog.xpParaSiguiente} XP</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-white/20 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-white"
                    initial={{ width: 0 }}
                    animate={{ width: `${prog.pct * 100}%` }}
                    transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: 0.3 }}
                  />
                </div>
                <p className="text-white/70 text-xs">
                  {prog.xpRestante > 0
                    ? `${prog.xpRestante} XP para el nivel ${prog.nivel + 1}`
                    : '¡Listo para subir al siguiente nivel!'}
                </p>
              </div>
            </div>
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 6, repeat: Infinity, repeatDelay: 8, ease: 'easeInOut' }}
              className="absolute top-0 right-0 text-8xl opacity-10 select-none"
            >
              🏆
            </motion.div>
          </Card>
        </motion.div>
      </motion.div>

      {/* ─── Racha activa + próximo hito (Fase 5) ──────────────────── */}
      <motion.div variants={fadeUp}>
        <RachaCard />
      </motion.div>

      {/* ─── Tabs ──────────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <Tabs defaultValue="disponibles">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="disponibles" className="text-xs sm:text-sm px-1">
              Disponibles {retosDisponibles.length > 0 && `(${retosDisponibles.length})`}
            </TabsTrigger>
            <TabsTrigger value="en-curso" className="text-xs sm:text-sm px-1">
              En curso {enCurso.length > 0 && `(${enCurso.length})`}
            </TabsTrigger>
            <TabsTrigger value="completados" className="text-xs sm:text-sm px-1">
              Completados {completados.length > 0 && `(${completados.length})`}
            </TabsTrigger>
          </TabsList>

          {/* ─── DISPONIBLES ─────────────────────────────────────────── */}
          <TabsContent value="disponibles" className="mt-4">
            <motion.div
              className="space-y-3"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}
            >
              {loading ? (
                [1, 2, 3].map((i) => (
                  <motion.div key={i} variants={fadeUp}>
                    <Skeleton className="h-32 w-full rounded-2xl" />
                  </motion.div>
                ))
              ) : retosDisponibles.length === 0 ? (
                <motion.div variants={fadeUp}>
                  <EmptyState
                    emoji="🌱"
                    title="Sin retos disponibles esta semana"
                    description="Aceptaste o completaste todo lo que te tocaba este ciclo. La próxima semana vuelve a abrir el catálogo."
                  />
                </motion.div>
              ) : (
                retosDisponibles.map((c) => {
                  const color = DIFICULTAD_COLORS[c.dificultad] ?? '#4F46E5'
                  const Icon  = iconParaCategoria(c.categoria_reto)
                  const soloDomingo = c.medicion != null && MEDICIONES_SOLO_DOMINGO.includes(c.medicion)
                  return (
                    <motion.div
                      key={c.id}
                      variants={challengeItemVariant}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.18 }}
                    >
                      <Card className="p-5 rounded-2xl shadow-md">
                        <div className="flex items-start gap-4 mb-3">
                          <motion.div
                            whileHover={{ scale: 1.15, rotate: 8 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: `${color}18` }}
                          >
                            <Icon className="w-6 h-6" style={{ color }} />
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold mb-1" style={{ color: 'var(--luka-text-primary)' }}>
                              {c.titulo}
                            </h4>
                            <p className="text-sm mb-2" style={{ color: 'var(--luka-text-secondary)' }}>
                              {c.descripcion}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className="rounded-full text-xs" style={{ background: color }}>
                                +{c.puntos} XP
                              </Badge>
                              <Badge variant="secondary" className="rounded-full text-xs capitalize">
                                {c.dificultad}
                              </Badge>
                              {soloDomingo && (
                                <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--luka-text-secondary)' }}>
                                  <Clock className="w-3 h-3" /> reclamable el domingo
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <motion.button
                          onClick={() => handleAccept(c)}
                          disabled={accepting === c.id}
                          whileHover={{ scale: 1.02, opacity: 0.9 }}
                          whileTap={{ scale: 0.97 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                          className="w-full py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                          style={{ background: color }}
                        >
                          {accepting === c.id ? 'Aceptando...' : 'Aceptar reto'}
                        </motion.button>
                      </Card>
                    </motion.div>
                  )
                })
              )}
            </motion.div>
          </TabsContent>

          {/* ─── EN CURSO ──────────────────────────────────────────── */}
          <TabsContent value="en-curso" className="mt-4">
            <motion.div
              className="space-y-3"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}
            >
              {loading ? (
                [1, 2].map((i) => (
                  <motion.div key={i} variants={fadeUp}>
                    <Skeleton className="h-40 w-full rounded-2xl" />
                  </motion.div>
                ))
              ) : enCurso.length === 0 ? (
                <motion.div variants={fadeUp}>
                  <EmptyState
                    emoji="🚀"
                    title="Sin retos activos"
                    description="Acepta un reto de la pestaña Disponibles para empezar a ganar XP."
                  />
                </motion.div>
              ) : (
                // Fallidos al final para no estorbar los retos aún vivos.
                // No los movemos a "Completados" porque no se completaron;
                // siguen siendo retos de esta semana. Saldrán naturalmente
                // de "En curso" cuando cambie la semana ISO Lima.
                [...enCurso]
                  .sort((a, b) => {
                    const af = a.challenge ? retoFallido(a.challenge, progresos[a.id] ?? 0) : false
                    const bf = b.challenge ? retoFallido(b.challenge, progresos[b.id] ?? 0) : false
                    if (af === bf) return 0
                    return af ? 1 : -1
                  })
                  .map((uc) => {
                  const c = uc.challenge
                  if (!c) return null
                  const color = DIFICULTAD_COLORS[c.dificultad] ?? '#4F46E5'
                  const Icon  = iconParaCategoria(c.categoria_reto)
                  const progreso = progresos[uc.id] ?? 0
                  const meta     = Number(c.meta_valor ?? 0)
                  const cumplido = reglaCumplida(c, progreso)
                  const fallido  = retoFallido(c, progreso)
                  const soloDomingo = c.medicion != null && MEDICIONES_SOLO_DOMINGO.includes(c.medicion)
                  const puedeReclamar = cumplido && !fallido && (!soloDomingo || esDomingo)

                  // pct para la barra: en gasto_total_max queremos mostrar
                  // qué % del límite ya gastó (0% = sin gastos, 100% = al
                  // límite). En el resto, progreso/meta tradicional.
                  const pct = meta > 0 ? Math.min((progreso / meta) * 100, 100) : 0

                  // Estado fallido: tarjeta inerte, sin botón, copy breve
                  // sin tono punitivo. No "completados" (no se ganó XP),
                  // no se borra (sigue siendo el reto de la semana).
                  if (fallido) {
                    return (
                      <motion.div
                        key={uc.id}
                        variants={challengeItemVariant}
                        transition={{ duration: 0.18 }}
                      >
                        <Card
                          className="p-4 rounded-2xl shadow-sm border"
                          style={{
                            borderColor: 'rgba(0,0,0,0.06)',
                            background:  'var(--luka-surface)',
                            opacity:     0.65,
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ background: 'rgba(0,0,0,0.04)', filter: 'grayscale(1)' }}
                            >
                              <Icon className="w-5 h-5" style={{ color: 'var(--luka-text-secondary)' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold truncate" style={{ color: 'var(--luka-text-primary)' }}>
                                {c.titulo}
                              </h4>
                              <p className="text-xs mt-0.5" style={{ color: 'var(--luka-text-secondary)' }}>
                                Esta vez no se pudo — vuelve a intentarlo la próxima semana 💪
                              </p>
                            </div>
                            <span
                              className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full font-medium"
                              style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--luka-text-secondary)' }}
                            >
                              Fallido
                            </span>
                          </div>
                        </Card>
                      </motion.div>
                    )
                  }

                  return (
                    <motion.div
                      key={uc.id}
                      variants={challengeItemVariant}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.18 }}
                    >
                      <Card className="p-5 rounded-2xl shadow-md">
                        <div className="flex items-start gap-4 mb-3">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: `${color}18` }}
                          >
                            <Icon className="w-6 h-6" style={{ color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold" style={{ color: 'var(--luka-text-primary)' }}>
                              {c.titulo}
                            </h4>
                            <p className="text-sm" style={{ color: 'var(--luka-text-secondary)' }}>
                              {c.descripcion}
                            </p>
                            <Badge className="mt-2 rounded-full text-xs" style={{ background: color }}>
                              +{c.puntos} XP
                            </Badge>
                          </div>
                        </div>

                        {/* Progreso parcial */}
                        <div className="space-y-1.5 mb-3">
                          <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: 0.2 }}
                              style={{ background: color }}
                            />
                          </div>
                          <div className="flex justify-between text-xs" style={{ color: 'var(--luka-text-secondary)' }}>
                            <span>{formatearProgreso(c, progreso)}</span>
                            {cumplido && <span style={{ color }}>✓ Cumplido</span>}
                          </div>
                        </div>

                        {/* Acción: Reclamar / Esperar */}
                        {puedeReclamar ? (
                          <motion.button
                            onClick={() => handleClaim(uc)}
                            disabled={claiming === uc.id}
                            whileHover={{ scale: 1.02, opacity: 0.9 }}
                            whileTap={{ scale: 0.97 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                            className="w-full py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                            style={{ background: color }}
                          >
                            <Check className="w-4 h-4 inline mr-1" />
                            {claiming === uc.id ? 'Reclamando...' : `Reclamar +${c.puntos} XP`}
                          </motion.button>
                        ) : cumplido && soloDomingo ? (
                          <button
                            type="button"
                            disabled
                            className="w-full py-2.5 rounded-xl text-sm font-medium border opacity-70 cursor-not-allowed"
                            style={{ color, borderColor: `${color}55` }}
                          >
                            <Clock className="w-4 h-4 inline mr-1" />
                            Reclamable el domingo
                          </button>
                        ) : (
                          <p className="text-xs text-center py-2" style={{ color: 'var(--luka-text-secondary)' }}>
                            Sigue avanzando esta semana ✨
                          </p>
                        )}
                      </Card>
                    </motion.div>
                  )
                })
              )}
            </motion.div>
          </TabsContent>

          {/* ─── COMPLETADOS ──────────────────────────────────────────── */}
          <TabsContent value="completados" className="mt-4">
            <motion.div
              className="space-y-3"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
            >
              {completados.length === 0 ? (
                <motion.div variants={fadeUp}>
                  <EmptyState
                    emoji="🏆"
                    title="Sin completados aún"
                    description="Cuando reclames XP de tus retos, aparecerán aquí con la semana en que los ganaste."
                  />
                </motion.div>
              ) : (
                completados.map((uc) => {
                  const c = uc.challenge
                  if (!c) return null
                  const color = DIFICULTAD_COLORS[c.dificultad] ?? '#4F46E5'
                  return (
                    <motion.div
                      key={uc.id}
                      variants={completadoItemVariant}
                      whileHover={{ scale: 1.01 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Card
                        className="p-4 rounded-2xl shadow-sm border-2"
                        style={{ borderColor: `${color}40`, background: `${color}06` }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: color }}
                          >
                            <Star className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold truncate" style={{ color: 'var(--luka-text-primary)' }}>
                              {c.titulo}
                            </h4>
                            <p className="text-xs" style={{ color: 'var(--luka-text-secondary)' }}>
                              {formatearSemana(uc.semana)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold" style={{ color }}>+{c.puntos}</p>
                            <p className="text-xs" style={{ color: 'var(--luka-text-secondary)' }}>XP</p>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )
                })
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Pequeña pista del nivel debajo de los tabs */}
      <motion.div variants={fadeUp} className="text-center pt-1">
        <p className="text-xs" style={{ color: 'var(--luka-text-secondary)' }}>
          <Award className="w-3 h-3 inline mr-1" />
          {puntos} XP acumulados — sigue aceptando retos cada semana
        </p>
      </motion.div>
    </motion.div>
  )
}
