import { supabase } from '@/lib/supabase'
import type { Benefit, CategoriaBeneficio } from '@/types/database'

export async function getBenefits(categoria?: CategoriaBeneficio): Promise<Benefit[]> {
  let query = supabase
    .from('benefits')
    .select('*')
    .eq('activo', true)
    .order('created_at', { ascending: false })

  if (categoria) {
    query = query.eq('categoria', categoria)
  }

  const { data, error } = await query
  if (error) throw new Error('No se pudieron cargar los beneficios')
  return data ?? []
}
