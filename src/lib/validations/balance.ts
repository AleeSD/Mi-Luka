import { z } from 'zod'

export const actualizarSaldoSchema = z.object({
  monto: z
    .number({ invalid_type_error: 'Ingresa un monto válido' })
    .min(0, 'El saldo no puede ser negativo')
    .max(9999999, 'El monto es demasiado grande'),
})

export type ActualizarSaldoFormData = z.infer<typeof actualizarSaldoSchema>

export const ahorroLibreSchema = z.object({
  monto: z
    .number({ invalid_type_error: 'Ingresa un monto válido' })
    .positive('El monto debe ser mayor a 0')
    .max(9999999, 'El monto es demasiado grande'),
})

export type AhorroLibreFormData = z.infer<typeof ahorroLibreSchema>

export const sacarGuardaditoSchema = z.object({
  monto: z
    .number({ invalid_type_error: 'Ingresa un monto válido' })
    .positive('El monto debe ser mayor a 0')
    .max(9999999, 'El monto es demasiado grande'),
})

export type SacarGuardaditoFormData = z.infer<typeof sacarGuardaditoSchema>
