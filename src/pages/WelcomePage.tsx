import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { Wallet, TrendingUp, Target, Sparkles } from 'lucide-react'
import { useAuthContext } from '@/context/AuthContext'
import logoEslogan from '@/assets/logo-eslogan.png'

const features = [
  { icon: Wallet,     text: 'Controla todos tus gastos' },
  { icon: Target,     text: 'Alcanza tus metas de ahorro' },
  { icon: TrendingUp, text: 'Analiza tus finanzas' },
  { icon: Sparkles,   text: 'Gana puntos y beneficios' },
]

const stats = [
  { value: '10K+', label: 'Usuarios' },
  { value: 'S/2M+', label: 'Ahorrado' },
  { value: '4.9★', label: 'Valoración' },
]

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
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.72 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.55, type: 'spring', stiffness: 180, damping: 18 }}
            className="flex justify-center"
          >
            <img
              src={logoEslogan}
              alt="Mi Luka - Tu dinero bajo control"
              className="w-44 lg:w-52 object-contain rounded-2xl"
            />
          </motion.div>

          {/* Features — stagger individual */}
          <motion.div
            className="space-y-4 py-4"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.42 } } }}
          >
            {features.map(({ icon: Icon, text }) => (
              <motion.div
                key={text}
                variants={{
                  hidden: { opacity: 0, x: -22 },
                  show:  { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } },
                }}
                className="flex items-center gap-3 text-white/90"
              >
                <motion.div
                  whileHover={{ scale: 1.2, rotate: 8 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 10 }}
                  className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0"
                >
                  <Icon className="w-4 h-4" />
                </motion.div>
                <span className="text-sm">{text}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.4 }}
            className="space-y-3"
          >
            <motion.button
              onClick={() => navigate('/auth?tab=register')}
              whileHover={{ scale: 1.03, y: -2, boxShadow: '0 20px 40px rgba(0,0,0,0.28)' }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              className="w-full py-4 text-base font-semibold rounded-2xl bg-white text-[#667eea] shadow-xl"
            >
              Comenzar gratis
            </motion.button>
            <motion.button
              onClick={() => navigate('/auth?tab=login')}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              className="w-full py-4 text-sm font-medium rounded-2xl border border-white/40 text-white hover:bg-white/10 transition-colors"
            >
              Ya tengo cuenta
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      {/* Desktop right decorative panel */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-white/5" />
        {/* Floating blobs */}
        <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-white/10 blur-3xl luka-float" />
        <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full bg-purple-300/20 blur-2xl luka-float-slow" />
        <div className="absolute top-1/2 left-1/4 w-32 h-32 rounded-full bg-indigo-300/10 blur-2xl luka-float" style={{ animationDelay: '2s' }} />

        <motion.div
          initial={{ opacity: 0, x: 40, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          className="relative z-10 text-center text-white space-y-6"
        >
          {/* Floating icon box */}
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-32 h-32 rounded-3xl bg-white/20 backdrop-blur-lg flex items-center justify-center mx-auto shadow-2xl"
          >
            <motion.div
              animate={{ rotate: [0, 14, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            >
              <Sparkles className="w-16 h-16 text-white" />
            </motion.div>
          </motion.div>

          <h2 className="text-3xl font-bold">Finanzas para tu generación</h2>
          <p className="text-white/80 max-w-sm">
            Diseñada por y para jóvenes que quieren tomar el control de su dinero con una app moderna y gamificada.
          </p>

          {/* Stats — stagger spring */}
          <motion.div
            className="flex justify-center gap-6 text-white/90"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.13, delayChildren: 0.65 } } }}
          >
            {stats.map(({ value, label }) => (
              <motion.div
                key={label}
                variants={{
                  hidden: { opacity: 0, scale: 0.55, y: 12 },
                  show:  { opacity: 1, scale: 1,    y: 0,  transition: { type: 'spring', stiffness: 270, damping: 14 } },
                }}
                className="text-center"
              >
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs text-white/70">{label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
