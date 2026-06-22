-- ════════════════════════════════════════════════════════════════════════
-- 0003a_goal_contributions.sql
--
-- Crea la tabla append-only goal_contributions, que loguea cada
-- contribución efectiva a una meta. Habilita los retos basados en
-- "N contribuciones esta semana" / "ahorraste en M días distintos" /
-- "Ahorra S/ X esta semana".
--
-- RLS: user_id = auth.uid(). Sin políticas de UPDATE ni DELETE — la tabla
-- es inmutable desde el cliente. El cascade en goal_id es SET NULL para
-- preservar el histórico aunque la meta se elimine (las contribuciones
-- son hechos verdaderos).
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

create table if not exists public.goal_contributions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  goal_id    uuid references public.goals(id) on delete set null,
  monto      numeric(12,2) not null check (monto > 0),
  fecha      date not null,
  created_at timestamptz not null default now()
);

create index if not exists goal_contributions_user_fecha_idx
  on public.goal_contributions (user_id, fecha desc);

create index if not exists goal_contributions_user_goal_fecha_idx
  on public.goal_contributions (user_id, goal_id, fecha desc);

alter table public.goal_contributions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'goal_contributions'
      and policyname = 'goal_contributions_select_own'
  ) then
    create policy goal_contributions_select_own on public.goal_contributions
      for select using (auth.uid() = user_id);
  end if;

  -- NOTA: NO se define política de INSERT, UPDATE ni DELETE para clientes.
  -- Los inserts solo ocurren vía RPC contribuir_meta (SECURITY DEFINER).
  -- Sin UPDATE/DELETE para el cliente: la tabla es append-only.
end$$;
