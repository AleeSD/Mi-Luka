# Plan de Mejoras Mi Luka — Diseño (Fase 0, revisión 5)

> Documento de diseño previo a la implementación. Las migraciones 0001–0010 ya están **generadas y aplicadas en Supabase**. Las decisiones de §2 (A, B, C, E, F) están aprobadas. **La rev. 5 redefine §2.B (racha)**: la racha ya no se alimenta solo de contribuciones a metas; ahora cuenta también **ahorro libre** sin meta destino. Esto introduce `profiles.monto_guardadito` (alcancía general) y dos RPCs nuevos (`registrar_ahorro_libre`, `sacar_de_guardadito`) en una migración aditiva **0011** (no se tocan las 0001–0010 existentes). La rev. 4 había convertido los retos en repetibles semana a semana (§2.D). La rev. 2 incorporó `saldo_configurado`, la 0010 destructiva y el portón de onboarding. La rev. 3 cerró 7 huecos.

---

## 0. Punto de partida (lo que el código YA hace)

- `profiles.puntos_totales` se incrementa en `completarReto` (con la falla B2: no atómico).
- `profiles.nivel` existe en la DB pero **nunca se incrementa** desde código — la UI lo lee y muestra "Nivel 1" para siempre. Bug latente.
- `achievements` y `user_achievements` están **declarados en `types/database.ts` pero ningún archivo `lib/db/*` los consulta**. Son terreno libre para reutilizar.
- No existe ninguna noción de saldo, racha, ni rotación de retos en el repo.

---

## 1. Modelo de datos propuesto

### 1.1 Cambios sobre tablas existentes

#### `profiles` — columnas nuevas

| Columna | Tipo | Default | Propósito |
|---|---|---|---|
| `saldo_disponible` | `numeric(12,2) not null` | `0` | Contador vivo de plata disponible. Se sobrescribe al editar y se descuenta en gastos/contribuciones/ahorro libre. |
| `saldo_configurado` | `boolean not null` | `false` | **Portón de onboarding.** Mientras esté en `false`, la app obliga a ingresar el saldo antes de usar nada. Se pone en `true` la primera vez que el RPC `actualizar_saldo` corre. Resuelve la ambigüedad "no configurado" vs. "tengo S/ 0 de verdad". |
| `monto_guardadito` | `numeric(12,2) not null` | `0` | **Alcancía / guardadito.** Acumulado de ahorro libre del usuario (sin meta destino). Cada `registrar_ahorro_libre` descuenta del saldo y suma aquí. `sacar_de_guardadito` revierte por simetría. Check `>= 0`. |
| `racha_actual` | `integer not null` | `0` | Días consecutivos con ≥1 contribución a meta. |
| `racha_mas_larga` | `integer not null` | `0` | Récord histórico para mostrar en Perfil. |
| `ultima_fecha_racha` | `date` | `null` | Último día que contó como "ahorrado". Se usa para detectar ruptura. |
| `umbral_saldo_bajo` | `numeric(12,2) not null` | `50` | Disparador del Banco C (notificación de saldo bajo). Tunable por usuario; default 50 PEN. |

Sobre `puntos_totales` y `nivel`:
- `puntos_totales` se **reinterpreta como XP** (sin renombrar la columna; evita romper datos y refs).
- `nivel` deja de ser fuente de verdad: el código lo calcula con `nivelDesdeXp(xp)`. La columna se mantiene por compatibilidad y la migración la **resetea a la fórmula nueva** para todos los perfiles existentes (no se pierden datos: `puntos_totales` queda igual).

#### `challenges` — columnas nuevas

| Columna | Tipo | Default | Propósito |
|---|---|---|---|
| `dificultad` | `text` `check in ('facil','media','dificil')` | `'media'` | Para diversificar el catálogo y asignar puntos por dificultad. |
| `categoria_reto` | `text` | `null` | Etiqueta libre (`ahorro`, `control`, `registro`, `progreso`) para UX. |
| `medicion` | `text` | requerido | Identificador legible-por-código de cómo se calcula el progreso. Ver §2.D para la lista. |

#### `user_challenges` — columnas nuevas

| Columna | Tipo | Default | Propósito |
|---|---|---|---|
| `semana` | `integer not null` | calculado | Año-ISO * 100 + semana-ISO en `America/Lima` (p.ej. `202525` = semana 25 de 2025). Se setea al aceptar el reto. |
| `progreso_cache` | `numeric(12,2)` | `0` | Valor cacheado del progreso (se actualiza atómico al completar). Se muestra como fallback; la UI prefiere calcular live con la función SQL `progreso_reto`. |

Constraint que **reemplaza** el modelo one-time:

```sql
alter table user_challenges
  add constraint user_challenges_user_challenge_semana_unique
  unique (user_id, challenge_id, semana);
```

Significado: **un mismo reto se puede completar muchas veces a lo largo del tiempo, pero solo una por semana ISO**. Filas de semanas pasadas quedan como historial.

#### `achievements` — sin cambios estructurales

Se reutiliza tal cual: `condicion_tipo='racha'` + `condicion_valor=10/25/50/100/...` para los hitos de racha. Se hace **seed** en migración (sección 1.4).

### 1.2 Tablas nuevas

Una sola tabla nueva, requerida para los retos basados en "N contribuciones esta semana" / "ahorraste en M días distintos":

