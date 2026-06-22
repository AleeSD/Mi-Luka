/**
 * Helpers de niveles. Espejo EXACTO del SQL en
 * supabase/migrations/0004_leveling_helpers.sql.
 *
 * Curva: xpParaAlcanzarNivel(n) = 100 * n * (n-1) / 2
 *   n=1 → 0  | n=2 → 100  | n=3 → 300  | n=4 → 600  | n=5 → 1000  | n=10 → 4500
 *
 * Verificación de bordes (TS y SQL deben coincidir):
 *   xp=99   → nivel 1   | xp=100 → nivel 2
 *   xp=299  → nivel 2   | xp=300 → nivel 3
 *   xp=599  → nivel 3   | xp=600 → nivel 4
 */

export const XP_BASE = 100

/** XP acumulado para alcanzar el inicio del nivel n. */
export function xpParaAlcanzarNivel(n: number): number {
  if (n <= 1) return 0
  return (XP_BASE * (n - 1) * n) / 2
}

/**
 * Nivel actual dado el XP total. Bucle entero puro (sin sqrt, sin
 * Math.floor sobre división de floats). Cero drift en los bordes.
 */
export function nivelDesdeXp(xp: number): number {
  if (xp == null || xp <= 0) return 1
  let n = 1
  // Mientras el umbral del nivel (n+1) sea <= xp, el usuario ya está en n+1.
  while ((XP_BASE * n * (n + 1)) / 2 <= xp) {
    n += 1
  }
  return n
}

export interface ProgresoNivel {
  /** Nivel actual del usuario. */
  nivel: number
  /** XP acumulado dentro del nivel actual (relativo a su inicio). */
  xpEnNivel: number
  /** XP total necesario para pasar de este nivel al siguiente. */
  xpParaSiguiente: number
  /** XP que aún falta para llegar al siguiente nivel. */
  xpRestante: number
  /** Progreso 0..1 dentro del nivel actual. */
  pct: number
  /** XP acumulado total desde el inicio. */
  xpTotal: number
  /** XP umbral del siguiente nivel (total). */
  xpUmbralSiguiente: number
}

/**
 * Calcula todo lo que la UI necesita para pintar la barra de nivel.
 */
export function progresoNivel(xp: number): ProgresoNivel {
  const xpTotal = Math.max(0, xp ?? 0)
  const nivel = nivelDesdeXp(xpTotal)
  const inicioNivel     = xpParaAlcanzarNivel(nivel)
  const inicioSiguiente = xpParaAlcanzarNivel(nivel + 1)
  const xpParaSiguiente = inicioSiguiente - inicioNivel
  const xpEnNivel       = xpTotal - inicioNivel
  const pct = xpParaSiguiente > 0
    ? Math.max(0, Math.min(1, xpEnNivel / xpParaSiguiente))
    : 0
  return {
    nivel,
    xpEnNivel,
    xpParaSiguiente,
    xpRestante: Math.max(0, xpParaSiguiente - xpEnNivel),
    pct,
    xpTotal,
    xpUmbralSiguiente: inicioSiguiente,
  }
}
