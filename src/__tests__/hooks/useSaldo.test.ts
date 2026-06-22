import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSaldo } from '@/hooks/useSaldo'

vi.mock('@/context/ProfileContext')
vi.mock('@/lib/db/balance')

import { useProfileContext } from '@/context/ProfileContext'
import { actualizarSaldo } from '@/lib/db/balance'

const makeProfile = () => ({
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
})

function setupMocks(overrides: {
  profile?: ReturnType<typeof makeProfile> | null
  loading?: boolean
}) {
  const mockSetProfile = vi.fn()
  const saldoChangeSourceRef = { current: 'spend' as 'user_edit' | 'spend' }
  const mockRefresh = vi.fn().mockResolvedValue(undefined)

  vi.mocked(useProfileContext).mockReturnValue({
    profile: 'profile' in overrides ? overrides.profile! : makeProfile(),
    loading: overrides.loading ?? false,
    error: null,
    setProfile: mockSetProfile,
    refresh: mockRefresh,
    saldoChangeSourceRef,
    update: vi.fn(),
    uploadProfileAvatar: vi.fn(),
  })

  return { mockSetProfile, saldoChangeSourceRef, mockRefresh }
}

beforeEach(() => vi.clearAllMocks())

describe('useSaldo — valores derivados', () => {
  it('expone saldo_disponible del perfil', () => {
    const p = { ...makeProfile(), saldo_disponible: 500 }
    setupMocks({ profile: p })
    const { result } = renderHook(() => useSaldo())
    expect(result.current.saldoDisponible).toBe(500)
  })

  it('saldo 0 cuando profile es null', () => {
    setupMocks({ profile: null })
    const { result } = renderHook(() => useSaldo())
    expect(result.current.saldoDisponible).toBe(0)
  })

  it('saldoConfigurado = false cuando no configurado', () => {
    const p = { ...makeProfile(), saldo_configurado: false }
    setupMocks({ profile: p })
    const { result } = renderHook(() => useSaldo())
    expect(result.current.saldoConfigurado).toBe(false)
  })
})

describe('useSaldo — requiereOnboarding', () => {
  it('false cuando loading = true (aunque saldo no configurado)', () => {
    const p = { ...makeProfile(), saldo_configurado: false }
    setupMocks({ profile: p, loading: true })
    const { result } = renderHook(() => useSaldo())
    expect(result.current.requiereOnboarding).toBe(false)
  })

  it('true cuando !loading && profile && !saldo_configurado', () => {
    const p = { ...makeProfile(), saldo_configurado: false }
    setupMocks({ profile: p, loading: false })
    const { result } = renderHook(() => useSaldo())
    expect(result.current.requiereOnboarding).toBe(true)
  })

  it('false cuando saldo ya configurado', () => {
    setupMocks({ profile: makeProfile() })
    const { result } = renderHook(() => useSaldo())
    expect(result.current.requiereOnboarding).toBe(false)
  })

  it('false cuando profile es null (incluso si !loading)', () => {
    setupMocks({ profile: null, loading: false })
    const { result } = renderHook(() => useSaldo())
    expect(result.current.requiereOnboarding).toBe(false)
  })
})

describe('useSaldo — actualizar()', () => {
  it('llama a actualizarSaldo con el monto dado', async () => {
    setupMocks({})
    vi.mocked(actualizarSaldo).mockResolvedValue(350)

    const { result } = renderHook(() => useSaldo())

    await act(async () => {
      await result.current.actualizar(350)
    })

    expect(actualizarSaldo).toHaveBeenCalledWith(350)
  })

  it('marca saldoChangeSourceRef = user_edit ANTES de setProfile', async () => {
    const { mockSetProfile, saldoChangeSourceRef } = setupMocks({})
    vi.mocked(actualizarSaldo).mockResolvedValue(400)

    let capturedSource: string | undefined
    mockSetProfile.mockImplementation(() => {
      capturedSource = saldoChangeSourceRef.current
    })

    const { result } = renderHook(() => useSaldo())

    await act(async () => {
      await result.current.actualizar(400)
    })

    expect(capturedSource).toBe('user_edit')
  })

  it('llama a setProfile con el saldo_disponible devuelto por RPC', async () => {
    const { mockSetProfile } = setupMocks({})
    vi.mocked(actualizarSaldo).mockResolvedValue(123)

    const { result } = renderHook(() => useSaldo())

    await act(async () => {
      await result.current.actualizar(123)
    })

    expect(mockSetProfile).toHaveBeenCalledOnce()
    // La función updater que se pasa a setProfile debe incluir saldo_disponible:123
    const updater = mockSetProfile.mock.calls[0][0]
    const prev = makeProfile()
    const next = updater(prev)
    expect(next.saldo_disponible).toBe(123)
    expect(next.saldo_configurado).toBe(true)
  })

  it('devuelve el número del RPC', async () => {
    setupMocks({})
    vi.mocked(actualizarSaldo).mockResolvedValue(777)

    const { result } = renderHook(() => useSaldo())

    let ret: number | undefined
    await act(async () => {
      ret = await result.current.actualizar(777)
    })

    expect(ret).toBe(777)
  })

  it('NO llama setProfile si actualizarSaldo falla', async () => {
    const { mockSetProfile } = setupMocks({})
    vi.mocked(actualizarSaldo).mockRejectedValue(new Error('RPC fail'))

    const { result } = renderHook(() => useSaldo())

    await act(async () => {
      await result.current.actualizar(100).catch(() => {})
    })

    expect(mockSetProfile).not.toHaveBeenCalled()
  })
})
