-- ════════════════════════════════════════════════════════════════════════
-- 0005_rpc_atomicos.sql
--
-- RPCs SECURITY DEFINER, atómicos, con `for update` donde tocan saldo o
-- puntos. Todos lanzan con RAISE EXCEPTION ... USING ERRCODE y propagan
-- el error al cliente (PROHIBIDO envolver en EXCEPTION WHEN OTHERS que
-- trague el error).
--
-- Códigos:
--   '42501' → NO_AUTENTICADO
--   '23505' → unique_violation (RETO_YA_ACEPTADO_ESTA_SEMANA)
--   '23514' → regla de negocio (SALDO_INSUFICIENTE, SALDO_NO_CONFIGURADO,
--             MONTO_INVALIDO, META_NO_ENCONTRADA, META_YA_COMPLETADA,
--             GASTO_NO_ENCONTRADO, RETO_NO_ENCONTRADO, RETO_YA_COMPLETADO,
--             RETO_FUERA_DE_SEMANA, RETO_NO_CUMPLIDO, RETO_RECLAMABLE_SOLO_DOMINGO)
--
-- Depende de:
--   • 0004 (nivel_desde_xp)
--   • 0006 (aplicar_racha) — invocado desde contribuir_meta
--   • 0007 (progreso_reto, semana_iso_lima) — invocados desde completar_reto y aceptar_reto
-- ════════════════════════════════════════════════════════════════════════

