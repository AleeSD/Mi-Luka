import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGuardadito } from '@/hooks/useGuardadito'

vi.mock('@/context/ProfileContext')
vi.mock('@/lib/db/guardadito')

import { useProfileContext } from '@/context/ProfileContext'
import { registrarAhorroLibre, sacarDeGuardadito } from '@/lib/db/guardadito'

const makeProfile = () => ({
  id: 'user-1',
  nombre: 'Test',
  avatar_url: null,
  nivel: 1,
  puntos_totales: 0,
  saldo_disponible: 300,
  saldo_configurado: true,
  monto_guardadito: 100,
  racha_actual: 5,
  racha_mas_larga: 10,
  ultima_fecha_racha: '2025-06-15',
  umbral_saldo_bajo: 50,
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
})

function setupMocks(profile = makeProfile()) {
  const mockSetProfile = vi.fn()
  const mockRefresh = vi.fn().mockResolvedValue(undefined)

  vi.mocked(useProfileContext).mockReturnValue({
    profile,
    loading: false,
    error: null,
    setProfile: mockSetProfile,
    refresh: mockRefresh,
    saldoChangeSourceRef: { current: 'spend' },
    update: vi.fn(),
    uploadProfileAvatar: vi.fn(),
  })

  return { mockSetProfile, mockRefresh }
}

beforeEach(() => vi.clearAllMocks())

describe('useGuardadito — valores derivados', () => {
  it('expone monto_guardadito del perfil', () => {
    const p = { ...makeProfile(), monto_guardadito: 250 }
    setupMocks(p)
    const { result } = renderHook(() => useGuardadito())
    expect(result.current.montoGuardadito).toBe(250)
  })

  it('expone saldo_disponible del perfil', () => {
    const p = { ...makeProfile(), saldo_disponible: 150 }
    setupMocks(p)
    const { result } = renderHook(() => useGuardadito())
    expect(result.current.saldoDisponible).toBe(150)
  })

  it('monto=0 cuando profile es null', () => {
    vi.mocked(useProfileContext).mockReturnValue({
      profile: null,
      loading: false,
      error: null,
      setProfile: vi.fn(),
      refresh: vi.fn(),
      saldoChangeSourceRef: { current: 'spend' },
      update: vi.fn(),
      uploadProfileAvatar: vi.fn(),
    })
    const { result } = renderHook(() => useGuardadito())
    expect(result.current.montoGuardadito).toBe(0)
    expect(result.current.saldoDisponible).toBe(0)
  })
})

describe('useGuardadito — registrarAhorro()', () => {
  it('actualiza saldo, guardadito Y racha en setProfile', async () => {
    const { mockSetProfile } = setupMocks()
    vi.mocked(registrarAhorroLibre).mockResolvedValue({
      saldo_nuevo: 250,
      guardadito_nuevo: 150,
      racha_actual: 6,
    })

    const { result } = renderHook(() => useGuardadito())

    await act(async () => {
      await result.current.registrarAhorro(50)
    })

    const updater = mockSetProfile.mock.calls[0][0]
    const next = updater(makeProfile())
    expect(next.saldo_disponible).toBe(250)
    expect(next.monto_guardadito).toBe(150)
    expect(next.racha_actual).toBe(6)
  })

  it('llama al RPC con el monto dado', async () => {
    setupMocks()
    vi.mocked(registrarAhorroLibre).mockResolvedValue({
      saldo_nuevo: 200,
      guardadito_nuevo: 200,
      racha_actual: 7,
    })

    const { result } = renderHook(() => useGuardadito())

    await act(async () => {
      await result.current.registrarAhorro(100)
    })

    expect(registrarAhorroLibre).toHaveBeenCalledWith(100)
  })

  it('no llama setProfile si el RPC falla', async () => {
    const { mockSetProfile } = setupMocks()
    vi.mocked(registrarAhorroLibre).mockRejectedValue(new Error('SALDO_INSUFICIENTE'))

    const { result } = renderHook(() => useGuardadito())

    await act(async () => {
      await result.current.registrarAhorro(9999).catch(() => {})
    })

    expect(mockSetProfile).not.toHaveBeenCalled()
  })
})

describe('useGuardadito — sacar()', () => {
  it('actualiza saldo y guardadito pero NO toca racha_actual', async () => {
    const { mockSetProfile } = setupMocks()
    vi.mocked(sacarDeGuardadito).mockResolvedValue({
      saldo_nuevo: 400,
      guardadito_nuevo: 50,
    })

    const { result } = renderHook(() => useGuardadito())

    await act(async () => {
      await result.current.sacar(50)
    })

    const updater = mockSetProfile.mock.calls[0][0]
    const prev = makeProfile()   // racha_actual = 5
    const next = updater(prev)
    expect(next.saldo_disponible).toBe(400)
    expect(next.monto_guardadito).toBe(50)
    // racha_actual debe ser idéntico al previo — sacar no toca la racha
    expect(next.racha_actual).toBe(prev.racha_actual)
  })

  it('llama al RPC con el monto dado', async () => {
    setupMocks()
    vi.mocked(sacarDeGuardadito).mockResolvedValue({
      saldo_nuevo: 350,
      guardadito_nuevo: 0,
    })

    const { result } = renderHook(() => useGuardadito())

    await act(async () => {
      await result.current.sacar(100)
    })

    expect(sacarDeGuardadito).toHaveBeenCalledWith(100)
  })

  it('no llama setProfile si el RPC falla', async () => {
    const { mockSetProfile } = setupMocks()
    vi.mocked(sacarDeGuardadito).mockRejectedValue(new Error('GUARDADITO_INSUFICIENTE'))

    const { result } = renderHook(() => useGuardadito())

    await act(async () => {
      await result.current.sacar(9999).catch(() => {})
    })

    expect(mockSetProfile).not.toHaveBeenCalled()
  })
})
