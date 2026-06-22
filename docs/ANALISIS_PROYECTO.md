# Análisis del Proyecto Mi Luka

> Reporte generado tras un recorrido completo del código contra el `README.md` previo. La fuente de verdad usada es **el código** (`src/`, `package.json`, `vite.config.ts`, `vercel.json`, `tsconfig.*`, `.npmrc`, `pnpm*.yaml`, `index.html`, `.env.example`). El esquema SQL y las políticas RLS viven solo en Supabase remoto — no fueron verificados con consultas en este pase.

---

## a) Discrepancias entre el README viejo y el código real

### 1. Tabla de Stack — versiones y dependencias

| Afirmación previa del README | Lo que dice el código |
|---|---|
| TypeScript `5.9.3` | `package.json` declara `^5.7.0` (resuelto exacto en `pnpm-lock.yaml`). |
| Supabase `2.49` | `^2.49.0` (rango mínimo, sin pin exacto). |
| Solo lista React, Vite, TS, Tailwind, RR7, shadcn, Lucide, Motion, Recharts, Sonner, canvas-confetti, date-fns, RHF, Zod, `@hookform/resolvers` | Faltan en la tabla: **`clsx`, `tailwind-merge`, `class-variance-authority`, `tw-animate-css`, `@tailwindcss/vite`**, y la **larga lista de primitives Radix** (`accordion`, `alert-dialog`, `aspect-ratio`, `avatar`, `checkbox`, `collapsible`, `context-menu`, `dialog`, `dropdown-menu`, `hover-card`, `label`, `menubar`, `navigation-menu`, `popover`, `progress`, `radio-group`, `scroll-area`, `select`, `separator`, `slider`, `slot`, `switch`, `tabs`, `toggle`, `toggle-group`, `tooltip`). |
| "React Router 7.13.0 (`createBrowserRouter`)" | Correcto, **pero** el paquete instalado es `react-router` (no `react-router-dom`). Detalle relevante para nuevos contribuidores. |

### 2. Estructura del proyecto

| Afirmación previa | Realidad |
|---|---|
| `code/public/` listado en el árbol | **No existe**. El favicon se sirve desde `src/assets/logo.png` (ver `index.html`). |
| `src/components/ui/button.tsx` listado | **No existe**. Los botones se renderizan como `<button>` con clases Tailwind directamente. |
| No mencionado | **Existe** `src/components/ui/use-mobile.ts` con `useIsMobile()` (breakpoint 768 px). |
| No mencionado | **Existe** `src/lib/motion-utils.ts` con `supportsHover`, `isMobile`, `fadeUp`, `scaleIn` para variantes adaptativas mobile/desktop. |
| No mencionado | `pnpm-workspace.yaml` y `pnpm.yaml` existen además de `.npmrc` (tres archivos haciendo trabajo similar; ver §b). |

### 3. ThemeContext

| Afirmación previa | Realidad |
|---|---|
| "`theme (light/dark/system)`, `toggleTheme`" | Expone `theme`, `setTheme(theme)` y `resolvedTheme`. **No hay `toggleTheme`** — el `Switch` del Perfil hace el toggle inline llamando a `setTheme`. |

### 4. AuthContext

| Afirmación previa | Realidad |
|---|---|
| "signIn, signUp, signOut, resetPassword" | También expone **`updatePassword`** (usada en la vista de reseteo). |
| "Reset de contraseña por email" | Correcto, **pero la vista de reseteo y la de "forgot" no estaban documentadas como sub-vistas en la sección Pantallas**. |
| No mencionado | `signUp` pasa `emailRedirectTo: ${origin}/auth`. `resetPassword` pasa `redirectTo: ${origin}/auth?reset=true`. La sub-vista `reset` se activa con `?reset=true` o `type=recovery` en el hash. |
| No mencionado | `signUp` aplica `sanitizeText(nombre)` antes de mandarlo a Supabase. **No** normaliza email (no hace `trim()` ni `toLowerCase()`). |

### 5. Rate limiting

