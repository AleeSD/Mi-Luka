import { z } from 'zod'

const CATEGORIAS = ['comida', 'transporte', 'entretenimiento', 'educacion', 'compras', 'salud', 'servicios', 'otros'] as const

export const expenseSchema = z.object({
  monto: z
    .number({ invalid_type_error: 'Ingresa un monto válido' })
    .positive('El monto debe ser mayor a 0')
    .max(999999, 'El monto es demasiado grande'),
  categoria: z.enum(CATEGORIAS, { errorMap: () => ({ message: 'Selecciona una categoría' }) }),
  descripcion: z
    .string()
    .min(1, 'La descripción es requerida')
    .max(100, 'Máximo 100 caracteres'),
  fecha: z.string().min(1, 'La fecha es requerida'),
  notas: z.string().max(500, 'Máximo 500 caracteres').optional(),
})

export type ExpenseFormData = z.infer<typeof expenseSchema>
