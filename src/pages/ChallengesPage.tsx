import { useState } from 'react'
import { Trophy, Award, Zap, Star, Crown, Target, Flame, Check } from 'lucide-react'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { useChallenges } from '@/hooks/useChallenges'
import { useProfile } from '@/hooks/useProfile'

const iconMap: Record<string, React.ElementType> = {
  zap: Zap, star: Star, crown: Crown, target: Target, flame: Flame, trophy: Trophy, award: Award,
}

function getIcon(tipo: string): React.ElementType {
  return iconMap[tipo] ?? Zap
}

const TIPO_COLORS: Record<string, string> = {
  ahorro: '#10B981',
  registro: '#4F46E5',
  sin_gasto: '#F59E0B',
  personalizado: '#8B5CF6',
}

export function ChallengesPage() {
  const { disponibles, enCurso, completados, loading, acceptChallenge, completeChallenge } = useChallenges()
  const { profile } = useProfile()
  const [accepting, setAccepting] = useState<string | null>(null)

  const puntos = profile?.puntos_totales ?? 0
  const nivel = profile?.nivel ?? 1
  const nextLevelPuntos = nivel * 500
  const levelPct = Math.min((puntos / nextLevelPuntos) * 100, 100)

  const handleAccept = async (challengeId: string, titulo: string) => {
    setAccepting(challengeId)
    try {
      await acceptChallenge(challengeId)
      toast.success(`¡Reto "${titulo}" aceptado!`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al aceptar el reto')
    } finally {
      setAccepting(null)
    }
  }

  const handleComplete = async (userChallengeId: string, puntoReto: number) => {
    try {
      await completeChallenge(userChallengeId, puntoReto)
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } })
      toast.success(`¡Reto completado! +${puntoReto} puntos`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al completar el reto')
    }
  }

  return (
    <div className="space-y-5 p-4 pt-6 pb-24">
      <div>
        <h1 className="text-2xl lg:text-3xl font-semibold" style={{ color: 'var(--luka-text-primary)' }}>Retos</h1>
        <p className="text-sm" style={{ color: 'var(--luka-text-secondary)' }}>Completa desafíos y gana recompensas</p>
      </div>

      {/* Nivel card */}
      <Card
        className="p-6 rounded-2xl shadow-lg border-0 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)' }}
      >
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/80 text-sm mb-1">Tu nivel</p>
              <h2 className="text-4xl text-white font-bold">Nivel {nivel}</h2>
            </div>
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Trophy className="w-7 h-7 text-white" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-white/80 text-sm">
              <span>{puntos} pts</span>
              <span>{nextLevelPuntos} pts</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${levelPct}%` }} />
            </div>
            <p className="text-white/70 text-xs">{nextLevelPuntos - puntos} puntos para el nivel {nivel + 1}</p>
          </div>
        </div>
        <div className="absolute top-0 right-0 text-8xl opacity-10 select-none">🏆</div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="disponibles">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="disponibles">Disponibles {disponibles.length > 0 && `(${disponibles.length})`}</TabsTrigger>
          <TabsTrigger value="en-curso">En curso {enCurso.length > 0 && `(${enCurso.length})`}</TabsTrigger>
          <TabsTrigger value="completados">Completados</TabsTrigger>
        </TabsList>

        {/* ─── DISPONIBLES ─── */}
        <TabsContent value="disponibles" className="mt-4 space-y-3">
          {loading ? (
            [1, 2].map((i) => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)
          ) : disponibles.length === 0 ? (
            <EmptyState emoji="🎉" title="¡Todos los retos aceptados!" description="No hay más retos disponibles por ahora." />
          ) : disponibles.map((challenge) => {
            const color = TIPO_COLORS[challenge.tipo] ?? '#4F46E5'
            const ChallengeIcon = getIcon(challenge.tipo)
            return (
              <Card key={challenge.id} className="p-5 rounded-2xl shadow-md">
                <div className="flex items-start gap-4 mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}18` }}>
                    <ChallengeIcon className="w-6 h-6" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold mb-1 truncate" style={{ color: 'var(--luka-text-primary)' }}>{challenge.titulo}</h4>
                    <p className="text-sm mb-2" style={{ color: 'var(--luka-text-secondary)' }}>{challenge.descripcion}</p>
                    <div className="flex items-center gap-3">
                      <Badge className="rounded-full text-xs" style={{ background: color }}>
                        +{challenge.puntos} puntos
                      </Badge>
                      <span className="text-xs" style={{ color: 'var(--luka-text-secondary)' }}>
                        {challenge.duracion_dias} días
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleAccept(challenge.id, challenge.titulo)}
                  disabled={accepting === challenge.id}
                  className="w-full py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: color }}
                >
                  {accepting === challenge.id ? 'Aceptando...' : 'Aceptar reto'}
                </button>
              </Card>
            )
          })}
        </TabsContent>

        {/* ─── EN CURSO ─── */}
        <TabsContent value="en-curso" className="mt-4 space-y-3">
          {loading ? (
            [1, 2].map((i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)
          ) : enCurso.length === 0 ? (
            <EmptyState emoji="🚀" title="Sin retos activos" description="Acepta un reto para empezar a ganar puntos." />
          ) : enCurso.map((uc) => {
            const challenge = uc.challenge
            if (!challenge) return null
            const color = TIPO_COLORS[challenge.tipo] ?? '#4F46E5'
            const pct = challenge.meta_valor ? Math.min((uc.progreso / challenge.meta_valor) * 100, 100) : 0
            return (
              <Card key={uc.id} className="p-5 rounded-2xl shadow-md">
                <div className="flex items-start gap-4 mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}18` }}>
                    <Target className="w-6 h-6" style={{ color }} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1" style={{ color: 'var(--luka-text-primary)' }}>{challenge.titulo}</h4>
                    <p className="text-sm" style={{ color: 'var(--luka-text-secondary)' }}>{challenge.descripcion}</p>
                    <Badge className="mt-2 rounded-full text-xs" style={{ background: color }}>
                      +{challenge.puntos} puntos
                    </Badge>
                  </div>
                </div>
                {challenge.meta_valor && (
                  <div className="space-y-1 mb-3">
                    <Progress value={pct} className="h-2" />
                    <div className="flex justify-between text-xs" style={{ color: 'var(--luka-text-secondary)' }}>
                      <span>{uc.progreso} / {challenge.meta_valor}</span>
                      <span style={{ color }}>{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => handleComplete(uc.id, challenge.puntos)}
                  className="w-full py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90"
                  style={{ background: color }}
                >
                  <Check className="w-4 h-4 inline mr-1" /> Marcar completado
                </button>
              </Card>
            )
          })}
        </TabsContent>

        {/* ─── COMPLETADOS ─── */}
        <TabsContent value="completados" className="mt-4 space-y-3">
          {completados.length === 0 ? (
            <EmptyState emoji="🏆" title="Sin completados aún" description="Completa retos para verlos aquí." />
          ) : completados.map((uc) => {
            const challenge = uc.challenge
            if (!challenge) return null
            const color = TIPO_COLORS[challenge.tipo] ?? '#4F46E5'
            return (
              <Card key={uc.id} className="p-4 rounded-2xl shadow-sm border-2"
                style={{ borderColor: `${color}40`, background: `${color}06` }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color }}>
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold" style={{ color: 'var(--luka-text-primary)' }}>{challenge.titulo}</h4>
                    <p className="text-xs" style={{ color: 'var(--luka-text-secondary)' }}>{challenge.descripcion}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color }}>+{challenge.puntos}</p>
                    <p className="text-xs" style={{ color: 'var(--luka-text-secondary)' }}>puntos</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </TabsContent>
      </Tabs>
    </div>
  )
}
