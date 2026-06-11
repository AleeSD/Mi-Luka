# Mi Luka 💸

> **Finanzas jóvenes, decisiones inteligentes.**

Mi Luka es una aplicación web fullstack de gestión de gastos personales y ahorro diseñada para la Generación Z (18–25 años). Combina un backend real en Supabase con una interfaz fintech moderna, gamificación y diseño responsive mobile + desktop.

![Stack](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-2.49-3ECF8E?logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-38B2AC?logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.3-646CFF?logo=vite&logoColor=white)

---

## Tabla de Contenidos

- [Características](#características)
- [Stack Tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Pantallas](#pantallas)
- [Base de Datos](#base-de-datos)
- [Diseño y Tokens CSS](#diseño-y-tokens-css)
- [Seguridad](#seguridad)
- [Instalación y Desarrollo](#instalación-y-desarrollo)
- [Variables de Entorno](#variables-de-entorno)
- [Despliegue](#despliegue)

---

## Características

### Funcionalidad Principal

| Módulo | Descripción |
|--------|-------------|
| **Autenticación** | Login / registro con email + contraseña. Rate limiting (5 intentos → 60s bloqueo). Reset de contraseña por email |
| **Gastos** | CRUD completo. 8 categorías con iconos y colores. Confetti en primer gasto del día |
| **Análisis** | Gráficos de barras y torta por período (semana / mes / año). Comparativa con período anterior |
| **Metas de ahorro** | Creación de metas con color, monto objetivo y fecha límite. Contribuciones parciales. Confetti al completar |
| **Retos financieros** | Sistema de retos gamificados. Puntos por completar. Niveles de usuario (cada 500 puntos) |
| **Beneficios** | Catálogo de descuentos de aliados. Filtro por categoría. Copia de código al portapapeles |
| **Perfil** | Avatar con upload. Estadísticas personales. Exportación a CSV. Toggle modo oscuro |

### UX / DX

- Diseño responsive: sidebar en desktop (lg+), bottom nav en mobile
- Modo oscuro / claro con persistencia en `localStorage`
- Skeleton loaders en todos los módulos durante carga
- Validaciones en tiempo real con Zod + React Hook Form
- Toasts informativos (Sonner) para todas las acciones
- `ErrorBoundary` global con mensaje en español

---

## Stack Tecnológico

### Frontend

| Tecnología | Versión | Rol |
|------------|---------|-----|
| [React](https://react.dev) | 18.3.1 | Framework UI |
| [TypeScript](https://typescriptlang.org) | 5.9.3 | Tipado estático estricto |
| [Vite](https://vitejs.dev) | 6.3.5 | Build tool y dev server |
| [React Router](https://reactrouter.com) | 7.13.0 | Enrutamiento SPA (`createBrowserRouter`) |
| [Tailwind CSS](https://tailwindcss.com) | 4.1.12 | Estilos utilitarios (sin config file) |
| [shadcn/ui](https://ui.shadcn.com) | — | Componentes base (Radix UI primitives) |
| [Lucide React](https://lucide.dev) | 0.487.0 | Iconografía |
| [Motion](https://motion.dev) | 12.23.24 | Animaciones (`motion/react`) |
| [Recharts](https://recharts.org) | 2.15.2 | Gráficos (BarChart, PieChart) |
| [Sonner](https://sonner.emilkowal.ski) | 2.0.3 | Notificaciones toast |
| [canvas-confetti](https://www.npmjs.com/package/canvas-confetti) | 1.9.4 | Efectos de celebración |
| [date-fns](https://date-fns.org) | 3.6.0 | Manipulación de fechas (locale `es`) |

### Backend / Infraestructura

| Tecnología | Versión | Rol |
|------------|---------|-----|
| [Supabase](https://supabase.com) | 2.49.0 | PostgreSQL + Auth + Storage |
| [Vercel](https://vercel.com) | — | Hosting con SPA rewrites y cabeceras de seguridad |

### Formularios y Validación

| Librería | Versión | Rol |
|----------|---------|-----|
| [React Hook Form](https://react-hook-form.com) | 7.55.0 | Gestión de formularios |
| [Zod](https://zod.dev) | 3.23.8 | Schemas de validación |
| [@hookform/resolvers](https://www.npmjs.com/package/@hookform/resolvers) | 3.9.0 | Integración RHF ↔ Zod |

---

## Arquitectura

```
┌─────────────────────────────────────┐
│           React SPA (Vite)          │
│                                     │
│  ┌──────────┐    ┌───────────────┐  │
│  │  Routes  │    │ ErrorBoundary │  │
│  │  (RRv7)  │    │  ThemeCtx     │  │
│  │          │    │  AuthCtx      │  │
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
        │ supabase-js v2
        ▼
┌─────────────────────┐
│    Supabase Cloud   │
│  PostgreSQL + Auth  │
│  Storage (avatars)  │
│  RLS on all tables  │
└─────────────────────┘
```

**Flujo de estado:**
- `AuthContext` → gestiona `user` y `session` vía `onAuthStateChange`
- `ThemeContext` → aplica clase `dark` a `document.documentElement`
- `use*` hooks → estado local por módulo, sin Redux ni Zustand
- Rutas protegidas con `ProtectedRoute` / `PublicOnlyRoute`

---

## Estructura del Proyecto

```
code/
├── public/
├── src/
│   ├── assets/
│   │   ├── logo.png                    # Logo sin eslogan (sidebar desktop)
│   │   └── logo-eslogan.png            # Logo con eslogan (welcome + auth)
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── ErrorBoundary.tsx       # Error boundary global (clase)
│   │   │   ├── MainLayout.tsx          # Sidebar desktop + bottom nav mobile
│   │   │   └── ProtectedRoute.tsx      # Guards: ProtectedRoute + PublicOnlyRoute
│   │   ├── shared/
│   │   │   ├── CategoryIcon.tsx        # Icono coloreado por CategoriaGasto
│   │   │   └── EmptyState.tsx          # Placeholder con emoji + CTA opcional
│   │   └── ui/                         # Componentes shadcn/ui (Radix primitives)
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── progress.tsx
│   │       ├── skeleton.tsx
│   │       ├── switch.tsx
│   │       ├── tabs.tsx
│   │       ├── textarea.tsx
│   │       └── utils.ts                # cn() helper (clsx + tailwind-merge)
│   │
│   ├── context/
│   │   ├── AuthContext.tsx             # user, session, signIn, signUp, signOut, resetPassword
│   │   └── ThemeContext.tsx            # theme (light/dark/system), toggleTheme
│   │
│   ├── hooks/
│   │   ├── useBenefits.ts              # benefits[], categoriaActiva, setCategoriaActiva
│   │   ├── useChallenges.ts            # disponibles, enCurso, completados
│   │   ├── useExpenses.ts              # expenses[], totalMes, add/edit/remove
│   │   ├── useGoals.ts                 # goalsActivas, goalsCompletadas, add/contribuir/remove
│   │   └── useProfile.ts              # profile, update, uploadProfileAvatar
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── benefits.ts             # getBenefits (con filtro opcional)
│   │   │   ├── challenges.ts           # get/aceptar/completar retos
│   │   │   ├── expenses.ts             # CRUD completo de gastos
│   │   │   ├── goals.ts                # CRUD + contribuirMeta
│   │   │   └── profiles.ts             # getProfile, updateProfile, uploadAvatar
│   │   ├── validations/
│   │   │   ├── auth.ts                 # loginSchema, registerSchema (Zod)
│   │   │   ├── expense.ts              # expenseSchema (monto, categoria, fecha…)
│   │   │   └── goal.ts                 # goalSchema, contribucionSchema
│   │   ├── supabase.ts                 # createClient<Database> tipado
│   │   └── utils.ts                    # formatCurrency, formatDate, CATEGORIAS map, sanitizeText
│   │
│   ├── pages/
│   │   ├── WelcomePage.tsx             # Pantalla de entrada con animaciones
│   │   ├── AuthPage.tsx                # Login + Registro (tabs) + rate limiting
│   │   ├── DashboardPage.tsx           # Balance, accesos rápidos, PieChart, últimos gastos
│   │   ├── AddExpensePage.tsx          # Crear / editar gasto (modo dual por :id)
│   │   ├── AnalyticsPage.tsx           # BarChart + PieChart + comparativa por período
│   │   ├── GoalsPage.tsx               # Metas con diálogos crear/contribuir
│   │   ├── ChallengesPage.tsx          # Retos disponibles, en curso, completados
│   │   ├── BenefitsPage.tsx            # Beneficios con filtro y copia de código
│   │   └── ProfilePage.tsx             # Avatar, stats, CSV export, configuración
│   │
│   ├── styles/
│   │   └── index.css                   # Tailwind v4 @import + tokens CSS --luka-*
│   │
│   ├── types/
│   │   └── database.ts                 # Tipos TypeScript + tipo Database para Supabase
│   │
│   ├── App.tsx                         # ErrorBoundary > ThemeProvider > AuthProvider > Router
│   ├── main.tsx                        # ReactDOM.createRoot
│   ├── routes.tsx                      # createBrowserRouter con rutas anidadas
│   └── vite-env.d.ts                   # /// <reference types="vite/client" />
│
├── .env.example                        # Variables de entorno requeridas (sin valores)
├── .gitattributes                      # Normalización LF cross-platform
├── .gitignore
├── .npmrc                              # onlyBuiltDependencies para pnpm 11
├── index.html
├── package.json
├── pnpm-lock.yaml
├── pnpm.yaml                           # Configuración pnpm workspace
├── tsconfig.app.json                   # strict + noUnusedLocals/Params + @/* alias
├── tsconfig.json                       # Project references
├── tsconfig.node.json
├── vercel.json                         # SPA rewrites + cabeceras de seguridad
└── vite.config.ts                      # Plugin React + Tailwind + alias @/
```

---

## Pantallas

### 1. Welcome (`/`)
Pantalla de entrada con animaciones escalonadas (Motion). Panel izquierdo con gradiente y estadísticas del producto. Botón "Comenzar gratis" → `/auth?tab=register`, botón "Ya tengo cuenta" → `/auth`. Redirige automáticamente a `/app` si hay sesión activa.

### 2. Auth (`/auth`)
Tabs `login` / `register` controlados por query param `?tab=`. Login con indicador de intentos y bloqueo de 60s tras 5 fallos (`MAX_INTENTOS = 5`, `BLOQUEO_SEGUNDOS = 60`). Registro con `PasswordStrength` (3 checks visuales: longitud, mayúscula, número). Mensajes de error traducidos al español.

### 3. Dashboard (`/app`)
- Saludo personalizado con nombre del usuario
- Tarjeta de balance con gradiente: total gastado este mes + total ahorrado en metas
- 3 accesos rápidos: agregar gasto, ver metas, ver retos
- Preview de hasta 2 metas activas con barra de progreso
- `PieChart` de gastos del mes por categoría
- Últimos 5 gastos (clic → editar)
- Skeleton loaders en todos los bloques

### 4. Agregar / Editar Gasto (`/app/add-expense`, `/app/add-expense/:id`)
Modo dual: crea o edita según presencia de `:id`. Grilla de 8 categorías con iconos (Lucide) y colores por categoría. Formulario Zod con campos: monto (máx. S/ 999,999), categoría, descripción, fecha, notas. `sanitizeText()` aplicado antes de guardar. Confetti si es el primer gasto del día.

### 5. Análisis (`/app/analytics`)
Selector de período: semana / mes / año. `BarChart` con datos por día de la semana o últimos 6 meses. `PieChart` por categoría. Lista de desglose con barra de proporción. Comparativa % vs período anterior con indicador de tendencia.

### 6. Metas de Ahorro (`/app/goals`)
Diálogo "Nueva meta" con selector de 6 colores. Barra de progreso personalizada (color de meta). Diálogo "Contribuir" con monto disponible calculado. Confetti al alcanzar el 100%. Sección colapsable de metas completadas. Botón eliminar meta.

### 7. Retos Financieros (`/app/challenges`)
Tarjeta de nivel con barra de progreso (`puntos_totales / nivel * 500`). 3 pestañas: Disponibles / En curso / Completados. Íconos dinámicos por tipo de reto (`getIcon(tipo)` de `iconMap`). Aceptar reto → crea registro `user_challenges`. Completar → suma puntos al perfil + confetti.

### 8. Beneficios (`/app/benefits`)
Filtro horizontal de categorías (pills deslizables). Tarjeta por aliado con código, descuento y fecha de expiración. Botón "Copiar" → `navigator.clipboard` con fallback `execCommand`. Alerta visual si el beneficio expira en ≤ 7 días.

### 9. Perfil (`/app/profile`)
Avatar con overlay de cámara → `<input type="file">` (límite 2MB) → upload a Supabase Storage bucket `avatars`. 4 estadísticas: gastos registrados, metas completadas, retos completados, puntos totales. Exportación de gastos a CSV (Blob + descarga programática). Toggle modo oscuro con `Switch`. Diálogo editar nombre. Botón logout.

---

## Base de Datos

### Tablas (PostgreSQL en Supabase)

```sql
profiles          -- perfil público del usuario (creado por trigger en auth.users)
expenses          -- gastos individuales
goals             -- metas de ahorro
challenges        -- catálogo de retos disponibles
user_challenges   -- retos aceptados/completados por usuario
achievements      -- catálogo de logros
user_achievements -- logros desbloqueados por usuario
benefits          -- beneficios y aliados activos
```

### Esquema resumido

```
profiles
  id (uuid, FK auth.users)  nombre  avatar_url  nivel  puntos_totales

expenses
  id  user_id  monto  categoria  descripcion  fecha  notas  created_at

goals
  id  user_id  titulo  monto_objetivo  monto_actual  fecha_limite
  color  icono  completada  created_at  updated_at

challenges
  id  titulo  descripcion  puntos  duracion_dias  tipo  meta_valor  activo

user_challenges
  id  user_id  challenge_id  progreso  completado  fecha_inicio  fecha_fin

benefits
  id  nombre_aliado  titulo  descuento  codigo  categoria
  color  icono  fecha_expiracion  activo
```

### Políticas RLS

Todas las tablas tienen Row Level Security activo. Las políticas garantizan que cada usuario solo puede leer y modificar sus propios registros. `challenges` y `benefits` son de solo lectura para usuarios autenticados.

### Trigger automático de perfil

```sql
-- Se ejecuta en auth.users INSERT
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

| Clave | Emoji | Color |
|-------|-------|-------|
| `comida` | 🍔 | `#F59E0B` |
| `transporte` | 🚌 | `#3B82F6` |
| `entretenimiento` | 🎬 | `#8B5CF6` |
| `educacion` | 📚 | `#10B981` |
| `compras` | 🛍️ | `#EC4899` |
| `salud` | 🏥 | `#EF4444` |
| `servicios` | 💡 | `#06B6D4` |
| `otros` | 📦 | `#6B7280` |

---

## Diseño y Tokens CSS

Tailwind CSS v4 sin archivo de configuración. Los tokens se definen en `src/styles/index.css` dentro de un bloque `@theme inline`:

```css
--luka-blue:             #4F46E5   /* Primario — CTAs, íconos activos */
--luka-green:            #10B981   /* Éxito — metas, ahorro */
--luka-purple:           #8B5CF6   /* Acento — retos, nivel */
--luka-gradient-start:   #667eea   /* Gradiente principal inicio */
--luka-gradient-end:     #764ba2   /* Gradiente principal fin */
--luka-text-primary:     (dark-aware)
--luka-text-secondary:   (dark-aware)
--luka-bg:               (dark-aware)
--luka-surface:          (dark-aware)
```

### Layout Responsive

| Breakpoint | Layout |
|------------|--------|
| `< lg` (mobile) | Bottom navigation fija con 5 ítems. Botón central `+` elevado con gradiente (`-mt-5`) |
| `≥ lg` (desktop) | Sidebar fija izquierda de 240px. Contenido principal con scroll libre |

---

## Seguridad

| Medida | Implementación |
|--------|---------------|
| **Autenticación** | Supabase Auth con JWT. Sesión persistida en `localStorage` bajo key `mi-luka-auth` |
| **RLS** | Row Level Security activo en todas las tablas. Políticas `user_id = auth.uid()` |
| **Rate limiting** | 5 intentos fallidos de login → bloqueo de 60 segundos en el cliente |
| **Sanitización** | `sanitizeText()` elimina caracteres `<` `>` y espacios extremos antes de guardar |
| **Validación** | Todos los formularios tienen schema Zod. Monto máximo S/ 999,999. Descripción máx. 100 chars |
| **Headers HTTP** | Configurados en `vercel.json`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Content-Security-Policy` |
| **Secretos** | `.env.local` en `.gitignore`. `.env.example` documenta variables requeridas sin valores |

---

## Instalación y Desarrollo

### Requisitos

- **Node.js** ≥ 18
- **pnpm** ≥ 11

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/AleeSD/Mi-Luka.git
cd Mi-Luka

# 2. Instalar dependencias
pnpm install

# 3. Autorizar build scripts (requerido una sola vez en pnpm 11)
#    Necesario para @tailwindcss/oxide y esbuild
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
| `pnpm dev` | Servidor de desarrollo con HMR |
| `pnpm build` | Type-check + build de producción (`dist/`) |
| `pnpm preview` | Preview del build de producción |

---

## Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto (ver `.env.example`):

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

> **Nunca** subas `.env.local` al repositorio. Está incluido en `.gitignore`.

Para obtener estos valores: [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto → Settings → API.

---

## Despliegue

El proyecto está configurado para despliegue en **Vercel**. El archivo `vercel.json` incluye:

- **SPA rewrites**: todas las rutas redirigen a `index.html` para que React Router funcione correctamente
- **Cabeceras de seguridad**: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Content-Security-Policy

```bash
# Despliegue manual
pnpm build
# Subir carpeta dist/ a tu hosting preferido

# O conectar el repo a Vercel para despliegue automático en cada push a main
```

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
