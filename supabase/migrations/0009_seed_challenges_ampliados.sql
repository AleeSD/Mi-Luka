-- ════════════════════════════════════════════════════════════════════════
-- 0009_seed_challenges_ampliados.sql
--
-- Seed de los 17 retos semanales. Idempotente (unique en titulo + on
-- conflict). Todos calibrados para cumplirse en ≤ 1 semana ISO.
--
-- XP por dificultad:
--   facil = 20  | media = 40  | dificil = 80
--
-- categoria_reto agrupa para UX: ahorro / control / registro / progreso.
-- parametro guarda dato adicional (p.ej. categoría a evitar en
-- sin_categoria_semana).
-- ════════════════════════════════════════════════════════════════════════

insert into public.challenges
  (titulo, descripcion, puntos, duracion_dias, tipo, meta_valor,
   activo, dificultad, categoria_reto, medicion, parametro)
values
  ('Ahorra S/ 50 esta semana',
   'Contribuye al menos S/ 50 a tus metas',
   20, 7, 'ahorro', 50, true, 'facil', 'ahorro', 'ahorro_monto_semana', null),

  ('Ahorra S/ 100 esta semana',
   'Contribuye al menos S/ 100 a tus metas',
   40, 7, 'ahorro', 100, true, 'media', 'ahorro', 'ahorro_monto_semana', null),

  ('Ahorra S/ 200 esta semana',
   'Contribuye al menos S/ 200 a tus metas',
   80, 7, 'ahorro', 200, true, 'dificil', 'ahorro', 'ahorro_monto_semana', null),

  ('Haz 3 contribuciones',
   'Aporta a tus metas en 3 ocasiones esta semana',
   20, 7, 'ahorro', 3, true, 'facil', 'ahorro', 'ahorro_count_semana', null),

  ('Ahorra en 5 días distintos',
   'Contribuye a tus metas en 5 días diferentes',
   40, 7, 'ahorro', 5, true, 'media', 'ahorro', 'ahorro_dias_distintos_semana', null),

  ('Completa una meta',
   'Termina una meta antes del domingo',
   80, 7, 'ahorro', 1, true, 'dificil', 'ahorro', 'meta_completada_semana', null),

  ('2 días sin gastar',
   'Pasa 2 días sin registrar ningún gasto',
   20, 7, 'sin_gasto', 2, true, 'facil', 'control', 'dias_sin_gasto_semana', null),

  ('4 días sin gastar',
   'Pasa 4 días sin registrar ningún gasto',
   80, 7, 'sin_gasto', 4, true, 'dificil', 'control', 'dias_sin_gasto_semana', null),

  ('Gasto semanal bajo S/ 200',
   'Mantén tu gasto total bajo S/ 200',
   40, 7, 'personalizado', 200, true, 'media', 'control', 'gasto_total_max_semana', null),

  ('Sin entretenimiento esta semana',
   'Cero gastos en la categoría entretenimiento',
   20, 7, 'sin_gasto', 0, true, 'facil', 'control', 'sin_categoria_semana', 'entretenimiento'),

  ('Sin compras esta semana',
   'Cero gastos en la categoría compras',
   40, 7, 'sin_gasto', 0, true, 'media', 'control', 'sin_categoria_semana', 'compras'),

  ('Registra gastos 4 días seguidos',
   'Anota al menos un gasto 4 días consecutivos',
   40, 7, 'registro', 4, true, 'media', 'registro', 'gastos_dias_seguidos', null),

  ('Registra en 5 días distintos',
   'Anota al menos un gasto en 5 días diferentes',
   20, 7, 'registro', 5, true, 'facil', 'registro', 'gastos_dias_distintos_semana', null),

  ('Categoriza 10 gastos',
   'Registra 10 gastos esta semana',
   20, 7, 'registro', 10, true, 'facil', 'registro', 'gastos_count_semana', null),

  ('Sube de nivel esta semana',
   'Avanza al siguiente nivel antes del domingo',
   40, 7, 'personalizado', 1, true, 'media', 'progreso', 'subir_nivel_semana', null),

  ('Racha de 5 días',
   'Mantén una racha activa de 5 días',
   40, 7, 'personalizado', 5, true, 'media', 'progreso', 'racha_minima', null),

  ('Llega al domingo con saldo',
   'Mantén saldo positivo al cierre de la semana',
   80, 7, 'personalizado', 1, true, 'dificil', 'progreso', 'saldo_positivo_fin_semana', null)
on conflict (titulo) do nothing;
