import { supabase } from '@/lib/supabase'

export interface Visita {
  id: string
  promotor_id: string
  loja_id: string
  check_in: string
  check_out?: string
  observacoes?: string
  status: string
  created_at?: string
}

export async function getActiveVisit(promoterId: string): Promise<Visita | null> {
  try {
    const { data, error } = await supabase
      .from('visitas')
      .select('*')
      .eq('promotor_id', promoterId)
      .is('check_out', null)
      .order('check_in', { ascending: false })
      .limit(1)
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    return null
  }
}

export async function createVisit(data: {
  promotor_id: string
  loja_id: string
  check_in: string
}): Promise<Visita> {
  const { data: visita, error } = await supabase
    .from('visitas')
    .insert({
      promotor_id: data.promotor_id,
      loja_id: data.loja_id,
      check_in: data.check_in,
      status: 'pendente'
    })
    .select()
    .single()
  
  if (error) throw error
  return visita
}

export async function updateVisit(
  id: string,
  data: { check_out: string; observacoes?: string }
): Promise<Visita> {
  const { data: visita, error } = await supabase
    .from('visitas')
    .update({
      check_out: data.check_out,
      observacoes: data.observacoes,
      status: 'realizada'
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return visita
}

export async function getVisitasByPromotor(promotorId: string): Promise<Visita[]> {
  const { data, error } = await supabase
    .from('visitas')
    .select('*, lojas(nome_loja)')
    .eq('promotor_id', promotorId)
    .order('check_in', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function getAllVisitas(): Promise<Visita[]> {
  const { data, error } = await supabase
    .from('visitas')
    .select('*, promotores(promotor_nome), lojas(nome_loja)')
    .order('check_in', { ascending: false })
  
  if (error) throw error
  return data || []
}
