import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { Wallet, TrendingUp, Target, Sparkles } from 'lucide-react'
import { useAuthContext } from '@/context/AuthContext'
import logoEslogan from '@/assets/logo-eslogan.png'

export function WelcomePage() {
  const navigate = useNavigate()
  const { user, loading } = useAuthContext()

  useEffect(() => {
    if (!loading && user) navigate('/app', { replace: true })
  }, [user, loading, navigate])

  if (loading) return null

  return (
    <div
      className="min-h-screen flex flex-col lg:flex-row"
      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
    >
      {/* Mobile / Left panel (desktop) */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-sm text-center text-white space-y-8"
        >
          {/* Logo con eslogan */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="flex justify-center"
          >
            <img
              src={logoEslogan}
              alt="Mi Luka - Tu dinero bajo control"
              className="w-56 lg:w-64 object-contain drop-shadow-xl"
            />
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="space-y-4 py-4"
          >
            {[
              { icon: Wallet,    text: 'Controla todos tus gastos' },
              { icon: Target,    text: 'Alcanza tus metas de ahorro' },
              { icon: TrendingUp, text: 'Analiza tus finanzas' },
              { icon: Sparkles,  text: 'Gana puntos y beneficios' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-white/90">
                <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm">{text}</span>
              </div>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="space-y-3"
          >
            <button
              onClick={() => navigate('/auth?tab=register')}
              className="w-full py-4 text-base font-semibold rounded-2xl bg-white text-[#667eea] hover:bg-white/95 shadow-xl transition-all hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]"
            >
              Comenzar gratis
            </button>
            <button
              onClick={() => navigate('/auth?tab=login')}
              className="w-full py-4 text-sm font-medium rounded-2xl border border-white/40 text-white hover:bg-white/10 transition-all"
            >
              Ya tengo cuenta
            </button>
          </motion.div>
        </motion.div>
      </div>

      {/* Desktop right decorative panel */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-white/5" />
        <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full bg-purple-300/20 blur-2xl" />
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="relative z-10 text-center text-white space-y-6"
        >
          <div className="w-32 h-32 rounded-3xl bg-white/20 backdrop-blur-lg flex items-center justify-center mx-auto shadow-2xl">
            <Sparkles className="w-16 h-16 text-white" />
          </div>
          <h2 className="text-3xl font-bold">Finanzas para tu generación</h2>
          <p className="text-white/80 max-w-sm">
            Diseñada por y para jóvenes que quieren tomar el control de su dinero con una app moderna y gamificada.
          </p>
          <div className="flex justify-center gap-6 text-white/90">
            <div className="text-center">
              <div className="text-2xl font-bold">10K+</div>
              <div className="text-xs text-white/70">Usuarios</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">S/2M+</div>
              <div className="text-xs text-white/70">Ahorrado</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">4.9★</div>
              <div className="text-xs text-white/70">Valoración</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
