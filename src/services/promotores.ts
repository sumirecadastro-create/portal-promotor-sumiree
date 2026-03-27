import { supabase } from '@/lib/supabase'

export interface Promotor {
  id: string
  promotor_nome: string
  loja_id?: string
  gerente_id?: string
  marca_produto?: string
  fabricante_produto?: string
  dias_semana?: string
  contato_responsavel?: string
  status?: string
  created_at?: string
  lojas?: { nome_loja: string }
}

export async function getPromotores() {
  try {
    const { data, error } = await supabase
      .from('promotores')
      .select('*, lojas(nome_loja)')
      .order('promotor_nome')
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Erro ao buscar promotores:', error)
    return []
  }
}

export async function getPromotorById(id: string) {
  try {
    const { data, error } = await supabase
      .from('promotores')
      .select('*, lojas(nome_loja)')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao buscar promotor:', error)
    return null
  }
}

export async function getPromotoresByLoja(lojaId: string) {
  try {
    const { data, error } = await supabase
      .from('promotores')
      .select('*')
      .eq('loja_id', lojaId)
      .order('promotor_nome')
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Erro ao buscar promotores por loja:', error)
    return []
  }
}

export async function updatePromotor(id: string, data: Partial<Promotor>) {
  try {
    const { data: promotor, error } = await supabase
      .from('promotores')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return promotor
  } catch (error) {
    console.error('Erro ao atualizar promotor:', error)
    return null
  }
}

export async function createPromotor(data: Omit<Promotor, 'id' | 'created_at'>) {
  try {
    const { data: promotor, error } = await supabase
      .from('promotores')
      .insert(data)
      .select()
      .single()
    
    if (error) throw error
    return promotor
  } catch (error) {
    console.error('Erro ao criar promotor:', error)
    return null
  }
}
