/**
 * Helpers de semana ISO en zona horaria America/Lima.
 *
 * Coincide EXACTAMENTE con la función SQL semana_iso_lima() de
 * supabase/migrations/0007_retos_helpers.sql:
 *   extract(isoyear from now() at time zone 'America/Lima') * 100
 *   + extract(week from now() at time zone 'America/Lima')
 *
 * Usar Intl.DateTimeFormat('en-CA', timeZone) evita drift del navegador
 * cuando está en otra zona horaria — formateamos la fecha como la vería
 * Lima y luego calculamos el ISO week sobre esa Y/M/D.
 */

/**
 * Obtiene la fecha (Y, M, D) tal como se vería en America/Lima en este
 * instante. Devuelve los componentes enteros.
 */
function ymdEnLima(now: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year:  'numeric',
    month: '2-digit',
    day:   '2-digit',
  }).formatToParts(now)

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? '0')

  return { year: get('year'), month: get('month'), day: get('day') }
}

/**
 * ISO 8601 week algorithm aplicado sobre una fecha Y/M/D arbitraria.
 * Devuelve `isoyear` y `isoweek`.
 */
function isoYearWeek(year: number, month: number, day: number): { isoyear: number; isoweek: number } {
  // Trabajamos en UTC para que no haya pollución de TZ del navegador en
  // los cálculos.
  const d = new Date(Date.UTC(year, month - 1, day))
  // ISO day: Mon=1 .. Sun=7
  const isoDow = d.getUTCDay() === 0 ? 7 : d.getUTCDay()
  // Mueve a Jueves de la MISMA semana ISO (el Jueves determina el isoyear).
  d.setUTCDate(d.getUTCDate() + 4 - isoDow)
  const isoyear = d.getUTCFullYear()
  // Days desde el 1 de enero del isoyear (ese mismo Jueves).
  const jan1 = new Date(Date.UTC(isoyear, 0, 1))
  const daysSinceJan1 = Math.floor((d.getTime() - jan1.getTime()) / 86400000)
  const isoweek = Math.floor(daysSinceJan1 / 7) + 1
  return { isoyear, isoweek }
}

/**
 * Devuelve el entero compacto isoyear*100 + isoweek para el instante
 * dado (por defecto, ahora) interpretado en zona Lima.
 *
 * Coincide bit a bit con `semana_iso_lima()` del SQL: misma combinación
 * de isoyear y semana ISO en zona Lima.
 */
export function semanaIsoLima(now: Date = new Date()): number {
  const { year, month, day } = ymdEnLima(now)
  const { isoyear, isoweek } = isoYearWeek(year, month, day)
  return isoyear * 100 + isoweek
}

/**
 * Etiqueta human-readable de una semana ISO (p.ej. "Semana 25 · 2025").
 * La usamos para marcar retos completados de semanas pasadas.
 */
export function formatearSemana(semana: number | null | undefined): string {
  if (semana == null) return ''
  const year = Math.floor(semana / 100)
  const week = semana % 100
  return `Semana ${week} · ${year}`
}

/**
 * Día de la semana ISO en Lima (1=Lunes ... 7=Domingo). Útil para que la
 * UI sepa si "hoy es domingo" sin tener que llamar al RPC.
 */
export function isoDowLima(now: Date = new Date()): number {
  const { year, month, day } = ymdEnLima(now)
  const d = new Date(Date.UTC(year, month - 1, day))
  return d.getUTCDay() === 0 ? 7 : d.getUTCDay()
}

/** True si hoy es domingo en zona Lima (isoDow === 7). */
export function esDomingoLima(now: Date = new Date()): boolean {
  return isoDowLima(now) === 7
}

// ─── Fecha-string (YYYY-MM-DD) en zona Lima ───────────────────────────────
// Coinciden con el formato que devuelve PostgreSQL para columnas date.
// Útiles para comparar contra profile.ultima_fecha_racha sin romper TZ.

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Hoy en zona Lima como 'YYYY-MM-DD'. */
export function hoyLimaDate(now: Date = new Date()): string {
  const { year, month, day } = ymdEnLima(now)
  return `${year}-${pad2(month)}-${pad2(day)}`
}

/** Ayer en zona Lima como 'YYYY-MM-DD'. */
export function ayerLimaDate(now: Date = new Date()): string {
  const { year, month, day } = ymdEnLima(now)
  // Resta 1 día en UTC sobre el Y/M/D ya capturado en Lima.
  const d = new Date(Date.UTC(year, month - 1, day))
  d.setUTCDate(d.getUTCDate() - 1)
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}
