import { useState, useRef } from 'react'
import { useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  User, LogOut, Edit, Award, Wallet, Target, Trophy, TrendingUp,
  ChevronRight, Settings, Download, Camera,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
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

const editProfileSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(50, 'Máximo 50 caracteres'),
})
type EditProfileData = z.infer<typeof editProfileSchema>

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuthContext()
  const { profile, loading, update, uploadProfileAvatar } = useProfile()
  const { theme, setTheme } = useTheme()
  const { expenses } = useExpenses()
  const { goalsCompletadas } = useGoals()
  const { completados } = useChallenges()
  const [editOpen, setEditOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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
    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen no puede superar 2MB')
      return
    }
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
    const rows = expenses.map((e) =>
      `${e.fecha},${e.categoria},"${e.descripcion}",${e.monto},"${e.notas ?? ''}"`
    )
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mi-luka-gastos-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Datos exportados')
  }

  const nombre = profile?.nombre ?? user?.user_metadata?.nombre ?? 'Usuario'
  const initials = nombre.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const nivel = profile?.nivel ?? 1
  const puntos = profile?.puntos_totales ?? 0
  const nextLevel = nivel * 500
  const pctNivel = Math.min((puntos / nextLevel) * 100, 100)

  const stats = [
    { label: 'Gastos', value: expenses.length.toString(), icon: Wallet, color: '#4F46E5' },
    { label: 'Metas', value: goalsCompletadas.length.toString(), icon: Target, color: '#10B981' },
    { label: 'Retos', value: completados.length.toString(), icon: Trophy, color: '#F59E0B' },
    { label: 'Puntos', value: puntos.toString(), icon: TrendingUp, color: '#8B5CF6' },
  ]

  return (
    <div className="space-y-5 p-4 pt-6 pb-24">
      {/* Header */}
      {loading ? (
        <Skeleton className="h-32 w-full rounded-2xl" />
      ) : (
        <Card className="p-6 rounded-2xl shadow-md">
          <div className="flex items-start gap-4 mb-4">
            <div className="relative">
              <Avatar className="w-20 h-20">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback
                  className="text-xl text-white font-bold"
                  style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#4F46E5] flex items-center justify-center shadow-md hover:opacity-90 transition-all"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate" style={{ color: 'var(--luka-text-primary)' }}>{nombre}</h2>
              <p className="text-sm" style={{ color: 'var(--luka-text-secondary)' }}>{user?.email}</p>
              <Badge className="mt-2 rounded-full" style={{ background: 'var(--luka-purple)' }}>
                <Award className="w-3 h-3 mr-1" />
                Nivel {nivel}
              </Badge>
            </div>
            <button
              onClick={() => { form.setValue('nombre', profile?.nombre ?? ''); setEditOpen(true) }}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Edit className="w-5 h-5" style={{ color: 'var(--luka-text-secondary)' }} />
            </button>
          </div>

          {/* Nivel progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs" style={{ color: 'var(--luka-text-secondary)' }}>
              <span>{puntos} puntos</span>
              <span>{nextLevel} para nivel {nivel + 1}</span>
            </div>
            <Progress value={pctNivel} className="h-2" />
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-4 rounded-2xl shadow-sm">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ background: `${color}18` }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <p className="text-xl font-bold" style={{ color: 'var(--luka-text-primary)' }}>{value}</p>
            <p className="text-xs" style={{ color: 'var(--luka-text-secondary)' }}>{label}</p>
          </Card>
        ))}
      </div>

      {/* Configuración */}
      <Card className="p-5 rounded-2xl shadow-md">
        <h3 className="font-semibold mb-4" style={{ color: 'var(--luka-text-primary)' }}>Configuración</h3>
        <div className="space-y-1">

          <button onClick={() => { form.setValue('nombre', profile?.nombre ?? ''); setEditOpen(true) }}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5" style={{ color: 'var(--luka-text-secondary)' }} />
              <span style={{ color: 'var(--luka-text-primary)' }}>Editar perfil</span>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--luka-text-secondary)' }} />
          </button>

          <div className="flex items-center justify-between p-3 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 flex items-center justify-center">🌙</div>
              <span style={{ color: 'var(--luka-text-primary)' }}>Modo oscuro</span>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={(v) => setTheme(v ? 'dark' : 'light')}
            />
          </div>

          <button onClick={handleExport}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5" style={{ color: 'var(--luka-text-secondary)' }} />
              <span style={{ color: 'var(--luka-text-primary)' }}>Exportar gastos CSV</span>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--luka-text-secondary)' }} />
          </button>

          <button onClick={() => navigate('/app/benefits')}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5" style={{ color: 'var(--luka-text-secondary)' }} />
              <span style={{ color: 'var(--luka-text-primary)' }}>Beneficios activos</span>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--luka-text-secondary)' }} />
          </button>
        </div>
      </Card>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full py-3.5 rounded-2xl font-medium border-2 border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all flex items-center justify-center gap-2"
      >
        <LogOut className="w-5 h-5" />
        Cerrar sesión
      </button>

      <p className="text-center text-xs" style={{ color: 'var(--luka-text-secondary)' }}>
        Mi Luka v1.0.0 · Hecho con 💜 para jóvenes
      </p>

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
            <button type="submit" disabled={form.formState.isSubmitting}
              className="w-full py-3 rounded-xl text-white font-medium disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}>
              {form.formState.isSubmitting ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
