import { describe, it, expect } from 'vitest'
import {
  nivelDesdeXp,
  xpParaAlcanzarNivel,
  progresoNivel,
  XP_BASE,
} from '@/lib/leveling'

describe('xpParaAlcanzarNivel', () => {
  it('nivel 1 → 0 XP (punto de inicio)', () => {
    expect(xpParaAlcanzarNivel(1)).toBe(0)
  })
  it('nivel ≤ 0 → 0 XP', () => {
    expect(xpParaAlcanzarNivel(0)).toBe(0)
    expect(xpParaAlcanzarNivel(-5)).toBe(0)
  })
  it('nivel 2 → 100 XP', () => {
    expect(xpParaAlcanzarNivel(2)).toBe(100)
  })
  it('nivel 3 → 300 XP', () => {
    expect(xpParaAlcanzarNivel(3)).toBe(300)
  })
  it('nivel 4 → 600 XP', () => {
    expect(xpParaAlcanzarNivel(4)).toBe(600)
  })
  it('nivel 5 → 1000 XP', () => {
    expect(xpParaAlcanzarNivel(5)).toBe(1000)
  })
  it('nivel 10 → 4500 XP', () => {
    expect(xpParaAlcanzarNivel(10)).toBe(4500)
  })
  it('fórmula genérica: 100 * n*(n-1)/2', () => {
    for (let n = 1; n <= 20; n++) {
      expect(xpParaAlcanzarNivel(n)).toBe(XP_BASE * (n - 1) * n / 2)
    }
  })
})

describe('nivelDesdeXp — bordes documentados', () => {
  it('xp=0 → nivel 1', () => expect(nivelDesdeXp(0)).toBe(1))
  it('xp negativo → nivel 1', () => expect(nivelDesdeXp(-1)).toBe(1))
  it('xp=null → nivel 1', () => expect(nivelDesdeXp(null as unknown as number)).toBe(1))
  it('xp=99 → nivel 1', () => expect(nivelDesdeXp(99)).toBe(1))
  it('xp=100 → nivel 2', () => expect(nivelDesdeXp(100)).toBe(2))
  it('xp=101 → nivel 2', () => expect(nivelDesdeXp(101)).toBe(2))
  it('xp=299 → nivel 2', () => expect(nivelDesdeXp(299)).toBe(2))
  it('xp=300 → nivel 3', () => expect(nivelDesdeXp(300)).toBe(3))
  it('xp=301 → nivel 3', () => expect(nivelDesdeXp(301)).toBe(3))
  it('xp=599 → nivel 3', () => expect(nivelDesdeXp(599)).toBe(3))
  it('xp=600 → nivel 4', () => expect(nivelDesdeXp(600)).toBe(4))
  it('xp=601 → nivel 4', () => expect(nivelDesdeXp(601)).toBe(4))
  it('borde de nivel 5 (xp=1000)', () => expect(nivelDesdeXp(1000)).toBe(5))
  it('borde de nivel 5 minus 1 (xp=999)', () => expect(nivelDesdeXp(999)).toBe(4))
  it('xp=4500 → nivel 10', () => expect(nivelDesdeXp(4500)).toBe(10))
  it('xp=4499 → nivel 9', () => expect(nivelDesdeXp(4499)).toBe(9))
})

describe('nivelDesdeXp — consistencia con xpParaAlcanzarNivel', () => {
  for (let n = 1; n <= 15; n++) {
    it(`nivel ${n}: XP inicio está en nivel ${n} y XP inicio-1 en nivel ${n - 1}`, () => {
      const inicio = xpParaAlcanzarNivel(n)
      expect(nivelDesdeXp(inicio)).toBe(n)
      if (n > 1) expect(nivelDesdeXp(inicio - 1)).toBe(n - 1)
    })
  }
})

describe('progresoNivel', () => {
  it('xp=0 → nivel 1, xpEnNivel=0, pct=0', () => {
    const p = progresoNivel(0)
    expect(p.nivel).toBe(1)
    expect(p.xpEnNivel).toBe(0)
    expect(p.pct).toBe(0)
    expect(p.xpTotal).toBe(0)
  })

  it('xp=null/undefined → no falla, nivel 1', () => {
    const p = progresoNivel(null as unknown as number)
    expect(p.nivel).toBe(1)
    expect(p.pct).toBe(0)
  })

  it('xp=100 → nivel 2, xpEnNivel=0, pct=0 (justo al inicio del nivel)', () => {
    const p = progresoNivel(100)
    expect(p.nivel).toBe(2)
    expect(p.xpEnNivel).toBe(0)
    expect(p.pct).toBe(0)
  })

  it('xp=200 → nivel 2, mitad del camino al nivel 3', () => {
    // nivel 2: inicio=100, siguiente=300, span=200
    // xp=200 → en nivel desde 100, xpEnNivel=100, pct=100/200=0.5
    const p = progresoNivel(200)
    expect(p.nivel).toBe(2)
    expect(p.xpEnNivel).toBe(100)
    expect(p.xpParaSiguiente).toBe(200)
    expect(p.pct).toBeCloseTo(0.5, 5)
    expect(p.xpRestante).toBe(100)
  })

  it('xp justo bajo siguiente nivel — pct < 1', () => {
    const p = progresoNivel(299)
    expect(p.nivel).toBe(2)
    expect(p.pct).toBeLessThan(1)
  })

  it('xpParaSiguiente es span correcto para cada nivel (100 * n)', () => {
    for (let n = 1; n <= 10; n++) {
      const p = progresoNivel(xpParaAlcanzarNivel(n))
      expect(p.xpParaSiguiente).toBe(100 * n)
    }
  })

  it('pct clamped entre 0 y 1', () => {
    for (let xp = 0; xp <= 5000; xp += 50) {
      const p = progresoNivel(xp)
      expect(p.pct).toBeGreaterThanOrEqual(0)
      expect(p.pct).toBeLessThanOrEqual(1)
    }
  })
})
