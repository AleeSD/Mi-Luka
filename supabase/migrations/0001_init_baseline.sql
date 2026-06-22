-- ════════════════════════════════════════════════════════════════════════
-- 0001_init_baseline.sql
--
-- ⚠️  BASELINE RETROACTIVO — capturado manualmente el 2026-06-18
--     a partir del esquema real del proyecto Supabase ohmxifpomswzjpipahkd.
--     Ya aplicado en Supabase bajo la migración 20260611012637_create_initial_schema.
--     Este archivo existe como referencia histórica para el repo.
--     NO RE-EJECUTAR: está registrado en supabase_migrations para que
--     db push lo ignore.
-- ════════════════════════════════════════════════════════════════════════

-- ── Extensiones ──────────────────────────────────────────────────────
create extension if not exists pgcrypto;

-- ── Tablas ───────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  nombre         text not null,
  avatar_url     text,
  nivel          integer not null default 1,
  puntos_totales integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  monto       numeric not null check (monto > 0),
  categoria   text not null check (categoria in (
                'comida','transporte','entretenimiento','educacion',
                'compras','salud','servicios','otros')),
  descripcion text not null check (char_length(descripcion) >= 1 and char_length(descripcion) <= 100),
  fecha       date not null,
  notas       text check (char_length(notas) <= 500),
  created_at  timestamptz not null default now()
);

create table if not exists public.goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  titulo         text not null check (char_length(titulo) >= 1 and char_length(titulo) <= 100),
  monto_objetivo numeric not null check (monto_objetivo > 0),
  monto_actual   numeric not null default 0 check (monto_actual >= 0),
  fecha_limite   date,
  color          text default '#4F46E5',
  icono          text default 'target',
  completada     boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.challenges (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null,
  descripcion   text not null,
  puntos        integer not null check (puntos > 0),
  duracion_dias integer not null check (duracion_dias > 0),
  tipo          text not null check (tipo in ('ahorro','registro','sin_gasto','personalizado')),
  meta_valor    numeric,
  activo        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists public.user_challenges (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  progreso     numeric not null default 0 check (progreso >= 0),
  completado   boolean not null default false,
  fecha_inicio timestamptz not null default now(),
  fecha_fin    timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists public.achievements (
  id              uuid primary key default gen_random_uuid(),
  titulo          text not null,
  descripcion     text not null,
  icono           text not null,
  condicion_tipo  text not null,
  condicion_valor integer not null default 1,
  created_at      timestamptz not null default now()
);

create table if not exists public.user_achievements (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  achievement_id     uuid not null references public.achievements(id) on delete cascade,
  fecha_desbloqueado timestamptz not null default now()
);

create table if not exists public.benefits (
  id               uuid primary key default gen_random_uuid(),
  nombre_aliado    text not null,
  titulo           text not null,
  descripcion      text not null,
  descuento        text not null,
  codigo           text not null,
  categoria        text not null check (categoria in (
                     'fitness','wellness','educacion','lifestyle','comida','transporte')),
  color            text default '#4F46E5',
  icono            text,
  fecha_expiracion date,
  activo           boolean not null default true,
  created_at       timestamptz not null default now()
);

-- ── RLS ──────────────────────────────────────────────────────────────
alter table public.profiles          enable row level security;
alter table public.expenses          enable row level security;
alter table public.goals             enable row level security;
alter table public.challenges        enable row level security;
alter table public.user_challenges   enable row level security;
alter table public.achievements      enable row level security;
alter table public.user_achievements enable row level security;
alter table public.benefits          enable row level security;

-- profiles
create policy "Users can view own profile"   on public.profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- expenses
create policy "Users can view own expenses"   on public.expenses for select using (auth.uid() = user_id);
create policy "Users can insert own expenses" on public.expenses for insert with check (auth.uid() = user_id);
create policy "Users can update own expenses" on public.expenses for update using (auth.uid() = user_id);
create policy "Users can delete own expenses" on public.expenses for delete using (auth.uid() = user_id);

-- goals
create policy "Users can view own goals"   on public.goals for select using (auth.uid() = user_id);
create policy "Users can insert own goals" on public.goals for insert with check (auth.uid() = user_id);
create policy "Users can update own goals" on public.goals for update using (auth.uid() = user_id);
create policy "Users can delete own goals" on public.goals for delete using (auth.uid() = user_id);

-- challenges
create policy "Anyone can view active challenges" on public.challenges for select using (activo = true);

-- user_challenges
create policy "Users can view own user_challenges"   on public.user_challenges for select using (auth.uid() = user_id);
create policy "Users can insert own user_challenges" on public.user_challenges for insert with check (auth.uid() = user_id);
create policy "Users can update own user_challenges" on public.user_challenges for update using (auth.uid() = user_id);

-- achievements
create policy "Anyone can view achievements" on public.achievements for select using (true);

-- user_achievements
create policy "Users can view own user_achievements"   on public.user_achievements for select using (auth.uid() = user_id);
create policy "Users can insert own user_achievements" on public.user_achievements for insert with check (auth.uid() = user_id);

-- benefits
create policy "Anyone can view active benefits" on public.benefits for select using (activo = true);

-- ── Trigger handle_new_user ──────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)));
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'on_auth_user_created'
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end$$;
