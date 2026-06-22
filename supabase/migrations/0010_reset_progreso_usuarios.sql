-- ════════════════════════════════════════════════════════════════════════
-- ⚠️                                                                   ⚠️
-- ⚠️   0010_reset_progreso_usuarios.sql                                ⚠️
-- ⚠️                                                                   ⚠️
-- ⚠️   MIGRACIÓN DESTRUCTIVA — APLICAR EXACTAMENTE UNA SOLA VEZ        ⚠️
-- ⚠️                                                                   ⚠️
-- ⚠️   ESTE ARCHIVO NO ES IDEMPOTENTE EN LA PRÁCTICA.                  ⚠️
-- ⚠️   RE-EJECUTARLO BORRARÍA EL AVANCE QUE LOS USUARIOS HAYAN         ⚠️
-- ⚠️   RECONSTRUIDO DESPUÉS DE LA PRIMERA APLICACIÓN.                  ⚠️
-- ⚠️                                                                   ⚠️
-- ⚠️   NO LO INCLUYAS EN `supabase db push`. APLICALO MANUALMENTE      ⚠️
-- ⚠️   DESDE EL SQL EDITOR DESPUÉS DE 0001–0009.                       ⚠️
-- ⚠️                                                                   ⚠️
-- ════════════════════════════════════════════════════════════════════════
--
-- QUÉ BORRA:
--   • profiles.puntos_totales      → 0
--   • profiles.nivel               → 1 (nivel_desde_xp(0))
--   • profiles.racha_actual        → 0
--   • profiles.racha_mas_larga     → 0
--   • profiles.ultima_fecha_racha  → null
--   • profiles.saldo_disponible    → 0
--   • profiles.saldo_configurado   → false (todos pasan por el portón)
--   • user_challenges              → todas las filas (truncate)
--   • user_achievements            → todas las filas (truncate)
--
-- QUÉ CONSERVA:
--   • expenses             (intacto)
--   • goals                (intacto, incluyendo monto_actual y completada)
--   • goal_contributions   (intacto — son hechos verdaderos)
--   • benefits / challenges / achievements (catálogos)
--
-- ─────────────────────────────────────────────────────────────────────
-- ANTES DE EJECUTAR:
--   1) Verifica que las migraciones 0001–0009 ya están aplicadas.
--   2) Haz respaldo. Opción A (preferida, fuera del proyecto):
--        pg_dump --host <host> --port 5432 --username postgres \
--          --no-owner --no-privileges \
--          --table public.profiles \
--          --table public.user_challenges \
--          --table public.user_achievements \
--          --file backup_pre_0010_AAAAMMDD.sql <db-name>
--      Opción B (snapshot dentro del mismo Postgres — escribe la fecha
--      a mano, NO uses $(date) que el SQL Editor no expande):
--        create table _backup_profiles_AAAAMMDD          as select * from public.profiles;
--        create table _backup_user_challenges_AAAAMMDD   as select * from public.user_challenges;
--        create table _backup_user_achievements_AAAAMMDD as select * from public.user_achievements;
--   3) EJECUTA UNA VEZ EN EL SQL EDITOR.
-- ════════════════════════════════════════════════════════════════════════

begin;

-- Vacía progreso de usuarios
truncate table public.user_challenges  restart identity cascade;
truncate table public.user_achievements restart identity cascade;

-- Resetea profiles
update public.profiles
   set puntos_totales     = 0,
       nivel              = public.nivel_desde_xp(0),
       racha_actual       = 0,
       racha_mas_larga    = 0,
       ultima_fecha_racha = null,
       saldo_disponible   = 0,
       saldo_configurado  = false,
       updated_at         = now();

-- Re-asegura la UNIQUE de retos por semana después del truncate.
-- Idempotente con guard sobre pg_constraint.
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

commit;
