import { ShoppingBag, Car, Film, BookOpen, Tag, Heart, Zap, Package } from 'lucide-react'
import type { CategoriaGasto } from '@/types/database'
import { CATEGORIAS } from '@/lib/utils'

interface CategoryIconProps {
  categoria: CategoriaGasto
  size?: 'sm' | 'md' | 'lg'
}

const iconMap: Record<CategoriaGasto, React.ElementType> = {
  comida:          ShoppingBag,
  transporte:      Car,
  entretenimiento: Film,
  educacion:       BookOpen,
  compras:         Tag,
  salud:           Heart,
  servicios:       Zap,
  otros:           Package,
}

const sizeMap = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
const containerSize = { sm: 'w-8 h-8', md: 'w-12 h-12', lg: 'w-14 h-14' }

export function CategoryIcon({ categoria, size = 'md' }: CategoryIconProps) {
  const Icon = iconMap[categoria]
  const { color } = CATEGORIAS[categoria]

  return (
    <div
      className={`${containerSize[size]} rounded-xl flex items-center justify-center flex-shrink-0`}
      style={{ background: `${color}18` }}
    >
      <Icon className={sizeMap[size]} style={{ color }} />
    </div>
  )
}
