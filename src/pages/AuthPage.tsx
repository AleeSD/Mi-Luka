import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'motion/react'
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, FileText, Shield, KeyRound, ArrowLeft, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthContext } from '@/context/AuthContext'
import {
  loginSchema, registerSchema, forgotSchema, resetPasswordSchema,
} from '@/lib/validations/auth'
import type {
  LoginFormData, RegisterFormData, ForgotFormData, ResetPasswordFormData,
} from '@/lib/validations/auth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import logoEslogan from '@/assets/logo-eslogan.png'

const MAX_INTENTOS     = 5
const BLOQUEO_SEGUNDOS = 60

type View = 'auth' | 'forgot' | 'forgot-sent' | 'reset'

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ caracteres', ok: password.length >= 8 },
    { label: 'Mayúscula',     ok: /[A-Z]/.test(password) },
    { label: 'Número',        ok: /[0-9]/.test(password) },
  ]
  const score  = checks.filter((c) => c.ok).length
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

function TermsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-[#4F46E5]" />
            Términos y Condiciones
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl flex items-start gap-2">
            <Shield className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <p className="text-indigo-700 dark:text-indigo-300 text-xs">
              Al crear tu cuenta aceptas estos términos. Léelos con calma.
            </p>
          </div>

          <section className="space-y-2">
            <h4 className="font-semibold text-gray-800 dark:text-gray-100">1. Uso del servicio</h4>
            <p>Mi Luka es una aplicación de gestión de finanzas personales dirigida a jóvenes. Al registrarte, confirmas que tienes al menos 16 años y que usarás el servicio de forma responsable y legal.</p>
          </section>

          <section className="space-y-2">
            <h4 className="font-semibold text-gray-800 dark:text-gray-100">2. Tu cuenta</h4>
            <p>Eres responsable de mantener la seguridad de tu contraseña. No compartas tus credenciales. Notifícanos de inmediato si sospechas de acceso no autorizado a tu cuenta.</p>
          </section>

          <section className="space-y-2">
            <h4 className="font-semibold text-gray-800 dark:text-gray-100">3. Privacidad de datos</h4>
            <p>Almacenamos únicamente la información necesaria para brindarte el servicio: tu nombre, email, y los registros financieros que tú mismo ingreses. No vendemos ni compartimos tus datos personales con terceros.</p>
          </section>

          <section className="space-y-2">
            <h4 className="font-semibold text-gray-800 dark:text-gray-100">4. Datos financieros</h4>
            <p>Mi Luka no accede a tus cuentas bancarias. Todos los datos financieros son registrados manualmente por ti. La app es una herramienta de seguimiento, no un servicio bancario.</p>
          </section>

          <section className="space-y-2">
            <h4 className="font-semibold text-gray-800 dark:text-gray-100">5. Limitación de responsabilidad</h4>
            <p>Mi Luka es una herramienta de apoyo financiero. No constituye asesoramiento financiero profesional. Las decisiones económicas que tomes son de tu exclusiva responsabilidad.</p>
          </section>

          <section className="space-y-2">
            <h4 className="font-semibold text-gray-800 dark:text-gray-100">6. Propiedad intelectual</h4>
            <p>El contenido, diseño y funcionalidades de Mi Luka son propiedad exclusiva del equipo de Mi Luka. Queda prohibida su reproducción sin autorización expresa.</p>
          </section>

          <section className="space-y-2">
            <h4 className="font-semibold text-gray-800 dark:text-gray-100">7. Modificaciones</h4>
            <p>Podemos actualizar estos términos en cualquier momento. Te notificaremos por email sobre cambios importantes. El uso continuo del servicio implica la aceptación de los nuevos términos.</p>
          </section>

          <section className="space-y-2">
            <h4 className="font-semibold text-gray-800 dark:text-gray-100">8. Contacto</h4>
            <p>¿Dudas o consultas? Escríbenos a <span className="text-[#4F46E5] font-medium">soporte@miluka.app</span></p>
          </section>

          <p className="text-xs text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
            Última actualización: Junio 2025 · Mi Luka v1.0
          </p>
        </div>

        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="w-full py-3 rounded-xl text-white font-medium mt-2"
          style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}
        >
          Entendido
        </motion.button>
      </DialogContent>
    </Dialog>
  )
}

