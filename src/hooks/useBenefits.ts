import { useState, useEffect, useCallback } from 'react'
import { getBenefits } from '@/lib/db/benefits'
import type { Benefit, CategoriaBeneficio } from '@/types/database'

export function useBenefits() {
  const [benefits, setBenefits] = useState<Benefit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categoriaActiva, setCategoriaActiva] = useState<CategoriaBeneficio | undefined>(undefined)

  const load = useCallback(async (categoria?: CategoriaBeneficio) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getBenefits(categoria)
      setBenefits(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando beneficios')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(categoriaActiva) }, [load, categoriaActiva])

  return { benefits, loading, error, categoriaActiva, setCategoriaActiva, refresh: () => load(categoriaActiva) }
}