- Confirmado: `MAX_INTENTOS = 5`, `BLOQUEO_SEGUNDOS = 60` en `AuthPage.tsx`. ✓
- **Solo cliente**: vive en estado React; se reinicia al recargar la página. El README anterior daba a entender que era una protección dura.

### 6. Categorías de gastos — colores incorrectos

El README viejo decía:

```
comida           #F59E0B
transporte       #3B82F6
entretenimiento  #8B5CF6
educacion        #10B981
```

El código (`src/lib/utils.ts`) tiene:

```
comida           #4F46E5
transporte       #10B981
entretenimiento  #F59E0B
educacion        #8B5CF6
```

Los emojis sí coinciden, pero **todos los colores listados estaban mal mapeados**.

### 7. Sanitización

El README afirmaba que `sanitizeText()` se aplica "antes de guardar". En realidad **solo se invoca en dos lugares**:

- `AuthContext.signUp(nombre)`
- `AddExpensePage` para `descripcion` y `notas`

**No se aplica** en: edición de gastos (`editExpense`), creación/contribución de metas, edición de nombre de perfil. El README ahora lo aclara.

### 8. Bottom navigation

El README decía "5 ítems". En `MainLayout.tsx` hay **6**: Inicio, Análisis, Agregar (botón especial central), Metas, Beneficios, Perfil.

### 9. Validaciones — algunos límites no estaban documentados

- Meta de ahorro: `monto_objetivo` máx. `9 999 999` (gasto era `999 999`).
- Notas de gasto: máx. 500 caracteres.
- Fecha de meta: opcional, pero si se da, **debe ser futura** (refine en Zod).
- Password: regex de mayúscula y número (no solo "longitud, mayúscula, número" como checks visuales — son reglas reales en el schema).

### 10. CSP y conexiones

El README mencionaba CSP genérico. La política real restringe `connect-src` a `'self' https://*.supabase.co`, `script-src 'self' 'unsafe-inline'`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' data: https:`, `font-src 'self' data:`. Útil dejar el detalle por si alguien añade un nuevo dominio (Sentry, analytics…).

### 11. Build/optimización omitidos

El README viejo no mencionaba:

- **Lazy loading** con `React.lazy` por página en `routes.tsx`.
- **`manualChunks`** en `vite.config.ts` para separar `charts`, `radix`, `motion`, `vendor-react`.
- `vite.config.ts` lleva `// @ts-nocheck`.

### 12. Pequeños

- README llamaba al sidebar "240px" pero usaba clase `w-60` (que efectivamente son 240 px, correcto, pero conviene anclar el cómputo).
- README mencionaba "📦 #6B7280" — correcto.
- README mencionaba "Bloqueo de 60s tras 5 fallos" en sección Auth — correcto.
- README decía que `useChallenges` expone `disponibles, enCurso, completados` — correcto, **pero también** `acceptChallenge`, `completeChallenge`, `refresh`.
- README no mencionaba que el bucket de avatares usa la ruta `avatars/{user_id}.{ext}` con `upsert: true`.

---

## b) Cosas que el código hace mal o le faltan (encontradas de paso)

### B1. `vite.config.ts` con `// @ts-nocheck`

Apaga el chequeo de tipos del archivo. Funcional pero esconde problemas reales si en el futuro se sustituye el plugin de Tailwind o Vite. Vale la pena resolver los tipos correctos.

### B2. `completarReto` no es transaccional

En `lib/db/challenges.ts`:

```ts
await supabase.from('user_challenges').update({ completado: true, ... }).eq('id', ...)
const { data: profile } = await supabase.from('profiles').select('puntos_totales').eq('id', userId).single()
await supabase.from('profiles').update({ puntos_totales: profile.puntos_totales + puntos }).eq('id', userId)
```

Tres queries sin transacción. Si la segunda o tercera falla, el reto queda marcado completado pero **sin sumar puntos**. Hay riesgo de race condition entre lecturas/escrituras concurrentes (dos completaciones simultáneas perderían puntos por last-write-wins). **Solución:** RPC server-side en Postgres con `update profiles set puntos_totales = puntos_totales + $1` o `increment` atómico.

### B3. Manejo de errores que oculta el mensaje real

