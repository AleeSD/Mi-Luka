import { useState, useEffect, useCallback } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { getExpenses, createExpense, updateExpense, deleteExpense } from '@/lib/db/expenses'
import type { Expense } from '@/types/database'
import type { ExpenseFormData } from '@/lib/validations/expense'

export function useExpenses() {
  const { user } = useAuthContext()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const data = await getExpenses(user.id)
      setExpenses(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando gastos')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  const addExpense = useCallback(async (data: ExpenseFormData): Promise<Expense> => {
    if (!user) throw new Error('No autenticado')
    const expense = await createExpense(user.id, data)
    setExpenses((prev) => [expense, ...prev])
    return expense
  }, [user])

  const editExpense = useCallback(async (id: string, data: Partial<ExpenseFormData>): Promise<Expense> => {
    const updated = await updateExpense(id, data)
    setExpenses((prev) => prev.map((e) => e.id === id ? updated : e))
    return updated
  }, [])

  const removeExpense = useCallback(async (id: string): Promise<void> => {
    await deleteExpense(id)
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const totalMes = expenses
    .filter((e) => {
      const hoy = new Date()
      const fecha = new Date(e.fecha)
      return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear()
    })
    .reduce((acc, e) => acc + Number(e.monto), 0)

  return { expenses, loading, error, refresh: load, addExpense, editExpense, removeExpense, totalMes }
}
