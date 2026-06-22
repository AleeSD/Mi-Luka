import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSaldo } from '@/hooks/useSaldo'
import { useSaldoEditor } from '@/context/SaldoEditorContext'
import { actualizarSaldoSchema, type ActualizarSaldoFormData } from '@/lib/validations/balance'

/**
 * Diálogo global de "Actualizar saldo" (reemplazo absoluto).
 *
 * Se monta una sola vez en MainLayout. Se abre vía useSaldoEditor() —
 * desde el SaldoCard del Dashboard, o desde el CTA de una LukaNotification
 * de bloqueo.
 *
 * El form se rellena con el saldo actual cada vez que se abre, para que
 * el usuario vea de partida cuánto tiene (y borre/ajuste a su gusto).
 */
export function SaldoEditorDialog() {
  const { isOpen, close } = useSaldoEditor()
  const { saldoDisponible, actualizar } = useSaldo()

  const form = useForm<ActualizarSaldoFormData>({
    resolver: zodResolver(actualizarSaldoSchema),
    defaultValues: { monto: undefined },
  })

  // Cada vez que se abre, prefillea con el saldo actual del contexto.
  useEffect(() => {
    if (isOpen) form.reset({ monto: saldoDisponible })
  }, [isOpen, saldoDisponible, form])

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await actualizar(data.monto)
      toast.success('Saldo actualizado')
      close()
    } catch (e) {
      console.error('[SaldoEditorDialog] actualizar_saldo error:', e)
      toast.error('No se pudo actualizar el saldo')
    }
  })

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) close() }}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle>Actualizar saldo</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="saldo-editor-monto">Saldo disponible (S/)</Label>
            <div className="relative">
              <span
                className="absolute left-4 top-3 text-lg font-medium pointer-events-none"
                style={{ color: 'var(--luka-text-secondary)' }}
              >
                S/
              </span>
              <Input
                id="saldo-editor-monto"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                autoFocus
                className="pl-10 text-lg h-12 rounded-xl border-2 focus:border-[#4F46E5]"
                {...form.register('monto', { valueAsNumber: true })}
              />
            </div>
            {form.formState.errors.monto && (
              <p className="text-xs text-red-500">{form.formState.errors.monto.message}</p>
            )}
          </div>
          <motion.button
            type="submit"
            disabled={form.formState.isSubmitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3 rounded-xl text-white font-medium disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}
          >
            {form.formState.isSubmitting ? 'Guardando...' : 'Guardar saldo'}
          </motion.button>
          <p className="text-xs text-center" style={{ color: 'var(--luka-text-secondary)' }}>
            Este monto reemplaza tu saldo actual. No suma ni resta.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}
