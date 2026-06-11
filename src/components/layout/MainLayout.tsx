import { Outlet, useNavigate, useLocation } from 'react-router'
import { Home, PlusCircle, TrendingUp, Target, User } from 'lucide-react'
import logoNormal from '@/assets/logo.png'

const navItems = [
  { path: '/app',            icon: Home,      label: 'Inicio'   },
  { path: '/app/analytics',  icon: TrendingUp, label: 'Análisis' },
  { path: '/app/add-expense', icon: PlusCircle, label: 'Agregar', isSpecial: true },
  { path: '/app/goals',      icon: Target,    label: 'Metas'    },
  { path: '/app/profile',    icon: User,      label: 'Perfil'   },
]

export function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-[var(--luka-surface)] dark:bg-gray-950">

      {/* ─── DESKTOP SIDEBAR (lg+) ─── */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-60 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-40 shadow-sm">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <img src={logoNormal} alt="Mi Luka" className="h-10 w-auto object-contain" />
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            if (item.isSpecial) {
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white font-medium transition-all hover:opacity-90 mt-2"
                  style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}
                >
                  <Icon className="w-5 h-5" />
                  <span>Nuevo gasto</span>
                </button>
              )
            }
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left"
                style={{
                  color: active ? 'var(--luka-blue)' : 'var(--luka-text-secondary)',
                  background: active ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                  fontWeight: active ? 600 : 400,
                }}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            )
          })}
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
          <Outlet />
        </div>
      </main>

      {/* ─── MOBILE BOTTOM NAV (< lg) ─── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg z-50 safe-bottom">
        <div className="max-w-md mx-auto px-2">
          <div className="flex justify-around items-center py-2">
            {navItems.map((item) => {
              const active = isActive(item.path)
              const Icon = item.icon

              if (item.isSpecial) {
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="flex flex-col items-center justify-center -mt-5"
                    aria-label="Agregar gasto"
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                      style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}
                    >
                      <Icon className="w-7 h-7 text-white" />
                    </div>
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
                  className="flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all min-w-[44px] min-h-[44px]"
                  style={{
                    color: active ? 'var(--luka-blue)' : 'var(--luka-text-secondary)',
                    background: active ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                  }}
                  aria-label={item.label}
                >
                  <Icon className={`w-6 h-6 ${active ? 'scale-110' : ''} transition-transform`} />
                  <span className="text-xs mt-1">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>
    </div>
  )
}
