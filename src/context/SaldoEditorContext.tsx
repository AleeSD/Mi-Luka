import { createContext, useContext, useState, useCallback } from 'react'

interface SaldoEditorContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
}

const SaldoEditorContext = createContext<SaldoEditorContextValue | null>(null)

/**
 * Controla el diálogo global de "Actualizar saldo".
 *
 * Antes el diálogo vivía dentro de DashboardPage, con su propio estado.
 * Eso impedía abrirlo desde otras pantallas (p.ej. desde el CTA de una
 * LukaNotification disparada en AddExpensePage o GoalsPage). Ahora el
 * diálogo se monta una vez en MainLayout y se abre vía este contexto
 * desde cualquier lugar.
 */
export function SaldoEditorProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  return (
    <SaldoEditorContext.Provider value={{ isOpen, open, close }}>
      {children}
    </SaldoEditorContext.Provider>
  )
}

export function useSaldoEditor() {
  const ctx = useContext(SaldoEditorContext)
  if (!ctx) throw new Error('useSaldoEditor debe usarse dentro de SaldoEditorProvider')
  return ctx
}
