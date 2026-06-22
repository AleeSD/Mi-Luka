-- ════════════════════════════════════════════════════════════════════════
-- 0003_challenges_metadata.sql
--
-- Añade metadata para el modelo nuevo de retos semanales repetibles.
-- Idempotente.
--
-- challenges:
--   • dificultad     text check ('facil','media','dificil')  default 'media'
--   • categoria_reto text   (etiqueta UX: ahorro/control/registro/progreso)
--   • medicion       text   (identificador para progreso_reto)
--   • parametro      text   (parámetro extra para algunas mediciones,
--                            p.ej. 'entretenimiento' en sin_categoria_semana)
--   • unique (titulo)       (necesario para seeds idempotentes)
--
-- user_challenges:
--   • semana         integer  (isoyear*100 + isoweek en America/Lima)
--   • snapshot_nivel integer  (nivel del perfil al aceptar — usado por subir_nivel_semana)
--   • progreso_cache numeric(12,2) not null default 0
--   • unique (user_id, challenge_id, semana)
-- ════════════════════════════════════════════════════════════════════════

-- ── challenges ──────────────────────────────────────────────────────
alter table public.challenges
  add column if not exists dificultad     text not null default 'media',
  add column if not exists categoria_reto text,
  add column if not exists medicion       text,
  add column if not exists parametro      text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'challenges_dificultad_check'
  ) then
    alter table public.challenges
      add constraint challenges_dificultad_check
      check (dificultad in ('facil','media','dificil'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'challenges_titulo_unique'
  ) then
    alter table public.challenges
      add constraint challenges_titulo_unique unique (titulo);
  end if;
end$$;

-- ── user_challenges ─────────────────────────────────────────────────
alter table public.user_challenges
  add column if not exists semana         integer,
  add column if not exists snapshot_nivel integer,
  add column if not exists progreso_cache numeric(12,2) not null default 0;

-- Backfill perezoso: las filas viejas tendrán semana NULL.
-- 0010 (destructiva) las truncará. Mientras tanto, la UNIQUE permite
-- varios NULLs (PG trata NULL como distinto), así que no rompe.

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'user_challenges_user_challenge_semana_unique'
  ) then
    alter table public.user_challenges
      add constraint user_challenges_user_challenge_semana_unique
      unique (user_id, challenge_id, semana);
  end if;
end$$;
