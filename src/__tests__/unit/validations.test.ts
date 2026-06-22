import { describe, it, expect } from 'vitest'
import { actualizarSaldoSchema, ahorroLibreSchema, sacarGuardaditoSchema } from '@/lib/validations/balance'
import { expenseSchema } from '@/lib/validations/expense'
import { goalSchema, contribucionSchema } from '@/lib/validations/goal'

// ─── actualizarSaldoSchema ─────────────────────────────────────────────────
describe('actualizarSaldoSchema', () => {
  it('acepta monto=0 (saldo puede ser cero)', () => {
    expect(actualizarSaldoSchema.safeParse({ monto: 0 }).success).toBe(true)
  })
  it('acepta monto positivo', () => {
    expect(actualizarSaldoSchema.safeParse({ monto: 500 }).success).toBe(true)
  })
  it('acepta monto=9999999 (límite superior)', () => {
    expect(actualizarSaldoSchema.safeParse({ monto: 9999999 }).success).toBe(true)
  })
  it('rechaza monto negativo', () => {
    const r = actualizarSaldoSchema.safeParse({ monto: -1 })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toMatch(/negativo/i)
  })
  it('rechaza monto > 9999999', () => {
    const r = actualizarSaldoSchema.safeParse({ monto: 10000000 })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toMatch(/grande/i)
  })
  it('rechaza string en lugar de número', () => {
    const r = actualizarSaldoSchema.safeParse({ monto: 'cien' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toMatch(/válido/i)
  })
  it('rechaza monto ausente', () => {
    expect(actualizarSaldoSchema.safeParse({}).success).toBe(false)
  })
})

// ─── ahorroLibreSchema ─────────────────────────────────────────────────────
describe('ahorroLibreSchema', () => {
  it('acepta monto positivo', () => {
    expect(ahorroLibreSchema.safeParse({ monto: 1 }).success).toBe(true)
  })
  it('rechaza monto=0 (debe ser positivo)', () => {
    const r = ahorroLibreSchema.safeParse({ monto: 0 })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toMatch(/mayor/i)
  })
  it('rechaza monto negativo', () => {
    expect(ahorroLibreSchema.safeParse({ monto: -1 }).success).toBe(false)
  })
  it('acepta decimales positivos', () => {
    expect(ahorroLibreSchema.safeParse({ monto: 0.01 }).success).toBe(true)
  })
  it('rechaza monto > 9999999', () => {
    expect(ahorroLibreSchema.safeParse({ monto: 10000000 }).success).toBe(false)
  })
})

// ─── sacarGuardaditoSchema ─────────────────────────────────────────────────
describe('sacarGuardaditoSchema', () => {
  it('acepta monto positivo', () => {
    expect(sacarGuardaditoSchema.safeParse({ monto: 50 }).success).toBe(true)
  })
  it('rechaza monto=0', () => {
    expect(sacarGuardaditoSchema.safeParse({ monto: 0 }).success).toBe(false)
  })
  it('rechaza negativo', () => {
    expect(sacarGuardaditoSchema.safeParse({ monto: -10 }).success).toBe(false)
  })
})

// ─── expenseSchema ─────────────────────────────────────────────────────────
describe('expenseSchema', () => {
  const valid = {
    monto: 50,
    categoria: 'comida',
    descripcion: 'Almuerzo',
    fecha: '2025-06-15',
  }

  it('acepta registro válido completo', () => {
    expect(expenseSchema.safeParse(valid).success).toBe(true)
  })

  it('acepta con notas opcionales', () => {
    expect(expenseSchema.safeParse({ ...valid, notas: 'Chifa cerca del trabajo' }).success).toBe(true)
  })

  it('rechaza monto=0', () => {
    expect(expenseSchema.safeParse({ ...valid, monto: 0 }).success).toBe(false)
  })

  it('rechaza monto > 999999 (no 9999999)', () => {
    expect(expenseSchema.safeParse({ ...valid, monto: 1000000 }).success).toBe(false)
  })

  it('acepta monto=999999 (límite)', () => {
    expect(expenseSchema.safeParse({ ...valid, monto: 999999 }).success).toBe(true)
  })

  it('rechaza categoría inválida', () => {
    const r = expenseSchema.safeParse({ ...valid, categoria: 'viajes' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toMatch(/categoría/i)
  })

  it('acepta todas las 8 categorías válidas', () => {
    const cats = ['comida', 'transporte', 'entretenimiento', 'educacion', 'compras', 'salud', 'servicios', 'otros']
    for (const c of cats) {
      expect(expenseSchema.safeParse({ ...valid, categoria: c }).success).toBe(true)
    }
  })

  it('rechaza descripcion vacía', () => {
    const r = expenseSchema.safeParse({ ...valid, descripcion: '' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toMatch(/requerida/i)
  })

  it('rechaza descripcion > 100 chars', () => {
    expect(expenseSchema.safeParse({ ...valid, descripcion: 'x'.repeat(101) }).success).toBe(false)
  })

  it('acepta descripcion de exactamente 100 chars', () => {
    expect(expenseSchema.safeParse({ ...valid, descripcion: 'x'.repeat(100) }).success).toBe(true)
  })

  it('rechaza notas > 500 chars', () => {
    expect(expenseSchema.safeParse({ ...valid, notas: 'n'.repeat(501) }).success).toBe(false)
  })

  it('acepta notas de exactamente 500 chars', () => {
    expect(expenseSchema.safeParse({ ...valid, notas: 'n'.repeat(500) }).success).toBe(true)
  })

  it('rechaza fecha vacía', () => {
    expect(expenseSchema.safeParse({ ...valid, fecha: '' }).success).toBe(false)
  })
})

// ─── goalSchema ─────────────────────────────────────────────────────────────
describe('goalSchema', () => {
  const future = new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0]
  const past = '2020-01-01'

  const valid = {
    titulo: 'Viaje a Cusco',
    monto_objetivo: 1000,
  }

  it('acepta meta válida sin fecha', () => {
    expect(goalSchema.safeParse(valid).success).toBe(true)
  })

  it('acepta meta válida con fecha futura', () => {
    expect(goalSchema.safeParse({ ...valid, fecha_limite: future }).success).toBe(true)
  })

  it('rechaza fecha en el pasado', () => {
    const r = goalSchema.safeParse({ ...valid, fecha_limite: past })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toMatch(/futuro/i)
  })

  it('acepta fecha_limite vacía/undefined (opcional)', () => {
    expect(goalSchema.safeParse({ ...valid, fecha_limite: undefined }).success).toBe(true)
    expect(goalSchema.safeParse({ ...valid, fecha_limite: '' }).success).toBe(true)
  })

  it('rechaza titulo vacío', () => {
    const r = goalSchema.safeParse({ ...valid, titulo: '' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toMatch(/requerido/i)
  })

  it('rechaza titulo > 100 chars', () => {
    expect(goalSchema.safeParse({ ...valid, titulo: 'x'.repeat(101) }).success).toBe(false)
  })

  it('rechaza monto_objetivo=0', () => {
    expect(goalSchema.safeParse({ ...valid, monto_objetivo: 0 }).success).toBe(false)
  })

  it('rechaza monto_objetivo > 9999999', () => {
    expect(goalSchema.safeParse({ ...valid, monto_objetivo: 10000000 }).success).toBe(false)
  })

  it('color y icono tienen defaults', () => {
    const r = goalSchema.parse(valid)
    expect(r.color).toBe('#4F46E5')
    expect(r.icono).toBe('target')
  })
})

// ─── contribucionSchema ─────────────────────────────────────────────────────
describe('contribucionSchema', () => {
  it('acepta monto positivo', () => {
    expect(contribucionSchema.safeParse({ monto: 100 }).success).toBe(true)
  })
  it('rechaza monto=0', () => {
    expect(contribucionSchema.safeParse({ monto: 0 }).success).toBe(false)
  })
  it('rechaza negativo', () => {
    expect(contribucionSchema.safeParse({ monto: -5 }).success).toBe(false)
  })
  it('acepta decimales', () => {
    expect(contribucionSchema.safeParse({ monto: 0.5 }).success).toBe(true)
  })
})
