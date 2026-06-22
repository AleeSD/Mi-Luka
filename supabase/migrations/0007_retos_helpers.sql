-- ════════════════════════════════════════════════════════════════════════
-- 0007_retos_helpers.sql
--
-- Helpers para el modelo de retos semanales:
--   • semana_iso_lima()                       — entero isoyear*100+isoweek
--   • longest_consecutive_days_with_expense() — auxiliar para gastos_dias_seguidos
--   • progreso_reto(p_user_challenge_id)      — progreso live según medicion
--   • retos_de_la_semana(p_cantidad)          — rotación filtrada por semana
--
-- Todo en zona horaria America/Lima.
-- ════════════════════════════════════════════════════════════════════════

-- ── semana_iso_lima ──────────────────────────────────────────────────
create or replace function public.semana_iso_lima()
returns integer
language sql
stable
as $$
  select (extract(isoyear from (now() at time zone 'America/Lima'))::int * 100)
       + (extract(week    from (now() at time zone 'America/Lima'))::int);
$$;

grant execute on function public.semana_iso_lima() to authenticated;

-- ── longest_consecutive_days_with_expense ────────────────────────────
-- Devuelve la mayor racha de días consecutivos con ≥ 1 gasto desde p_desde.
create or replace function public.longest_consecutive_days_with_expense(
  p_user_id uuid,
  p_desde   date
) returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_dias int := 0;
  v_max  int := 0;
  v_prev date;
  v_curr date;
begin
  for v_curr in
    select distinct fecha
      from public.expenses
     where user_id = p_user_id and fecha >= p_desde
     order by fecha
  loop
    if v_prev is null or v_curr = v_prev + 1 then
      v_dias := v_dias + 1;
    else
      v_dias := 1;
    end if;
    if v_dias > v_max then v_max := v_dias; end if;
    v_prev := v_curr;
  end loop;
  return v_max;
end;
$$;

-- No se expone directamente; lo invoca progreso_reto.
revoke execute on function public.longest_consecutive_days_with_expense(uuid, date) from public;

-- ── progreso_reto ────────────────────────────────────────────────────
-- Devuelve el progreso live para el reto del usuario en la semana en curso.
-- La UI compara contra challenges.meta_valor para mostrar barra y habilitar
-- el botón "Reclamar XP". completar_reto re-evalúa server-side igual.
create or replace function public.progreso_reto(p_user_challenge_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_uc public.user_challenges;
  v_ch public.challenges;
  v_hoy date := (now() at time zone 'America/Lima')::date;
  -- isodow: 1 = lunes ... 7 = domingo. v_lunes = hoy - (isodow - 1).
  v_lunes date := v_hoy - ((extract(isodow from v_hoy)::int - 1));
  v_lunes_ts timestamptz := v_lunes::timestamp at time zone 'America/Lima';
  v_progreso numeric := 0;
begin
  if v_uid is null then
    raise exception 'NO_AUTENTICADO' using errcode = '42501';
  end if;

  select * into v_uc
    from public.user_challenges
   where id = p_user_challenge_id and user_id = v_uid;
  if not found then
    raise exception 'RETO_NO_ENCONTRADO' using errcode = '23514';
  end if;

  select * into v_ch from public.challenges where id = v_uc.challenge_id;
  if not found then
    raise exception 'RETO_NO_ENCONTRADO' using errcode = '23514';
  end if;

  case v_ch.medicion
    when 'ahorro_monto_semana' then
      select coalesce(sum(monto), 0) into v_progreso
        from public.goal_contributions
       where user_id = v_uid and fecha >= v_lunes;

    when 'ahorro_count_semana' then
      select count(*) into v_progreso
        from public.goal_contributions
       where user_id = v_uid and fecha >= v_lunes;

    when 'ahorro_dias_distintos_semana' then
      select count(distinct fecha) into v_progreso
        from public.goal_contributions
       where user_id = v_uid and fecha >= v_lunes;

    when 'meta_completada_semana' then
      select count(*) into v_progreso
        from public.goals
       where user_id = v_uid
         and completada = true
         and updated_at >= v_lunes_ts;

    when 'dias_sin_gasto_semana' then
      -- Días transcurridos esta semana = isodow del día actual (1=lunes, 7=domingo).
      -- Días con gasto = count distinct fechas con gasto.
      -- Días sin gasto (so far) = isodow - distinct_fechas, no menor que 0.
      v_progreso := greatest(0,
        (extract(isodow from v_hoy)::int)
        - coalesce((select count(distinct fecha)
                      from public.expenses
                     where user_id = v_uid and fecha >= v_lunes), 0)
      );

    when 'gasto_total_max_semana' then
      select coalesce(sum(monto), 0) into v_progreso
        from public.expenses where user_id = v_uid and fecha >= v_lunes;

    when 'sin_categoria_semana' then
      -- challenges.parametro guarda la categoria a evitar
      select count(*) into v_progreso
        from public.expenses
       where user_id = v_uid
         and fecha >= v_lunes
         and categoria::text = v_ch.parametro;

    when 'gastos_dias_seguidos' then
      v_progreso := public.longest_consecutive_days_with_expense(v_uid, v_lunes);

    when 'gastos_dias_distintos_semana' then
      select count(distinct fecha) into v_progreso
        from public.expenses where user_id = v_uid and fecha >= v_lunes;

    when 'gastos_count_semana' then
      select count(*) into v_progreso
        from public.expenses where user_id = v_uid and fecha >= v_lunes;

    when 'subir_nivel_semana' then
      select case when nivel > coalesce(v_uc.snapshot_nivel, 1) then 1 else 0 end
        into v_progreso
        from public.profiles where id = v_uid;

    when 'racha_minima' then
      select racha_actual into v_progreso from public.profiles where id = v_uid;

    when 'saldo_positivo_fin_semana' then
      select case when saldo_disponible > 0 then 1 else 0 end
        into v_progreso
        from public.profiles where id = v_uid;

    else
      v_progreso := 0;
  end case;

  return coalesce(v_progreso, 0);
end;
$$;

grant execute on function public.progreso_reto(uuid) to authenticated;

-- ── retos_de_la_semana ──────────────────────────────────────────────
-- Selección determinística por semana ISO + exclusión de los que el
-- usuario ya tiene (aceptado o completado) en la SEMANA EN CURSO.
-- Los retos de semanas anteriores NO se excluyen (modelo repetible).
create or replace function public.retos_de_la_semana(p_cantidad int default 5)
returns setof public.challenges
language sql
stable
security definer
set search_path = public
as $$
  with sem as (select public.semana_iso_lima() as s)
  select c.*
    from public.challenges c, sem
   where c.activo = true
     and not exists (
       select 1 from public.user_challenges uc
        where uc.user_id      = auth.uid()
          and uc.challenge_id = c.id
          and uc.semana       = sem.s
     )
   order by md5(c.id::text || sem.s::text)
   limit p_cantidad;
$$;

grant execute on function public.retos_de_la_semana(int) to authenticated;
