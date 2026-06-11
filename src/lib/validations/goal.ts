import { z } from 'zod'

export const goalSchema = z.object({
  titulo: z
    .string()
    .min(1, 'El título es requerido')
    .max(100, 'Máximo 100 caracteres'),
  monto_objetivo: z
    .number({ invalid_type_error: 'Ingresa un monto válido' })
    .positive('El monto debe ser mayor a 0')
    .max(9999999, 'El monto es demasiado grande'),
  fecha_limite: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true
      return new Date(val) > new Date()
    }, 'La fecha debe ser en el futuro'),
  color: z.string().default('#4F46E5'),
  icono: z.string().default('target'),
})

export const contribucionSchema = z.object({
  monto: z
    .number({ invalid_type_error: 'Ingresa un monto válido' })
    .positive('El monto debe ser mayor a 0'),
})

export type GoalFormData = z.infer<typeof goalSchema>
export type ContribucionFormData = z.infer<typeof contribucionSchema>
