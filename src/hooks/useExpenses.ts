import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { useProfileContext } from '@/context/ProfileContext'
import { getExpenses, createExpense, updateExpense, deleteExpense } from '@/lib/db/expenses'
import type { Expense } from '@/types/database'
import type { ExpenseFormData } from '@/lib/validations/expense'

export function useExpenses() {
  const { user } = useAuthContext()
  const { setProfile } = useProfileContext()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    getExpenses(user.id)
      .then((data) => { if (!cancelled) setExpenses(data) })
      .catch((e) => {
        console.error('[useExpenses] load error:', e)
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error cargando gastos')
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [user, retryCount])

  const addExpense = useCallback(async (data: ExpenseFormData): Promise<Expense> => {
    if (!user) throw new Error('No autenticado')
    const { expense, saldo_nuevo } = await createExpense(user.id, data)
    setExpenses((prev) => [expense, ...prev])
    setProfile((p) => (p ? { ...p, saldo_disponible: saldo_nuevo } : p))
    return expense
  }, [user, setProfile])

  const editExpense = useCallback(async (id: string, data: ExpenseFormData): Promise<Expense> => {
    const { expense, saldo_nuevo } = await updateExpense(id, data)
    setExpenses((prev) => prev.map((e) => (e.id === id ? expense : e)))
    setProfile((p) => (p ? { ...p, saldo_disponible: saldo_nuevo } : p))
    return expense
  }, [setProfile])

  const removeExpense = useCallback(async (id: string): Promise<void> => {
    // eliminar_gasto devuelve el monto al saldo; propagamos al perfil.
    const saldoNuevo = await deleteExpense(id)
    setExpenses((prev) => prev.filter((e) => e.id !== id))
    setProfile((p) => (p ? { ...p, saldo_disponible: saldoNuevo } : p))
  }, [setProfile])

  // Total del mes en curso (memoizado — cierra B5).
  const totalMes = useMemo(() => {
    const hoy = new Date()
    const mes = hoy.getMonth()
    const año = hoy.getFullYear()
    return expenses
      .filter((e) => {
        const fecha = new Date(e.fecha)
        return fecha.getMonth() === mes && fecha.getFullYear() === año
      })
      .reduce((acc, e) => acc + Number(e.monto), 0)
  }, [expenses])

  return {
    expenses,
    loading,
    error,
    refresh: () => setRetryCount((n) => n + 1),
    addExpense,
    editExpense,
    removeExpense,
    totalMes,
  }
}
