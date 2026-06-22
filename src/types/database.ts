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

export type DificultadReto = 'facil' | 'media' | 'dificil'

export type Medicion =
  | 'ahorro_monto_semana'
  | 'ahorro_count_semana'
  | 'ahorro_dias_distintos_semana'
  | 'meta_completada_semana'
  | 'dias_sin_gasto_semana'
  | 'gasto_total_max_semana'
  | 'sin_categoria_semana'
  | 'gastos_dias_seguidos'
  | 'gastos_dias_distintos_semana'
  | 'gastos_count_semana'
  | 'subir_nivel_semana'
  | 'racha_minima'
  | 'saldo_positivo_fin_semana'

export type Profile = {
  id: string
  nombre: string
  avatar_url: string | null
  nivel: number
  puntos_totales: number
  saldo_disponible: number
  saldo_configurado: boolean
  monto_guardadito: number
  racha_actual: number
  racha_mas_larga: number
  ultima_fecha_racha: string | null
  umbral_saldo_bajo: number
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

export type GoalContribution = {
  id: string
  user_id: string
  goal_id: string | null
  monto: number
  fecha: string
  created_at: string
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
  dificultad: DificultadReto
  categoria_reto: string | null
  medicion: Medicion | null
  parametro: string | null
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
  semana: number | null
  snapshot_nivel: number | null
  progreso_cache: number
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

// ─── RPC return shapes ────────────────────────────────────────────────

export type RegistrarGastoResult = {
  expense: Expense
  saldo_nuevo: number
}

export type EditarGastoResult = {
  expense: Expense
  saldo_nuevo: number
}

export type ContribuirMetaResult = {
  goal: Goal
  saldo_nuevo: number
  monto_aplicado: number
  racha_actual: number
}

export type CompletarRetoResult = {
  xp_nuevo: number
  nivel_nuevo: number
  subio_de_nivel: boolean
  progreso: number
}

export type RegistrarAhorroLibreResult = {
  saldo_nuevo: number
  guardadito_nuevo: number
  racha_actual: number
}

export type SacarDeGuardaditoResult = {
  saldo_nuevo: number
  guardadito_nuevo: number
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
          saldo_disponible?: number
          saldo_configurado?: boolean
          monto_guardadito?: number
          racha_actual?: number
          racha_mas_larga?: number
          ultima_fecha_racha?: string | null
          umbral_saldo_bajo?: number
        }
        Update: {
          nombre?: string
          avatar_url?: string | null
          nivel?: number
          puntos_totales?: number
          saldo_disponible?: number
          saldo_configurado?: boolean
          monto_guardadito?: number
          racha_actual?: number
          racha_mas_larga?: number
          ultima_fecha_racha?: string | null
          umbral_saldo_bajo?: number
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
      goal_contributions: {
        Row: GoalContribution
        Insert: {
          user_id: string
          goal_id?: string | null
          monto: number
          fecha: string
        }
        Update: never
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
          dificultad?: DificultadReto
          categoria_reto?: string | null
          medicion?: Medicion | null
          parametro?: string | null
        }
        Update: {
          titulo?: string
          descripcion?: string
          puntos?: number
          duracion_dias?: number
          tipo?: TipoReto
          meta_valor?: number | null
          activo?: boolean
          dificultad?: DificultadReto
          categoria_reto?: string | null
          medicion?: Medicion | null
          parametro?: string | null
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
          semana?: number | null
          snapshot_nivel?: number | null
          progreso_cache?: number
        }
        Update: {
          progreso?: number
          completado?: boolean
          fecha_fin?: string | null
          progreso_cache?: number
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
      actualizar_saldo: {
        Args: { p_monto: number }
        Returns: number
      }
      registrar_gasto: {
        Args: {
          p_monto: number
          p_categoria: CategoriaGasto
          p_descripcion: string
          p_fecha: string
          p_notas?: string | null
        }
        Returns: RegistrarGastoResult
      }
      editar_gasto: {
        Args: {
          p_expense_id: string
          p_monto: number
          p_categoria: CategoriaGasto
          p_descripcion: string
          p_fecha: string
          p_notas?: string | null
        }
        Returns: EditarGastoResult
      }
      eliminar_gasto: {
        Args: { p_expense_id: string }
        Returns: number
      }
      contribuir_meta: {
        Args: { p_goal_id: string; p_monto: number }
        Returns: ContribuirMetaResult
      }
      registrar_ahorro_libre: {
        Args: { p_monto: number }
        Returns: RegistrarAhorroLibreResult
      }
      sacar_de_guardadito: {
        Args: { p_monto: number }
        Returns: SacarDeGuardaditoResult
      }
      aceptar_reto: {
        Args: { p_challenge_id: string }
        Returns: UserChallenge
      }
      completar_reto: {
        Args: { p_user_challenge_id: string }
        Returns: CompletarRetoResult
      }
      eliminar_meta: {
        Args: { p_goal_id: string; p_devolver_saldo?: boolean }
        Returns: number
      }
      retos_de_la_semana: {
        Args: { p_cantidad?: number }
        Returns: Challenge[]
      }
      progreso_reto: {
        Args: { p_user_challenge_id: string }
        Returns: number
      }
      semana_iso_lima: {
        Args: Record<string, never>
        Returns: number
      }
      nivel_desde_xp: {
        Args: { p_xp: number }
        Returns: number
      }
      xp_para_alcanzar_nivel: {
        Args: { p_n: number }
        Returns: number
      }
    }
  }
}
