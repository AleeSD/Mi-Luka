import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  pickRandom,
  mensajeBloqueoDinamico,
  BANCO_A_GASTO_BLOQUEADO,
  BANCO_B_SALDO_CERO,
  BANCO_C_SALDO_BAJO,
} from '@/lib/mensajes'

afterEach(() => vi.restoreAllMocks())

describe('pickRandom', () => {
  it('devuelve un elemento del array', () => {
    const arr = [1, 2, 3, 4, 5]
    const result = pickRandom(arr)
    expect(arr).toContain(result)
  })

  it('con array de un elemento siempre devuelve ese elemento', () => {
    expect(pickRandom(['único'])).toBe('único')
  })

  it('distribuye hacia todo el array (prueba estadística suave)', () => {
    const arr = ['a', 'b', 'c', 'd']
    const hits = new Set<string>()
    for (let i = 0; i < 100; i++) hits.add(pickRandom(arr))
    expect(hits.size).toBeGreaterThan(1)
  })

  it('usa Math.floor(Math.random() * arr.length)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(pickRandom(['primero', 'segundo', 'tercero'])).toBe('primero')
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    expect(pickRandom(['a', 'b', 'c'])).toBe('c')
  })

  it('funciona con tuplas readonly', () => {
    const result = pickRandom(BANCO_B_SALDO_CERO)
    expect(BANCO_B_SALDO_CERO).toContain(result)
  })
})

describe('mensajeBloqueoDinamico — rama dinámica (random < 0.35)', () => {
  it('devuelve mensaje con cifras cuando random < 0.35', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.34)
    const msg = mensajeBloqueoDinamico(30, 50)
    expect(msg.title).toContain('S/')
    expect(msg.subtitle).toBe('Actualiza tu saldo para registrar este movimiento.')
  })

  it('formatea saldoActual en el title', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const msg = mensajeBloqueoDinamico(30, 50)
    expect(msg.title).toContain('30')
  })

  it('formatea montoIntentado en el title', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const msg = mensajeBloqueoDinamico(30, 50)
    expect(msg.title).toContain('50')
  })

  it('emoji 👀 está en el mensaje dinámico', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    const msg = mensajeBloqueoDinamico(100, 200)
    expect(msg.title).toContain('👀')
  })
})

describe('mensajeBloqueoDinamico — rama banco A (random >= 0.35)', () => {
  it('devuelve elemento del BANCO_A cuando random >= 0.35', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.35)
    const msg = mensajeBloqueoDinamico(30, 50)
    const titles = BANCO_A_GASTO_BLOQUEADO.map((m) => m.title)
    expect(titles).toContain(msg.title)
  })

  it('devuelve objeto con title y subtitle (propiedades correctas)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const msg = mensajeBloqueoDinamico(10, 20)
    expect(msg).toHaveProperty('title')
    expect(msg).toHaveProperty('subtitle')
    expect(typeof msg.title).toBe('string')
    expect(typeof msg.subtitle).toBe('string')
  })

  it('title del banco A no está vacío', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const msg = mensajeBloqueoDinamico(5, 100)
    expect(msg.title.length).toBeGreaterThan(0)
  })
})

describe('bancos de mensajes — integridad', () => {
  it('BANCO_A tiene exactamente 8 mensajes', () => {
    expect(BANCO_A_GASTO_BLOQUEADO.length).toBe(8)
  })

  it('BANCO_B tiene exactamente 8 mensajes', () => {
    expect(BANCO_B_SALDO_CERO.length).toBe(8)
  })

  it('BANCO_C tiene exactamente 4 mensajes', () => {
    expect(BANCO_C_SALDO_BAJO.length).toBe(4)
  })

  it('todos los mensajes de BANCO_A tienen title y subtitle no vacíos', () => {
    for (const m of BANCO_A_GASTO_BLOQUEADO) {
      expect(m.title.length).toBeGreaterThan(0)
      expect(m.subtitle.length).toBeGreaterThan(0)
    }
  })
})
