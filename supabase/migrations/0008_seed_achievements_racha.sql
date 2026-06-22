-- ════════════════════════════════════════════════════════════════════════
-- 0008_seed_achievements_racha.sql
--
-- Seed de logros de racha. Idempotente (unique en titulo + on conflict).
-- Estos logros se desbloquean automáticamente desde aplicar_racha (0006).
-- ════════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'achievements_titulo_unique'
  ) then
    alter table public.achievements
      add constraint achievements_titulo_unique unique (titulo);
  end if;
end$$;

insert into public.achievements (titulo, descripcion, icono, condicion_tipo, condicion_valor)
values
  ('Semana y media de fuego', '10 días seguidos ahorrando',  'flame',    'racha', 10),
  ('Un mes de constancia',    '25 días seguidos ahorrando',  'sparkles', 'racha', 25),
  ('Disciplina nivel pro',    '50 días seguidos ahorrando',  'trophy',   'racha', 50),
  ('Centenario',              '100 días seguidos ahorrando', 'crown',    'racha', 100),
  ('Imparable',               '200 días seguidos ahorrando', 'star',     'racha', 200),
  ('Un año entero',           '365 días seguidos ahorrando', 'medal',    'racha', 365)
on conflict (titulo) do nothing;