#### `goal_contributions` — log inmutable de contribuciones a metas

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid pk default gen_random_uuid()` | |
| `user_id` | `uuid not null references auth.users` | RLS `user_id = auth.uid()` |
| `goal_id` | `uuid not null references public.goals` | |
| `monto` | `numeric(12,2) not null check (monto > 0)` | El delta efectivo (ya clampado al objetivo). |
| `fecha` | `date not null` | Fecha de Lima en la que ocurrió (computada en el RPC). |
| `created_at` | `timestamptz default now()` | |

- Sin `updated_at`, sin update: es **append-only**. Las contribuciones no se editan; si se quiere deshacer, se borra la meta (devolviendo todo al saldo) o se crea una contraparte.
- Lo insert el RPC `contribuir_meta` en la misma transacción que descuenta saldo.
- Habilita el cálculo barato de `count(*) where fecha entre lunes y domingo` y `count(distinct fecha)` para los retos de la semana.
- Los hitos de racha siguen leyendo `profiles.ultima_fecha_racha` (no esta tabla) — no se cambia esa parte.

La 0010 destructiva **no** borra `goal_contributions` (es nueva, no existe antes de la migración). Si se quiere "punto de partida limpio" igual, se puede añadir un `truncate` en la 0010; **lo dejaré fuera** porque las contribuciones pasadas son hechos verdaderos y podrían usarse para mostrar histórico en Perfil. Confírmame si prefieres truncarlas.

### 1.3 RPCs (funciones server-side, security definer)

Todos los RPCs son **SECURITY DEFINER**, validan `auth.uid()` internamente, y se ejecutan en transacción única.

| RPC | Firma | Responsabilidad |
|---|---|---|
| `actualizar_saldo` | `(p_monto numeric) returns numeric` | Sobrescribe `profiles.saldo_disponible` con `p_monto` **y pone `saldo_configurado = true`** en la misma sentencia. Devuelve el nuevo saldo. Cubre tanto el onboarding (primera vez) como la edición posterior — no hace falta un `configurar_saldo_inicial` separado. |
| `registrar_ahorro_libre` | `(p_monto numeric) returns jsonb` | Atómico. Valida `saldo_configurado` y `saldo >= p_monto` (bloqueo duro con `SALDO_INSUFICIENTE`/`SALDO_NO_CONFIGURADO`). Descuenta del saldo, suma al guardadito, **inserta en `goal_contributions` con `goal_id = null`**, llama a `aplicar_racha`. Devuelve `{ saldo_nuevo, guardadito_nuevo, racha_actual }`. Migración 0011. |
| `sacar_de_guardadito` | `(p_monto numeric) returns jsonb` | Atómico. Valida `guardadito >= p_monto` (raise `GUARDADITO_INSUFICIENTE`). Suma al saldo, resta del guardadito. **No** toca la racha. Devuelve `{ saldo_nuevo, guardadito_nuevo }`. Migración 0011. |
| `registrar_gasto` | `(p_monto, p_categoria, p_descripcion, p_fecha, p_notas) returns jsonb` | Atómico: bloquea fila de profiles (`for update`), valida `saldo >= monto`, inserta gasto, descuenta saldo. Devuelve `{ expense, saldo_nuevo }`. Lanza `RAISE EXCEPTION ... USING ERRCODE = '23514'` con mensaje `'SALDO_INSUFICIENTE'` si no alcanza. |
| `editar_gasto` | `(p_expense_id uuid, p_monto, p_categoria, p_descripcion, p_fecha, p_notas) returns jsonb` | Atómico. Lee el gasto, **valida ownership** (`user_id = auth.uid()`, si no existe o no es del caller, raise `'GASTO_NO_ENCONTRADO'`). Calcula `delta = p_monto - expense.monto`. Bloquea profiles `for update`. Si `delta > 0` y `saldo < delta` → raise `'SALDO_INSUFICIENTE'` con `ERRCODE = '23514'`. Actualiza el gasto y aplica `saldo -= delta` (que ajusta correctamente para deltas negativos o cero). Devuelve `{ expense, saldo_nuevo }`. |
| `eliminar_gasto` | `(p_expense_id uuid) returns numeric` | Atómico. Valida ownership (raise `'GASTO_NO_ENCONTRADO'` si no aplica). Bloquea profiles `for update`, suma `expense.monto` al saldo, borra el gasto. Devuelve el nuevo saldo. |
| `contribuir_meta` | `(p_goal_id uuid, p_monto numeric) returns jsonb` | Igual de atómico: bloquea profiles + goal, valida saldo, clampa al objetivo restante, descuenta saldo por el **delta efectivo**, actualiza meta y completada flag. Actualiza racha en el mismo paso (sección 1.4). Devuelve `{ goal, saldo_nuevo, racha_actual }`. Mismo error si insuficiente. |
| `aceptar_reto` | `(p_challenge_id uuid) returns user_challenges` | Inserta una fila en `user_challenges` con `semana = semana_iso_lima()` y `snapshot_nivel = profiles.nivel` actual. Falla con `SQLSTATE '23505'` si el usuario ya aceptó este reto esta semana (constraint `user_challenges_user_challenge_semana_unique`). Reemplaza el insert directo del cliente. |
| `completar_reto` | `(p_user_challenge_id uuid) returns jsonb` | Bloquea perfil + user_challenge. Valida ownership, `semana = semana_iso_lima()` (no se pueden completar retos de semanas pasadas) y `completado = false` (raise `'RETO_YA_COMPLETADO'`). **Re-evalúa server-side** llamando a `progreso_reto(p_user_challenge_id)`; si `progreso < challenges.meta_valor`, raise `'RETO_NO_CUMPLIDO'`. Solo entonces marca `completado=true`, fija `fecha_fin`, suma `challenges.puntos` a `puntos_totales`, recalcula `nivel = nivel_desde_xp(puntos_totales)`. Devuelve `{ xp_nuevo, nivel_nuevo, subio_de_nivel }`. |
| `eliminar_meta` | `(p_goal_id uuid, p_devolver_saldo boolean default true) returns numeric` | Si `p_devolver_saldo`, suma `monto_actual` al saldo antes de borrar. Devuelve el nuevo saldo (o el actual si no devolvió). |
| `retos_de_la_semana` | `(p_cantidad int default 5) returns setof challenges` | Selección determinística semanal de retos del catálogo **que el usuario aún no aceptó ni completó esta semana** (semana ISO Lima). Ver §2.D.3. |
| `progreso_reto` | `(p_user_challenge_id uuid) returns numeric` | Calcula progreso live para el reto según su `medicion`. Ver §2.D.2. |
| `semana_iso_lima` | `() returns integer` | Helper usado en aceptar_reto, completar_reto y retos_de_la_semana. |

> **Hueco funcional cerrado en rev. 3:** antes, `createExpense` restaba del saldo pero `updateExpense` y `deleteExpense` lo dejaban desfasado. Ahora hay simetría completa: registrar, editar y eliminar gasto **todos** ajustan el saldo atómicamente. La regla de bloqueo por saldo insuficiente aplica también a la edición (cuando el delta es positivo).

> **Códigos de error usados:** `SQLSTATE '23514'` (check_violation) para `'SALDO_INSUFICIENTE'`, `'SALDO_NO_CONFIGURADO'`, `'META_NO_ENCONTRADA'`, `'GASTO_NO_ENCONTRADO'`, `'RETO_NO_ENCONTRADO'`, `'RETO_YA_COMPLETADO'`. El cliente discrimina por el `message`, no por el código (el código es el mismo para señalar "regla de negocio violada"). `'23505'` (unique_violation) cae naturalmente en `aceptarReto` si el usuario intenta re-aceptar un reto.

> **Propagación de errores — REGLA INNEGOCIABLE:** todos los RPC lanzan con `RAISE EXCEPTION '<MENSAJE>' USING ERRCODE = '<codigo>'`. **Ningún RPC envuelve su lógica en `BEGIN ... EXCEPTION WHEN OTHERS THEN ... END`** que se trague el error o impida el rollback. Patrón prohibido:
> ```sql
> -- ❌ NO HACER: traga el error y revierte el rollback automático
> begin
>   -- lógica
> exception when others then
>   return null;
> end;
> ```
> Patrón correcto: dejar que Postgres propague la excepción a través de PostgREST, que la entrega al cliente como `error.message` con el `SQLSTATE`. El bloque `EXCEPTION` solo se usa cuando se necesita **traducir** un error específico a otro mensaje (p.ej. `WHEN unique_violation THEN RAISE EXCEPTION 'RETO_YA_ACEPTADO' USING ERRCODE = '23505'`) y siempre vuelve a lanzar — nunca devuelve silenciosamente. Esto garantiza que un error de negocio aborte la transacción entera y el cliente reciba el `message` real para mapearlo a la notificación correspondiente.

Helpers SQL:
- `nivel_desde_xp(xp integer) returns integer immutable` — espejo del helper TS. Misma fórmula.
- `xp_para_alcanzar_nivel(n integer) returns integer immutable` — ídem.

### 1.4 Migraciones SQL (archivos a crear en `supabase/migrations/`)

> Todas idempotentes (`if not exists`, `or replace`, `drop ... if exists`). RLS estricto: `user_id = auth.uid()` en todo lo nuevo.

| Archivo | Contenido |
|---|---|
| `0001_init_baseline.sql` | **Captura el estado actual** de la DB en SQL (todas las tablas hoy en Supabase + RLS existente + trigger `handle_new_user`). Resuelve el hallazgo B13. Marcado claramente como "baseline retroactivo". **Estrategia preferida:** si tienes Supabase CLI, generarlo con `supabase db dump --schema public --file supabase/migrations/0001_init_baseline.sql` y revisar el output. Si no tienes CLI, lo escribo a mano basándome en `src/types/database.ts` + el trigger documentado en el README, pero con un comentario `-- ⚠️ Baseline reconstruido a mano: puede no reflejar el remoto al 100%`. |
| `0002_profiles_saldo_y_racha.sql` | `alter table profiles add column if not exists saldo_disponible / saldo_configurado / racha_actual / racha_mas_larga / ultima_fecha_racha / umbral_saldo_bajo`. Backfill seguro (todos los perfiles existentes nacen con `saldo_configurado = false` → pasan por el portón). |
| `0003_challenges_metadata.sql` | `alter table challenges add column dificultad / categoria_reto / medicion` con defaults. `alter table user_challenges add column semana integer / snapshot_nivel integer / progreso_cache numeric`. Constraint `unique (user_id, challenge_id, semana)`. |
| `0003a_goal_contributions.sql` | Crea tabla `goal_contributions` (append-only) + RLS `user_id = auth.uid()` + índices `(user_id, fecha desc)` y `(user_id, goal_id, fecha desc)`. |
| `0004_leveling_helpers.sql` | Crea `nivel_desde_xp`, `xp_para_alcanzar_nivel` (immutable). `update profiles set nivel = nivel_desde_xp(puntos_totales)` para resincronizar perfiles existentes. |
| `0005_rpc_atomicos.sql` | `actualizar_saldo`, `registrar_gasto`, `editar_gasto`, `eliminar_gasto`, `contribuir_meta` (inserta también en `goal_contributions`), `completar_reto` (con re-validación de `progreso_reto`), `aceptar_reto`, `eliminar_meta`. Todas SECURITY DEFINER, con `grant execute to authenticated`. |
| `0006_racha_helper.sql` | Función `aplicar_racha(p_user_id uuid) returns void` invocada por `contribuir_meta`. Maneja primera contribución del día, consecutivo, ruptura. **No** se invoca solo: solo desde el RPC de contribuir. |
| `0007_rotacion_retos.sql` | Funciones `semana_iso_lima`, `longest_consecutive_days_with_expense`, `progreso_reto` y `retos_de_la_semana` (todas en §2.D). |
| `0008_seed_achievements_racha.sql` | Inserta logros de racha (10, 25, 50, 100, 200, 365 días) con `condicion_tipo='racha'`. Idempotente con `on conflict do nothing`. |
| `0009_seed_challenges_ampliados.sql` | Inserta los **17 retos semanales** del catálogo (§2.D.6) con `dificultad`, `categoria_reto`, `medicion`, `puntos` por dificultad (20/40/80) y `meta_valor`. Idempotente con `on conflict (titulo) do nothing` (asume un `unique(titulo)` que también añade esta migración para los retos seed). |
| `0011_guardadito_y_ahorro_libre.sql` | **Rev. 5 — aditiva**, no toca las 0001–0010. Añade `profiles.monto_guardadito numeric(12,2) not null default 0` con check `>= 0`. Crea RPCs `registrar_ahorro_libre` y `sacar_de_guardadito`. Idempotente con guards en `pg_constraint` y `create or replace function`. Se aplica vía `supabase db push` después de la 0010 sin precaución especial. |

**Migración separada (destructiva, una sola vez):**

| Archivo | Contenido |
|---|---|
| `0010_reset_progreso_usuarios.sql` | **⚠️ MIGRACIÓN DESTRUCTIVA DE UNA SOLA VEZ.** Cabecera del archivo lo deja muy claro. Resetea `profiles.puntos_totales = 0`, `profiles.nivel = nivel_desde_xp(0)`, `racha_actual = 0`, `racha_mas_larga = 0`, `ultima_fecha_racha = null`, `saldo_disponible = 0`, `saldo_configurado = false` para **todos** los perfiles. Borra `user_challenges` y `user_achievements` por completo. **Conserva intactos** `expenses` y `goals` (incluido `monto_actual` y `completada`). **NO ES IDEMPOTENTE en el sentido útil**: re-ejecutarla borraría el avance que el usuario reconstruyera. Va en un archivo aparte para que el dashboard de Supabase no la incluya en un `db push` accidental. |

**Instrucciones para aplicar** (incluidas en cada migración como comentario y en el README de `supabase/migrations/`):

**Antes de aplicar nada — paso 0 (baseline 0001):**

```bash
# Si tienes Supabase CLI instalado, GENERA el baseline real del remoto.
# Esto es preferible a mi versión escrita a mano porque captura tipos
# enum, índices y permisos exactos.
supabase link --project-ref <ref>
supabase db dump --schema public --file supabase/migrations/0001_init_baseline.sql

