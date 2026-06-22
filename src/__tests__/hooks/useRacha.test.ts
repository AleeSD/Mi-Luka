import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRacha, HITOS_RACHA } from '@/hooks/useRacha'

vi.mock('@/context/ProfileContext')
vi.mock('@/lib/semana')

import { useProfileContext } from '@/context/ProfileContext'
import { hoyLimaDate, ayerLimaDate } from '@/lib/semana'

const HOY = '2025-06-15'
const AYER = '2025-06-14'
const ANTES_DE_AYER = '2025-06-13'

const makeProfile = (overrides: Partial<{
  racha_actual: number
  racha_mas_larga: number
  ultima_fecha_racha: string | null
}> = {}) => ({
  id: 'user-1',
  nombre: 'Test',
  avatar_url: null,
  nivel: 1,
  puntos_totales: 0,
  saldo_disponible: 200,
  saldo_configurado: true,
  monto_guardadito: 0,
  racha_actual: 0,
  racha_mas_larga: 0,
  ultima_fecha_racha: null,
  umbral_saldo_bajo: 50,
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
  ...overrides,
})

function setupContext(profile: ReturnType<typeof makeProfile> | null = null) {
  vi.mocked(useProfileContext).mockReturnValue({
    profile,
    loading: false,
    error: null,
    setProfile: vi.fn(),
    refresh: vi.fn(),
    saldoChangeSourceRef: { current: 'spend' },
    update: vi.fn(),
    uploadProfileAvatar: vi.fn(),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(hoyLimaDate).mockReturnValue(HOY)
  vi.mocked(ayerLimaDate).mockReturnValue(AYER)
})

describe('useRacha — rachaEfectiva', () => {
  it('rachaEfectiva = 0 si ultima_fecha_racha es null', () => {
    setupContext(makeProfile({ racha_actual: 5, ultima_fecha_racha: null }))
    const { result } = renderHook(() => useRacha())
    expect(result.current.rachaEfectiva).toBe(0)
  })

  it('rachaEfectiva = 0 si racha_actual = 0', () => {
    setupContext(makeProfile({ racha_actual: 0, ultima_fecha_racha: HOY }))
    const { result } = renderHook(() => useRacha())
    expect(result.current.rachaEfectiva).toBe(0)
  })

  it('rachaEfectiva = racha_actual si ultima_fecha = HOY', () => {
    setupContext(makeProfile({ racha_actual: 8, ultima_fecha_racha: HOY }))
    const { result } = renderHook(() => useRacha())
    expect(result.current.rachaEfectiva).toBe(8)
  })

  it('rachaEfectiva = racha_actual si ultima_fecha = AYER', () => {
    setupContext(makeProfile({ racha_actual: 12, ultima_fecha_racha: AYER }))
    const { result } = renderHook(() => useRacha())
    expect(result.current.rachaEfectiva).toBe(12)
  })

  it('rachaEfectiva = 0 si ultima_fecha es anterior a ayer (racha perdida)', () => {
    setupContext(makeProfile({ racha_actual: 20, ultima_fecha_racha: ANTES_DE_AYER }))
    const { result } = renderHook(() => useRacha())
    expect(result.current.rachaEfectiva).toBe(0)
  })

  it('rachaEfectiva = 0 si profile es null', () => {
    setupContext(null)
    const { result } = renderHook(() => useRacha())
    expect(result.current.rachaEfectiva).toBe(0)
  })
})

describe('useRacha — esActivaHoy', () => {
  it('true solo si ultima_fecha = HOY', () => {
    setupContext(makeProfile({ racha_actual: 3, ultima_fecha_racha: HOY }))
    const { result } = renderHook(() => useRacha())
    expect(result.current.esActivaHoy).toBe(true)
  })

  it('false si ultima_fecha = AYER', () => {
    setupContext(makeProfile({ racha_actual: 3, ultima_fecha_racha: AYER }))
    const { result } = renderHook(() => useRacha())
    expect(result.current.esActivaHoy).toBe(false)
  })

  it('false si ultima_fecha = null', () => {
    setupContext(makeProfile({ ultima_fecha_racha: null }))
    const { result } = renderHook(() => useRacha())
    expect(result.current.esActivaHoy).toBe(false)
  })
})

describe('useRacha — proxHito y diasParaProxHito', () => {
  it('rachaEfectiva=0 → proxHito=10, dias=10', () => {
    setupContext(makeProfile({ racha_actual: 0, ultima_fecha_racha: null }))
    const { result } = renderHook(() => useRacha())
    expect(result.current.proxHito).toBe(10)
    expect(result.current.diasParaProxHito).toBe(10)
  })

  it('rachaEfectiva=10 (exacto en hito) → proxHito=25, dias=15', () => {
    setupContext(makeProfile({ racha_actual: 10, ultima_fecha_racha: HOY }))
    const { result } = renderHook(() => useRacha())
    expect(result.current.proxHito).toBe(25)
    expect(result.current.diasParaProxHito).toBe(15)
  })

  it('rachaEfectiva=9 → proxHito=10, dias=1', () => {
    setupContext(makeProfile({ racha_actual: 9, ultima_fecha_racha: HOY }))
    const { result } = renderHook(() => useRacha())
    expect(result.current.proxHito).toBe(10)
    expect(result.current.diasParaProxHito).toBe(1)
  })

  it('rachaEfectiva=365 (último hito) → proxHito=null, dias=null', () => {
    setupContext(makeProfile({ racha_actual: 365, ultima_fecha_racha: HOY }))
    const { result } = renderHook(() => useRacha())
    expect(result.current.proxHito).toBeNull()
    expect(result.current.diasParaProxHito).toBeNull()
  })

  it('rachaEfectiva=400 (sobre el último hito) → proxHito=null', () => {
    setupContext(makeProfile({ racha_actual: 400, ultima_fecha_racha: HOY }))
    const { result } = renderHook(() => useRacha())
    expect(result.current.proxHito).toBeNull()
  })

  it('todos los hitos del catálogo están presentes', () => {
    expect([...HITOS_RACHA]).toEqual([10, 25, 50, 100, 200, 365])
  })
})

describe('useRacha — rachaActual y rachaMasLarga (valores crudos)', () => {
  it('expone racha_actual crudo aunque esté perdida', () => {
    setupContext(makeProfile({ racha_actual: 20, ultima_fecha_racha: ANTES_DE_AYER }))
    const { result } = renderHook(() => useRacha())
    expect(result.current.rachaActual).toBe(20)
    expect(result.current.rachaEfectiva).toBe(0)
  })

  it('expone racha_mas_larga', () => {
    setupContext(makeProfile({ racha_mas_larga: 100 }))
    const { result } = renderHook(() => useRacha())
    expect(result.current.rachaMasLarga).toBe(100)
  })
})
