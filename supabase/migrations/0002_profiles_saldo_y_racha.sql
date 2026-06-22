-- ════════════════════════════════════════════════════════════════════════
-- 0002_profiles_saldo_y_racha.sql
--
-- Añade las columnas de saldo (con bandera de onboarding) y racha a
-- profiles. Idempotente.
--
-- Columnas nuevas:
--   • saldo_disponible      numeric(12,2) not null default 0
--   • saldo_configurado     boolean       not null default false (gate)
--   • racha_actual          integer       not null default 0
--   • racha_mas_larga       integer       not null default 0
--   • ultima_fecha_racha    date          (nullable)
--   • umbral_saldo_bajo     numeric(12,2) not null default 50
--
-- Constraint adicional: saldo_disponible >= 0.
-- ════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists saldo_disponible   numeric(12,2) not null default 0,
  add column if not exists saldo_configurado  boolean       not null default false,
  add column if not exists racha_actual       integer       not null default 0,
  add column if not exists racha_mas_larga    integer       not null default 0,
  add column if not exists ultima_fecha_racha date,
  add column if not exists umbral_saldo_bajo  numeric(12,2) not null default 50;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_saldo_disponible_nonneg'
  ) then
    alter table public.profiles
      add constraint profiles_saldo_disponible_nonneg
      check (saldo_disponible >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_umbral_saldo_bajo_nonneg'
  ) then
    alter table public.profiles
      add constraint profiles_umbral_saldo_bajo_nonneg
      check (umbral_saldo_bajo >= 0);
  end if;
end$$;