# Si NO tienes CLI, usa el 0001 que generaré a mano. Llevará un comentario
# advirtiendo que puede no reflejar el remoto al 100%; las migraciones
# 0002–0009 son aditivas e idempotentes y no dependen del contenido exacto
# del baseline para funcionar.
```

```bash
# Opción A: Supabase CLI (recomendada)
supabase link --project-ref <ref>

# 1) Aplicar migraciones idempotentes 0001–0009
supabase db push
```

**2) ⚠️ ANTES de la 0010, hacer respaldo.** Dos opciones; recomendada la primera porque vive fuera del proyecto:

**Opción 1 — `pg_dump` local (preferida):**

```bash
# Toma la connection string desde Supabase Dashboard → Project Settings → Database
pg_dump \
  --host <db-host> --port 5432 --username postgres \
  --no-owner --no-privileges \
  --table public.profiles \
  --table public.user_challenges \
  --table public.user_achievements \
  --file backup_pre_0010_20250617.sql \
  <db-name>

# Restaurar si algo sale mal:
# psql ... -f backup_pre_0010_20250617.sql
```

**Opción 2 — Snapshot dentro de la misma DB** (más rápido, vive en el mismo Postgres). Pégalo en el SQL Editor con la fecha de **hoy** escrita a mano (no uses `$(date)`, esa es sintaxis de shell y el SQL Editor no la expande):

```sql
-- Reemplaza 20250617 por la fecha real del día en que aplicas la 0010
create table _backup_profiles_20250617          as select * from public.profiles;
create table _backup_user_challenges_20250617   as select * from public.user_challenges;
create table _backup_user_achievements_20250617 as select * from public.user_achievements;
```

```bash
# 3) Aplicar la 0010 UNA sola vez, manualmente:
#    Abrir SQL Editor → pegar 0010_reset_progreso_usuarios.sql → Run.

# Opción B: Solo dashboard (sin CLI)
# Pegar 0001–0009 en SQL Editor en orden numérico, hacer el respaldo
# (opción 2 de arriba, con fecha a mano), y pegar 0010 al final una sola vez.
```

**Importante**: la 0010 **no** se mete en el mismo flujo de `supabase db push` que las demás. Vive en `supabase/migrations/` por trazabilidad histórica, pero el README de la carpeta la marca como "aplicar manualmente exactamente una vez, después de 0001–0009".

### 1.5 Actualización de `src/types/database.ts`

- Añadir a `Profile`, `Profile.Insert`, `Profile.Update`: `saldo_disponible`, `saldo_configurado`, `monto_guardadito`, `racha_actual`, `racha_mas_larga`, `ultima_fecha_racha`, `umbral_saldo_bajo`.
- Añadir `dificultad`, `categoria_reto`, `medicion` a `Challenge`.
- Añadir `semana`, `snapshot_nivel`, `progreso_cache` a `UserChallenge` (Row/Insert/Update).
- Añadir tipo nuevo `GoalContribution` y su entrada en `Database.public.Tables`.
- Añadir tipo `Medicion` (`'ahorro_monto_semana' | 'ahorro_count_semana' | 'ahorro_dias_distintos_semana' | 'meta_completada_semana' | 'dias_sin_gasto_semana' | 'gasto_total_max_semana' | 'sin_categoria_semana' | 'gastos_dias_seguidos' | 'gastos_dias_distintos_semana' | 'gastos_count_semana' | 'subir_nivel_semana' | 'racha_minima' | 'saldo_positivo_fin_semana'`) y referenciarlo desde `Challenge.medicion`.
- Añadir tipo `Database.public.Functions` con las firmas de los RPC (`actualizar_saldo`, `registrar_gasto`, `editar_gasto`, `eliminar_gasto`, `contribuir_meta`, `registrar_ahorro_libre`, `sacar_de_guardadito`, `aceptar_reto`, `completar_reto`, `eliminar_meta`, `retos_de_la_semana`, `progreso_reto`, `semana_iso_lima`, `nivel_desde_xp`, `xp_para_alcanzar_nivel`) para que `supabase.rpc(...)` quede tipado.
- `TipoReto` ya cubre `'ahorro' | 'registro' | 'sin_gasto' | 'personalizado'`; sin cambios. Convive con `medicion` (que es el cómo-se-mide vs. tipo, que es el cómo-se-comunica).

### 1.7 Guardadito y ahorro libre (rev. 5)

**Concepto.** Algunos usuarios no quieren crear una meta para separar plata, solo apartar al "chanchito". Antes el sistema obligaba a crear una meta para que la racha contara. Ahora hay un canal segundo: el **guardadito** (`profiles.monto_guardadito`), una alcancía general que acumula ahorro libre.

**Reglas.**
- `registrar_ahorro_libre(p_monto)` descuenta del saldo y suma al guardadito, igual de duro que `registrar_gasto` ante saldo insuficiente.
- Inserta una fila en `goal_contributions` con `goal_id = null` (la columna ya era nullable; el FK lo permite). Esto unifica el log: cualquier fila de `goal_contributions` representa un acto de ahorro, sea a una meta concreta o al guardadito.
- Llama a `aplicar_racha` — punto del cambio.
- `sacar_de_guardadito(p_monto)` por simetría con `eliminar_meta` (que devuelve saldo): pasa plata del guardadito al saldo disponible. **No** toca la racha (sacar no es ahorrar).

**Impacto en los retos de ahorro (§2.D.6, #1–5).** Las tres mediciones (`ahorro_monto_semana`, `ahorro_count_semana`, `ahorro_dias_distintos_semana`) ya queryean `goal_contributions` sin filtrar por `goal_id`. **Cuentan tanto contribuciones a metas como ahorro libre por defecto.** Esto es coherente con "la racha cuenta ahorro en general" y no requiere cambio en 0007. Verificado en el SQL existente.

> Si en el futuro quieres un reto "solo metas" (p.ej. "Completa una meta antes del domingo" ya lo es, vía `meta_completada_semana`), se agrega un `medicion` nuevo con filtro `where goal_id is not null` sin tocar lo existente.

**`monto_guardadito` y la 0010.** La 0010 ya fue aplicada (según tu confirmación) cuando aún no existía esta columna. La migración 0011 añade la columna con `default 0`, así que **todos los perfiles existentes la reciben en 0** automáticamente al correr el `add column`. No hay nada que reconciliar manualmente y **no hay que re-ejecutar la 0010**. Documentado en la cabecera de 0011.

### 1.6 Estrategia de reseteo + portón de onboarding

El reseteo (0010) y el portón se complementan:

1. **Servidor (0010)** vacía `puntos_totales`, `nivel`, `racha_*`, `user_challenges`, `user_achievements` y deja `saldo_configurado = false` en todos los perfiles existentes. Conserva gastos y metas.
2. **Cliente (Fase 2)** ve en cualquier `useProfile`/`useSaldo` que `saldo_configurado === false` y bloquea el render del layout hasta que el usuario complete el `OnboardingSaldoDialog`. Mismo flujo para usuarios existentes (recién reseteados) y nuevos (nacen en `false` por default).
3. **Servidor (RPC `actualizar_saldo`)** es la única vía para flipear la bandera. No hay UPDATE directo desde el cliente: el RPC garantiza que `saldo_disponible = p_monto` y `saldo_configurado = true` ocurren atómicamente.
4. **Doble verificación**: el gate del cliente es UX; pero los RPC `registrar_gasto` y `contribuir_meta` también pueden requerir `saldo_configurado = true` (lanzando `SQLSTATE '23514'` con mensaje `'SALDO_NO_CONFIGURADO'`) para que un cliente modificado no se salte el flujo. Recomendación: sí incluir esta validación server-side — refuerza la regla sin costo perceptible.

---

## 2. Decisiones abiertas con mi recomendación

> **Estado en esta revisión: APROBADAS (A–F).** Se mantienen aquí como referencia para la implementación. El modelo de saldo, la regla de bloqueo dura, la bandera `saldo_configurado` y el reseteo destructivo están **decididos por brief** y no se replantean.

### A. Eliminar meta con dinero contribuido — ¿devolver al saldo?

**Recomendación: SÍ, devolver `monto_actual` al saldo disponible.**

Razones:
- La contribución es una "reserva mental", no un gasto consumado.
- Borrar una meta sin devolver el monto se sentiría como castigo, y rompe el mental model "saldo = lo que tengo".
- Para metas **completadas** (`completada = true`) también devolvemos por defecto. Justificación: la meta sigue siendo una etiqueta interna; el dinero no se fue a ningún lado.
- Mitigación UX: el diálogo de confirmación dirá "Esto devolverá S/ X a tu saldo disponible. ¿Continuar?".

Implementación: el RPC `eliminar_meta` recibe `p_devolver_saldo boolean default true`. La UI envía `true` siempre, pero el flag queda disponible si en el futuro queremos un toggle.

### B. Racha — qué cuenta como "día ahorrado" y cómo se detecta ruptura

**Recomendación (rev. 5): un acto de AHORRO de monto > 0 en el día calendario de Lima. "Ahorrar" = contribuir a una meta (RPC `contribuir_meta`) **o** registrar un ahorro libre al guardadito (RPC `registrar_ahorro_libre`). Ambos descuentan del saldo y ambos llaman a `aplicar_racha`. Cualquiera de los dos cuenta como "día ahorrado".**

> **Zona horaria fija a `America/Lima`** en server y cliente. `CURRENT_DATE` en Postgres devuelve la fecha en UTC del servidor (que normalmente está en UTC), lo que haría que la racha cambiara de día a las 7pm de Lima. Usar `(now() at time zone 'America/Lima')::date` cierra el día a la medianoche local del usuario, que es lo que él espera. Se aplica en `aplicar_racha`, en `retos_de_la_semana`, y donde se lea la "racha efectiva" en TS (que también compara con `hoyLima`).

Lógica (siempre con `hoy_lima := (now() at time zone 'America/Lima')::date`):
- Por día solo cuenta **una vez** aunque haya varias contribuciones.
- "Día consecutivo" = `ultima_fecha_racha = hoy_lima - 1`.
- Si `ultima_fecha_racha < hoy_lima - 1` → la racha se rompió: `racha_actual = 1` (la de hoy). `racha_mas_larga` queda como estaba.
- Si `ultima_fecha_racha = hoy_lima` (ya contribuyó hoy) → no incrementa, no rompe.
- Lectura para UI: **"racha efectiva"** = `(ultima_fecha_racha IN (hoy_lima, hoy_lima - 1)) ? racha_actual : 0`. Esto evita mostrar "racha 7" cuando ya se rompió pero el usuario aún no contribuye hoy. Se calcula en TS al leer perfil — el cliente computa `hoyLima` con `new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())` para evitar drift con el navegador en otra zona.
- **No hay job nocturno**. La racha se "rompe perezosamente" en la próxima contribución/ahorro libre, y la UI lo refleja al leer.

**Idempotencia de la racha (sin doble-contar):** `aplicar_racha` arranca con `if v_ultima = v_hoy then return v_actual`. Si en el mismo día Lima el usuario contribuye a una meta a las 10 am y luego registra un ahorro libre a las 2 pm, el segundo invocador entra a `aplicar_racha` con `v_ultima = hoy` y sale temprano. La racha sube **una sola vez por día**, sin importar cuántas acciones de ahorro haga. Lo verifiqué para los dos invocadores (`contribuir_meta` y `registrar_ahorro_libre`) — comparten exactamente el mismo helper, así que el invariante se mantiene.

> Si el producto se expande a otros países, se hará `profiles.timezone text not null default 'America/Lima'` y se reemplazará el literal. Por ahora, constante.

Por qué ahorro (meta o libre) y no "registró gasto" o "no gastó":
- Detectar "no gastó" requiere un job server-side (cron) que cierre el día — el brief pide evitar infra extra.
- "Registró gasto" no incentiva el comportamiento positivo.
- Ahorro = comportamiento positivo activo. El usuario que tiene meta(s) la(s) usa; el que no, igual puede separar plata al guardadito y mantener la racha viva.

### C. Niveles — fórmula y migración

**Recomendación: curva creciente cuadrática suave, helper único.**

Fórmula (tunable en un solo lugar):

```ts
// src/lib/leveling.ts
export const XP_BASE = 100   // XP requerido para saltar del nivel 1 al 2

