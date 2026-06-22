import { useState, useRef } from 'react'
import { useNavigate } from 'react-router'
import { supportsHover, isMobile, fadeUp, scaleIn } from '@/lib/motion-utils'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  User, LogOut, Edit, Award, Wallet, Target, Trophy,
  ChevronRight, ChevronDown, Flame, Settings, Download, Camera,
} from 'lucide-react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthContext } from '@/context/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useTheme } from '@/context/ThemeContext'
import { useExpenses } from '@/hooks/useExpenses'
import { useGoals } from '@/hooks/useGoals'
import { useChallenges } from '@/hooks/useChallenges'
import { useRacha } from '@/hooks/useRacha'
import { useAchievements } from '@/hooks/useAchievements'
import { RecompensaItem } from '@/components/shared/RecompensaItem'
import { progresoNivel } from '@/lib/leveling'

const editProfileSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(50, 'Máximo 50 caracteres'),
})
type EditProfileData = z.infer<typeof editProfileSchema>

const pageVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
}

// fadeUp + scaleIn from motion-utils: desktop = full animation, mobile = fade-only

const statCardVariant = isMobile
  ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.28 } } }
  : { hidden: { opacity: 0, scale: 0.82, y: 10 }, show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 20 } } }

const settingsItemVariant = isMobile
  ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.26 } } }
  : { hidden: { opacity: 0, x: 12 }, show: { opacity: 1, x: 0, transition: { duration: 0.26 } } }

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, signOut }                          = useAuthContext()
  const { profile, loading, update, uploadProfileAvatar } = useProfile()
  const { theme, setTheme }                        = useTheme()
  const { expenses }                               = useExpenses()
  const { goalsCompletadas }                       = useGoals()
  const { completados }                            = useChallenges()
  const { rachaEfectiva, rachaMasLarga }           = useRacha()
  const { items: recompensas, desbloqueadasCount } = useAchievements()
  const [editOpen, setEditOpen]                    = useState(false)
  const [recompensasOpen, setRecompensasOpen]      = useState(false)
  const fileRef                                    = useRef<HTMLInputElement>(null)

  const form = useForm<EditProfileData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: { nombre: profile?.nombre ?? '' },
  })

  const handleEdit = form.handleSubmit(async (data) => {
    try {
      await update({ nombre: data.nombre })
      toast.success('Perfil actualizado')
      setEditOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al actualizar')
    }
  })

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('La imagen no puede superar 2MB'); return }
    try {
      await uploadProfileAvatar(file)
      toast.success('Foto actualizada')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al subir imagen')
    }
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  const handleExport = () => {
    if (expenses.length === 0) { toast.error('No hay gastos para exportar'); return }
    const headers = 'Fecha,Categoría,Descripción,Monto,Notas'
    const rows    = expenses.map((e) =>
      `${e.fecha},${e.categoria},"${e.descripcion}",${e.monto},"${e.notas ?? ''}"`
    )
    const csv  = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `mi-luka-gastos-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Datos exportados')
  }

  const nombre   = profile?.nombre ?? user?.user_metadata?.nombre ?? 'Usuario'
  const initials = nombre.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const puntos   = profile?.puntos_totales ?? 0
  // Calcula nivel y progreso desde puntos_totales con la curva única en
  // src/lib/leveling.ts (espejo del SQL nivel_desde_xp). Antes la página
  // mostraba nivel*500 hardcoded, que no coincidía con el RPC.
  const prog     = progresoNivel(puntos)
  const nivel    = prog.nivel
  const pctNivel = prog.pct * 100

  // Stat "Racha activa" reemplaza la antigua "Puntos" (la XP/nivel ya se
  // visualiza en la barra del card de arriba). Si la racha activa es 0 y
  // el récord no, mostramos el récord como referencia.
  const rachaValor = rachaEfectiva > 0
    ? `${rachaEfectiva}d`
    : rachaMasLarga > 0
      ? `${rachaMasLarga}d`
      : '0d'
  const rachaLabel = rachaEfectiva > 0
    ? 'Racha activa'
    : rachaMasLarga > 0
      ? 'Mejor racha'
      : 'Racha'

  const stats = [
    { label: 'Gastos',    value: expenses.length.toString(),         icon: Wallet,     color: '#4F46E5' },
    { label: 'Metas',     value: goalsCompletadas.length.toString(), icon: Target,     color: '#10B981' },
    { label: 'Retos',     value: completados.length.toString(),      icon: Trophy,     color: '#F59E0B' },
    { label: rachaLabel,  value: rachaValor,                         icon: Flame,      color: '#EF4444' },
  ]

  const settingsItems = [
    {
      label: 'Editar perfil',
      icon:  User,
      onClick: () => { form.setValue('nombre', profile?.nombre ?? ''); setEditOpen(true) },
    },
    {
      label: 'Exportar gastos CSV',
      icon:  Download,
      onClick: handleExport,
    },
    {
      label: 'Beneficios activos',
      icon:  Settings,
      onClick: () => navigate('/app/benefits'),
    },
  ]

  return (
    <motion.div
      className="space-y-5 p-4 pt-6 pb-24"
      variants={pageVariants}
      initial="hidden"
      animate="show"
    >
      {/* Profile card */}
      {loading ? (
        <motion.div variants={fadeUp}>
          <Skeleton className="h-32 w-full rounded-2xl" />
        </motion.div>
      ) : (
        <motion.div variants={scaleIn}>
          <Card className="p-6 rounded-2xl shadow-md">
            <div className="flex items-start gap-4 mb-4">
              {/* Avatar */}
              <div className="relative">
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.1 }}
                >
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback
                      className="text-xl text-white font-bold"
                      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>
                <motion.button
                  onClick={() => fileRef.current?.click()}
                  aria-label="Cambiar foto de perfil"
                  whileHover={{ scale: 1.18 }}
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 15 }}
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#4F46E5] flex items-center justify-center shadow-md"
                >
                  <Camera className="w-4 h-4 text-white" />
                </motion.button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold truncate" style={{ color: 'var(--luka-text-primary)' }}>{nombre}</h2>
                <p className="text-sm" style={{ color: 'var(--luka-text-secondary)' }}>{user?.email}</p>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25, type: 'spring', stiffness: 280, damping: 16 }}
                >
                  <Badge className="mt-2 rounded-full" style={{ background: 'var(--luka-purple)' }}>
                    <Award className="w-3 h-3 mr-1" />
                    Nivel {nivel}
                  </Badge>
                </motion.div>
              </div>

              <motion.button
                onClick={() => { form.setValue('nombre', profile?.nombre ?? ''); setEditOpen(true) }}
                whileHover={{ scale: 1.1, rotate: 8 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 420, damping: 15 }}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Edit className="w-5 h-5" style={{ color: 'var(--luka-text-secondary)' }} />
              </motion.button>
            </div>

            {/* Level progress */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs" style={{ color: 'var(--luka-text-secondary)' }}>
                <span>{prog.xpEnNivel} / {prog.xpParaSiguiente} XP</span>
                <span>{prog.xpRestante} para nivel {nivel + 1}</span>
              </div>
              <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${pctNivel}%` }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: 0.3 }}
                  style={{ background: 'linear-gradient(90deg, #4F46E5, #8B5CF6)' }}
                />
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Stats grid */}
      <motion.div
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {stats.map(({ label, value, icon: Icon, color }) => (
          <motion.div
            key={label}
            variants={statCardVariant}
            whileHover={{ y: -3, boxShadow: `0 8px 24px ${color}22` }}
            transition={{ duration: 0.18 }}
          >
            <Card className="p-4 rounded-2xl shadow-sm">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ background: `${color}18` }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <p className="text-xl font-bold" style={{ color: 'var(--luka-text-primary)' }}>{value}</p>
              <p className="text-xs" style={{ color: 'var(--luka-text-secondary)' }}>{label}</p>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Recompensas (colapsable) */}
      <motion.div variants={fadeUp}>
        <Card className="p-5 rounded-2xl shadow-md">
          <button
            type="button"
            onClick={() => setRecompensasOpen((o) => !o)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5" style={{ color: 'var(--luka-purple)' }} />
              <h3 className="font-semibold" style={{ color: 'var(--luka-text-primary)' }}>
                Recompensas {recompensas.length > 0 && (
                  <span className="text-sm font-normal" style={{ color: 'var(--luka-text-secondary)' }}>
                    ({desbloqueadasCount} de {recompensas.length})
                  </span>
                )}
              </h3>
            </div>
            <motion.div
              animate={{ rotate: recompensasOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5" style={{ color: 'var(--luka-text-secondary)' }} />
            </motion.div>
          </button>

          {recompensas.length === 0 ? (
            <p className="mt-3 text-xs text-center" style={{ color: 'var(--luka-text-secondary)' }}>
              Aún no hay recompensas configuradas
            </p>
          ) : (
            recompensasOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                className="mt-4 grid grid-cols-3 gap-3"
              >
                {recompensas.map((item) => (
                  <RecompensaItem key={item.achievement.id} item={item} />
                ))}
              </motion.div>
            )
          )}
        </Card>
      </motion.div>

      {/* Configuración */}
      <motion.div variants={fadeUp}>
        <Card className="p-5 rounded-2xl shadow-md">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--luka-text-primary)' }}>Configuración</h3>
          <motion.div
            className="space-y-1"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
            style={{ isolation: 'isolate' }}
          >
            {settingsItems.map(({ label, icon: Icon, onClick }) => (
              <motion.button
                key={label}
                onClick={onClick}
                style={{ WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden' }}
                variants={settingsItemVariant}
                whileHover={supportsHover ? { x: 4, backgroundColor: 'rgba(79,70,229,0.04)' } : undefined}
                whileTap={{ scale: 0.99 }}
                transition={{ duration: 0.15 }}
                className="w-full flex items-center justify-between p-3 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" style={{ color: 'var(--luka-text-secondary)' }} />
                  <span style={{ color: 'var(--luka-text-primary)' }}>{label}</span>
                </div>
                <ChevronRight className="w-4 h-4" style={{ color: 'var(--luka-text-secondary)' }} />
              </motion.button>
            ))}

            {/* Dark mode toggle */}
            <motion.div
              variants={{
                hidden: { opacity: 0, x: 12 },
                show:   { opacity: 1, x: 0, transition: { duration: 0.26 } },
              }}
              className="flex items-center justify-between p-3 rounded-xl"
              style={{ WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center" aria-hidden="true">🌙</div>
                <span style={{ color: 'var(--luka-text-primary)' }}>Modo oscuro</span>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(v) => setTheme(v ? 'dark' : 'light')}
              />
            </motion.div>
          </motion.div>
        </Card>
      </motion.div>

      {/* Logout */}
      <motion.div variants={fadeUp}>
        <motion.button
          onClick={handleLogout}
          whileHover={{ scale: 1.01, borderColor: '#EF4444' }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className="w-full py-3.5 rounded-2xl font-medium border-2 border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Cerrar sesión
        </motion.button>
      </motion.div>

      <motion.p
        variants={fadeUp}
        className="text-center text-xs"
        style={{ color: 'var(--luka-text-secondary)' }}
      >
        Mi Luka v1.0.0 · Hecho con 💜 para jóvenes
      </motion.p>

      {/* Dialog editar perfil */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input className="rounded-xl" {...form.register('nombre')} />
              {form.formState.errors.nombre && (
                <p className="text-xs text-red-500">{form.formState.errors.nombre.message}</p>
              )}
            </div>
            <motion.button
              type="submit"
              disabled={form.formState.isSubmitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 rounded-xl text-white font-medium disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}
            >
              {form.formState.isSubmitting ? 'Guardando...' : 'Guardar cambios'}
            </motion.button>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
