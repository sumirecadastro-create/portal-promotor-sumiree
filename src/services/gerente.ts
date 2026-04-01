import { supabase } from '@/lib/supabase'

export interface Gerente {
  id: string
  cod_loja: string
  nome_gerente: string
  telefone?: string
  created_at?: string
}

export async function getGerentes() {
  try {
    const { data, error } = await supabase
      .from('gerentes')
      .select('*')
      .order('nome_gerente')
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Erro ao buscar gerentes:', error)
    return []
  }
}

export async function getGerenteByLoja(cod_loja: string) {
  try {
    const { data, error } = await supabase
      .from('gerentes')
      .select('*')
      .eq('cod_loja', cod_loja)
      .maybeSingle()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao buscar gerente da loja:', error)
    return null
  }
}

export async function createGerente(gerente: Omit<Gerente, 'id' | 'created_at'>) {
  try {
    const { data, error } = await supabase
      .from('gerentes')
      .insert(gerente)
      .select()
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao criar gerente:', error)
    return null
  }
}
 
