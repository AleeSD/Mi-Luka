# Mi Luka 💸

> **Finanzas jóvenes, decisiones inteligentes.**

Mi Luka es una aplicación web fullstack de gestión de gastos personales y ahorro diseñada para la Generación Z (18–25 años). Combina un backend real en Supabase con una interfaz fintech moderna, gamificación y diseño responsive mobile + desktop.

![Stack](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase_JS-2.49+-3ECF8E?logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1.12-38B2AC?logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.3.5-646CFF?logo=vite&logoColor=white)

---

## Tabla de Contenidos

- [Características](#características)
- [Stack Tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Pantallas](#pantallas)
- [Saldo y Gamificación](#saldo-y-gamificación)
- [Base de Datos](#base-de-datos)
- [Diseño y Tokens CSS](#diseño-y-tokens-css)
- [Seguridad](#seguridad)
- [Tests](#tests)
- [Instalación y Desarrollo](#instalación-y-desarrollo)
- [Guía de Usuario](docs/GUIA_DE_USO.md)
- [Variables de Entorno](#variables-de-entorno)
- [Build y Optimización](#build-y-optimización)
- [Despliegue](#despliegue)

---

## Características

### Funcionalidad Principal

| Módulo | Descripción |
|--------|-------------|
| **Autenticación** | Login / registro con email + contraseña. Confirmación de email **deshabilitada por config en Supabase**: el usuario queda con sesión activa al registrarse y cae directo al portón de onboarding de saldo. Rate limiting **en cliente** (5 intentos → 60s de bloqueo). Recuperación de contraseña por correo y vista de reseteo (`?reset=true` o `type=recovery` en el hash). Modal de términos y condiciones |
| **Onboarding** | Modal obligatorio (no descartable) que pide el saldo disponible al primer login y a usuarios reseteados. Gate en `ProtectedRoute` que cubre todo `/app/*` incluso vía URL directa. Hasta que `profile.saldo_configurado = true`, ninguna acción es accesible |
| **Saldo y guardadito** | Saldo disponible (`profiles.saldo_disponible`) editable por **reemplazo absoluto** desde un diálogo global. Guardadito (`profiles.monto_guardadito`): alcancía general para ahorro libre con acciones "Apartar" y "Sacar" (descuenta/devuelve al saldo). Gasto y contribución a meta **descuentan vía RPC atómico** con bloqueo duro si exceden saldo |
| **Gastos** | CRUD completo. 8 categorías con iconos Lucide y colores. Confetti en el primer gasto del día. Modo dual crear/editar por `:id`. Bloqueo duro de creación / edición si excede el saldo (mensaje rotativo del Banco A con CTA "Actualizar saldo"). Eliminar gasto devuelve el monto al saldo |
| **Análisis** | Gráficos de barras y torta por período (semana / mes / año). Comparativa con período anterior |
| **Metas de ahorro** | Creación de metas con 6 colores predefinidos, monto objetivo y fecha límite opcional (debe ser a futuro). Contribuciones parciales (clamp al objetivo, bloqueo duro si saldo insuficiente). Confetti al completar. **Eliminar meta devuelve `monto_actual` al saldo** (decisión §2.A del plan) |
| **Niveles + XP** | Curva cuadrática: `xpParaAlcanzarNivel(n) = 100 · n · (n-1) / 2` (L2=100, L3=300, L5=1000, L10=4500). Helpers TS espejo exacto del SQL (`src/lib/leveling.ts` ↔ migración `0004`). Cero drift en bordes (99/100/299/300/599/600) por bucle entero |
| **Retos semanales (repetibles)** | Catálogo de 17 retos con horizonte ≤ 1 semana, rotación determinística por semana ISO en `America/Lima` (`retos_de_la_semana` RPC). Cada reto se acepta y completa **una vez por semana** (`UNIQUE(user_id, challenge_id, semana)`). Progreso parcial live vía RPC `progreso_reto`. Botón **"Reclamar XP"** solo cuando se cumple. Estado **"Fallido"** para antagónicos rotos. Retos de fin de semana solo reclamables el domingo Lima |
| **Racha y recompensas** | Racha de "días ahorrando" (`profiles.racha_actual`, `racha_mas_larga`, `ultima_fecha_racha`) que sube por contribución a meta **o** ahorro libre (no duplica si pasan ambos el mismo día Lima). Helper `aplicar_racha` desbloquea logros idempotentemente. 6 hitos sembrados: 10/25/50/100/200/365 días. Racha efectiva mostrada como 0 si la última fecha está rota |
| **Notificación inferior** | `LukaNotification` slide-up estilo iOS (drag-to-dismiss, auto-dismiss pausable, z-index sobre bottom-nav). Variantes: bloqueo (Banco A), saldo cero (B), saldo bajo (C), hito de racha. Una notificación a la vez; nuevas reemplazan con crossfade |
| **Beneficios** | Catálogo de descuentos de aliados. Filtro por categoría. Copia de código al portapapeles (`navigator.clipboard` + fallback `execCommand`). Aviso si expira en ≤ 7 días |
| **Perfil** | Avatar con upload (límite 2 MB). Stats personales (gastos, metas, retos, racha). Sección colapsable de Recompensas. Exportación de gastos a CSV. Selector de tema light / dark / system. Editar nombre. Logout |

### UX / DX

- Diseño responsive: sidebar fija de 240px en desktop (`lg+`), bottom navigation con 6 ítems en mobile (`< lg`)
- Modo claro / oscuro / sistema con persistencia en `localStorage` bajo key `mi-luka-theme`
- Skeleton loaders durante carga en todos los módulos
- Lazy loading por ruta con `React.lazy` + `Suspense` y `PageLoader` propio
- Validaciones en tiempo real con Zod + React Hook Form
- Toasts informativos con Sonner (`richColors`, top-center)
- `ErrorBoundary` global de clase con mensaje en español
- Animaciones con Motion (`motion/react`); variantes simplificadas en mobile (solo opacity) vía `lib/motion-utils.ts` para evitar artefactos GPU
- Respeto a `prefers-reduced-motion` en animaciones CSS personalizadas

---

## Stack Tecnológico

> Versiones tomadas directamente de `package.json`. Para versiones resueltas exactas, ver `pnpm-lock.yaml`.

### Frontend

| Tecnología | Versión | Rol |
|------------|---------|-----|
| [React](https://react.dev) | 18.3.1 | Framework UI |
| [TypeScript](https://typescriptlang.org) | ^5.7 | Tipado estático estricto |
| [Vite](https://vitejs.dev) | 6.3.5 | Build tool y dev server |
| [React Router](https://reactrouter.com) | 7.13.0 | Enrutamiento SPA (`createBrowserRouter`). Paquete `react-router` (no `react-router-dom`) |
| [Tailwind CSS](https://tailwindcss.com) | 4.1.12 | Estilos utilitarios (sin `tailwind.config.js`; tokens en CSS) |
| [@tailwindcss/vite](https://www.npmjs.com/package/@tailwindcss/vite) | 4.1.12 | Plugin oficial de Vite para Tailwind v4 |
| [tw-animate-css](https://www.npmjs.com/package/tw-animate-css) | 1.3.8 | Utilidades de animación tipo `animate-*` para Tailwind v4 |
| Radix UI primitives | varias | Componentes `accordion`, `alert-dialog`, `avatar`, `checkbox`, `dialog`, `dropdown-menu`, `label`, `popover`, `progress`, `select`, `separator`, `slider`, `slot`, `switch`, `tabs`, `tooltip`, etc. (ver `package.json` para la lista completa) |
| [Lucide React](https://lucide.dev) | 0.487.0 | Iconografía |
| [Motion](https://motion.dev) | 12.23.24 | Animaciones (`motion/react`) |
| [Recharts](https://recharts.org) | 2.15.2 | Gráficos (BarChart, PieChart) |
| [Sonner](https://sonner.emilkowal.ski) | 2.0.3 | Notificaciones toast |
| [canvas-confetti](https://www.npmjs.com/package/canvas-confetti) | ^1.9.4 | Efectos de celebración |
| [date-fns](https://date-fns.org) | 3.6.0 | Manipulación de fechas (locale `es`) |
| [clsx](https://www.npmjs.com/package/clsx) | 2.1.1 | Composición condicional de clases |
| [tailwind-merge](https://www.npmjs.com/package/tailwind-merge) | 3.2.0 | Merge inteligente de utilidades Tailwind (`cn()` helper) |
| [class-variance-authority](https://cva.style) | 0.7.1 | Variants tipados para componentes UI |

### Backend / Infraestructura

| Tecnología | Versión | Rol |
|------------|---------|-----|
| [@supabase/supabase-js](https://supabase.com) | ^2.49.0 | Cliente tipado para PostgreSQL + Auth + Storage |
| [Vercel](https://vercel.com) | — | Hosting con SPA rewrites y cabeceras de seguridad |

### Formularios y Validación

| Librería | Versión | Rol |
|----------|---------|-----|
| [React Hook Form](https://react-hook-form.com) | 7.55.0 | Gestión de formularios |
| [Zod](https://zod.dev) | ^3.23.8 | Schemas de validación |
| [@hookform/resolvers](https://www.npmjs.com/package/@hookform/resolvers) | ^3.9.0 | Integración RHF ↔ Zod |

---

## Arquitectura

```
┌─────────────────────────────────────┐
│           React SPA (Vite)          │
│                                     │
│  ┌──────────┐    ┌───────────────┐  │
│  │  Routes  │    │ ErrorBoundary │  │
│  │  (RRv7)  │    │  ThemeCtx     │  │
│  │  lazy()  │    │  AuthCtx      │  │
│  └────┬─────┘    └───────────────┘  │
│       │                             │
│  ┌────▼──────────────────────────┐  │
│  │        Pages (9 pantallas)    │  │
│  │  useExpenses / useGoals /     │  │
│  │  useChallenges / useBenefits  │  │
│  │  useProfile                   │  │
│  └────┬──────────────────────────┘  │
│       │                             │
│  ┌────▼──────────────────────────┐  │
│  │    lib/db (data layer)        │  │
│  │  expenses · goals · challenges│  │
│  │  profiles · benefits          │  │
│  └────┬──────────────────────────┘  │
└───────┼─────────────────────────────┘
        │ @supabase/supabase-js
        ▼
┌─────────────────────┐
│    Supabase Cloud   │
│  PostgreSQL + Auth  │
│  Storage (avatars)  │
│  RLS on all tables  │
└─────────────────────┘
```

**Flujo de estado:**
- `AuthContext` → expone `user`, `session`, `loading`, `signIn`, `signUp`, `signOut`, `resetPassword`, `updatePassword`. Se sincroniza con `onAuthStateChange`
- `ThemeContext` → expone `theme`, `setTheme(theme)` y `resolvedTheme`. Soporta `'light' | 'dark' | 'system'` y aplica la clase a `document.documentElement`
- `ProfileContext` → perfil global compartido entre módulos; incluye `saldo_disponible`, `racha_actual` y un ref de origen de cambio que distingue edición manual de gasto/contribución (usado por los watchers de notificación para evitar falsos positivos)
- `NotificationContext` → cola de notificaciones LukaNotification (una a la vez). Expone `notify({ title, subtitle, cta, variante })`. Nuevas notificaciones reemplazan la activa con crossfade
- `SaldoEditorContext` → estado del diálogo global de edición de saldo; permite abrirlo desde cualquier punto de la app (p.ej. desde el CTA "Actualizar saldo" de una notificación de bloqueo)
- `use*` hooks → estado local por módulo. Patrón de `cancelled` flag para evitar setState tras unmount. Cada hook expone `refresh()` para reintentar tras error. Sin Redux ni Zustand
- Rutas protegidas con `ProtectedRoute` (skeleton durante `loading`, redirect a `/auth`) y `PublicOnlyRoute` (spinner full-page, redirect a `/app` si hay sesión)

---

## Estructura del Proyecto

```
code/
├── src/
│   ├── assets/
│   │   ├── logo.png                    # Logo sin eslogan (sidebar desktop, favicon)
│   │   └── logo-eslogan.png            # Logo con eslogan (welcome + auth)
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── ErrorBoundary.tsx       # Error boundary global (componente de clase)
│   │   │   ├── MainLayout.tsx          # Sidebar desktop + bottom nav mobile (6 ítems)
│   │   │   └── ProtectedRoute.tsx      # Guards: ProtectedRoute + PublicOnlyRoute + portón de onboarding
│   │   ├── notifications/
│   │   │   ├── LukaNotification.tsx    # Componente slide-up con drag-to-dismiss y auto-dismiss
│   │   │   └── LukaNotificationHost.tsx # Montado en MainLayout; gestiona la cola de una notificación a la vez
│   │   ├── onboarding/
│   │   │   └── OnboardingSaldoDialog.tsx # Diálogo obligatorio (no descartable) de saldo inicial
│   │   ├── saldo/
│   │   │   └── SaldoEditorDialog.tsx   # Diálogo de reemplazo absoluto de saldo disponible
│   │   ├── shared/
│   │   │   ├── CategoryIcon.tsx        # Icono coloreado por CategoriaGasto
│   │   │   ├── EmptyState.tsx          # Placeholder con emoji + CTA opcional
│   │   │   ├── RachaCard.tsx           # Tarjeta de racha activa + próximo hito de recompensa
│   │   │   └── RecompensaItem.tsx      # Ítem de logro (desbloqueado a color / bloqueado en gris)
│   │   └── ui/                         # Wrappers shadcn-style sobre Radix primitives
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── progress.tsx
│   │       ├── skeleton.tsx
│   │       ├── switch.tsx
│   │       ├── tabs.tsx
│   │       ├── textarea.tsx
│   │       ├── use-mobile.ts           # Hook useIsMobile (breakpoint 768px)
│   │       └── utils.ts                # cn() helper (clsx + tailwind-merge)
│   │
│   ├── context/
│   │   ├── AuthContext.tsx             # user, session, signIn, signUp, signOut, resetPassword, updatePassword
│   │   ├── NotificationContext.tsx     # Cola de LukaNotifications (una a la vez); expone notify()
│   │   ├── ProfileContext.tsx          # Perfil global: saldo, racha, flag de origen de cambio (spend vs user_edit)
│   │   ├── SaldoEditorContext.tsx      # Estado del diálogo global de edición de saldo
│   │   └── ThemeContext.tsx            # theme ('light'|'dark'|'system'), setTheme, resolvedTheme
│   │
│   ├── hooks/
│   │   ├── useAchievements.ts          # Catálogo de logros + user_achievements desbloqueados
│   │   ├── useBenefits.ts              # benefits[], categoriaActiva, setCategoriaActiva, refresh
│   │   ├── useChallenges.ts            # disponibles, enCurso, completados, acceptChallenge, completeChallenge
│   │   ├── useExpenses.ts              # expenses[], totalMes, addExpense, editExpense, removeExpense, refresh
│   │   ├── useGoals.ts                 # goalsActivas, goalsCompletadas, addGoal, contribuir, removeGoal
│   │   ├── useGuardadito.ts            # monto_guardadito, registrarAhorro(monto), sacar(monto)
│   │   ├── useLukaNotification.ts      # Wrapper sobre NotificationContext para disparar notificaciones
│   │   ├── useProfile.ts               # profile, update, uploadProfileAvatar, refresh
│   │   ├── useRacha.ts                 # racha_actual efectiva (ruptura perezosa), racha_mas_larga
│   │   ├── useRachaNotificationWatcher.ts # Detecta cruces de hitos y dispara LukaNotification racha_hito
│   │   ├── useSaldo.ts                 # saldo_disponible, saldo_configurado, actualizar(monto), requiereOnboarding
│   │   └── useSaldoNotificationWatcher.ts # Detecta cruces de umbral saldo bajo/cero y dispara notificación
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── achievements.ts         # getAchievements, getUserAchievements
│   │   │   ├── balance.ts              # actualizarSaldo (RPC actualizar_saldo)
│   │   │   ├── benefits.ts             # getBenefits (con filtro opcional)
│   │   │   ├── challenges.ts           # getChallenges (RPC retos_de_la_semana), aceptarReto, completarReto, getProgresoReto
│   │   │   ├── expenses.ts             # CRUD atómico vía RPC (registrar/editar/eliminar_gasto) + getExpenseById
│   │   │   ├── goals.ts                # createGoal, contribuirMeta (RPC), deleteGoal (RPC con devolución)
│   │   │   ├── guardadito.ts           # registrarAhorroLibre, sacarDeGuardadito (RPCs atómicos)
│   │   │   └── profiles.ts             # getProfile, updateProfile, uploadAvatar (Supabase Storage)
│   │   ├── validations/
│   │   │   ├── auth.ts                 # loginSchema, registerSchema, forgotSchema, resetPasswordSchema
│   │   │   ├── balance.ts              # actualizarSaldoSchema, ahorroLibreSchema, sacarGuardaditoSchema
│   │   │   ├── expense.ts              # expenseSchema (monto, categoria, descripcion, fecha, notas)
│   │   │   └── goal.ts                 # goalSchema, contribucionSchema
│   │   ├── leveling.ts                 # XP_BASE, xpParaAlcanzarNivel, nivelDesdeXp (bucle entero), progresoNivel
│   │   ├── mensajes.ts                 # BANCO_A/B/C mensajes rotativos, pickRandom, mensajeBloqueoDinamico
│   │   ├── motion-utils.ts             # supportsHover, isMobile, fadeUp, scaleIn (variantes adaptativas)
│   │   ├── semana.ts                   # semanaIsoLima(), lunesLima(), formatearSemana() en zona America/Lima
│   │   ├── supabase.ts                 # createClient<Database> con storageKey 'mi-luka-auth'
│   │   └── utils.ts                    # cn, formatCurrency (PEN), formatDate, sanitizeText, CATEGORIAS, getDiasRestantes, getBeneficioProximoAExpirar
│   │
│   ├── pages/
│   │   ├── WelcomePage.tsx             # Pantalla de entrada con animaciones
│   │   ├── AuthPage.tsx                # Login + Registro + Forgot + Reset + Términos (vista única, 4 sub-vistas)
│   │   ├── DashboardPage.tsx           # Balance, saldo disponible, guardadito, accesos rápidos, PieChart, últimos gastos
│   │   ├── AddExpensePage.tsx          # Crear / editar gasto (modo dual por :id)
│   │   ├── AnalyticsPage.tsx           # BarChart + PieChart + comparativa por período
│   │   ├── GoalsPage.tsx               # Metas con diálogos crear / contribuir
│   │   ├── ChallengesPage.tsx          # Retos disponibles / en curso / completados + RachaCard
│   │   ├── BenefitsPage.tsx            # Beneficios con filtro y copia de código
│   │   └── ProfilePage.tsx             # Avatar, stats, racha más larga, recompensas colapsables, CSV export, config
│   │
│   ├── styles/
│   │   └── index.css                   # Tailwind v4 @import + @theme inline + tokens --luka-* + keyframes luka-*
│   │
│   ├── test/
│   │   └── setup.ts                    # Setup global de Vitest (mocks de Supabase, matchers)
│   │
│   ├── __tests__/
│   │   ├── unit/                       # Tests unitarios de leveling, semana, mensajes, validaciones
│   │   └── hooks/                      # Tests de useGuardadito, useRacha, useSaldo, useSaldoNotificationWatcher
│   │
│   ├── types/
│   │   └── database.ts                 # Tipos de dominio + Database para Supabase + tipo Medicion + firmas RPC
│   │
│   ├── App.tsx                         # ErrorBoundary > ThemeProvider > AuthProvider > ProfileProvider > NotificationProvider > RouterProvider + Toaster
│   ├── main.tsx                        # ReactDOM.createRoot
│   ├── routes.tsx                      # createBrowserRouter con lazy() por página + PageLoader
│   └── vite-env.d.ts                   # /// <reference types="vite/client" />
│
├── supabase/
│   └── migrations/                     # 11 migraciones SQL versionadas (0001–0011)
│       └── README.md                   # Instrucciones de aplicación, orden y respaldos
│
├── e2e/                                # Tests end-to-end con Playwright (auth, expenses, dashboard, goals, profile)
│
├── docs/
│   ├── PLAN_MEJORAS.md                 # Documento de diseño y decisiones de arquitectura
│   └── ANALISIS_PROYECTO.md            # Reporte de discrepancias y mejoras identificadas
│
├── .env.example                        # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (sin valores)
├── .gitattributes                      # Normalización LF cross-platform
├── .gitignore
├── .npmrc                              # onlyBuiltDependencies para pnpm 11
├── index.html                          # <title>Mi Luka</title> + favicon + theme-color
├── package.json
├── playwright.config.ts                # Configuración de tests E2E con Playwright
├── pnpm-lock.yaml
├── pnpm-workspace.yaml                 # allowBuilds (variante pnpm)
├── pnpm.yaml                           # onlyBuiltDependencies (variante pnpm)
├── tsconfig.app.json                   # strict + noUnusedLocals/Params + @/* alias
├── tsconfig.json                       # Project references
├── tsconfig.node.json
├── vercel.json                         # SPA rewrites + cabeceras de seguridad (CSP, X-Frame, etc.)
├── vite.config.ts                      # Plugin React + Tailwind + alias @ + manualChunks (vendor splitting)
└── vitest.config.ts                    # Configuración de Vitest para tests unitarios y de hooks
```

> No existe carpeta `public/`. El favicon se sirve desde `src/assets/logo.png` referenciado en `index.html`.

---

## Pantallas

### 1. Welcome (`/`)
Pantalla de entrada con animaciones escalonadas (Motion). Panel izquierdo con gradiente y estadísticas del producto. Botón "Comenzar gratis" → `/auth?tab=register`, botón "Ya tengo cuenta" → `/auth`. Si hay sesión activa, `PublicOnlyRoute` redirige a `/app`.

### 2. Auth (`/auth`)
Pantalla con 4 sub-vistas (`auth`, `forgot`, `forgot-sent`, `reset`) gestionadas por estado local + `AnimatePresence`. Tabs `login` / `register` controladas por query param `?tab=`. Login con indicador de intentos y bloqueo cliente-side de 60 s tras 5 fallos (`MAX_INTENTOS = 5`, `BLOQUEO_SEGUNDOS = 60`). Registro con `PasswordStrength` (3 checks visuales: 8+ caracteres, mayúscula, número) y checkbox de aceptación de términos (modal). Vista `reset` se activa con `?reset=true` o cuando el hash incluye `type=recovery`. Mensajes de error mapeados al español en `AuthContext`.

### 3. Dashboard (`/app`)
- Saludo personalizado con nombre del usuario
- Tarjeta de balance con gradiente: total gastado este mes + total ahorrado en metas
- Accesos rápidos: agregar gasto, ver metas, ver retos
- Preview de metas activas con barra de progreso
- `PieChart` de gastos del mes por categoría
- Últimos 5 gastos (clic → editar)
- Skeleton loaders en todos los bloques

### 4. Agregar / Editar Gasto (`/app/add-expense`, `/app/add-expense/:id`)
Modo dual: crea o edita según presencia de `:id`. Grilla de 8 categorías con iconos (Lucide: `ShoppingBag`, `Car`, `Film`, `BookOpen`, `Tag`, `Heart`, `Zap`, `Package`). Formulario Zod con: `monto` (positivo, máx. 999 999), `categoria`, `descripcion` (1–100 chars), `fecha`, `notas` (≤ 500 chars, opcional). `sanitizeText()` aplicado a `descripcion` y `notas` antes de guardar. Confetti si es el primer gasto del día.

### 5. Análisis (`/app/analytics`)
Selector de período: semana / mes / año. `BarChart` con datos por día de la semana o últimos 6 meses. `PieChart` por categoría. Lista de desglose con barra de proporción. Comparativa porcentual vs. período anterior con indicador de tendencia.

### 6. Metas de Ahorro (`/app/goals`)
Diálogo "Nueva meta" con selector de **6 colores predefinidos** (`#4F46E5`, `#10B981`, `#8B5CF6`, `#F59E0B`, `#EF4444`, `#06B6D4`). Barra de progreso con el color de la meta. Diálogo "Contribuir" con monto disponible calculado y clamp al objetivo. Marca como `completada` automáticamente al alcanzar el 100% y dispara confetti. Sección colapsable de metas completadas. Botón eliminar.

### 7. Retos Financieros (`/app/challenges`)
Tarjeta de nivel con barra de progreso `puntos_totales / (nivel * 500)`. 3 pestañas: Disponibles / En curso / Completados. Íconos dinámicos por tipo de reto (`ahorro` | `registro` | `sin_gasto` | `personalizado`). Aceptar reto → crea registro `user_challenges`. Completar → marca `completado = true`, fija `fecha_fin` y suma `puntos` al perfil (en dos queries separadas, ver [Análisis del Proyecto](docs/ANALISIS_PROYECTO.md)).

### 8. Beneficios (`/app/benefits`)
Filtro horizontal de categorías (pills deslizables). Tarjeta por aliado con código, descuento y fecha de expiración. Botón "Copiar" → `navigator.clipboard.writeText` con fallback `document.execCommand('copy')`. Alerta visual si el beneficio expira en ≤ 7 días.

### 9. Perfil (`/app/profile`)
Avatar con overlay de cámara → `<input type="file">` (límite 2 MB) → `uploadAvatar` a Supabase Storage bucket `avatars`, ruta `avatars/{user_id}.{ext}` con `upsert: true`. 4 estadísticas: gastos, metas completadas, retos completados y **racha activa** (con fallback al récord). **Sección colapsable "Recompensas"** con los 6 hitos de racha (10/25/50/100/200/365). Exportación de gastos a CSV (Blob + descarga programática). Selector de tema (Switch). Diálogo editar nombre. Botón logout.

---

## Saldo y Gamificación

Esta sección documenta la lógica de saldo + niveles + retos + racha + recompensas. **Toda la mutación de dinero y XP pasa por RPCs atómicos SECURITY DEFINER** en Postgres (carpeta `supabase/migrations/`); el cliente nunca hace UPDATE directo de saldo, puntos o racha.

### Saldo disponible (`profiles.saldo_disponible`)

- Es un **contador vivo**, no un cálculo sobre el histórico. El usuario lo edita por **reemplazo absoluto** (el monto nuevo sobrescribe el anterior; no se suma ni se resta).
- Cada gasto y cada contribución a meta lo descuentan vía RPC.
- Bandera `profiles.saldo_configurado boolean` controla el portón de onboarding: mientras esté `false`, el `OnboardingSaldoDialog` bloquea `/app/*`.
- RPC `actualizar_saldo(p_monto)` sobrescribe el valor **y** pone `saldo_configurado = true` en la misma sentencia. Cubre onboarding y edición posterior.

### Guardadito (`profiles.monto_guardadito`)

Alcancía general para "ahorro libre" sin meta destino.

- RPC `registrar_ahorro_libre(p_monto)`: valida `saldo >= p_monto` (bloqueo duro), descuenta del saldo, suma al guardadito, **inserta en `goal_contributions` con `goal_id = null`** y llama a `aplicar_racha`.
- RPC `sacar_de_guardadito(p_monto)`: valida `guardadito >= p_monto`, suma al saldo, resta del guardadito. **No** toca la racha.
- Las mediciones de retos de ahorro (`ahorro_monto_semana`, `ahorro_count_semana`, `ahorro_dias_distintos_semana`) cuentan **tanto contribuciones a metas como ahorro libre** porque queryean `goal_contributions` sin filtrar `goal_id`.

### Bloqueo duro por saldo insuficiente

Si un gasto o contribución excede el saldo, los RPCs lanzan `SQLSTATE '23514'` con mensaje `SALDO_INSUFICIENTE`. El cliente lo mapea a clases tipadas (`SaldoInsuficienteError`, `SaldoNoConfiguradoError`, `GuardaditoInsuficienteError`) y dispara una **LukaNotification** con un mensaje rotativo del Banco A + CTA "Actualizar saldo". El gasto **no se registra**.

### Niveles y XP

Curva única en `src/lib/leveling.ts` (espejo del SQL en `supabase/migrations/0004_leveling_helpers.sql`):

```ts
xpParaAlcanzarNivel(n) = 100 * n * (n-1) / 2
// n=1 → 0, n=2 → 100, n=3 → 300, n=4 → 600, n=5 → 1000, n=10 → 4500
```

`nivelDesdeXp(xp)` se implementa con **bucle entero puro** (sin `sqrt`, sin `numeric`) tanto en TS como en SQL para garantizar cero drift en los bordes exactos. Verificado: `99→1, 100→2, 299→2, 300→3, 599→3, 600→4`.

XP por dificultad de reto: **fácil = 20, media = 40, difícil = 80**. Ritmo esperado: un usuario activo (2 fáciles + 1 media/semana = 80 XP) llega a L3 en ~1 mes, L5 en ~3 meses.

### Retos semanales repetibles

Las migraciones siembran **17 retos** distintos en `0009_seed_challenges_ampliados.sql`, todos con horizonte ≤ 1 semana.

- **Identificador de semana**: `semana_iso_lima()` SQL ↔ `semanaIsoLima()` TS, devuelven `isoyear*100 + isoweek` en zona `America/Lima`. Coinciden exactamente.
- **Constraint**: `UNIQUE (user_id, challenge_id, semana)` permite reaceptar el mismo reto **en semanas distintas**, pero no dos veces en la misma.
- **Rotación**: `retos_de_la_semana(p_cantidad)` ordena el catálogo por `md5(c.id || semana)` (determinístico para la semana en curso) y excluye los que el usuario ya tiene esta semana.
- **Progreso live**: RPC `progreso_reto(p_user_challenge_id)` mide en función del `medicion` del reto (ver tabla más abajo) sobre el rango `[lunes Lima, ahora]`.
- **Reclamación atómica**: RPC `completar_reto(p_user_challenge_id)` re-evalúa progreso server-side; si cumple, marca completado, suma `puntos` a `profiles.puntos_totales` y recalcula `nivel`. Devuelve `{ xp_nuevo, nivel_nuevo, subio_de_nivel, progreso }`.
- **Retos de fin de semana**: `gasto_total_max_semana`, `sin_categoria_semana`, `saldo_positivo_fin_semana` solo se reclaman el **domingo Lima** (guard en el RPC, etiqueta visible en UI).

| Medición | Descripción | Cumple si |
|---|---|---|
| `ahorro_monto_semana` | Soles aportados a goal_contributions esta semana | `progreso >= meta` |
| `ahorro_count_semana` | Número de contribuciones esta semana | `progreso >= meta` |
| `ahorro_dias_distintos_semana` | Días con ≥1 contribución | `progreso >= meta` |
| `meta_completada_semana` | Goals con `completada=true` esta semana | `progreso >= 1` |
| `dias_sin_gasto_semana` | Días sin gasto desde el lunes | `progreso >= meta` |
| `gasto_total_max_semana` | Gasto total acumulado | `progreso <= meta` (solo domingo) |
| `sin_categoria_semana` | Gastos en la categoría `parametro` | `progreso === 0` (solo domingo) |
| `gastos_dias_seguidos` | Mayor racha consecutiva con gasto | `progreso >= meta` |
| `gastos_dias_distintos_semana` | Días distintos con gasto | `progreso >= meta` |
| `gastos_count_semana` | Cantidad de gastos | `progreso >= meta` |
| `subir_nivel_semana` | Nivel actual > snapshot al aceptar | `progreso === 1` |
| `racha_minima` | `profiles.racha_actual` | `progreso >= meta` |
| `saldo_positivo_fin_semana` | `saldo_disponible > 0` | `progreso === 1` (solo domingo) |

### Estado "Reto fallido"

Antagónicos cuya regla ya no puede cumplirse en la semana:

| Medición | Condición |
|---|---|
| `gasto_total_max_semana` | `progreso > meta_valor` (excediste el techo, irreversible) |
| `sin_categoria_semana` | `progreso > 0` (al menos un gasto en la categoría prohibida) |

La UI los muestra como tarjeta **inerte, atenuada**, sin botón "Reclamar", al final de "En curso". El RPC `completar_reto` también los rechaza con `RETO_NO_CUMPLIDO`. Quedan visibles hasta que la semana ISO Lima cambie y salgan naturalmente del filtro de `semana`.

### Racha (`profiles.racha_actual / racha_mas_larga / ultima_fecha_racha`)

- **Día ahorrado** = `≥1 contribución a meta` **o** `≥1 ahorro libre` en el día calendario `America/Lima`. Ambos disparan `aplicar_racha(user_id)`.
- `aplicar_racha` no se duplica: arranca con `if v_ultima = v_hoy then return v_actual`. Si el usuario hace meta + ahorro libre el mismo día, la racha sube **una sola vez**.
- **Ruptura perezosa**: si la última fecha no es hoy ni ayer Lima, el cliente muestra "racha efectiva = 0" sin esperar al próximo evento. El valor crudo en DB se reseteará a 1 cuando el usuario vuelva a ahorrar.
- **Recompensas idempotentes**: dentro de `aplicar_racha`, un `INSERT ... ON CONFLICT DO NOTHING` desbloquea logros para cada hito alcanzado (10/25/50/100/200/365). El watcher `useRachaNotificationWatcher` detecta cruces y dispara una `LukaNotification` con variante `racha_hito` (icono 🔥), **una sola vez por hito por usuario** (los ya-desbloqueados en DB inicializan el set "ya notificados").

### Notificación inferior estilo iPhone

`LukaNotificationHost` se monta una vez en `MainLayout`. La cola es de **una notificación a la vez**: si llega otra, reemplaza con crossfade. Variantes:

| Variante | Icono | Trigger |
|---|---|---|
| `bloqueo` | `AlertCircle` rojo | Gasto / contribución excede saldo (Banco A + CTA "Actualizar saldo") |
| `saldo_cero` | `Wallet` ámbar | Saldo cae a 0 por gasto/contribución/ahorro (no por edición) — Banco B |
| `saldo_bajo` | `TrendingDown` ámbar | Saldo cruza `profiles.umbral_saldo_bajo` por debajo (default 50) — Banco C |
| `racha_hito` | `Flame` rojo/ámbar | Racha cruza un hito (10/25/50/100/200/365) por primera vez |

**Anti-spam**: el watcher de saldo distingue origen del cambio (`user_edit` vs `spend`) vía un `ref` en `ProfileContext`. Editar saldo a mano NO dispara Banco B/C; solo gastos / contribuciones / ahorros sí. El watcher de racha verifica `notifiedIdsRef` para no re-notificar logros ya desbloqueados en DB.

---

## Base de Datos

> **Migraciones versionadas en `supabase/migrations/`** (creadas en Fase 1 del plan, [PLAN_MEJORAS.md](docs/PLAN_MEJORAS.md)). Aplicar con `supabase db push` para 0001–0009 y la 0011, y manualmente con respaldo previo para 0010 (destructiva, una sola vez). Detalles y comandos exactos en `supabase/migrations/README.md`.

### Migraciones

| # | Archivo | Idempotente | Contenido |
|---|---|:---:|---|
| 0001 | `0001_init_baseline.sql` | sí | Baseline generado con `supabase db dump` (estado real del remoto). |
| 0002 | `0002_profiles_saldo_y_racha.sql` | sí | Columnas `saldo_disponible`, `saldo_configurado`, `racha_actual`, `racha_mas_larga`, `ultima_fecha_racha`, `umbral_saldo_bajo` en `profiles`. |
| 0003 | `0003_challenges_metadata.sql` | sí | `dificultad`, `categoria_reto`, `medicion`, `parametro` en `challenges`. `semana`, `snapshot_nivel`, `progreso_cache` en `user_challenges`. UNIQUE `(user_id, challenge_id, semana)` y `(challenges.titulo)`. |
| 0003a | `0003a_goal_contributions.sql` | sí | Tabla append-only `goal_contributions` con RLS de SELECT. |
| 0004 | `0004_leveling_helpers.sql` | sí | `nivel_desde_xp(int)`, `xp_para_alcanzar_nivel(int)` (bucle entero puro). |
| 0005 | `0005_rpc_atomicos.sql` | sí | RPCs `actualizar_saldo`, `registrar_gasto`, `editar_gasto`, `eliminar_gasto`, `contribuir_meta`, `aceptar_reto`, `completar_reto`, `eliminar_meta`. |
| 0006 | `0006_racha_helper.sql` | sí | `aplicar_racha(uuid)` con desbloqueo idempotente de hitos. |
| 0007 | `0007_retos_helpers.sql` | sí | `semana_iso_lima()`, `longest_consecutive_days_with_expense()`, `progreso_reto()`, `retos_de_la_semana()`. |
| 0008 | `0008_seed_achievements_racha.sql` | sí | 6 hitos de racha sembrados (10/25/50/100/200/365 días). |
| 0009 | `0009_seed_challenges_ampliados.sql` | sí | 17 retos semanales sembrados con dificultad y medicion. |
| 0010 | `0010_reset_progreso_usuarios.sql` | **NO** | ⚠️ Destructiva una-sola-vez. Resetea perfiles + vacía user_challenges/user_achievements. Conserva expenses, goals, goal_contributions. |
| 0011 | `0011_guardadito_y_ahorro_libre.sql` | sí | Columna `profiles.monto_guardadito`. RPCs `registrar_ahorro_libre` y `sacar_de_guardadito`. |

### Tablas (PostgreSQL en Supabase)

```sql
profiles          -- perfil público del usuario (creado por trigger en auth.users)
expenses          -- gastos individuales
goals             -- metas de ahorro
goal_contributions -- log append-only de aportes (a meta o al guardadito)
challenges        -- catálogo de retos disponibles
user_challenges   -- retos aceptados/completados por usuario (con semana ISO)
achievements      -- catálogo de logros (hitos de racha sembrados)
user_achievements -- logros desbloqueados por usuario
benefits          -- beneficios y aliados activos
```

### Esquema resumido (según `src/types/database.ts`)

```
profiles
  id (uuid, FK auth.users)  nombre  avatar_url
  nivel  puntos_totales
  saldo_disponible  saldo_configurado  monto_guardadito  umbral_saldo_bajo
  racha_actual  racha_mas_larga  ultima_fecha_racha
  created_at  updated_at

expenses
  id  user_id  monto  categoria  descripcion  fecha  notas  created_at

goals
  id  user_id  titulo  monto_objetivo  monto_actual  fecha_limite
  color  icono  completada  created_at  updated_at

goal_contributions
  id  user_id  goal_id (nullable, ahorro libre = null)  monto  fecha  created_at

challenges
  id  titulo  descripcion  puntos  duracion_dias  tipo  meta_valor  activo
  dificultad  categoria_reto  medicion  parametro  created_at

user_challenges
  id  user_id  challenge_id  progreso  completado  fecha_inicio  fecha_fin
  semana  snapshot_nivel  progreso_cache  created_at

achievements
  id  titulo  descripcion  icono  condicion_tipo  condicion_valor  created_at

user_achievements
  id  user_id  achievement_id  fecha_desbloqueado

benefits
  id  nombre_aliado  titulo  descripcion  descuento  codigo  categoria
  color  icono  fecha_expiracion  activo  created_at
```

### RPCs SECURITY DEFINER

Todos validan `auth.uid()` y son atómicos (`for update` donde tocan saldo o puntos). Lanzan con `RAISE EXCEPTION ... USING ERRCODE` — el cliente discrimina por `error.message`. Códigos: `'42501'` no autenticado, `'23505'` unique violation, `'23514'` regla de negocio.

| RPC | Devuelve | Errores tipados (cliente) |
|---|---|---|
| `actualizar_saldo(p_monto)` | `numeric` (saldo nuevo) | — |
| `registrar_gasto(...)` | `{ expense, saldo_nuevo }` | `SALDO_INSUFICIENTE`, `SALDO_NO_CONFIGURADO` |
| `editar_gasto(p_expense_id, ...)` | `{ expense, saldo_nuevo }` | `SALDO_INSUFICIENTE`, `GASTO_NO_ENCONTRADO` |
| `eliminar_gasto(p_expense_id)` | `numeric` (saldo nuevo) | `GASTO_NO_ENCONTRADO` |
| `contribuir_meta(p_goal_id, p_monto)` | `{ goal, saldo_nuevo, monto_aplicado, racha_actual }` | `SALDO_INSUFICIENTE`, `META_NO_ENCONTRADA`, `META_YA_COMPLETADA` |
| `registrar_ahorro_libre(p_monto)` | `{ saldo_nuevo, guardadito_nuevo, racha_actual }` | `SALDO_INSUFICIENTE`, `SALDO_NO_CONFIGURADO` |
| `sacar_de_guardadito(p_monto)` | `{ saldo_nuevo, guardadito_nuevo }` | `GUARDADITO_INSUFICIENTE` |
| `eliminar_meta(p_goal_id, p_devolver_saldo)` | `numeric` (saldo nuevo) | `META_NO_ENCONTRADA` |
| `aceptar_reto(p_challenge_id)` | `user_challenges` row | `RETO_YA_ACEPTADO_ESTA_SEMANA`, `RETO_NO_ENCONTRADO` |
| `completar_reto(p_user_challenge_id)` | `{ xp_nuevo, nivel_nuevo, subio_de_nivel, progreso }` | `RETO_NO_CUMPLIDO`, `RETO_YA_COMPLETADO`, `RETO_FUERA_DE_SEMANA`, `RETO_RECLAMABLE_SOLO_DOMINGO` |
| `retos_de_la_semana(p_cantidad)` | `setof challenges` | — |
| `progreso_reto(p_user_challenge_id)` | `numeric` | `RETO_NO_ENCONTRADO` |
| `semana_iso_lima()` | `integer` (isoyear*100 + isoweek) | — |
| `nivel_desde_xp(p_xp)` / `xp_para_alcanzar_nivel(p_n)` | `integer` | — |

`aplicar_racha(p_user_id)` y `longest_consecutive_days_with_expense(p_user_id, p_desde)` son helpers internos que `revoke execute from public`; solo se invocan desde otros RPCs SECURITY DEFINER.

### Políticas RLS

Todas las tablas tienen Row Level Security activo (configurado en Supabase). Las políticas garantizan que cada usuario solo pueda leer y modificar sus propios registros (`auth.uid() = user_id`). `challenges` y `benefits` son de solo lectura para usuarios autenticados. *(Detalles exactos vivir en el dashboard de Supabase — no replicados en el repo.)*

### Trigger automático de perfil

Existe un trigger sobre `auth.users` INSERT que crea automáticamente la fila en `public.profiles`. Implementación de referencia:

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Categorías de Gastos

Definidas en `src/lib/utils.ts` (`CATEGORIAS`):

| Clave | Emoji | Color (`color`) |
|-------|-------|-----------------|
| `comida` | 🍔 | `#4F46E5` |
| `transporte` | 🚌 | `#10B981` |
| `entretenimiento` | 🎬 | `#F59E0B` |
| `educacion` | 📚 | `#8B5CF6` |
| `compras` | 🛍️ | `#EC4899` |
| `salud` | 🏥 | `#EF4444` |
| `servicios` | 💡 | `#06B6D4` |
| `otros` | 📦 | `#6B7280` |

### Categorías de Beneficios

`fitness` · `wellness` · `educacion` · `lifestyle` · `comida` · `transporte` (definidas en `types/database.ts`).

---

## Diseño y Tokens CSS

Tailwind CSS v4 sin archivo de configuración. Los tokens se definen en `src/styles/index.css` en `:root` (light), `.dark` (dark) y se exponen al motor Tailwind dentro de un bloque `@theme inline`.

```css
/* Brand */
--luka-blue:           #4F46E5     /* Primario — CTAs, íconos activos */
--luka-blue-light:     #818CF8
--luka-blue-dark:      #3730A3
--luka-green:          #10B981     /* Éxito — metas, ahorro */
--luka-green-light:    #34D399
--luka-green-dark:     #059669
--luka-purple:         #8B5CF6     /* Acento — retos, nivel */
--luka-purple-light:   #A78BFA
--luka-purple-dark:    #6D28D9
--luka-bg-gradient:    linear-gradient(135deg, #667eea 0%, #764ba2 100%)
--luka-surface:        (dark-aware: #F9FAFB / #1F2937)
--luka-text-primary:   (dark-aware: #111827 / #F9FAFB)
--luka-text-secondary: (dark-aware: #6B7280 / #9CA3AF)
```

`index.css` también define varias **animaciones personalizadas** (`luka-float`, `luka-float-slow`, `luka-pulse-ring`, `luka-gradient-pan`, `luka-shimmer`) y las desactiva bajo `@media (prefers-reduced-motion: reduce)`.

### Layout Responsive

| Breakpoint | Layout |
|------------|--------|
| `< lg` (mobile) | Bottom navigation fija con **6 ítems** (Inicio, Análisis, Agregar, Metas, Beneficios, Perfil). Botón central `+` elevado con gradiente (`-mt-5`) y pulse ring |
| `≥ lg` (desktop) | Sidebar fija izquierda de **240 px** (`w-60`) con logo, navegación con `layoutId` indicator y CTA "Nuevo gasto". Contenido con `max-w-4xl` |

`lib/motion-utils.ts` detecta `(hover: none) and (pointer: coarse)` y reemplaza variantes con desplazamientos/escalas por fade-only en móvil, para evitar artefactos de pintura en GPUs Chromium.

---

## Seguridad

| Medida | Implementación |
|--------|---------------|
| **Autenticación** | Supabase Auth con JWT. Sesión persistida en `localStorage` bajo `storageKey: 'mi-luka-auth'`. `autoRefreshToken: true`, `detectSessionInUrl: true` |
| **RLS** | Row Level Security activo en todas las tablas (configurado en Supabase). El repo no contiene las políticas |
| **Rate limiting** | **Solo en cliente**: 5 intentos fallidos de login → 60 s de bloqueo controlado por estado React. No hay rate-limit server-side propio (se delega a Supabase) |
| **Sanitización** | `sanitizeText()` en `lib/utils.ts` elimina `<` `>` y aplica `trim()`. **Aplicada en:** `signUp(nombre)` y campos `descripcion`/`notas` de gastos. **No aplicada en:** títulos de metas, edición de nombre de perfil, ni updates de gastos |
| **Validación** | Schemas Zod en todos los formularios. Monto gasto máx. **999 999**; meta máx. **9 999 999**. Descripción gasto ≤ 100, notas ≤ 500. Password: ≥ 8 chars, 1 mayúscula, 1 número. Confirmación de password con `refine`. Fecha de meta opcional pero debe ser a futuro |
| **Headers HTTP** | En `vercel.json`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, y `Content-Security-Policy` con `connect-src` restringido a `'self' https://*.supabase.co` |
| **Confirmación de email** | `signUp` configura `emailRedirectTo: ${origin}/auth`. El usuario recibe email para confirmar antes de poder iniciar sesión |
| **Reset de contraseña** | `resetPasswordForEmail` con `redirectTo: ${origin}/auth?reset=true`. La página detecta `?reset=true` o `type=recovery` en el hash y muestra la vista de nueva contraseña |
| **Storage** | Avatares en bucket `avatars` con `upsert: true`. Límite de tamaño verificado en cliente (2 MB) — **no hay validación server-side de tamaño/tipo en el repo** |
| **Secretos** | `.env.local` en `.gitignore`. `.env.example` documenta variables requeridas sin valores |

---

## Tests

El proyecto incluye tests unitarios (Vitest) y end-to-end (Playwright).

### Tests unitarios (`src/__tests__/`)

| Suite | Archivos cubiertos |
|-------|--------------------|
| `unit/leveling.test.ts` | `src/lib/leveling.ts` — bordes exactos de `nivelDesdeXp` (99→1, 100→2, 300→3, 600→4…) |
| `unit/semana.test.ts` | `src/lib/semana.ts` — `semanaIsoLima()` y `lunesLima()` en zona Lima |
| `unit/mensajes.test.ts` | `src/lib/mensajes.ts` — rotación de mensajes Banco A/B/C |
| `unit/validations.test.ts` | Schemas Zod de `balance`, `expense`, `goal` |
| `hooks/useSaldo.test.ts` | Hook `useSaldo` — actualización y estado `requiereOnboarding` |
| `hooks/useGuardadito.test.ts` | Hook `useGuardadito` — apartar y sacar con validación de saldo |
| `hooks/useRacha.test.ts` | Hook `useRacha` — racha efectiva con ruptura perezosa |
| `hooks/useSaldoNotificationWatcher.test.tsx` | Watcher de umbral saldo bajo/cero |

El setup global está en `src/test/setup.ts` e incluye mocks de `@supabase/supabase-js` para que los tests corran sin conexión real.

### Tests E2E (`e2e/`)

Cubren los flujos críticos contra un entorno real de Supabase (configurable en `.env.test`):

| Archivo | Flujo |
|---------|-------|
| `01-auth.spec.ts` | Registro, login, logout, recuperación de contraseña |
| `02-expenses.spec.ts` | Crear, editar, eliminar gasto; bloqueo por saldo insuficiente |
| `03-dashboard.spec.ts` | Carga del dashboard, edición de saldo, guardadito |
| `04-goals.spec.ts` | Crear meta, contribuir, completar, eliminar con devolución de saldo |
| `05-profile-theme.spec.ts` | Editar nombre, cambiar tema, exportar CSV |

Ver `.env.test.example` para las variables requeridas por los E2E.

---

## Instalación y Desarrollo

### Requisitos

- **Node.js** ≥ 18
- **pnpm** ≥ 11 (recomendado; el repo tiene `pnpm-lock.yaml`)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/AleeSD/Mi-Luka.git
cd Mi-Luka

# 2. Instalar dependencias
pnpm install

# 3. Autorizar build scripts (requerido una sola vez en pnpm 11)
#    Las build scripts permitidas se declaran en .npmrc + pnpm.yaml + pnpm-workspace.yaml
pnpm approve-builds --all

# 4. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# 5. Iniciar servidor de desarrollo
pnpm dev
```

La aplicación estará disponible en `http://localhost:5173`.

### Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Servidor de desarrollo con HMR (Vite) |
| `pnpm build` | `tsc -b` (typecheck con project references) seguido de `vite build` (genera `dist/`) |
| `pnpm preview` | Preview del build de producción |
| `pnpm test` | Tests unitarios y de hooks con Vitest (single run) |
| `pnpm test:watch` | Tests unitarios en modo watch (re-ejecuta al guardar) |
| `pnpm test:coverage` | Tests unitarios con reporte de cobertura de código |
| `pnpm test:e2e` | Tests end-to-end con Playwright (requiere `VITE_SUPABASE_*` en `.env.test`) |
| `pnpm test:e2e:ui` | Tests E2E con interfaz visual interactiva de Playwright |

### TypeScript

- `tsconfig.app.json`: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`, alias `@/* → ./src/*`
- `tsconfig.node.json`: configuración para `vite.config.ts`
- `vite.config.ts` lleva `// @ts-nocheck` por compatibilidad con tipos del plugin Tailwind v4

---

## Variables de Entorno

El código en `src/lib/supabase.ts` lee únicamente:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

Si alguna falta, la app lanza `Error: Faltan las variables de entorno de Supabase` en arranque.

> **Nunca** subas `.env.local` al repositorio. Está incluido en `.gitignore`.

Para obtener estos valores: [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto → Settings → API.

---

## Build y Optimización

### Code splitting manual

`vite.config.ts` define `manualChunks` para separar dependencias pesadas y mejorar el caching:

| Chunk | Contenido |
|-------|-----------|
| `charts` | `recharts`, `d3-*`, `victory-vendor` |
| `radix` | `@radix-ui/*` |
| `motion` | `motion`, `framer-motion` |
| `vendor-react` | `react`, `react-dom`, `react-router`, `scheduler` |

### Lazy routing

Cada página se importa con `React.lazy` y se envuelve en `<Suspense fallback={<PageLoader />}>`. Esto genera un chunk por ruta, reduciendo el bundle inicial.

---

## Despliegue

El proyecto está configurado para despliegue en **Vercel**. `vercel.json` incluye:

- **SPA rewrites**: todas las rutas redirigen a `index.html` para que React Router funcione correctamente
- **Cabeceras de seguridad**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Content-Security-Policy` con `connect-src 'self' https://*.supabase.co`

```bash
# Despliegue manual
pnpm build
# Subir carpeta dist/ a tu hosting preferido

# O conectar el repo a Vercel para despliegue automático en cada push a main
```

> Recuerda configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` como variables de entorno en el dashboard de Vercel.

---

## Contribuir

1. Fork del repositorio
2. Crear rama feature: `git checkout -b feature/nueva-funcionalidad`
3. Hacer cambios y verificar: `pnpm build` (0 errores TypeScript)
4. Push y crear Pull Request hacia `main`

---

## Licencia

MIT — Úsalo, modifícalo y distribúyelo libremente.

---

<p align="center">
  Desarrollado con 💚 para que la Generación Z tome control de su dinero.
</p>