Patrón repetido en `lib/db/*`:

```ts
if (error) throw new Error('No se pudieron cargar los gastos')
```

Se descarta `error.message` real (códigos Postgres, `42501` por RLS, etc.). El usuario recibe siempre el mismo mensaje; el debugging requiere abrir DevTools manualmente porque ni siquiera se hace `console.error`. Recomendado: loguear `error` antes de tirar el wrapper amigable, o usar un wrapper que preserve `.cause`.

En `AuthContext.signIn`, además, sólo se distingue "Invalid login credentials" vs. genérico — emails no confirmados o usuarios bloqueados pueden caer al genérico sin contexto.

### B4. Falta normalización de inputs

- **Email**: ni `trim()` ni `toLowerCase()` antes de mandar a Supabase. Un espacio accidental al final convierte el login en fallo y consume un intento del rate limit.
- **Nombre del perfil**: `updateProfile` no aplica `sanitizeText`. Un usuario puede meter `<script>` en su nombre (el render usa React text-content, no `dangerouslySetInnerHTML`, así que no es XSS directo, pero **incumple la promesa del README**).
- **Descripción/notas en edit**: `updateExpense` no sanitiza, a diferencia de `createExpense`.
- **Título de meta**: nunca se sanitiza.

### B5. `useExpenses.totalMes` se recalcula en cada render

Es un filter+reduce sobre todo `expenses` sin `useMemo`. Mientras el array no sea enorme, no es problema, pero el patrón se repite en otras páginas (Dashboard, Analytics) y debería memoizarse.

### B6. `getDiasRestantes` con drift de zona horaria

`parseISO(fechaLimite).getTime() - new Date().getTime()` mezcla instantes en UTC con fechas tipo `YYYY-MM-DD` que `parseISO` interpreta como medianoche local. Cerca de cambios de día puede contar mal por uno. No crítico, pero notable para "expira en ≤ 7 días".

### B7. `tsBuildInfoFile` apunta a `node_modules/.tmp/`

`tsconfig.app.json` guarda el incremental ahí. Si se borra `node_modules` (algo común en CI/cleanups), el caché desaparece. No es bug, pero es inusual; lo estándar es `.tsbuildinfo` en raíz o en `dist/`.

### B8. Tres archivos para configurar pnpm builds

`.npmrc` declara `onlyBuiltDependencies[]`, `pnpm.yaml` repite lo mismo y añade `sharp`, y `pnpm-workspace.yaml` usa el formato `allowBuilds`. **Tres fuentes de verdad superpuestas** y ligeramente discrepantes. Habría que consolidar en uno (idealmente `pnpm-workspace.yaml` que es el oficial moderno).

### B9. Persistencia de `intentosFallidos` solo en memoria

El bloqueo de 5/60s muere al refrescar. Un atacante con un script puede recargar y reintentar. Si la intención es defensa real, el contador debe vivir en `localStorage` con expiración, o (mejor) delegarse al rate-limit de Supabase Auth.

### B10. Falta validación de tipo/tamaño en `uploadAvatar` server-side

`uploadProfileAvatar` chequea 2 MB en cliente, pero no valida MIME ni tamaño en Supabase Storage RLS. Un cliente modificado puede subir cualquier cosa. Configurar políticas en el bucket.

### B11. `dist/` y `UsersHOGARAppDataLocalTempanim-shots/` en el repo

Hay un directorio `dist/` y una carpeta `UsersHOGARAppDataLocalTempanim-shots/` (temp screenshots) en el root. `dist/` debería estar fuera del index de Git (sí está en `.gitignore`, comprobar si quedó historial), y el `UsersHOGAR...` parece basura accidental de algún tool — `.gitignore` la excluye con `UsersHOGAR*/` así que probablemente solo es local.

### B12. Sin tests, sin lint, sin formatter

- `package.json` no declara `test`, `lint`, ni `format`. No hay Jest/Vitest/Playwright, ni ESLint, ni Prettier configurados. Un CI básico solo correría `tsc -b && vite build`.

### B13. Esquema SQL fuera del repo

