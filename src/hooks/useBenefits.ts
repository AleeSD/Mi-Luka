import { useState, useEffect } from 'react'
import { getBenefits } from '@/lib/db/benefits'
import type { Benefit, CategoriaBeneficio } from '@/types/database'

export function useBenefits() {
  const [benefits, setBenefits] = useState<Benefit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categoriaActiva, setCategoriaActiva] = useState<CategoriaBeneficio | undefined>(undefined)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setError(null)

    getBenefits(categoriaActiva)
      .then(data => {
        if (!cancelled) setBenefits(data)
      })
      .catch(e => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error cargando beneficios')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [categoriaActiva, retryCount])

  return {
    benefits,
    loading,
    error,
    categoriaActiva,
    setCategoriaActiva,
    refresh: () => setRetryCount(n => n + 1),
  }
}
