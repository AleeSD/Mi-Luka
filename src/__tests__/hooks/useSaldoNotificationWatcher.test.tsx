import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSaldoNotificationWatcher } from '@/hooks/useSaldoNotificationWatcher'
import type { Profile } from '@/types/database'

vi.mock('@/context/ProfileContext')
vi.mock('@/hooks/useLukaNotification')

import { useProfileContext } from '@/context/ProfileContext'
import { useLukaNotification } from '@/hooks/useLukaNotification'

const makeProfile = (saldo: number, umbral = 50): Profile => ({
  id: 'user-1',
  nombre: 'Test',
  avatar_url: null,
  nivel: 1,
  puntos_totales: 0,
  saldo_disponible: saldo,
  saldo_configurado: true,
  monto_guardadito: 0,
  racha_actual: 0,
  racha_mas_larga: 0,
  ultima_fecha_racha: null,
  umbral_saldo_bajo: umbral,
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
})

function setup(initialProfile: Profile | null = null) {
  const mockNotify = vi.fn()
  vi.mocked(useLukaNotification).mockReturnValue({ notify: mockNotify, dismiss: vi.fn() })

  const saldoChangeSourceRef = { current: 'spend' as 'user_edit' | 'spend' }

  let currentProfile: Profile | null = initialProfile
  vi.mocked(useProfileContext).mockImplementation(() => ({
    profile: currentProfile,
    loading: false,
    error: null,
    setProfile: vi.fn(),
    refresh: vi.fn(),
    saldoChangeSourceRef,
    update: vi.fn(),
    uploadProfileAvatar: vi.fn(),
  }))

  return { mockNotify, saldoChangeSourceRef, setProfile: (p: Profile | null) => { currentProfile = p } }
}

beforeEach(() => vi.clearAllMocks())

describe('useSaldoNotificationWatcher — primera carga', () => {
  it('NO dispara notificación en la primera carga', () => {
    const { mockNotify } = setup(makeProfile(100))
    renderHook(() => useSaldoNotificationWatcher())
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it('NO dispara cuando profile es null al inicio', () => {
    const { mockNotify } = setup(null)
    renderHook(() => useSaldoNotificationWatcher())
    expect(mockNotify).not.toHaveBeenCalled()
  })
})

describe('useSaldoNotificationWatcher — Banco B (saldo llega a 0)', () => {
  it('dispara saldo_cero cuando prev>0 → curr=0', () => {
    const { mockNotify, setProfile } = setup(makeProfile(100))

    const { rerender } = renderHook(() => useSaldoNotificationWatcher())

    act(() => {
      setProfile(makeProfile(0))
      rerender()
    })

    expect(mockNotify).toHaveBeenCalledOnce()
    expect(mockNotify.mock.calls[0][0].variant).toBe('saldo_cero')
  })

  it('NO dispara si prev ya era 0 → curr=0', () => {
    const { mockNotify, setProfile } = setup(makeProfile(0))
    const { rerender } = renderHook(() => useSaldoNotificationWatcher())

    act(() => {
      setProfile(makeProfile(0))
      rerender()
    })

    expect(mockNotify).not.toHaveBeenCalled()
  })
})

describe('useSaldoNotificationWatcher — Banco C (saldo bajo)', () => {
  it('dispara saldo_bajo cuando prev>umbral → 0<curr<=umbral', () => {
    const umbral = 50
    const { mockNotify, setProfile } = setup(makeProfile(100, umbral))
    const { rerender } = renderHook(() => useSaldoNotificationWatcher())

    act(() => {
      setProfile(makeProfile(30, umbral))
      rerender()
    })

    expect(mockNotify).toHaveBeenCalledOnce()
    expect(mockNotify.mock.calls[0][0].variant).toBe('saldo_bajo')
  })

  it('curr=umbral exacto dispara Banco C', () => {
    const umbral = 50
    const { mockNotify, setProfile } = setup(makeProfile(100, umbral))
    const { rerender } = renderHook(() => useSaldoNotificationWatcher())

    act(() => {
      setProfile(makeProfile(50, umbral))
      rerender()
    })

    expect(mockNotify).toHaveBeenCalledOnce()
    expect(mockNotify.mock.calls[0][0].variant).toBe('saldo_bajo')
  })

  it('curr=umbral+1 NO dispara (no cruzó el umbral)', () => {
    const umbral = 50
    const { mockNotify, setProfile } = setup(makeProfile(100, umbral))
    const { rerender } = renderHook(() => useSaldoNotificationWatcher())

    act(() => {
      setProfile(makeProfile(51, umbral))
      rerender()
    })

    expect(mockNotify).not.toHaveBeenCalled()
  })

  it('NO dispara Banco C si curr=0 (ese es caso del Banco B)', () => {
    const umbral = 50
    const { mockNotify, setProfile } = setup(makeProfile(100, umbral))
    const { rerender } = renderHook(() => useSaldoNotificationWatcher())

    act(() => {
      setProfile(makeProfile(0, umbral))
      rerender()
    })

    expect(mockNotify).toHaveBeenCalledOnce()
    expect(mockNotify.mock.calls[0][0].variant).toBe('saldo_cero')
  })
})

describe('useSaldoNotificationWatcher — user_edit bypass', () => {
  it('NO dispara si el cambio viene de user_edit (aunque cruce 0)', () => {
    const { mockNotify, setProfile, saldoChangeSourceRef } = setup(makeProfile(100))
    const { rerender } = renderHook(() => useSaldoNotificationWatcher())

    act(() => {
      saldoChangeSourceRef.current = 'user_edit'
      setProfile(makeProfile(0))
      rerender()
    })

    expect(mockNotify).not.toHaveBeenCalled()
  })

  it('NO dispara si user_edit aunque cruce umbral', () => {
    const { mockNotify, setProfile, saldoChangeSourceRef } = setup(makeProfile(100, 50))
    const { rerender } = renderHook(() => useSaldoNotificationWatcher())

    act(() => {
      saldoChangeSourceRef.current = 'user_edit'
      setProfile(makeProfile(30, 50))
      rerender()
    })

    expect(mockNotify).not.toHaveBeenCalled()
  })
})

describe('useSaldoNotificationWatcher — reset en logout', () => {
  it('reseta el prevRef cuando profile pasa a null', () => {
    const { mockNotify, setProfile } = setup(makeProfile(100))
    const { rerender } = renderHook(() => useSaldoNotificationWatcher())

    // Logout
    act(() => {
      setProfile(null)
      rerender()
    })

    // Login con saldo 0 — no debe disparar (es "primera carga" de nuevo)
    act(() => {
      setProfile(makeProfile(0))
      rerender()
    })

    expect(mockNotify).not.toHaveBeenCalled()
  })
})