El esquema y RLS solo viven en Supabase. Riesgos:
- No hay reproducibilidad (un dev nuevo no puede levantar Postgres local).
- Cambios al esquema no se versionan junto al código que los consume.
- Si Supabase se pierde, el esquema se reconstruye a mano leyendo `types/database.ts`.

Recomendado: usar `supabase` CLI con `supabase db dump` o migrations en `supabase/migrations/`.

### B14. `useGoals` espera a `authLoading` pero `useExpenses` y otros no

`useGoals` espera `authLoading` antes de decidir si hay user. `useExpenses`, `useChallenges`, `useBenefits` no — disparan request con `user?.id` que puede ser `undefined` o causar un flash de "no autenticado". Inconsistencia.

### B15. `ProtectedRoute` skeleton de tema claro

`ProtectedRoute` usa `bg-[#F9FAFB]` hardcoded. En dark mode produce un flash blanco mientras carga la sesión. Usar variable `--luka-surface`.

### B16. Rutas no manejan 404 dentro de `/app`

`{ path: '*', element: <Navigate to="/" replace /> }` está al top level. No hay un 404 amigable dentro de `/app` — al pegar `/app/cualquiercosa` redirige a `/`.

### B17. `goals.ts` no expone `updateGoal` genérico

Solo `createGoal`, `contribuirMeta`, `deleteGoal`. Si se quiere renombrar una meta o cambiar la fecha límite, no hay API — sólo borrar y crear.

---

## c) Candidatos a mejora (ordenados por impacto)

> **No implementar todavía** — esta es una lista priorizada para que el dueño decida.

### Impacto alto

1. **Convertir `completarReto` a RPC atómico** (incremento de puntos transaccional). Riesgo de pérdida de puntos hoy. [B2]
2. **Versionar el esquema SQL y RLS en el repo** (`supabase/migrations/`). Reproducibilidad y onboarding. [B13]
3. **Endurecer rate limit / login**: mover contador a `localStorage` con expiración o delegar a Supabase. Trim+lowercase de email para no quemar intentos. [B9, B4]
4. **Configurar políticas RLS y validación de tipo/tamaño en bucket `avatars`** (Supabase Storage). [B10]
5. **Sanitización consistente** de todos los inputs guardados (nombre de perfil, título de meta, edición de gasto). [B4, B7-readme]

### Impacto medio

6. **Mejorar el manejo de errores** en `lib/db/*`: preservar y loguear el error original; mostrar mensajes más útiles cuando se pueda distinguir. [B3]
7. **Añadir test setup mínimo** (Vitest + RTL) para hooks (`useExpenses`, `useGoals`) y para `sanitizeText`/`formatCurrency`. Sin tests, todo refactor es a ciegas. [B12]
8. **Lint + format**: ESLint con preset React/TS + Prettier. Reglas que ya falla `tsconfig` (`noUnusedLocals`) se cazan más tarde de lo necesario.
9. **Memoizar agregaciones derivadas** (`totalMes`, `goalsActivas`, `gastosMes` en Dashboard/Analytics) con `useMemo`. [B5]
10. **Unificar el patrón de espera a auth** entre hooks (usar `authLoading` en todos o ninguno). [B14]

### Impacto bajo / quality of life

11. **Eliminar `// @ts-nocheck` de `vite.config.ts`**. [B1]
12. **Consolidar configuración pnpm** en `pnpm-workspace.yaml` único. [B8]
13. **Skeleton de `ProtectedRoute` con tokens de tema** para evitar flash blanco. [B15]
14. **Mover `tsBuildInfoFile`** fuera de `node_modules/`. [B7]
15. **Añadir `updateGoal`** en `lib/db/goals.ts` y permitir editar título / fecha en la UI. [B17]
16. **404 amigable** para rutas inválidas dentro de `/app`. [B16]
17. **Corregir drift de zona horaria** en `getDiasRestantes` (parsear como local o usar `differenceInCalendarDays` de date-fns). [B6]
18. **Limpiar la carpeta `UsersHOGARAppDataLocalTempanim-shots/`** del working tree. [B11]
