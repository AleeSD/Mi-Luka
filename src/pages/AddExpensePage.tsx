import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ShoppingBag, Car, Film, BookOpen, Tag, Heart, Zap, Package } from 'lucide-react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { expenseSchema } from '@/lib/validations/expense'
import type { ExpenseFormData } from '@/lib/validations/expense'
import { useExpenses } from '@/hooks/useExpenses'
import { getExpenseById } from '@/lib/db/expenses'
import { CATEGORIAS, sanitizeText } from '@/lib/utils'
import type { CategoriaGasto } from '@/types/database'

const iconMap: Record<CategoriaGasto, React.ElementType> = {
  comida: ShoppingBag, transporte: Car, entretenimiento: Film,
  educacion: BookOpen, compras: Tag, salud: Heart, servicios: Zap, otros: Package,
}

const pageVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] } },
}

export function AddExpensePage() {
  const navigate    = useNavigate()
  const { id }      = useParams<{ id?: string }>()
  const isEditing   = Boolean(id)
  const { addExpense, editExpense, expenses } = useExpenses()
  const [loadingEdit, setLoadingEdit] = useState(false)

  const {
    register, handleSubmit, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      fecha:  new Date().toISOString().split('T')[0],
      monto:  undefined,
    },
  })

  const selectedCat = watch('categoria')

  useEffect(() => {
    if (!id) return
    setLoadingEdit(true)
    getExpenseById(id).then((expense) => {
      if (expense) {
        setValue('monto',       Number(expense.monto))
        setValue('categoria',   expense.categoria)
        setValue('descripcion', expense.descripcion)
        setValue('fecha',       expense.fecha)
        setValue('notas',       expense.notas ?? '')
      }
    }).finally(() => setLoadingEdit(false))
  }, [id, setValue])

  const onSubmit = handleSubmit(async (data) => {
    try {
      const sanitized: ExpenseFormData = {
        ...data,
        descripcion: sanitizeText(data.descripcion),
        notas:       data.notas ? sanitizeText(data.notas) : undefined,
      }

      if (isEditing && id) {
        await editExpense(id, sanitized)
        toast.success('Gasto actualizado')
      } else {
        await addExpense(sanitized)
        const hoy       = new Date().toISOString().split('T')[0]
        const gastosHoy = expenses.filter((e) => e.fecha === hoy)
        if (gastosHoy.length === 0) {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } })
        }
        toast.success('¡Gasto registrado!')
      }
      navigate('/app')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar el gasto')
    }
  })

  if (loadingEdit) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-40 rounded-xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <motion.div
      className="min-h-screen p-4 pt-6 space-y-5 pb-24"
      variants={pageVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <motion.button
          type="button"
          onClick={() => navigate(-1)}
          whileHover={{ scale: 1.1, x: -2 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 420, damping: 17 }}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" style={{ color: 'var(--luka-text-primary)' }} />
        </motion.button>
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--luka-text-primary)' }}>
            {isEditing ? 'Editar gasto' : 'Nuevo gasto'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--luka-text-secondary)' }}>
            {isEditing ? 'Modifica los datos del gasto' : 'Registra un nuevo gasto'}
          </p>
        </div>
      </motion.div>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Monto */}
        <motion.div variants={fadeUp}>
          <Card className="p-5 rounded-2xl shadow-md">
            <Label htmlFor="monto" className="block mb-2">Monto</Label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-2xl font-medium" style={{ color: 'var(--luka-text-secondary)' }}>
                S/
              </span>
              <Input
                id="monto"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className="pl-12 text-2xl h-14 rounded-xl border-2 focus:border-[#4F46E5]"
                {...register('monto', { valueAsNumber: true })}
              />
            </div>
            {errors.monto && <p className="text-xs text-red-500 mt-1">{errors.monto.message}</p>}
          </Card>
        </motion.div>

        {/* Categoría */}
        <motion.div variants={fadeUp}>
          <Card className="p-5 rounded-2xl shadow-md">
            <Label className="block mb-3">Categoría</Label>
            <motion.div
              className="grid grid-cols-4 gap-2"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
            >
              {(Object.keys(CATEGORIAS) as CategoriaGasto[]).map((cat) => {
                const { label, color } = CATEGORIAS[cat]
                const Icon             = iconMap[cat]
                const isSelected       = selectedCat === cat
                return (
                  <motion.button
                    key={cat}
                    type="button"
                    onClick={() => setValue('categoria', cat, { shouldValidate: true })}
                    variants={{
                      hidden: { opacity: 0, scale: 0.8 },
                      show:   { opacity: 1, scale: 1, transition: { duration: 0.25 } },
                    }}
                    animate={{ scale: isSelected ? 1.06 : 1 }}
                    whileHover={{ scale: isSelected ? 1.08 : 1.05 }}
                    whileTap={{ scale: 0.94 }}
                    transition={{ type: 'spring', stiffness: 340, damping: 20 }}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl"
                    style={{
                      background:   isSelected ? `${color}18` : 'transparent',
                      border:       isSelected ? `2px solid ${color}` : '2px solid transparent',
                    }}
                  >
                    <Icon className="w-6 h-6" style={{ color: isSelected ? color : 'var(--luka-text-secondary)' }} />
                    <span className="text-xs text-center leading-tight"
                      style={{ color: isSelected ? color : 'var(--luka-text-secondary)' }}>
                      {label}
                    </span>
                  </motion.button>
                )
              })}
            </motion.div>
            {errors.categoria && <p className="text-xs text-red-500 mt-2">{errors.categoria.message}</p>}
          </Card>
        </motion.div>

        {/* Descripción */}
        <motion.div variants={fadeUp}>
          <Card className="p-5 rounded-2xl shadow-md">
            <Label htmlFor="descripcion" className="block mb-2">Descripción</Label>
            <Input
              id="descripcion"
              placeholder="Ej: Almuerzo con amigos"
              className="rounded-xl"
              {...register('descripcion')}
            />
            {errors.descripcion && <p className="text-xs text-red-500 mt-1">{errors.descripcion.message}</p>}
          </Card>
        </motion.div>

        {/* Fecha */}
        <motion.div variants={fadeUp}>
          <Card className="p-5 rounded-2xl shadow-md">
            <Label htmlFor="fecha" className="block mb-2">Fecha</Label>
            <Input id="fecha" type="date" className="rounded-xl" {...register('fecha')} />
            {errors.fecha && <p className="text-xs text-red-500 mt-1">{errors.fecha.message}</p>}
          </Card>
        </motion.div>

        {/* Notas */}
        <motion.div variants={fadeUp}>
          <Card className="p-5 rounded-2xl shadow-md">
            <Label htmlFor="notas" className="block mb-2">
              Notas <span className="text-xs font-normal" style={{ color: 'var(--luka-text-secondary)' }}>(opcional)</span>
            </Label>
            <Textarea
              id="notas"
              placeholder="Agrega una nota o detalle adicional..."
              className="rounded-xl resize-none"
              rows={3}
              {...register('notas')}
            />
            {errors.notas && <p className="text-xs text-red-500 mt-1">{errors.notas.message}</p>}
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <motion.button
            type="submit"
            disabled={isSubmitting}
            whileHover={{ scale: 1.02, y: -2, boxShadow: '0 12px 32px rgba(79,70,229,0.35)' }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className="w-full py-4 rounded-2xl text-white text-base font-semibold disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}
          >
            {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar gasto' : 'Guardar gasto'}
          </motion.button>
        </motion.div>
      </form>
    </motion.div>
  )
}
