# Supabase Migrations — Mi Luka

Orden de aplicación, instrucciones y advertencias para las migraciones
versionadas en este directorio.

> **TL;DR**
> 1. `supabase db dump --schema public --file supabase/migrations/0001_init_baseline.sql` ← una vez, antes de todo.
> 2. `supabase db push` ← aplica 0001 → 0009.
> 3. **Respalda** `profiles`, `user_challenges`, `user_achievements`.
> 4. Pega `0010_reset_progreso_usuarios.sql` en el SQL Editor y ejecuta **una sola vez**.

---

## Orden de archivos

| # | Archivo | Idempotente | Contenido |
|---|---|:---:|---|
| 0001 | `0001_init_baseline.sql` | sí | **Generado por `supabase db dump`** (ver paso 0). No escribir a mano. |
| 0002 | `0002_profiles_saldo_y_racha.sql` | sí | Columnas `saldo_disponible`, `saldo_configurado`, `racha_actual`, `racha_mas_larga`, `ultima_fecha_racha`, `umbral_saldo_bajo` en `profiles`. |
| 0003 | `0003_challenges_metadata.sql` | sí | `dificultad` / `categoria_reto` / `medicion` / `parametro` en `challenges`. `semana` / `snapshot_nivel` / `progreso_cache` en `user_challenges`. UNIQUEs en `(user_id, challenge_id, semana)` y `(challenges.titulo)`. |
| 0003a | `0003a_goal_contributions.sql` | sí | Tabla append-only `goal_contributions` con RLS de lectura propia. Solo se escribe vía RPC. |
| 0004 | `0004_leveling_helpers.sql` | sí | `nivel_desde_xp(int)` (bucle entero puro, sin sqrt) y `xp_para_alcanzar_nivel(int)`. Resync de `profiles.nivel`. |
| 0005 | `0005_rpc_atomicos.sql` | sí | RPCs `actualizar_saldo`, `registrar_gasto`, `editar_gasto`, `eliminar_gasto`, `contribuir_meta`, `aceptar_reto`, `completar_reto`, `eliminar_meta`. |
| 0006 | `0006_racha_helper.sql` | sí | `aplicar_racha(uuid)` invocada solo desde `contribuir_meta`. Desbloquea logros de hito. |
| 0007 | `0007_retos_helpers.sql` | sí | `semana_iso_lima()`, `longest_consecutive_days_with_expense()`, `progreso_reto()`, `retos_de_la_semana()`. |
| 0008 | `0008_seed_achievements_racha.sql` | sí | Seed de logros de racha (10/25/50/100/200/365). |
| 0009 | `0009_seed_challenges_ampliados.sql` | sí | Seed de los 17 retos semanales. |
| 0010 | `0010_reset_progreso_usuarios.sql` | **NO** | ⚠️ **Destructiva, una sola vez.** Resetea progreso de usuarios y conserva gastos / metas / contribuciones. Aplicar manualmente. |

---

## Paso 0 — Generar el baseline real

Hazlo **una vez** y comitea el archivo generado:

```bash
supabase link --project-ref <project-ref>
supabase db dump --schema public --file supabase/migrations/0001_init_baseline.sql
```

Esto captura el estado actual remoto (tablas, índices, RLS, trigger
`handle_new_user`, enums si los hay). Las migraciones 0002–0009 son
aditivas e idempotentes y no asumen contenido exacto del baseline, así
que cualquier cambio que tu remoto tenga sobre lo documentado en el
README del proyecto queda preservado.

---

## Aplicar 0001 → 0009 (idempotentes)

```bash
supabase db push
```

Si prefieres dashboard: pega cada archivo en el SQL Editor en orden
numérico.

---

## ⚠️ Respaldo antes de la 0010

**No te saltes este paso.** La 0010 vacía `user_challenges` y
`user_achievements` y resetea contadores de `profiles`.

### Opción A — pg_dump (preferida)

```bash
# Connection string desde Supabase Dashboard → Project Settings → Database
pg_dump \
  --host <db-host> --port 5432 --username postgres \
  --no-owner --no-privileges \
  --table public.profiles \
  --table public.user_challenges \
  --table public.user_achievements \
  --file backup_pre_0010_AAAAMMDD.sql \
  <db-name>
```

Reemplaza `AAAAMMDD` por la fecha real (p.ej. `20250617`). Para
restaurar si algo sale mal:

```bash
psql --host <db-host> --port 5432 --username postgres -f backup_pre_0010_AAAAMMDD.sql <db-name>
```

### Opción B — Snapshot en la misma DB (solo dashboard)

Pega en el SQL Editor con la fecha **escrita a mano** (el SQL Editor
**no** expande `$(date)` ni variables de shell):

```sql
create table _backup_profiles_AAAAMMDD          as select * from public.profiles;
create table _backup_user_challenges_AAAAMMDD   as select * from public.user_challenges;
create table _backup_user_achievements_AAAAMMDD as select * from public.user_achievements;
```

---

## Aplicar la 0010 (una sola vez)

1. Abrir Supabase Dashboard → SQL Editor → New query.
2. Pegar el contenido de `0010_reset_progreso_usuarios.sql`.
3. Run.

**No la incluyas nunca en `supabase db push` ni en CI.** El archivo lleva
una cabecera grande de advertencia para que sea evidente.

---

## Convenciones internas

- Todas las RPCs son `SECURITY DEFINER`, validan `auth.uid()` y usan
  `for update` donde tocan saldo / puntos.
- Lanzan con `RAISE EXCEPTION '<MENSAJE>' USING ERRCODE = '<codigo>'`.
  **Prohibido** envolver lógica en `EXCEPTION WHEN OTHERS THEN ...` que
  trague el error.
- Códigos: `'42501'` = no autenticado · `'23505'` = unique violation
  · `'23514'` = regla de negocio.
- Zona horaria fija a `America/Lima` en helpers de fecha
  (`semana_iso_lima`, `aplicar_racha`, `progreso_reto`).