// Total acumulado de XP para alcanzar el inicio del nivel n.
// n=1 → 0, n=2 → 100, n=3 → 300, n=4 → 600, n=5 → 1000, n=10 → 4500
export function xpParaAlcanzarNivel(n: number): number {
  if (n <= 1) return 0
  return (XP_BASE * (n - 1) * n) / 2
}

// Mayor n tal que xpParaAlcanzarNivel(n) <= xp.
// Implementación ENTERA (evita drift de Math.sqrt en bordes exactos).
export function nivelDesdeXp(xp: number): number {
  if (xp <= 0) return 1
  // Aproximación con sqrt + corrección entera por seguridad.
  // n(n-1) <= 2*xp/XP_BASE  ⇒  n ≈ floor((1 + sqrt(1 + 8*xp/XP_BASE)) / 2)
  const aprox = Math.floor((1 + Math.sqrt(1 + (8 * xp) / XP_BASE)) / 2)
  // Corrección: prueba aprox-1, aprox, aprox+1 y devuelve el mayor n
  // cuyo umbral acumulado sea <= xp. Cierra los bordes (xp = 100, 300, 600...).
  let n = Math.max(1, aprox - 1)
  while (xpParaAlcanzarNivel(n + 1) <= xp) n++
  return n
}

export function progresoNivel(xp: number) {
  const nivel = nivelDesdeXp(xp)
  const actual = xp - xpParaAlcanzarNivel(nivel)
  const siguiente = xpParaAlcanzarNivel(nivel + 1) - xpParaAlcanzarNivel(nivel)
  return { nivel, actual, siguiente, pct: actual / siguiente }
}
```

Función SQL espejo en `0004_leveling_helpers.sql`, **también entera** (sin `sqrt`, sin `numeric`):

```sql
create or replace function nivel_desde_xp(p_xp integer)
returns integer
language plpgsql
immutable
as $$
declare
  v_xp_base constant integer := 100;
  v_n integer := 1;
begin
  if p_xp is null or p_xp <= 0 then
    return 1;
  end if;
  -- Itera hasta que el umbral del siguiente nivel supere p_xp.
  -- No usa sqrt: cero drift en bordes exactos (100, 300, 600, 1000, ...).
  while (v_xp_base * v_n * (v_n + 1)) / 2 <= p_xp loop
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

create or replace function xp_para_alcanzar_nivel(p_n integer)
returns integer
language sql
immutable
as $$
  select case
    when p_n <= 1 then 0
    else (100 * (p_n - 1) * p_n) / 2
  end;
$$;
```

> **Verificación de bordes** (deben coincidir TS y SQL):
> `xp = 99` → nivel 1; `xp = 100` → nivel 2; `xp = 299` → nivel 2; `xp = 300` → nivel 3; `xp = 599` → nivel 3; `xp = 600` → nivel 4. Tanto el helper TS (con la corrección entera) como el SQL (bucle entero puro) entregan esos resultados sin posibilidad de error por redondeo.

**Migración de datos existentes:**
- `puntos_totales` se mantiene como XP literal (interpretación nueva, dato igual).
- `UPDATE profiles SET nivel = nivel_desde_xp(puntos_totales)` en la misma migración.
- Resultado: nadie pierde puntos. Usuarios con `puntos_totales = 0` siguen en nivel 1. Usuarios con puntos quedan en el nivel que les corresponde por la curva nueva.

### D. Retos repetibles semana a semana (reemplaza el modelo one-time de rev. 3)

**Decisión nueva: los retos son recurrentes por semana ISO en Lima.** Todos los retos del catálogo se cumplen en ≤ 1 semana. Cada lunes (Lima) arranca una tanda y el progreso se reinicia. Un mismo reto puede aparecer en semanas futuras y el usuario puede volver a completarlo. Lo único que se prohíbe es **completar el mismo reto dos veces en la misma semana** (eso sería farmeo dentro del ciclo).

#### D.1 Modelo de completación por semana

Una semana se identifica con un entero compacto:

```sql
-- Helper que se usa en muchas partes:
create or replace function semana_iso_lima()
returns integer
language sql
stable
as $$
  select extract(isoyear from (now() at time zone 'America/Lima'))::int * 100
       + extract(week    from (now() at time zone 'America/Lima'))::int;