-- ── actualizar_saldo ────────────────────────────────────────────────
-- Sobrescribe saldo_disponible y marca saldo_configurado = true.
-- Cubre tanto el onboarding como la edición posterior.
create or replace function public.actualizar_saldo(p_monto numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_nuevo numeric;
begin
  if v_uid is null then
    raise exception 'NO_AUTENTICADO' using errcode = '42501';
  end if;
  if p_monto is null or p_monto < 0 then
    raise exception 'MONTO_INVALIDO' using errcode = '23514';
  end if;

  update public.profiles
     set saldo_disponible  = p_monto,
         saldo_configurado = true,
         updated_at        = now()
   where id = v_uid
   returning saldo_disponible into v_nuevo;

  if v_nuevo is null then
    raise exception 'PERFIL_NO_ENCONTRADO' using errcode = '23514';
  end if;

  return v_nuevo;
end;
$$;

grant execute on function public.actualizar_saldo(numeric) to authenticated;

-- ── registrar_gasto ────────────────────────────────────────────────
-- Atómico: bloquea profiles, valida saldo, inserta gasto, descuenta.
create or replace function public.registrar_gasto(
  p_monto       numeric,
  p_categoria   text,
  p_descripcion text,
  p_fecha       date,
  p_notas       text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_saldo numeric;
  v_configurado boolean;
  v_expense public.expenses;
begin
  if v_uid is null then
    raise exception 'NO_AUTENTICADO' using errcode = '42501';
  end if;
  if p_monto is null or p_monto <= 0 then
    raise exception 'MONTO_INVALIDO' using errcode = '23514';
  end if;

  select saldo_disponible, saldo_configurado
    into v_saldo, v_configurado
    from public.profiles
   where id = v_uid
     for update;

  if not found then
    raise exception 'PERFIL_NO_ENCONTRADO' using errcode = '23514';
  end if;

  if not v_configurado then
    raise exception 'SALDO_NO_CONFIGURADO' using errcode = '23514';
  end if;

  if v_saldo < p_monto then
    raise exception 'SALDO_INSUFICIENTE' using errcode = '23514';
  end if;

  insert into public.expenses (user_id, monto, categoria, descripcion, fecha, notas)
  values (v_uid, p_monto, p_categoria, p_descripcion, p_fecha, p_notas)
  returning * into v_expense;

  update public.profiles
     set saldo_disponible = saldo_disponible - p_monto,
         updated_at = now()
   where id = v_uid
   returning saldo_disponible into v_saldo;

  return jsonb_build_object('expense', to_jsonb(v_expense), 'saldo_nuevo', v_saldo);
end;
$$;

grant execute on function public.registrar_gasto(numeric, text, text, date, text) to authenticated;

-- ── editar_gasto ────────────────────────────────────────────────────
-- Ajusta el saldo por DELTA = nuevo_monto - viejo_monto.
-- Si delta > 0 y excede saldo → SALDO_INSUFICIENTE.
create or replace function public.editar_gasto(
  p_expense_id  uuid,
  p_monto       numeric,
  p_categoria   text,
  p_descripcion text,
  p_fecha       date,
  p_notas       text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_old_monto numeric;
  v_delta numeric;
  v_saldo numeric;
  v_expense public.expenses;
begin
  if v_uid is null then
    raise exception 'NO_AUTENTICADO' using errcode = '42501';
  end if;
  if p_monto is null or p_monto <= 0 then
    raise exception 'MONTO_INVALIDO' using errcode = '23514';
  end if;

  select monto into v_old_monto
    from public.expenses
   where id = p_expense_id and user_id = v_uid
     for update;
  if not found then
    raise exception 'GASTO_NO_ENCONTRADO' using errcode = '23514';
  end if;

  v_delta := p_monto - v_old_monto;

  select saldo_disponible into v_saldo
    from public.profiles
   where id = v_uid
     for update;
  if not found then
    raise exception 'PERFIL_NO_ENCONTRADO' using errcode = '23514';
  end if;

  if v_delta > 0 and v_saldo < v_delta then
    raise exception 'SALDO_INSUFICIENTE' using errcode = '23514';
  end if;

  update public.expenses
     set monto       = p_monto,
         categoria   = p_categoria,
         descripcion = p_descripcion,
         fecha       = p_fecha,
         notas       = p_notas
   where id = p_expense_id and user_id = v_uid
   returning * into v_expense;

  update public.profiles
     set saldo_disponible = saldo_disponible - v_delta,
         updated_at = now()
   where id = v_uid
   returning saldo_disponible into v_saldo;

  return jsonb_build_object('expense', to_jsonb(v_expense), 'saldo_nuevo', v_saldo);
end;
$$;

grant execute on function public.editar_gasto(uuid, numeric, text, text, date, text) to authenticated;

-- ── eliminar_gasto ──────────────────────────────────────────────────
-- Devuelve el monto del gasto al saldo y borra la fila.
create or replace function public.eliminar_gasto(p_expense_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_monto numeric;
  v_saldo numeric;
begin
  if v_uid is null then
    raise exception 'NO_AUTENTICADO' using errcode = '42501';
  end if;

  select monto into v_monto
    from public.expenses
   where id = p_expense_id and user_id = v_uid
     for update;
  if not found then
    raise exception 'GASTO_NO_ENCONTRADO' using errcode = '23514';
  end if;

  delete from public.expenses where id = p_expense_id;

  update public.profiles
     set saldo_disponible = saldo_disponible + v_monto,
         updated_at = now()
   where id = v_uid
   returning saldo_disponible into v_saldo;

  return v_saldo;
end;
$$;

grant execute on function public.eliminar_gasto(uuid) to authenticated;

-- ── contribuir_meta ─────────────────────────────────────────────────
-- Atómico: valida saldo contra el monto solicitado, clampa al objetivo,
-- descuenta el delta efectivo, loguea en goal_contributions, dispara
-- aplicar_racha (que también desbloquea logros de hito).
create or replace function public.contribuir_meta(
  p_goal_id uuid,
  p_monto   numeric
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_saldo numeric;
  v_configurado boolean;
  v_goal public.goals;
  v_delta numeric;
  v_racha_actual integer;
  v_fecha_lima date := (now() at time zone 'America/Lima')::date;
begin
  if v_uid is null then
    raise exception 'NO_AUTENTICADO' using errcode = '42501';
  end if;
  if p_monto is null or p_monto <= 0 then
    raise exception 'MONTO_INVALIDO' using errcode = '23514';
  end if;

  select * into v_goal
    from public.goals
   where id = p_goal_id and user_id = v_uid
     for update;
  if not found then
    raise exception 'META_NO_ENCONTRADA' using errcode = '23514';
  end if;

  select saldo_disponible, saldo_configurado
    into v_saldo, v_configurado
    from public.profiles
   where id = v_uid
     for update;
  if not found then
    raise exception 'PERFIL_NO_ENCONTRADO' using errcode = '23514';
  end if;

  if not v_configurado then
    raise exception 'SALDO_NO_CONFIGURADO' using errcode = '23514';
  end if;

  -- Validar saldo contra el monto SOLICITADO (no contra el clampado).
  -- Regla del producto: si el usuario pide más de lo que tiene → bloqueo duro.
  if v_saldo < p_monto then
    raise exception 'SALDO_INSUFICIENTE' using errcode = '23514';
  end if;

  -- Clampar al objetivo restante (el saldo ya es suficiente).
  v_delta := least(p_monto, v_goal.monto_objetivo - v_goal.monto_actual);

  if v_delta <= 0 then
    raise exception 'META_YA_COMPLETADA' using errcode = '23514';
  end if;

  update public.goals
     set monto_actual = monto_actual + v_delta,
         completada   = (monto_actual + v_delta >= monto_objetivo),
         updated_at   = now()
   where id = p_goal_id
   returning * into v_goal;

  update public.profiles
     set saldo_disponible = saldo_disponible - v_delta,
         updated_at = now()
   where id = v_uid
   returning saldo_disponible into v_saldo;

  insert into public.goal_contributions (user_id, goal_id, monto, fecha)
  values (v_uid, p_goal_id, v_delta, v_fecha_lima);

  v_racha_actual := public.aplicar_racha(v_uid);

  return jsonb_build_object(
    'goal',           to_jsonb(v_goal),
    'saldo_nuevo',    v_saldo,
    'monto_aplicado', v_delta,
    'racha_actual',   v_racha_actual
  );
end;
$$;

grant execute on function public.contribuir_meta(uuid, numeric) to authenticated;

-- ── aceptar_reto ────────────────────────────────────────────────────
-- Inserta una fila en user_challenges con semana actual + snapshot_nivel.
-- Si el usuario ya aceptó este reto esta semana, falla con '23505'.
create or replace function public.aceptar_reto(p_challenge_id uuid)
returns public.user_challenges
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_uc public.user_challenges;
  v_nivel integer;
  v_semana integer := public.semana_iso_lima();
begin
  if v_uid is null then
    raise exception 'NO_AUTENTICADO' using errcode = '42501';
  end if;

  perform 1 from public.challenges where id = p_challenge_id and activo = true;
  if not found then
    raise exception 'RETO_NO_ENCONTRADO' using errcode = '23514';
  end if;

  select nivel into v_nivel from public.profiles where id = v_uid;
  if not found then
    raise exception 'PERFIL_NO_ENCONTRADO' using errcode = '23514';
  end if;

  insert into public.user_challenges (
    user_id, challenge_id, semana, snapshot_nivel,
    progreso, completado, fecha_inicio, progreso_cache
  ) values (
    v_uid, p_challenge_id, v_semana, v_nivel,
    0, false, now(), 0
  )
  returning * into v_uc;

  return v_uc;
exception
  when unique_violation then
    raise exception 'RETO_YA_ACEPTADO_ESTA_SEMANA' using errcode = '23505';
end;
$$;

grant execute on function public.aceptar_reto(uuid) to authenticated;

-- ── completar_reto ──────────────────────────────────────────────────
-- Re-evalúa el progreso server-side llamando a progreso_reto.
-- Solo si cumple, suma XP, recalcula nivel y marca completado.
-- Para retos "no exceder" / "saldo positivo fin de semana" exige domingo
-- en Lima para evitar farmeo de claim temprano.
create or replace function public.completar_reto(p_user_challenge_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_uc public.user_challenges;
  v_ch public.challenges;
  v_progreso numeric;
  v_xp_antes integer;
  v_nivel_antes integer;
  v_xp_nuevo integer;
  v_nivel_nuevo integer;
  v_semana integer := public.semana_iso_lima();
  v_isodow integer := extract(isodow from (now() at time zone 'America/Lima')::date)::int;
  v_cumplido boolean;
begin
  if v_uid is null then
    raise exception 'NO_AUTENTICADO' using errcode = '42501';
  end if;

  select * into v_uc
    from public.user_challenges
   where id = p_user_challenge_id and user_id = v_uid
     for update;
  if not found then
    raise exception 'RETO_NO_ENCONTRADO' using errcode = '23514';
  end if;

  if v_uc.semana is null or v_uc.semana <> v_semana then
    raise exception 'RETO_FUERA_DE_SEMANA' using errcode = '23514';
  end if;

  if v_uc.completado then
    raise exception 'RETO_YA_COMPLETADO' using errcode = '23514';
  end if;

  select * into v_ch from public.challenges where id = v_uc.challenge_id;
  if not found then
    raise exception 'RETO_NO_ENCONTRADO' using errcode = '23514';
  end if;

  -- Guard: retos "no exceder" / "saldo al cierre" solo reclamables domingo Lima.
  if v_ch.medicion in (
       'gasto_total_max_semana',
       'sin_categoria_semana',
       'saldo_positivo_fin_semana'
     ) and v_isodow < 7 then
    raise exception 'RETO_RECLAMABLE_SOLO_DOMINGO' using errcode = '23514';
  end if;

  -- Re-evaluar progreso server-side
  v_progreso := public.progreso_reto(p_user_challenge_id);

  -- Determinar cumplimiento según semántica de la medición
  v_cumplido := case v_ch.medicion
    when 'gasto_total_max_semana' then v_progreso <= v_ch.meta_valor
    when 'sin_categoria_semana'   then v_progreso = 0
    else v_progreso >= v_ch.meta_valor
  end;

  if not v_cumplido then
    raise exception 'RETO_NO_CUMPLIDO' using errcode = '23514';
  end if;

  select puntos_totales, nivel
    into v_xp_antes, v_nivel_antes
    from public.profiles
   where id = v_uid
     for update;
  if not found then
    raise exception 'PERFIL_NO_ENCONTRADO' using errcode = '23514';
  end if;

  v_xp_nuevo    := v_xp_antes + v_ch.puntos;
  v_nivel_nuevo := public.nivel_desde_xp(v_xp_nuevo);

  update public.profiles
     set puntos_totales = v_xp_nuevo,
         nivel          = v_nivel_nuevo,
         updated_at     = now()
   where id = v_uid;

  update public.user_challenges
     set completado     = true,
         fecha_fin      = now(),
         progreso_cache = v_progreso
   where id = p_user_challenge_id;

  return jsonb_build_object(
    'xp_nuevo',       v_xp_nuevo,
    'nivel_nuevo',    v_nivel_nuevo,
    'subio_de_nivel', v_nivel_nuevo > v_nivel_antes,
    'progreso',       v_progreso
  );
end;
$$;

grant execute on function public.completar_reto(uuid) to authenticated;

-- ── eliminar_meta ───────────────────────────────────────────────────
-- Por defecto devuelve monto_actual al saldo (decisión §2.A del plan).
create or replace function public.eliminar_meta(
  p_goal_id        uuid,
  p_devolver_saldo boolean default true
) returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_monto_actual numeric;
  v_saldo numeric;
begin
  if v_uid is null then
    raise exception 'NO_AUTENTICADO' using errcode = '42501';
  end if;

  select monto_actual into v_monto_actual
    from public.goals
   where id = p_goal_id and user_id = v_uid
     for update;
  if not found then
    raise exception 'META_NO_ENCONTRADA' using errcode = '23514';
  end if;

  delete from public.goals where id = p_goal_id;

  if p_devolver_saldo and v_monto_actual > 0 then
    update public.profiles
       set saldo_disponible = saldo_disponible + v_monto_actual,
           updated_at = now()
     where id = v_uid
     returning saldo_disponible into v_saldo;
  else
    select saldo_disponible into v_saldo from public.profiles where id = v_uid;
  end if;

  return v_saldo;
end;
$$;

grant execute on function public.eliminar_meta(uuid, boolean) to authenticated;
