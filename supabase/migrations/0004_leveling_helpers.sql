-- ════════════════════════════════════════════════════════════════════════
-- 0004_leveling_helpers.sql
--
-- Helpers de niveles. Espejo exacto del helper TS en src/lib/leveling.ts.
--
-- Curva: xp_para_alcanzar_nivel(n) = 100 * n * (n-1) / 2
--   n=1 → 0  | n=2 → 100  | n=3 → 300  | n=4 → 600  | n=5 → 1000  | n=10 → 4500
--
-- nivel_desde_xp(xp) usa BUCLE ENTERO PURO (sin sqrt, sin numeric).
-- Cero drift en bordes (99→1, 100→2, 299→2, 300→3, 599→3, 600→4).
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.xp_para_alcanzar_nivel(p_n integer)
returns integer
language sql
immutable
as $$
  select case
    when p_n <= 1 then 0
    else (100 * (p_n - 1) * p_n) / 2
  end;
$$;

create or replace function public.nivel_desde_xp(p_xp integer)
returns integer
language plpgsql
immutable
as $$
declare
  v_xp_base constant integer := 100;
  v_n integer := 1;
begin
  if p_xp is null or p_xp <= 0 then
    return 1;
  end if;
  -- Itera hasta que el umbral del siguiente nivel supere p_xp.
  -- Umbral_siguiente_nivel(n+1 visto desde n actual) = 100 * n * (n+1) / 2.
  -- Mientras (umbral del nivel n+1) <= p_xp, el usuario ya alcanzó n+1.
  while (v_xp_base * v_n * (v_n + 1)) / 2 <= p_xp loop
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

grant execute on function public.nivel_desde_xp(integer)      to authenticated;
grant execute on function public.xp_para_alcanzar_nivel(integer) to authenticated;

-- Resincroniza nivel con la fórmula nueva para perfiles existentes.
-- (La 0010 reseteará todo a 0/1, pero esta línea es idempotente y
-- mantiene el invariante mientras no se aplique 0010.)
update public.profiles
   set nivel = public.nivel_desde_xp(coalesce(puntos_totales, 0));
