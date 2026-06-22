import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Wallet } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSaldo } from '@/hooks/useSaldo'
import { actualizarSaldoSchema, type ActualizarSaldoFormData } from '@/lib/validations/balance'

/**
 * Modal OBLIGATORIO de onboarding. Es no descartable por diseño:
 *  - sin botón cerrar
 *  - sin click-fuera (onInteractOutside.preventDefault)
 *  - sin Escape (onEscapeKeyDown.preventDefault)
 *
 * Se activa cuando profile.saldo_configurado === false (cubre usuarios
 * nuevos y los reseteados por la 0010). Al guardar, useSaldo.actualizar
 * llama al RPC actualizar_saldo (que también pone saldo_configurado = true
 * en la misma sentencia) y actualiza el ProfileContext optimistamente.
 * El gate de ProtectedRoute detecta la nueva bandera y libera la app.
 */
export function OnboardingSaldoDialog() {
  const { actualizar } = useSaldo()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ActualizarSaldoFormData>({
    resolver: zodResolver(actualizarSaldoSchema),
    defaultValues: { monto: undefined },
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await actualizar(data.monto)
      toast.success('¡Listo! Ya puedes usar Mi Luka.')
      // No hace falta callback: actualizar() actualizó el ProfileContext
      // → requiereOnboarding pasa a false → ProtectedRoute desmonta el dialog.
    } catch (e) {
      console.error('[OnboardingSaldoDialog] actualizar_saldo error:', e)
      toast.error('No se pudo guardar el saldo. Intenta de nuevo.')
    }
  })

  return (
    <DialogPrimitive.Root open>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <DialogPrimitive.Content
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white dark:bg-gray-900 p-6 shadow-2xl focus:outline-none"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">
            Configura tu saldo inicial
          </DialogPrimitive.Title>

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5"
          >
            {/* Icon + heading */}
            <div className="text-center space-y-3">
              <div
                className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}
              >
                <Wallet className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--luka-text-primary)' }}>
                  ¿Cuánto tienes disponible?
                </h2>
                <p className="text-sm mt-1.5" style={{ color: 'var(--luka-text-secondary)' }}>
                  Ingresa tu saldo actual para empezar a controlar tus finanzas. Puedes cambiarlo cuando quieras.
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="onboarding-monto">Saldo disponible (S/)</Label>
                <div className="relative">
                  <span
                    className="absolute left-4 top-3 text-xl font-medium pointer-events-none"
                    style={{ color: 'var(--luka-text-secondary)' }}
                  >
                    S/
                  </span>
                  <Input
                    id="onboarding-monto"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    autoFocus
                    className="pl-10 text-xl h-13 rounded-xl border-2 focus:border-[#4F46E5]"
                    {...register('monto', { valueAsNumber: true })}
                  />
                </div>
                {errors.monto && (
                  <p className="text-xs text-red-500">{errors.monto.message}</p>
                )}
              </div>

              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: 1.02, y: -1, boxShadow: '0 10px 28px rgba(79,70,229,0.32)' }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className="w-full py-3.5 rounded-2xl text-white font-semibold disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}
              >
                {isSubmitting ? 'Guardando...' : 'Empezar con Mi Luka'}
              </motion.button>
            </form>

            <p className="text-xs text-center" style={{ color: 'var(--luka-text-secondary)' }}>
              Puedes poner S/ 0 si aún no lo sabes. Lo importante es arrancar.
            </p>
          </motion.div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
