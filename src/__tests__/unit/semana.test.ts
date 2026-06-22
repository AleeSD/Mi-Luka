import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  semanaIsoLima,
  hoyLimaDate,
  ayerLimaDate,
  esDomingoLima,
  isoDowLima,
  formatearSemana,
} from '@/lib/semana'

/**
 * Lima (PET) = UTC-5, sin horario de verano.
 * limaAt(Y, M, D, h) construye el instante UTC correspondiente a las h:00 Lima.
 */
function limaAt(year: number, month: number, day: number, hour: number): Date {
  return new Date(Date.UTC(year, month - 1, day, hour + 5, 0, 0))
}

describe('hoyLimaDate', () => {
  afterEach(() => vi.useRealTimers())

  it('devuelve YYYY-MM-DD del día Lima', () => {
    const t = limaAt(2025, 6, 15, 10)
    expect(hoyLimaDate(t)).toBe('2025-06-15')
  })

  it('a las 23:59 Lima aún es el mismo día Lima', () => {
    const t = limaAt(2025, 6, 15, 23)
    expect(hoyLimaDate(t)).toBe('2025-06-15')
  })

  it('a las 00:01 UTC es aún el día previo en Lima', () => {
    // 00:01 UTC del 16-jun = 19:01 Lima del 15-jun
    const t = new Date(Date.UTC(2025, 5, 16, 0, 1, 0))
    expect(hoyLimaDate(t)).toBe('2025-06-15')
  })

  it('cruce de medianoche Lima: 04:59 UTC del 16 → aún 15-jun Lima', () => {
    const t = new Date(Date.UTC(2025, 5, 16, 4, 59, 0)) // 23:59 Lima del 15-jun
    expect(hoyLimaDate(t)).toBe('2025-06-15')
  })

  it('cruce de medianoche Lima: 05:00 UTC del 16 → ya 16-jun Lima', () => {
    const t = new Date(Date.UTC(2025, 5, 16, 5, 0, 0)) // 00:00 Lima del 16-jun
    expect(hoyLimaDate(t)).toBe('2025-06-16')
  })
})

describe('ayerLimaDate', () => {
  it('ayer de 2025-06-15 es 2025-06-14', () => {
    const t = limaAt(2025, 6, 15, 12)
    expect(ayerLimaDate(t)).toBe('2025-06-14')
  })

  it('cruce de mes: ayer del 1-jul es 30-jun', () => {
    const t = limaAt(2025, 7, 1, 12)
    expect(ayerLimaDate(t)).toBe('2025-06-30')
  })

  it('cruce de año: ayer del 1-ene-2026 es 31-dic-2025', () => {
    const t = limaAt(2026, 1, 1, 12)
    expect(ayerLimaDate(t)).toBe('2025-12-31')
  })
})

describe('esDomingoLima', () => {
  it('2025-06-22 es domingo', () => {
    const t = limaAt(2025, 6, 22, 12)
    expect(esDomingoLima(t)).toBe(true)
  })

  it('2025-06-23 es lunes', () => {
    const t = limaAt(2025, 6, 23, 12)
    expect(esDomingoLima(t)).toBe(false)
  })

  it('2025-06-21 es sábado', () => {
    const t = limaAt(2025, 6, 21, 12)
    expect(esDomingoLima(t)).toBe(false)
  })

  it('23:59 Lima del sábado → NO es domingo', () => {
    // sábado 21-jun 23:59 Lima = domingo 22-jun 04:59 UTC
    const t = new Date(Date.UTC(2025, 5, 22, 4, 59, 0))
    expect(esDomingoLima(t)).toBe(false)
  })

  it('00:00 Lima del domingo → SÍ es domingo', () => {
    // domingo 22-jun 00:00 Lima = domingo 22-jun 05:00 UTC
    const t = new Date(Date.UTC(2025, 5, 22, 5, 0, 0))
    expect(esDomingoLima(t)).toBe(true)
  })
})

describe('semanaIsoLima', () => {
  it('2025-06-16 (lunes) → semana 25 de 2025', () => {
    const t = limaAt(2025, 6, 16, 12)
    expect(semanaIsoLima(t)).toBe(202525)
  })

  it('2025-06-22 (domingo) → aún semana 25', () => {
    const t = limaAt(2025, 6, 22, 12)
    expect(semanaIsoLima(t)).toBe(202525)
  })

  it('2025-06-23 (lunes) → semana 26', () => {
    const t = limaAt(2025, 6, 23, 12)
    expect(semanaIsoLima(t)).toBe(202526)
  })

  it('cruce de año ISO: 2025-12-29 (lunes) → semana 1 de 2026', () => {
    const t = limaAt(2025, 12, 29, 12)
    expect(semanaIsoLima(t)).toBe(202601)
  })

  it('2026-01-04 (domingo) → aún semana 1 de 2026', () => {
    const t = limaAt(2026, 1, 4, 12)
    expect(semanaIsoLima(t)).toBe(202601)
  })

  it('2026-01-05 (lunes) → semana 2 de 2026', () => {
    const t = limaAt(2026, 1, 5, 12)
    expect(semanaIsoLima(t)).toBe(202602)
  })

  it('cruce de medianoche Lima en cambio de semana', () => {
    // Domingo 22-jun 23:59 Lima → semana 25
    const before = new Date(Date.UTC(2025, 5, 23, 4, 59, 0))
    // Lunes 23-jun 00:00 Lima → semana 26
    const after = new Date(Date.UTC(2025, 5, 23, 5, 0, 0))
    expect(semanaIsoLima(before)).toBe(202525)
    expect(semanaIsoLima(after)).toBe(202526)
  })
})

describe('formatearSemana', () => {
  it('202525 → "Semana 25 · 2025"', () => {
    expect(formatearSemana(202525)).toBe('Semana 25 · 2025')
  })
  it('null → string vacío', () => {
    expect(formatearSemana(null)).toBe('')
  })
  it('undefined → string vacío', () => {
    expect(formatearSemana(undefined)).toBe('')
  })
})

describe('isoDowLima', () => {
  it('lunes=1', () => expect(isoDowLima(limaAt(2025, 6, 23, 12))).toBe(1))
  it('domingo=7', () => expect(isoDowLima(limaAt(2025, 6, 22, 12))).toBe(7))
  it('miércoles=3', () => expect(isoDowLima(limaAt(2025, 6, 18, 12))).toBe(3))
})
