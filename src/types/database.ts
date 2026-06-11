export type CategoriaGasto =
  | 'comida'
  | 'transporte'
  | 'entretenimiento'
  | 'educacion'
  | 'compras'
  | 'salud'
  | 'servicios'
  | 'otros'

export type CategoriaBeneficio =
  | 'fitness'
  | 'wellness'
  | 'educacion'
  | 'lifestyle'
  | 'comida'
  | 'transporte'

export type TipoReto = 'ahorro' | 'registro' | 'sin_gasto' | 'personalizado'

export type Profile = {
  id: string
  nombre: string
  avatar_url: string | null
  nivel: number
  puntos_totales: number
  created_at: string
  updated_at: string
}

export type Expense = {
  id: string
  user_id: string
  monto: number
  categoria: CategoriaGasto
  descripcion: string
  fecha: string
  notas: string | null
  created_at: string
}

export type Goal = {
  id: string
  user_id: string
  titulo: string
  monto_objetivo: number
  monto_actual: number
  fecha_limite: string | null
  color: string
  icono: string
  completada: boolean
  created_at: string
  updated_at: string
}

export type Challenge = {
  id: string
  titulo: string
  descripcion: string
  puntos: number
  duracion_dias: number
  tipo: TipoReto
  meta_valor: number | null
  activo: boolean
  created_at: string
}

export type UserChallenge = {
  id: string
  user_id: string
  challenge_id: string
  progreso: number
  completado: boolean
  fecha_inicio: string
  fecha_fin: string | null
  created_at: string
  challenge?: Challenge
}

export type Achievement = {
  id: string
  titulo: string
  descripcion: string
  icono: string
  condicion_tipo: string
  condicion_valor: number
  created_at: string
}

export type UserAchievement = {
  id: string
  user_id: string
  achievement_id: string
  fecha_desbloqueado: string
  achievement?: Achievement
}

export type Benefit = {
  id: string
  nombre_aliado: string
  titulo: string
  descripcion: string
  descuento: string
  codigo: string
  categoria: CategoriaBeneficio
  color: string
  icono: string | null
  fecha_expiracion: string | null
  activo: boolean
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: {
          id: string
          nombre: string
          avatar_url?: string | null
          nivel?: number
          puntos_totales?: number
        }
        Update: {
          nombre?: string
          avatar_url?: string | null
          nivel?: number
          puntos_totales?: number
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: Expense
        Insert: {
          user_id: string
          monto: number
          categoria: CategoriaGasto
          descripcion: string
          fecha: string
          notas?: string | null
        }
        Update: {
          monto?: number
          categoria?: CategoriaGasto
          descripcion?: string
          fecha?: string
          notas?: string | null
        }
        Relationships: []
      }
      goals: {
        Row: Goal
        Insert: {
          user_id: string
          titulo: string
          monto_objetivo: number
          monto_actual?: number
          fecha_limite?: string | null
          color: string
          icono?: string
          completada?: boolean
        }
        Update: {
          titulo?: string
          monto_objetivo?: number
          monto_actual?: number
          fecha_limite?: string | null
          color?: string
          icono?: string
          completada?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      challenges: {
        Row: Challenge
        Insert: {
          titulo: string
          descripcion: string
          puntos: number
          duracion_dias: number
          tipo: TipoReto
          meta_valor?: number | null
          activo?: boolean
        }
        Update: {
          titulo?: string
          descripcion?: string
          puntos?: number
          duracion_dias?: number
          tipo?: TipoReto
          meta_valor?: number | null
          activo?: boolean
        }
        Relationships: []
      }
      user_challenges: {
        Row: UserChallenge
        Insert: {
          user_id: string
          challenge_id: string
          progreso?: number
          completado?: boolean
          fecha_inicio?: string
          fecha_fin?: string | null
        }
        Update: {
          progreso?: number
          completado?: boolean
          fecha_fin?: string | null
        }
        Relationships: []
      }
      achievements: {
        Row: Achievement
        Insert: {
          titulo: string
          descripcion: string
          icono: string
          condicion_tipo: string
          condicion_valor: number
        }
        Update: {
          titulo?: string
          descripcion?: string
          icono?: string
          condicion_tipo?: string
          condicion_valor?: number
        }
        Relationships: []
      }
      user_achievements: {
        Row: UserAchievement
        Insert: {
          user_id: string
          achievement_id: string
          fecha_desbloqueado?: string
        }
        Update: never
        Relationships: []
      }
      benefits: {
        Row: Benefit
        Insert: {
          nombre_aliado: string
          titulo: string
          descripcion: string
          descuento: string
          codigo: string
          categoria: CategoriaBeneficio
          color: string
          icono?: string | null
          fecha_expiracion?: string | null
          activo?: boolean
        }
        Update: {
          nombre_aliado?: string
          titulo?: string
          descripcion?: string
          descuento?: string
          codigo?: string
          categoria?: CategoriaBeneficio
          color?: string
          icono?: string | null
          fecha_expiracion?: string | null
          activo?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
  }
}