$$;
```

Devuelve p. ej. `202525` para la semana 25 de 2025. Cambia automáticamente a la medianoche local de Lima del lunes.

`user_challenges` gana la columna `semana` (ver §1.1). El constraint nuevo es:

```sql
unique (user_id, challenge_id, semana)
```

Implicaciones:
- Aceptar el mismo reto dos veces en la misma semana → `SQLSTATE '23505'` server-side.
- Aceptarlo de nuevo la semana siguiente → ok, otra fila con `semana` diferente.
- `aceptar_reto` setea `semana = semana_iso_lima()` automáticamente.

**Encaje con el reset 0010**: la 0010 vacía `user_challenges` por completo (`truncate`). Cuando los usuarios vuelvan a aceptar retos, las filas nacerán con `semana = semana_actual` y la constraint ya estará en su lugar. Sin conflicto.

#### D.2 Caducidad y progreso perezoso (sin job nocturno)

**Recomendación: el progreso se calcula al leer/al completar, en función del rango "lunes 00:00 Lima → ahora", basado en `user_challenges.fecha_inicio` y la semana ISO actual.** No hay job que "expire" retos.

Reglas:
- Aceptar un reto **inserta** una fila con `semana = semana_iso_lima()`. La UI muestra esa fila en "En curso" **solo si** `semana = semana_iso_lima()` y `completado = false`.
- Filas con `semana < semana_iso_lima()` y `completado = false` son retos **abandonados**: dejan de aparecer en "En curso" automáticamente. No se borran (queda historial, útil para "% de retos completados").
- Filas con `completado = true` aparecen en "Completados" con su `semana` mostrada ("Semana 24 de 2025") para dar continuidad visual.

**El progreso live se computa con una función SQL `progreso_reto(p_user_challenge_id uuid)`** que, dado el `uc.id`, conoce el `challenge.medicion` (campo nuevo en §1.1) y queries la data subyacente filtrada por `[lunes_lima, ahora]`:

```sql
create or replace function progreso_reto(p_user_challenge_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uc       user_challenges;
  v_ch       challenges;
  v_lunes    date := (date_trunc('week', (now() at time zone 'America/Lima'))::date);
  v_inicio   timestamptz := v_lunes::timestamptz at time zone 'America/Lima';
  v_progreso numeric := 0;
begin
  select * into v_uc from user_challenges where id = p_user_challenge_id and user_id = auth.uid();
  if not found then raise exception 'RETO_NO_ENCONTRADO' using errcode = '23514'; end if;

  select * into v_ch from challenges where id = v_uc.challenge_id;

  case v_ch.medicion
    when 'ahorro_monto_semana' then
      select coalesce(sum(monto), 0) into v_progreso
        from goal_contributions
        where user_id = auth.uid() and fecha >= v_lunes;
    when 'ahorro_count_semana' then
      select count(*) into v_progreso
        from goal_contributions
        where user_id = auth.uid() and fecha >= v_lunes;
    when 'ahorro_dias_distintos_semana' then
      select count(distinct fecha) into v_progreso
        from goal_contributions
        where user_id = auth.uid() and fecha >= v_lunes;
    when 'meta_completada_semana' then
      select count(*) into v_progreso
        from goals
        where user_id = auth.uid()
          and completada = true
          and updated_at >= v_inicio;
    when 'dias_sin_gasto_semana' then
      v_progreso := 7 - (select count(distinct fecha)
                           from expenses
                           where user_id = auth.uid() and fecha >= v_lunes);
    when 'gasto_total_max_semana' then
      -- progreso = monto gastado (la UI compara contra meta_valor; "completado" si gasto_total <= meta_valor al final de la semana)
      select coalesce(sum(monto), 0) into v_progreso
        from expenses where user_id = auth.uid() and fecha >= v_lunes;
    when 'sin_categoria_semana' then
      -- meta_valor es 0; progreso = gastos en esa categoría esta semana (debe quedarse en 0)
      select count(*) into v_progreso
        from expenses
        where user_id = auth.uid()
          and fecha >= v_lunes
          and categoria = v_ch.meta_valor::text;   -- caso especial: meta_valor cero, categoría va en categoria_reto
    when 'gastos_dias_seguidos' then
      v_progreso := longest_consecutive_days_with_expense(auth.uid(), v_lunes);
    when 'gastos_dias_distintos_semana' then
      select count(distinct fecha) into v_progreso
        from expenses where user_id = auth.uid() and fecha >= v_lunes;
    when 'gastos_count_semana' then
      select count(*) into v_progreso
        from expenses where user_id = auth.uid() and fecha >= v_lunes;
    when 'subir_nivel_semana' then
      -- 1 si nivel_actual > nivel_al_aceptar (snapshot tomado en aceptar_reto, ver §D.5)
      v_progreso := case when (select nivel from profiles where id = auth.uid())
                            > coalesce((v_uc.snapshot_nivel)::int, 1)
                         then 1 else 0 end;
    when 'racha_minima' then
      v_progreso := (select racha_actual from profiles where id = auth.uid());
    when 'saldo_positivo_fin_semana' then
      -- evaluación al cierre: 1 si saldo > 0 al consultar; el reto solo es "completable" desde domingo
      v_progreso := case when (select saldo_disponible from profiles where id = auth.uid()) > 0 then 1 else 0 end;
  end case;

  return v_progreso;
end;
$$;
```

Notas de la función:
- `longest_consecutive_days_with_expense(user_id, desde)` es un helper auxiliar pequeño que cuenta la mayor racha de días consecutivos con ≥ 1 gasto a partir de `desde`. Se define en la misma migración.
- `subir_nivel_semana` requiere snapshot del nivel al aceptar el reto: `user_challenges.snapshot_nivel integer` (columna adicional en §1.1).
- Es `stable` y `security definer`: confiable, cacheable por la query, cheap (cada cálculo filtra por usuario + semana).
- La UI llama `supabase.rpc('progreso_reto', { p_user_challenge_id: ... })` para cada reto "En curso" al cargar la pantalla.

> **Decisión menor**: añado `user_challenges.snapshot_nivel integer` a §1.1 para el reto "Sube de nivel esta semana". Es la única forma limpia de saber "nivel al inicio del reto" sin un job nocturno.

#### D.3 Rotación de retos disponibles

Reescribo `retos_de_la_semana` con el filtro nuevo: excluye los retos que el usuario ya **completó o aceptó esta semana** (no los de semanas anteriores).

```sql
create or replace function retos_de_la_semana(p_cantidad int default 5)
returns setof challenges
language sql
stable
security definer
set search_path = public
as $$
  with sem as (select semana_iso_lima() as s)
  select c.*
  from challenges c, sem
  where c.activo = true
    and not exists (
      select 1 from user_challenges uc
      where uc.user_id = auth.uid()
        and uc.challenge_id = c.id
        and uc.semana = sem.s
    )
  order by md5(c.id::text || sem.s::text)
  limit p_cantidad;
$$;
```

- La misma semana ISO devuelve el mismo orden global, pero **personalizado** porque filtra los que el caller ya tomó esta semana.
- Si el usuario ya aceptó/completó los 5 que aparecieron al inicio de la semana, los siguientes 5 del catálogo aparecen (la rotación es estable, los siguientes en el orden md5).
- La semana siguiente, todos los retos vuelven a estar disponibles (`semana` cambia → el NOT EXISTS no encuentra filas).

#### D.4 Puntos por dificultad y ritmo de subida de nivel

Asignación recomendada (en el seed 0009, columna `puntos` de `challenges`):

| Dificultad | XP por completar |
|---|---|
| `facil` | 20 |
| `media` | 40 |
| `dificil` | 80 |

**Ritmo esperado** con la curva `xpParaAlcanzarNivel(n) = 100 * n(n-1)/2`:

| Perfil de usuario | Retos/semana | XP/semana | Nivel tras 4 semanas | Tras 12 semanas | Tras 24 semanas |
|---|---|---|---|---|---|
| Casual (1 fácil) | 1f | 20 | L2 | L3 | L3 |
| Activo (2f + 1m) | 2f, 1m | 80 | L3 | L5 | L7 |
| Pro (3f + 2m + 1d) | 6 | 220 | L5 | L9 | L11 |
| Máximo (todos) | ~13 | ~520 | L8 | L12 | L17 |

Razonable: el "máximo" no es trivial (requiere completar todo el catálogo cada semana), y el usuario activo tarda ~24 semanas (6 meses) en llegar a nivel 7. La curva cuadrática sigue dando sentido a niveles altos: cada nuevo nivel cuesta más XP, así que rehacer retos semana a semana no rompe el balance.

#### D.5 Progreso visible en la UI

Cada reto muestra una barra de progreso parcial con `current / meta`. El hook `useChallenges` para cada reto "En curso" llama `progreso_reto(uc.id)` y la UI renderiza:

- Cuantitativos: `S/ 30 / S/ 50`, `2 / 3 contribuciones`, `4 / 5 días`.
- Binarios (`meta_completada_semana`, `subir_nivel_semana`, `saldo_positivo_fin_semana`): `0 / 1` con etiqueta tipo "Aún no" / "¡Listo!".
- "Sin gastos en X categoría" (meta_valor = 0): se muestra con `0 gastos en entretenimiento ✓` o `2 gastos en entretenimiento — reto fallido esta semana` (el reto sigue contando como no completado; vuelve a aparecer la semana siguiente).

**Reclamación**: cuando `progreso >= meta_valor`, la tarjeta del reto muestra el botón "Reclamar XP". El RPC `completar_reto` re-valida server-side llamando a `progreso_reto` y solo entonces marca completado + suma XP. Esto evita que un cliente modificado reclame sin cumplir.

#### D.6 Catálogo del seed 0009 (15+ retos, todos semanales)

Convenciones:
- `tipo` (`ahorro` | `registro` | `sin_gasto` | `personalizado`) es el campo ya existente en la tabla.
- `medicion` (campo nuevo) es el identificador que `progreso_reto` lee.
- `meta_valor` (campo ya existente) es el umbral numérico de éxito.
- `categoria_reto` agrupa para UX.
- Columna **"Medible hoy"** indica si la app ya rastrea los datos o necesita instrumentación adicional.

| # | Título | Cat. | Dificultad | XP | meta_valor | medicion | Medible hoy | Cómo se calcula |
|---|---|---|---|---|---|---|---|---|
| 1 | Ahorra S/ 50 esta semana | ahorro | facil | 20 | 50 | `ahorro_monto_semana` | NUEVA: requiere `goal_contributions` | `sum(monto)` desde lunes Lima |
| 2 | Ahorra S/ 100 esta semana | ahorro | media | 40 | 100 | `ahorro_monto_semana` | NUEVA | mismo |
| 3 | Ahorra S/ 200 esta semana | ahorro | dificil | 80 | 200 | `ahorro_monto_semana` | NUEVA | mismo |
| 4 | Haz 3 contribuciones a tus metas | ahorro | facil | 20 | 3 | `ahorro_count_semana` | NUEVA | `count(*)` filas en `goal_contributions` esta semana |
| 5 | Ahorra en 5 días distintos | ahorro | media | 40 | 5 | `ahorro_dias_distintos_semana` | NUEVA | `count(distinct fecha)` en `goal_contributions` |
| 6 | Completa una meta antes del domingo | ahorro | dificil | 80 | 1 | `meta_completada_semana` | SÍ | `count(*)` en `goals` donde `completada=true` y `updated_at >= lunes_lima` |
| 7 | 2 días sin gastar esta semana | control | facil | 20 | 2 | `dias_sin_gasto_semana` | SÍ | `7 - count(distinct fecha)` en `expenses` esta semana |
| 8 | 4 días sin gastar esta semana | control | dificil | 80 | 4 | `dias_sin_gasto_semana` | SÍ | mismo |
| 9 | Mantén tu gasto semanal bajo S/ 200 | control | media | 40 | 200 | `gasto_total_max_semana` | SÍ | `sum(monto)` en `expenses` esta semana; completado al cierre si `<= meta_valor` |
| 10 | No gastes en "entretenimiento" | control | facil | 20 | 0 | `sin_categoria_semana` (categoría: `entretenimiento`) | SÍ | `count(*)` en `expenses` con esa categoría esta semana; meta = 0 |
| 11 | No gastes en "compras" | control | media | 40 | 0 | `sin_categoria_semana` (categoría: `compras`) | SÍ | igual |
| 12 | Registra gastos 4 días seguidos | registro | media | 40 | 4 | `gastos_dias_seguidos` | SÍ | `longest_consecutive_days_with_expense` desde lunes |
| 13 | Registra ≥ 1 gasto en 5 días | registro | facil | 20 | 5 | `gastos_dias_distintos_semana` | SÍ | `count(distinct fecha)` en `expenses` esta semana |
| 14 | Categoriza 10 gastos esta semana | registro | facil | 20 | 10 | `gastos_count_semana` | SÍ | `count(*)` en `expenses` esta semana |
| 15 | Sube de nivel esta semana | progreso | media | 40 | 1 | `subir_nivel_semana` | SÍ (con snapshot) | `nivel_actual > snapshot_nivel` al aceptar |
| 16 | Alcanza una racha de 5 días | progreso | media | 40 | 5 | `racha_minima` | SÍ | `profiles.racha_actual >= 5` |
| 17 | Llega al domingo con saldo positivo | progreso | dificil | 80 | 1 | `saldo_positivo_fin_semana` | SÍ (parcial) | `profiles.saldo_disponible > 0` al reclamar |

**17 retos**, holgado sobre el mínimo de 15. Cubre las tres dificultades y los cuatro grupos. Las tres variantes de "ahorro_monto_semana" y las dos de "dias_sin_gasto_semana" son intencionales: dan al usuario opciones suaves o duras según ánimo, sin inflar el catálogo con retos cualitativamente distintos.

**Aclaración del #17 (saldo positivo toda la semana)**: el brief original pedía "Mantén saldo positivo toda la semana", lo que requeriría log de saldo histórico (instrumentación nueva). Lo reemplacé por "Llega al domingo con saldo positivo" — verificable al reclamar sin infra extra. Si prefieres la versión estricta dime y añado `profiles.saldo_toco_cero_esta_semana boolean` reseteado los lunes (flipeado a true por los RPCs cuando `saldo_nuevo <= 0`).

**Resumen de instrumentación nueva requerida** (todo en Fase 1):
1. Tabla `goal_contributions` (3 retos la usan: #1, #2, #3, #4, #5).
2. Columna `user_challenges.snapshot_nivel integer` (reto #15).
3. Función SQL `progreso_reto` + helper `longest_consecutive_days_with_expense`.
4. Función `semana_iso_lima()`.

Lo demás se mide con `expenses`, `goals`, `profiles` que ya existen.


### E. Recompensas de racha

**Recomendación: reutilizar `achievements` + `user_achievements`, con `condicion_tipo='racha'`.**

Seed inicial (`0008_seed_achievements_racha.sql`):

| Hito | titulo | descripcion | icono |
|---|---|---|---|
| 10 | "Semana y media de fuego" | "10 días seguidos ahorrando" | flame |
| 25 | "Un mes de constancia" | "25 días seguidos ahorrando" | sparkles |
| 50 | "Disciplina nivel pro" | "50 días seguidos ahorrando" | trophy |
| 100 | "Centenario" | "100 días seguidos ahorrando" | crown |
| 200 | "Imparable" | "200 días seguidos ahorrando" | star |
| 365 | "Un año entero" | "365 días seguidos ahorrando" | medal |

Desbloqueo: dentro de `aplicar_racha`, al actualizar `racha_actual`, se hace `insert into user_achievements ... on conflict do nothing` para cada hito alcanzado. Atómico en la misma transacción que el RPC de contribuir.

### F. Ubicación UI del apartado de racha y recompensas

**Recomendación: dentro de ChallengesPage (sección de "gamificación" ya existe ahí), y un resumen en ProfilePage.**

Razones:
- Bottom nav ya tiene 6 ítems — no agregamos otro.
- ChallengesPage es la pantalla de gamificación; racha + recompensas pegan temáticamente.
- ProfilePage muestra ya stats agregadas; añadir "Racha más larga" y "Recompensas desbloqueadas" cuadra con la sección de stats.

Layout propuesto:

**ChallengesPage** (arriba, sobre las pestañas):
- Card actual de Nivel (se queda).
- Nueva `RachaCard` justo debajo: muestra `racha_actual` (efectiva), icono de fuego con altura proporcional, próximo hito ("Faltan X días para 'Un mes de constancia'").
- Si racha = 0, muestra mensaje de invitación: "Contribuye a una meta hoy y arranca tu racha 🔥".

**ProfilePage** (en la sección de stats):
- Una stat nueva: "Racha más larga: X días".
- Sección colapsable nueva al final: "Recompensas" con grid de hitos: desbloqueados a color, bloqueados en gris con candado.

No tocamos rutas, no tocamos bottom nav.

---

## 3. Lista de archivos por fase

### Fase 1 — Migraciones y tipos

**Crear:**
- `supabase/migrations/0001_init_baseline.sql`
- `supabase/migrations/0002_profiles_saldo_y_racha.sql` (incluye `saldo_configurado`)
- `supabase/migrations/0003_challenges_metadata.sql`
- `supabase/migrations/0004_leveling_helpers.sql`
- `supabase/migrations/0005_rpc_atomicos.sql` (`actualizar_saldo` setea la bandera en `true`)
- `supabase/migrations/0006_racha_helper.sql`
- `supabase/migrations/0007_rotacion_retos.sql`
- `supabase/migrations/0008_seed_achievements_racha.sql`
- `supabase/migrations/0009_seed_challenges_ampliados.sql`
- `supabase/migrations/0010_reset_progreso_usuarios.sql` ⚠️ **destructiva, una sola vez**
- `supabase/migrations/README.md` (orden, instrucciones, sección destacada para la 0010 con pasos de respaldo)

**Editar:**
- `src/types/database.ts` (columnas nuevas incluida `saldo_configurado` + tipo `Functions` con firmas RPC)

### Fase 2 — Saldo + portón de onboarding

> **Orden interno de Fase 2:**
> 1. RPC `actualizar_saldo` (ya creado en Fase 1) + `useSaldo` + `lib/db/balance.ts`.
> 2. **`OnboardingSaldoDialog` + gate en `ProtectedRoute`** (esto desbloquea el resto de la app; sin el saldo configurado nada más es usable).
> 3. `SaldoCard` en Dashboard (edición posterior, mismo RPC).
> 4. Conexión de gasto y contribución a los RPC con bloqueo dura.

**Crear:**
- `src/lib/db/balance.ts` (`actualizarSaldo`, `eliminarMetaConDevolucion`)
- `src/lib/db/guardadito.ts` (`registrarAhorroLibre`, `sacarDeGuardadito`)
- `src/lib/mensajes.ts` (`BANCO_A_GASTO_BLOQUEADO`, `BANCO_B_SALDO_CERO`, `BANCO_C_SALDO_BAJO`, helper `pickRandom`, helper `mensajeBloqueoDinamico(saldoActual, monto)` para la variante con cifras reales del mensaje 1 del Banco A)
- `src/lib/validations/balance.ts` (`actualizarSaldoSchema`, `ahorroLibreSchema`, `sacarGuardaditoSchema`: monto positivo, máx. coherente, `numeric(12,2)` → 9 999 999.99)
- `src/hooks/useSaldo.ts` (lee `profiles.saldo_disponible` y `saldo_configurado`, expone `actualizar(monto)`, derivado `requiereOnboarding` con `useMemo`)
- `src/hooks/useGuardadito.ts` (lee `profiles.monto_guardadito`, expone `registrarAhorro(monto)` y `sacar(monto)`)
- **`src/components/onboarding/OnboardingSaldoDialog.tsx`** — diálogo OBLIGATORIO no descartable (sin botón cerrar, sin click-fuera, sin `Escape`). Copy Gen Z amigable de bienvenida. Form RHF + Zod, input PEN, mensaje motivacional. Submit → `actualizarSaldo(monto)` → bandera flipea → gate libera y la app queda usable.

**Editar:**
- **`src/components/layout/ProtectedRoute.tsx`** — el `ProtectedRoute` carga `useProfile` (o un `useSaldo` ligero) y, **antes** de renderizar `<Outlet />`, evalúa `saldo_configurado`. Si es `false`, renderiza el layout con `<OnboardingSaldoDialog />` montado sobre un fondo bloqueado (no se ve el contenido detrás, no se navega). Una vez la bandera pasa a `true`, libera. Esto cubre TODAS las rutas hijas (`/app`, `/app/add-expense`, `/app/analytics`, etc.) porque `ProtectedRoute` envuelve a `MainLayout`. URL directa a `/app/add-expense` también queda bloqueada.
- `src/lib/db/expenses.ts` — **las tres operaciones cambian**:
  - `createExpense` → RPC `registrar_gasto`.
  - `updateExpense` → RPC `editar_gasto` (ajusta saldo por delta; bloquea si delta positivo excede saldo).
  - `deleteExpense` → RPC `eliminar_gasto` (devuelve el monto al saldo).
  - Mantiene las firmas para no romper hooks; mapea `SALDO_INSUFICIENTE` → `SaldoInsuficienteError` y `SALDO_NO_CONFIGURADO` → `SaldoNoConfiguradoError`. Antes del mapeo, `console.error(error)` con el objeto completo de Supabase (cierra B3).
- `src/lib/db/goals.ts` — `contribuirMeta` llama al RPC `contribuir_meta`. Misma estrategia de error. `deleteGoal` llama al RPC `eliminar_meta` con devolución de saldo.
- `src/hooks/useExpenses.ts` — captura `SaldoInsuficienteError` en `addExpense` **y en `editExpense`** y devuelve un discriminante (`{ ok: false, motivo: 'saldo_insuficiente', saldo_actual, monto_intentado }`) para que la página dispare el Banco A. `removeExpense` no puede bloquear (la eliminación solo devuelve saldo). El saldo se refresca tras cada operación leyendo el `saldo_nuevo` que devuelve el RPC.
- `src/hooks/useGoals.ts` — mismo patrón en `contribuir`.
- `src/hooks/useProfile.ts` — incluye el saldo y la bandera en la lectura (ya viene en `getProfile` con `select '*'`).
- `src/pages/DashboardPage.tsx` — añade `SaldoCard` con botón "Editar" → diálogo de reemplazo absoluto (reutiliza el form del onboarding, distinta copy). Añade también `GuardaditoCard` con dos acciones: "Ahorrar" (descuenta saldo, suma al guardadito, dispara la racha) y "Sacar" (devuelve al saldo, no toca racha). Ambas con form Zod + validación de bloqueo duro server-side (mensaje Banco A si saldo insuficiente al ahorrar).
- `src/pages/AddExpensePage.tsx` — al submit fallido por saldo, dispara la notificación inferior (Fase 3) en lugar de toast. Botón "Guardar" se deshabilita si `monto > saldoDisponible` (UX inmediata) además del bloqueo server-side.
- `src/pages/GoalsPage.tsx` — mismo tratamiento de bloqueo dura en el diálogo de contribución.

### Fase 3 — Notificación inferior estilo iPhone

**Crear:**
- `src/components/shared/LukaNotification.tsx` — componente animado, slide-up desde abajo, drag-to-dismiss (`motion/react` `drag="y"` + `onDragEnd` con umbral). Auto-dismiss configurable (default 5s). Acepta `title`, `subtitle`, `cta`, `onCta`.
- `src/context/NotificationContext.tsx` — `<NotificationProvider>` con cola y API `notify({ title, subtitle, cta })`. Solo una notificación visible a la vez.
- `src/hooks/useLukaNotification.ts` — wrapper trivial sobre el contexto.

**Editar:**
- `src/App.tsx` — envuelve con `<NotificationProvider>` dentro de AuthProvider.
- `src/hooks/useSaldo.ts` — detecta crossings de umbral (low → very-low → zero) comparando previousSaldo vs newSaldo y dispara una sola notificación por crossing. Estado `ultimoUmbralCruzado` en `useRef` para no spamear en renders.
- `src/pages/AddExpensePage.tsx` y `src/pages/GoalsPage.tsx` — en bloqueo por saldo, llaman a `notify` con mensaje del Banco A + CTA "Actualizar saldo" que abre el diálogo de edición.

### Fase 4 — Niveles y retos (semanales, repetibles)

**Crear:**
- `src/lib/leveling.ts` (`XP_BASE`, `xpParaAlcanzarNivel`, `nivelDesdeXp` con corrección entera de bordes, `progresoNivel`).
- `src/lib/semana.ts` (`semanaIsoLima()`, `lunesLima()`, `formatearSemana(semana)` para etiquetas tipo "Semana 25 de 2025").

**Editar:**
- `src/lib/db/challenges.ts`:
  - `getChallenges` → llama a RPC `retos_de_la_semana` (excluye los aceptados/completados esta semana).
  - `aceptarReto` → llama a RPC `aceptar_reto` (server-side fija `semana` y `snapshot_nivel`).
  - `completarReto` → llama a RPC `completar_reto`. Devuelve `{ xp_nuevo, nivel_nuevo, subio_de_nivel }` para que la UI muestre confetti + animación "Subiste al nivel N".
  - Nueva función `getProgresoReto(userChallengeId)` → RPC `progreso_reto`. Devuelve el numérico, la UI lo divide entre `meta_valor` para la barra.
  - Mapea errores: `RETO_NO_CUMPLIDO`, `RETO_YA_COMPLETADO`, `'23505'` (re-aceptar misma semana).
- `src/hooks/useChallenges.ts`:
  - Filtra "En curso" por `semana === semanaIsoLima()` (las filas viejas no aparecen).
  - Para cada reto en curso, lee progreso live con `getProgresoReto`. Memoizado con `useMemo` por id de reto, refetch tras gasto/contribución/registro.
  - Propaga `subio_de_nivel` para confetti + notificación.
- `src/pages/ChallengesPage.tsx`:
  - Reemplaza `nextLevelPuntos = nivel * 500` por `progresoNivel(puntos_totales)`. Muestra `nivel`, `pct`, `actual / siguiente`. Animación de transición al subir.
  - Cada tarjeta de reto en curso muestra progreso parcial (`S/ 30 / S/ 50`, `2 / 3`, etc.) y el botón "Reclamar XP" cuando `progreso >= meta_valor`.
  - Sección "Completados" muestra la etiqueta de semana ("Semana 25 de 2025") para retos cobrados de semanas anteriores.
  - EmptyState para "Disponibles" cuando el usuario agotó el catálogo esta semana ("Volvieron tus retos el lunes 👀").
- `src/pages/ProfilePage.tsx` — misma corrección de cálculo de nivel.

### Fase 5 — Racha y recompensas

**Crear:**
- `src/lib/db/achievements.ts` (`getAchievements`, `getUserAchievements`)
- `src/hooks/useRacha.ts` (lee del perfil, calcula racha efectiva)
- `src/hooks/useAchievements.ts`
- `src/components/shared/RachaCard.tsx`
- `src/components/shared/RecompensaItem.tsx`

**Editar:**
- `src/pages/ChallengesPage.tsx` — inserta `<RachaCard />` debajo del card de nivel.
- `src/pages/ProfilePage.tsx` — stat de "Racha más larga", sección colapsable de "Recompensas".
- `src/lib/db/goals.ts` — sin cambios adicionales (la racha la dispara el RPC `contribuir_meta` en Fase 1).
- `README.md` — sección nueva "Saldo y gamificación", actualizar diagrama de arquitectura con los RPC y la tabla `profiles` extendida.

---

## 4. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| `0001_init_baseline.sql` no refleja exactamente lo que hay en Supabase remoto | Se marca explícitamente como "baseline retroactivo". Antes de aplicar, hago `supabase db dump --schema public` (si tienes CLI) o me das un dump y reconcilio. Las migraciones siguientes son aditivas e idempotentes, por lo que no rompen aunque el baseline esté incompleto. |
| Backfill de `puntos_totales → nivel` sobre datos existentes | La columna `nivel` se recomputa con `nivel_desde_xp(puntos_totales)`. Como la fórmula nueva es monotónica creciente y `puntos_totales` no se toca, ningún usuario "baja" de nivel — solo se ajusta al esquema nuevo. |
| RPC con `EXCEPTION` corta la transacción y revierte estado parcial | Cada RPC inicia con `BEGIN ... EXCEPTION WHEN ... ROLLBACK` implícito (Postgres atomicity). Probado en plantilla. |
| Notificación bottom emerge sobre el bottom-nav móvil | Z-index alto y `safe-bottom` ya está en el CSS. La notificación se posiciona sobre la bottom-nav con offset visual claro. |
| Estado de notificación spammeable | Cola de una notificación a la vez + cooldown por tipo (1 por cross de umbral, 1 por bloqueo). |
| **0010 corrida dos veces** borra el avance reconstruido | El archivo lleva cabecera grande en mayúsculas con la advertencia. Se documenta en `supabase/migrations/README.md` como "una sola vez tras 0001–0009, nunca en CI". El nombre del archivo (`_reset_progreso_usuarios`) lo hace evidente. **Antes de aplicar**, paso de respaldo obligatorio (snapshot de `profiles`, `user_challenges`, `user_achievements`) documentado en el README de migraciones. |
| **Usuario salta el portón** modificando el cliente | El gate del cliente es UX. La defensa real está en los RPC `registrar_gasto` y `contribuir_meta`, que rechazan si `saldo_configurado = false`. Aun saltándose el modal, el usuario no puede registrar nada hasta llamar a `actualizar_saldo`. |
| **Usuario entra a `/` o `/auth`** con `saldo_configurado = false` | Solo se gatea `/app/*` (lo que pasa por `ProtectedRoute`). `/` y `/auth` son `PublicOnlyRoute` y redirigen a `/app` si hay sesión; al llegar allí, el portón actúa. No hay forma de usar features de la app sin pasar por el modal. |
| **Cliente reclama reto sin cumplir progreso** | `completar_reto` re-evalúa `progreso_reto` server-side antes de marcar completado y sumar XP. Si `progreso < meta_valor` → `RETO_NO_CUMPLIDO`. La UI puede deshabilitar el botón cuando lee progreso < meta, pero la defensa real está en el RPC. |
| **Catálogo se agota** (usuario completa los 17 retos en una semana) | Es muy improbable porque varios son antagonistas (no se pueden cumplir a la vez: "2 días sin gasto" vs "registra 4 días seguidos" requieren días diferentes). Si pasa, el EmptyState invita a volver la próxima semana. Crecer el catálogo es una mejora futura barata (añadir filas al seed). |
| **Reto medible solo en el último día** (#6, #9, #17) | `meta_completada_semana`, `gasto_total_max_semana` y `saldo_positivo_fin_semana` se vuelven reclamables solo cuando se cumple la condición. La UI lo aclara en el copy del reto. Es UX, no riesgo de datos. |
| **Drift de zona horaria si Supabase corre en UTC** | Todas las funciones usan `(now() at time zone 'America/Lima')` explícito. Cambiar la TZ del servidor no afecta la lógica. |
| Tests automáticos | Ninguno en el repo (B12). No se introducen tests en este plan; se documenta cómo probar manualmente al final de cada fase. |

---

## 5. Lo que NO se hace en este plan (fuera de scope)

- No se introduce sistema de tests (B12 sigue abierto).
- No se elimina `// @ts-nocheck` de `vite.config.ts` (B1).
- No se consolidan los tres archivos pnpm (B8).
- No se cambian skeletons ni 404s (B15, B16).
- No se modifica el flujo de auth/rate limit (B9).
- No se añade validación server-side de avatar (B10).

Esto se mantiene en el reporte de mejoras (`ANALISIS_PROYECTO.md`) para futuras tandas.

---

## Espero tu OK para arrancar Fase 1

Las decisiones A, B, C, E, F siguen aprobadas. **La rev. 4 reemplaza completamente §2.D** con el modelo nuevo:

1. **Retos repetibles semana a semana**, no one-time. `UNIQUE (user_id, challenge_id, semana)` reemplaza al `UNIQUE (user_id, challenge_id)` de la rev. 3.
2. **Columna `user_challenges.semana`** (entero `isoyear*100+isoweek` en Lima) + `snapshot_nivel` (para el reto "Sube de nivel"). Función SQL `semana_iso_lima()` reutilizable.
3. **Caducidad perezosa, sin job nocturno**: las filas de semanas pasadas dejan de aparecer en "En curso" automáticamente; quedan en historial.
4. **Catálogo de 17 retos semanales** (§2.D.6) con `medicion` explícita por reto. Marcado qué requiere instrumentación nueva: tabla `goal_contributions` (append-only, RLS), columna `snapshot_nivel`, helpers SQL `progreso_reto` y `longest_consecutive_days_with_expense`. Lo demás se mide con tablas existentes.
5. **XP por dificultad**: 20 / 40 / 80. Curva verificada (un usuario activo llega a L7 en ~24 semanas; máximo a L17). Ver tabla de ritmo en §2.D.4.
6. **Progreso visible en la UI**: cada reto en curso muestra barra `progreso / meta` calculada live con RPC `progreso_reto`. Botón "Reclamar XP" cuando llega al umbral.
7. **`completar_reto` re-evalúa server-side** llamando a `progreso_reto`. Un cliente no puede reclamar sin cumplir.

Mantengo de la rev. 3:
- `editar_gasto` y `eliminar_gasto` RPC.
- TZ Lima en todo.
- Comandos de respaldo con fecha a mano + `pg_dump`.
- `nivel_desde_xp` entero sin drift.
- Regla innegociable de propagación de errores en RPC.
- Baseline 0001 vía `supabase db dump` si hay CLI.

Una vez confirmes esta rev. 4, arranco con:

1. Las **11 migraciones** en `supabase/migrations/` (0001 baseline + 0002 saldo/racha + 0003 metadata de retos + 0003a goal_contributions + 0004 leveling + 0005 RPCs atómicos + 0006 racha helper + 0007 retos helpers/rotación + 0008 seed achievements + 0009 seed 17 retos + 0010 reset destructivo).
2. El `supabase/migrations/README.md` con orden, instrucciones, baseline, pasos de respaldo para la 0010.
3. La actualización de `src/types/database.ts` con `Profile`/`Challenge`/`UserChallenge` extendidos, tipo `GoalContribution`, tipo `Medicion` y `Database.public.Functions` con todas las firmas RPC.

**Antes de arrancar te preguntaré tres cosas:**
1. ¿Tienes Supabase CLI instalado? (para `db dump` el baseline real).
2. ¿Fecha prevista de aplicación? (para el sufijo de respaldo `_AAAAMMDD`).
3. **¿Quieres que la 0010 también vacíe `goal_contributions`?** Por defecto la dejé fuera (las contribuciones pasadas son hechos verdaderos), pero si prefieres punto-de-partida limpio absoluto, la añado.

Tras eso pauso, te muestro la lista exacta de archivos creados, las instrucciones de aplicación y el recordatorio de respaldo, y espero tu OK para Fase 2 (saldo + portón de onboarding).
