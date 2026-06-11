import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'motion/react'
import { Eye, EyeOff, Mail, Lock, User, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthContext } from '@/context/AuthContext'
import { loginSchema, registerSchema } from '@/lib/validations/auth'
import type { LoginFormData, RegisterFormData } from '@/lib/validations/auth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import logoEslogan from '@/assets/logo-eslogan.png'

const MAX_INTENTOS = 5
const BLOQUEO_SEGUNDOS = 60

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ caracteres', ok: password.length >= 8 },
    { label: 'Mayúscula', ok: /[A-Z]/.test(password) },
    { label: 'Número', ok: /[0-9]/.test(password) },
  ]
  const score = checks.filter((c) => c.ok).length
  const colors = ['bg-red-400', 'bg-yellow-400', 'bg-green-400']
  if (!password) return null
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < score ? colors[score - 1] : 'bg-gray-200'}`} />
        ))}
      </div>
      <div className="flex gap-3">
        {checks.map((c) => (
          <span key={c.label} className={`text-xs ${c.ok ? 'text-green-600' : 'text-gray-400'}`}>
            {c.ok ? '✓' : '○'} {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function AuthPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { signIn, signUp, user, loading } = useAuthContext()
  const [tab, setTab] = useState<'login' | 'register'>(params.get('tab') === 'register' ? 'register' : 'login')
  const [showPass, setShowPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [intentosFallidos, setIntentosFallidos] = useState(0)
  const [bloqueadoHasta, setBloqueadoHasta] = useState<number | null>(null)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!loading && user) navigate('/app', { replace: true })
  }, [user, loading, navigate])

  useEffect(() => {
    if (bloqueadoHasta) {
      timerRef.current = setInterval(() => {
        const remaining = Math.ceil((bloqueadoHasta - Date.now()) / 1000)
        if (remaining <= 0) {
          setCountdown(0)
          setBloqueadoHasta(null)
          setIntentosFallidos(0)
          if (timerRef.current) clearInterval(timerRef.current)
        } else {
          setCountdown(remaining)
        }
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [bloqueadoHasta])

  const loginForm = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })
  const registerForm = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) })
  const watchPassword = registerForm.watch('password', '')

  const bloqueado = bloqueadoHasta !== null && Date.now() < bloqueadoHasta

  const handleLogin = loginForm.handleSubmit(async (data) => {
    if (bloqueado) return
    try {
      await signIn(data.email, data.password)
      toast.success('¡Bienvenido de vuelta!')
      navigate('/app')
    } catch (e) {
      const newIntentos = intentosFallidos + 1
      setIntentosFallidos(newIntentos)
      if (newIntentos >= MAX_INTENTOS) {
        setBloqueadoHasta(Date.now() + BLOQUEO_SEGUNDOS * 1000)
        toast.error(`Demasiados intentos. Espera ${BLOQUEO_SEGUNDOS} segundos.`)
      } else {
        toast.error(e instanceof Error ? e.message : 'Error al iniciar sesión')
      }
    }
  })

  const handleRegister = registerForm.handleSubmit(async (data) => {
    try {
      await signUp(data.email, data.password, data.nombre)
      toast.success('¡Cuenta creada! Revisa tu email para confirmarla.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al crear la cuenta')
    }
  })

  if (loading) return null

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F9FAFB] dark:bg-gray-950">

      {/* LEFT panel – desktop only */}
      <div
        className="hidden lg:flex flex-1 items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        <div className="absolute top-20 right-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 text-center text-white space-y-6 max-w-sm">
          <img src={logoEslogan} alt="Mi Luka" className="w-56 mx-auto object-contain" />
          <p className="text-white/80 text-sm leading-relaxed">
            Controla tus gastos, alcanza tus metas y vive tu vida al máximo. Tu futuro financiero empieza aquí.
          </p>
        </div>
      </div>

      {/* RIGHT panel – form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-6"
        >
          {/* Logo mobile */}
          <div className="lg:hidden text-center">
            <img src={logoEslogan} alt="Mi Luka" className="h-16 mx-auto object-contain" />
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl p-6 space-y-5">
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'login' | 'register')}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
                <TabsTrigger value="register">Crear cuenta</TabsTrigger>
              </TabsList>

              {/* ─── LOGIN ─── */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="login-email">Correo electrónico</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input id="login-email" type="email" placeholder="tu@email.com" className="pl-10 rounded-xl"
                        {...loginForm.register('email')} />
                    </div>
                    {loginForm.formState.errors.email && (
                      <p className="text-xs text-red-500">{loginForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="login-password">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input id="login-password" type={showPass ? 'text' : 'password'} placeholder="••••••••"
                        className="pl-10 pr-10 rounded-xl" {...loginForm.register('password')} />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                        {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-xs text-red-500">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  {bloqueado && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>Cuenta bloqueada. Intenta en {countdown}s</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loginForm.formState.isSubmitting || bloqueado}
                    className="w-full py-3 rounded-xl text-white font-medium transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}
                  >
                    {loginForm.formState.isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
                  </button>
                </form>
              </TabsContent>

              {/* ─── REGISTER ─── */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="reg-nombre">Nombre completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input id="reg-nombre" type="text" placeholder="Tu nombre" className="pl-10 rounded-xl"
                        {...registerForm.register('nombre')} />
                    </div>
                    {registerForm.formState.errors.nombre && (
                      <p className="text-xs text-red-500">{registerForm.formState.errors.nombre.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="reg-email">Correo electrónico</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input id="reg-email" type="email" placeholder="tu@email.com" className="pl-10 rounded-xl"
                        {...registerForm.register('email')} />
                    </div>
                    {registerForm.formState.errors.email && (
                      <p className="text-xs text-red-500">{registerForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="reg-password">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input id="reg-password" type={showPass ? 'text' : 'password'} placeholder="••••••••"
                        className="pl-10 pr-10 rounded-xl" {...registerForm.register('password')} />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                        {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <PasswordStrength password={watchPassword} />
                    {registerForm.formState.errors.password && (
                      <p className="text-xs text-red-500">{registerForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="reg-confirm">Confirmar contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input id="reg-confirm" type={showConfirmPass ? 'text' : 'password'} placeholder="••••••••"
                        className="pl-10 pr-10 rounded-xl" {...registerForm.register('confirmPassword')} />
                      <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                        {showConfirmPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {registerForm.formState.errors.confirmPassword && (
                      <p className="text-xs text-red-500">{registerForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <div className="flex items-start gap-2">
                    <input type="checkbox" id="terms" className="mt-1 rounded"
                      {...registerForm.register('terms')} />
                    <label htmlFor="terms" className="text-xs text-gray-500">
                      Acepto los <span className="text-[#4F46E5] cursor-pointer">términos y condiciones</span> y la{' '}
                      <span className="text-[#4F46E5] cursor-pointer">política de privacidad</span>
                    </label>
                  </div>
                  {registerForm.formState.errors.terms && (
                    <p className="text-xs text-red-500">{registerForm.formState.errors.terms.message}</p>
                  )}

                  <button
                    type="submit"
                    disabled={registerForm.formState.isSubmitting}
                    className="w-full py-3 rounded-xl text-white font-medium transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                  >
                    {registerForm.formState.isSubmitting ? 'Creando cuenta...' : 'Crear mi cuenta'}
                  </button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
