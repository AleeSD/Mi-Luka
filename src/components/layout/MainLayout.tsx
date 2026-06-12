import { Outlet, useNavigate, useLocation } from 'react-router'
import { Home, PlusCircle, TrendingUp, Target, User, Gift } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import logoNormal from '@/assets/logo.png'

const navItems = [
  { path: '/app',             icon: Home,       label: 'Inicio'   },
  { path: '/app/analytics',   icon: TrendingUp,  label: 'Análisis' },
  { path: '/app/add-expense', icon: PlusCircle,  label: 'Agregar', isSpecial: true },
  { path: '/app/goals',       icon: Target,      label: 'Metas'    },
  { path: '/app/benefits',    icon: Gift,        label: 'Beneficios' },
  { path: '/app/profile',     icon: User,        label: 'Perfil'   },
]

export function MainLayout() {
  const navigate  = useNavigate()
  const location  = useLocation()

  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-[var(--luka-surface)] dark:bg-gray-950">

      {/* ─── DESKTOP SIDEBAR (lg+) ─── */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-60 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-40 shadow-sm">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="p-6 border-b border-gray-100 dark:border-gray-800"
        >
          <img src={logoNormal} alt="Mi Luka" className="h-8 w-auto object-contain rounded-xl" />
        </motion.div>

        <nav className="flex-1 p-4">
          <motion.div
            className="space-y-1"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.18 } } }}
          >
            {navItems.map((item) => {
              const Icon   = item.icon
              const active = isActive(item.path)

              if (item.isSpecial) {
                return (
                  <motion.div
                    key={item.path}
                    variants={{ hidden: { opacity: 0, x: -14 }, show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } } }}
                  >
                    <motion.button
                      onClick={() => navigate(item.path)}
                      whileHover={{ scale: 1.02, opacity: 0.9 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white font-medium mt-2"
                      style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}
                    >
                      <Icon className="w-5 h-5" />
                      <span>Nuevo gasto</span>
                    </motion.button>
                  </motion.div>
                )
              }

              return (
                <motion.div
                  key={item.path}
                  variants={{ hidden: { opacity: 0, x: -14 }, show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } } }}
                >
                  <button
                    onClick={() => navigate(item.path)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left relative"
                    style={{
                      color:      active ? 'var(--luka-blue)' : 'var(--luka-text-secondary)',
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {active && (
                      <motion.span
                        layoutId="sidebar-indicator"
                        className="absolute inset-0 rounded-xl"
                        style={{ background: 'rgba(79,70,229,0.08)' }}
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}
                    <Icon className="w-5 h-5 relative z-10" />
                    <span className="relative z-10">{item.label}</span>
                  </button>
                </motion.div>
              )
            })}
          </motion.div>
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-center" style={{ color: 'var(--luka-text-secondary)' }}>
            Mi Luka v1.0.0
          </p>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <main className="lg:ml-60 min-h-screen pb-20 lg:pb-0">
        <div className="max-w-2xl mx-auto lg:max-w-4xl">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ─── MOBILE BOTTOM NAV (< lg) ─── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg z-50 safe-bottom">
        <div className="max-w-md mx-auto px-2">
          <div className="flex justify-around items-center py-2">
            {navItems.map((item) => {
              const active = isActive(item.path)
              const Icon   = item.icon

              if (item.isSpecial) {
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="flex flex-col items-center justify-center -mt-5"
                    aria-label="Agregar gasto"
                  >
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.88 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 17 }}
                      className="relative"
                    >
                      {/* Pulse ring */}
                      <div
                        className="absolute inset-0 rounded-2xl luka-pulse-ring"
                        style={{ background: 'rgba(79,70,229,0.28)' }}
                      />
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg relative z-10"
                        style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}
                      >
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                    </motion.div>
                    <span className="text-xs mt-1" style={{ color: 'var(--luka-text-secondary)' }}>
                      {item.label}
                    </span>
                  </button>
                )
              }

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="flex flex-col items-center justify-center py-2 px-3 rounded-xl min-w-[44px] min-h-[44px] relative"
                  style={{ color: active ? 'var(--luka-blue)' : 'var(--luka-text-secondary)' }}
                  aria-label={item.label}
                >
                  {active && (
                    <motion.span
                      layoutId="mobile-indicator"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: 'rgba(79,70,229,0.08)' }}
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <motion.div
                    animate={{ scale: active ? 1.15 : 1 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                    className="relative z-10"
                  >
                    <Icon className="w-6 h-6" />
                  </motion.div>
                  <span className="text-xs mt-1 relative z-10">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>
    </div>
  )
}
