-- ════════════════════════════════════════════════════════════════════════
-- 0006_racha_helper.sql
--
-- aplicar_racha(user_id) — helper SECURITY DEFINER invocado solo desde
-- contribuir_meta (0005). No se expone a clientes.
--
-- Lógica (todo en zona horaria America/Lima):
--   • Hoy = (now() at time zone 'America/Lima')::date
--   • Si ultima_fecha_racha = hoy        → no cambia (ya contó hoy).
--   • Si ultima_fecha_racha = hoy - 1    → racha_actual += 1.
--   • En otro caso                       → racha_actual = 1 (ruptura).
--   • racha_mas_larga = greatest(...).
--   • Desbloquea achievements con condicion_tipo='racha' y
--     condicion_valor <= racha_actual, idempotente.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.aplicar_racha(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoy        date := (now() at time zone 'America/Lima')::date;
  v_ultima     date;
  v_actual     integer;
  v_mas_larga  integer;
begin
  select ultima_fecha_racha, racha_actual, racha_mas_larga
    into v_ultima, v_actual, v_mas_larga
    from public.profiles
   where id = p_user_id
     for update;

  if not found then
    raise exception 'PERFIL_NO_ENCONTRADO' using errcode = '23514';
  end if;

  if v_ultima = v_hoy then
    return v_actual;
  end if;

  if v_ultima = v_hoy - 1 then
    v_actual := v_actual + 1;
  else
    v_actual := 1;
  end if;

  v_mas_larga := greatest(coalesce(v_mas_larga, 0), v_actual);

  update public.profiles
     set racha_actual       = v_actual,
         racha_mas_larga    = v_mas_larga,
         ultima_fecha_racha = v_hoy,
         updated_at         = now()
   where id = p_user_id;

  -- Desbloquea logros de hito alcanzados (idempotente)
  insert into public.user_achievements (user_id, achievement_id)
  select p_user_id, a.id
    from public.achievements a
   where a.condicion_tipo = 'racha'
     and a.condicion_valor <= v_actual
     and not exists (
       select 1 from public.user_achievements ua
        where ua.user_id = p_user_id and ua.achievement_id = a.id
     );

  return v_actual;
end;
$$;

-- No se expone a clientes; solo lo invoca contribuir_meta (SECURITY DEFINER).
revoke execute on function public.aplicar_racha(uuid) from public;
