-- ════════════════════════════════════════════════════════════════════════
-- 0011_guardadito_y_ahorro_libre.sql
--
-- Rev. 5: la racha ahora se alimenta también de AHORRO LIBRE (sin meta
-- destino). Esta migración es ADITIVA: NO modifica 0001–0010, solo
-- añade una columna y dos RPCs.
--
-- ─────────────────────────────────────────────────────────────────────
-- Columna nueva:
--   • profiles.monto_guardadito numeric(12,2) not null default 0
--                                check (monto_guardadito >= 0)
--
-- RPCs nuevos:
--   • registrar_ahorro_libre(p_monto)  → descuenta saldo, suma al
--     guardadito, inserta en goal_contributions con goal_id=null, llama
--     a aplicar_racha. Bloqueo duro con SALDO_INSUFICIENTE/
--     SALDO_NO_CONFIGURADO igual que registrar_gasto.
--   • sacar_de_guardadito(p_monto)     → suma al saldo, resta del
--     guardadito. NO toca la racha. Raise GUARDADITO_INSUFICIENTE.
--
-- ─────────────────────────────────────────────────────────────────────
-- Idempotencia: add column if not exists + create or replace function +
-- guards en pg_constraint. Re-ejecutar la migración es seguro.
--
-- Encaje con la 0010 (destructiva):
--   La 0010 ya se aplicó antes de existir esta columna. El default = 0
--   en el ADD COLUMN deja todos los perfiles existentes con
--   monto_guardadito = 0 automáticamente. Cero acción adicional. No es
--   necesario re-correr la 0010 ni hacer un UPDATE puntual.
--
-- Encaje con aplicar_racha (0006): NO se duplica la racha. El helper
-- arranca con `if v_ultima = v_hoy then return v_actual`, así que si
-- el usuario contribuye a una meta y además registra un ahorro libre
-- el mismo día Lima, la racha sube UNA sola vez.
--
-- Encaje con retos de ahorro (0007, #1–5): las mediciones
-- ahorro_monto_semana / ahorro_count_semana / ahorro_dias_distintos_semana
-- queryean goal_contributions SIN filtrar por goal_id. Por lo tanto
-- ahora cuentan tanto contribuciones a metas como ahorro libre. Es la
-- semántica que el brief pidió ("la racha cuenta ahorro en general").
-- ════════════════════════════════════════════════════════════════════════

-- ── columna ─────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists monto_guardadito numeric(12,2) not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_monto_guardadito_nonneg'
  ) then
    alter table public.profiles
      add constraint profiles_monto_guardadito_nonneg
      check (monto_guardadito >= 0);
  end if;
end$$;

-- ── registrar_ahorro_libre ──────────────────────────────────────────
create or replace function public.registrar_ahorro_libre(p_monto numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_saldo numeric;
  v_configurado boolean;
  v_guardadito numeric;
  v_racha_actual integer;
  v_fecha_lima date := (now() at time zone 'America/Lima')::date;
begin
  if v_uid is null then
    raise exception 'NO_AUTENTICADO' using errcode = '42501';
  end if;
  if p_monto is null or p_monto <= 0 then
    raise exception 'MONTO_INVALIDO' using errcode = '23514';
  end if;

  select saldo_disponible, saldo_configurado, monto_guardadito
    into v_saldo, v_configurado, v_guardadito
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

  update public.profiles
     set saldo_disponible = saldo_disponible - p_monto,
         monto_guardadito = monto_guardadito + p_monto,
         updated_at       = now()
   where id = v_uid
   returning saldo_disponible, monto_guardadito
        into v_saldo, v_guardadito;

  -- Log inmutable de ahorro: goal_id = null indica ahorro libre.
  insert into public.goal_contributions (user_id, goal_id, monto, fecha)
  values (v_uid, null, p_monto, v_fecha_lima);

  -- Alimenta la racha (mismo helper que contribuir_meta).
  -- No duplica: aplicar_racha sale temprano si ultima_fecha_racha = hoy_lima.
  v_racha_actual := public.aplicar_racha(v_uid);

  return jsonb_build_object(
    'saldo_nuevo',      v_saldo,
    'guardadito_nuevo', v_guardadito,
    'racha_actual',     v_racha_actual
  );
end;
$$;

grant execute on function public.registrar_ahorro_libre(numeric) to authenticated;

-- ── sacar_de_guardadito ─────────────────────────────────────────────
-- Simetría con eliminar_meta(p_devolver_saldo=true): permite revertir
-- plata del guardadito al saldo si el usuario apartó de más. NO toca la
-- racha (sacar no es ahorrar).
create or replace function public.sacar_de_guardadito(p_monto numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_saldo numeric;
  v_guardadito numeric;
begin
  if v_uid is null then
    raise exception 'NO_AUTENTICADO' using errcode = '42501';
  end if;
  if p_monto is null or p_monto <= 0 then
    raise exception 'MONTO_INVALIDO' using errcode = '23514';
  end if;

  select monto_guardadito into v_guardadito
    from public.profiles
   where id = v_uid
     for update;
  if not found then
    raise exception 'PERFIL_NO_ENCONTRADO' using errcode = '23514';
  end if;

  if v_guardadito < p_monto then
    raise exception 'GUARDADITO_INSUFICIENTE' using errcode = '23514';
  end if;

  update public.profiles
     set monto_guardadito = monto_guardadito - p_monto,
         saldo_disponible = saldo_disponible + p_monto,
         updated_at       = now()
   where id = v_uid
   returning saldo_disponible, monto_guardadito
        into v_saldo, v_guardadito;

  return jsonb_build_object(
    'saldo_nuevo',      v_saldo,
    'guardadito_nuevo', v_guardadito
  );
end;
$$;

grant execute on function public.sacar_de_guardadito(numeric) to authenticated;
