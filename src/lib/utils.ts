import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isValid, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { CategoriaGasto } from '@/types/database'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateStr: string, pattern = 'dd MMM yyyy'): string {
  const date = parseISO(dateStr)
  if (!isValid(date)) return dateStr
  return format(date, pattern, { locale: es })
}

export function sanitizeText(text: string): string {
  return text.trim().replace(/[<>]/g, '')
}

export const CATEGORIAS: Record<CategoriaGasto, { label: string; emoji: string; color: string }> = {
  comida:          { label: 'Comida',          emoji: '🍔', color: '#4F46E5' },
  transporte:      { label: 'Transporte',      emoji: '🚌', color: '#10B981' },
  entretenimiento: { label: 'Entretenimiento', emoji: '🎬', color: '#F59E0B' },
  educacion:       { label: 'Educación',       emoji: '📚', color: '#8B5CF6' },
  compras:         { label: 'Compras',         emoji: '🛍️', color: '#EC4899' },
  salud:           { label: 'Salud',           emoji: '🏥', color: '#EF4444' },
  servicios:       { label: 'Servicios',       emoji: '💡', color: '#06B6D4' },
  otros:           { label: 'Otros',           emoji: '📦', color: '#6B7280' },
}

export function getDiasRestantes(fechaLimite: string): number {
  const hoy = new Date()
  const limite = parseISO(fechaLimite)
  const diff = limite.getTime() - hoy.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function getBeneficioProximoAExpirar(fechaExpiracion: string | null): boolean {
  if (!fechaExpiracion) return false
  const dias = getDiasRestantes(fechaExpiracion)
  return dias > 0 && dias <= 7
}