export function AuthPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { signIn, signUp, resetPassword, updatePassword, user, loading } = useAuthContext()

  const [tab, setTab]       = useState<'login' | 'register'>(params.get('tab') === 'register' ? 'register' : 'login')
  const [view, setView]     = useState<View>(() => params.get('reset') === 'true' ? 'reset' : 'auth')
  const [showPass, setShowPass]               = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [showResetPass, setShowResetPass]     = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [intentosFallidos, setIntentosFallidos] = useState(0)
  const [bloqueadoHasta, setBloqueadoHasta]     = useState<number | null>(null)
  const [countdown, setCountdown]               = useState(0)
  const [termsOpen, setTermsOpen]               = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!loading && user && view !== 'reset') navigate('/app', { replace: true })
  }, [user, loading, navigate, view])

  // Detect recovery token in URL hash (Supabase puts it there after email link click)
  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('type=recovery') || params.get('reset') === 'true') {
      setView('reset')
    }
  }, [params])

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

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { nombre: '', email: '', password: '', confirmPassword: '', terms: false },
  })

  const forgotForm = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  })

  const resetForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const watchPassword        = registerForm.watch('password', '')
  const watchResetPassword   = resetForm.watch('password', '')
  const bloqueado            = bloqueadoHasta !== null && Date.now() < bloqueadoHasta

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
      toast.success('¡Bienvenido a Mi Luka!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al crear la cuenta')
    }
  })

  const handleForgot = forgotForm.handleSubmit(async (data) => {
    try {
      await resetPassword(data.email)
      setView('forgot-sent')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al enviar el correo')
    }
  })

  const handleReset = resetForm.handleSubmit(async (data) => {
    try {
      await updatePassword(data.password)
      toast.success('¡Contraseña actualizada! Ya puedes iniciar sesión.')
      navigate('/auth', { replace: true })
      setView('auth')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al actualizar la contraseña')
    }
  })

  if (loading) return null

  const slideVariants = {
    enter:  { opacity: 0, x: 20 },
    center: { opacity: 1, x: 0  },
    exit:   { opacity: 0, x: -20 },
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F9FAFB] dark:bg-gray-950">

      {/* LEFT panel – desktop only */}
      <div
        className="hidden lg:flex flex-1 items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        <div className="absolute top-20 right-20 w-64 h-64 rounded-full bg-white/10 blur-3xl luka-float" />
        <div className="absolute bottom-10 left-10 w-40 h-40 rounded-full bg-purple-300/15 blur-2xl luka-float-slow" />
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          className="relative z-10 text-center text-white space-y-6 max-w-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.5, type: 'spring', stiffness: 180, damping: 18 }}
            className="flex justify-center"
          >
            <img src={logoEslogan} alt="Mi Luka" className="w-48 object-contain rounded-2xl" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="text-white/80 text-sm leading-relaxed"
          >
            Controla tus gastos, alcanza tus metas y vive tu vida al máximo. Tu futuro financiero empieza aquí.
          </motion.p>
        </motion.div>
      </div>

      {/* RIGHT panel – form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          className="w-full max-w-sm space-y-6"
        >
          {/* Logo mobile */}
          <div className="lg:hidden flex justify-center">
            <img src={logoEslogan} alt="Mi Luka" className="h-14 object-contain rounded-xl" />
          </div>

          <AnimatePresence mode="wait">

            {/* ─── MAIN AUTH (login / register) ─── */}
            {view === 'auth' && (
              <motion.div
                key="auth"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl p-6 space-y-5"
              >
                <Tabs value={tab} onValueChange={(v) => setTab(v as 'login' | 'register')}>
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
                    <TabsTrigger value="register">Crear cuenta</TabsTrigger>
                  </TabsList>

                  {/* ─── LOGIN ─── */}
                  <TabsContent value="login">
                    <form onSubmit={handleLogin} noValidate className="space-y-4">

                      <div className="space-y-1">
                        <Label htmlFor="login-email">Correo electrónico</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="tu@email.com"
                            autoComplete="email"
                            className="pl-10 rounded-xl"
                            {...loginForm.register('email')}
                          />
                        </div>
                        {loginForm.formState.errors.email && (
                          <p className="text-xs text-red-500">{loginForm.formState.errors.email.message}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="login-password">Contraseña</Label>
                          <button
                            type="button"
                            onClick={() => setView('forgot')}
                            className="text-xs text-[#4F46E5] hover:underline font-medium"
                          >
                            ¿Olvidaste tu contraseña?
                          </button>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                          <Input
                            id="login-password"
                            type={showPass ? 'text' : 'password'}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            className="pl-10 pr-10 rounded-xl"
                            {...loginForm.register('password')}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPass(!showPass)}
                            aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                          >
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

                      <motion.button
                        type="submit"
                        disabled={loginForm.formState.isSubmitting || bloqueado}
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        className="w-full py-3 rounded-xl text-white font-medium disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}
                      >
                        {loginForm.formState.isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
                      </motion.button>
                    </form>
                  </TabsContent>

                  {/* ─── REGISTER ─── */}
                  <TabsContent value="register">
                    <form onSubmit={handleRegister} noValidate className="space-y-4">

                      <div className="space-y-1">
                        <Label htmlFor="reg-nombre">Nombre completo</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                          <Input
                            id="reg-nombre"
                            type="text"
                            placeholder="Tu nombre"
                            autoComplete="name"
                            className="pl-10 rounded-xl"
                            {...registerForm.register('nombre')}
                          />
                        </div>
                        {registerForm.formState.errors.nombre && (
                          <p className="text-xs text-red-500">{registerForm.formState.errors.nombre.message}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="reg-email">Correo electrónico</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                          <Input
                            id="reg-email"
                            type="email"
                            placeholder="tu@email.com"
                            autoComplete="email"
                            className="pl-10 rounded-xl"
                            {...registerForm.register('email')}
                          />
                        </div>
                        {registerForm.formState.errors.email && (
                          <p className="text-xs text-red-500">{registerForm.formState.errors.email.message}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="reg-password">Contraseña</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                          <Input
                            id="reg-password"
                            type={showPass ? 'text' : 'password'}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            className="pl-10 pr-10 rounded-xl"
                            {...registerForm.register('password')}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPass(!showPass)}
                            aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                          >
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
                          <Input
                            id="reg-confirm"
                            type={showConfirmPass ? 'text' : 'password'}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            className="pl-10 pr-10 rounded-xl"
                            {...registerForm.register('confirmPassword')}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPass(!showConfirmPass)}
                            aria-label={showConfirmPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                          >
                            {showConfirmPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                        {registerForm.formState.errors.confirmPassword && (
                          <p className="text-xs text-red-500">{registerForm.formState.errors.confirmPassword.message}</p>
                        )}
                      </div>

                      {/* Terms */}
                      <div className="space-y-1">
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            id="terms"
                            className="mt-0.5 w-4 h-4 rounded accent-[#4F46E5] cursor-pointer flex-shrink-0"
                            {...registerForm.register('terms')}
                          />
                          <label htmlFor="terms" className="text-xs text-gray-500 leading-relaxed cursor-pointer">
                            Acepto los{' '}
                            <button
                              type="button"
                              onClick={() => setTermsOpen(true)}
                              className="text-[#4F46E5] font-medium hover:underline"
                            >
                              términos y condiciones
                            </button>
                            {' '}y la{' '}
                            <button
                              type="button"
                              onClick={() => setTermsOpen(true)}
                              className="text-[#4F46E5] font-medium hover:underline"
                            >
                              política de privacidad
                            </button>
                          </label>
                        </div>
                        {registerForm.formState.errors.terms && (
                          <p className="text-xs text-red-500">{registerForm.formState.errors.terms.message}</p>
                        )}
                      </div>

                      <motion.button
                        type="submit"
                        disabled={registerForm.formState.isSubmitting}
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        className="w-full py-3 rounded-xl text-white font-medium disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                      >
                        {registerForm.formState.isSubmitting ? 'Creando cuenta...' : 'Crear mi cuenta'}
                      </motion.button>
                    </form>
                  </TabsContent>
                </Tabs>
              </motion.div>
            )}

            {/* ─── FORGOT PASSWORD ─── */}
            {view === 'forgot' && (
              <motion.div
                key="forgot"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl p-6 space-y-5"
              >
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(79,70,229,0.1)' }}>
                    <KeyRound className="w-5 h-5 text-[#4F46E5]" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-base" style={{ color: 'var(--luka-text-primary)' }}>
                      Recuperar contraseña
                    </h2>
                    <p className="text-xs" style={{ color: 'var(--luka-text-secondary)' }}>
                      Te enviaremos un enlace a tu correo
                    </p>
                  </div>
                </div>

                <form onSubmit={handleForgot} noValidate className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="forgot-email">Correo electrónico</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="tu@email.com"
                        autoComplete="email"
                        className="pl-10 rounded-xl"
                        {...forgotForm.register('email')}
                      />
                    </div>
                    {forgotForm.formState.errors.email && (
                      <p className="text-xs text-red-500">{forgotForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <motion.button
                    type="submit"
                    disabled={forgotForm.formState.isSubmitting}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    className="w-full py-3 rounded-xl text-white font-medium disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}
                  >
                    {forgotForm.formState.isSubmitting ? 'Enviando...' : 'Enviar enlace'}
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => setView('auth')}
                    className="w-full flex items-center justify-center gap-1.5 text-sm py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    style={{ color: 'var(--luka-text-secondary)' }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Volver al inicio de sesión
                  </button>
                </form>
              </motion.div>
            )}

            {/* ─── FORGOT SENT ─── */}
            {view === 'forgot-sent' && (
              <motion.div
                key="forgot-sent"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl p-6 text-center space-y-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                  className="flex justify-center"
                >
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(79,70,229,0.1)' }}>
                    <CheckCircle className="w-8 h-8 text-[#4F46E5]" />
                  </div>
                </motion.div>
                <div>
                  <h2 className="font-semibold text-lg" style={{ color: 'var(--luka-text-primary)' }}>
                    ¡Correo enviado!
                  </h2>
                  <p className="text-sm mt-1" style={{ color: 'var(--luka-text-secondary)' }}>
                    Revisa tu bandeja de entrada y haz clic en el enlace para crear una nueva contraseña.
                  </p>
                </div>
                <p className="text-xs px-4" style={{ color: 'var(--luka-text-secondary)' }}>
                  Si no lo ves en unos minutos, revisa tu carpeta de spam.
                </p>
                <button
                  onClick={() => setView('auth')}
                  className="w-full flex items-center justify-center gap-1.5 text-sm py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                  style={{ color: 'var(--luka-text-primary)' }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver al inicio de sesión
                </button>
              </motion.div>
            )}

            {/* ─── RESET PASSWORD ─── */}
            {view === 'reset' && (
              <motion.div
                key="reset"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl p-6 space-y-5"
              >
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                    <KeyRound className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-base" style={{ color: 'var(--luka-text-primary)' }}>
                      Nueva contraseña
                    </h2>
                    <p className="text-xs" style={{ color: 'var(--luka-text-secondary)' }}>
                      Elige una contraseña segura
                    </p>
                  </div>
                </div>

                <form onSubmit={handleReset} noValidate className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="reset-password">Nueva contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        id="reset-password"
                        type={showResetPass ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="pl-10 pr-10 rounded-xl"
                        {...resetForm.register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetPass(!showResetPass)}
                        aria-label={showResetPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      >
                        {showResetPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <PasswordStrength password={watchResetPassword} />
                    {resetForm.formState.errors.password && (
                      <p className="text-xs text-red-500">{resetForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="reset-confirm">Confirmar contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        id="reset-confirm"
                        type={showResetConfirm ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="pl-10 pr-10 rounded-xl"
                        {...resetForm.register('confirmPassword')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetConfirm(!showResetConfirm)}
                        aria-label={showResetConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      >
                        {showResetConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {resetForm.formState.errors.confirmPassword && (
                      <p className="text-xs text-red-500">{resetForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <motion.button
                    type="submit"
                    disabled={resetForm.formState.isSubmitting}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    className="w-full py-3 rounded-xl text-white font-medium disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                  >
                    {resetForm.formState.isSubmitting ? 'Actualizando...' : 'Guardar nueva contraseña'}
                  </motion.button>
                </form>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </div>

      {/* Terms & Conditions modal */}
      <TermsModal open={termsOpen} onClose={() => setTermsOpen(false)} />
    </div>
  )
}
