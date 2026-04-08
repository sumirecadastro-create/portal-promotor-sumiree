import { supabase } from '@/lib/supabase'

export interface Visita {
  id: string
  promotor_id: string
  loja_id: string
  check_in: string
  check_out?: string
  observacoes?: string
  status: string
}

export async function getActiveVisit(promotorId: string): Promise<Visita | null> {
  const { data, error } = await supabase
    .from('visitas')
    .select('*')
    .eq('promotor_id', promotorId)
    .is('check_out', null)
    .single()
  
  if (error) return null
  return data
}

export async function getActiveVisitsByDay(date: string): Promise<Visita[]> {
  const { data, error } = await supabase
    .from('visitas')
    .select('*')
    .gte('check_in', `${date}T00:00:00`)
    .lt('check_in', `${date}T23:59:59`)
    .is('check_out', null)
  
  if (error) {
    console.error('Erro ao buscar visitas ativas:', error)
    return []
  }
  return data || []
}

export async function createVisit(visit: Omit<Visita, 'id' | 'status'>): Promise<Visita> {
  const { data, error } = await supabase
    .from('visitas')
    .insert({ ...visit, status: 'em_andamento' })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateVisit(id: string, updates: Partial<Visita>): Promise<Visita> {
  const { data, error } = await supabase
    .from('visitas')
    .update({ ...updates, status: updates.check_out ? 'concluida' : 'em_andamento' })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getAllVisitas(): Promise<Visita[]> {
  const { data, error } = await supabase
    .from('visitas')
    .select('*')
    .order('check_in', { ascending: false })
  
  if (error) throw error
  return data || []
}

// 👇 ADICIONE ESTA FUNÇÃO NO FINAL 👇
export async function testConnection() {
  console.log('Testando conexão com Supabase...')
  const { data, error } = await supabase
    .from('visitas')
    .select('count')
  console.log('Resultado:', { data, error })
  return { data, error }
}
