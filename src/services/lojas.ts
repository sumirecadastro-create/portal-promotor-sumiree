import { supabase } from '@/lib/supabase'

export async function getLojas() {
  const { data, error } = await supabase
    .from('lojas')
    .select('*')
    .order('nome_loja')
  
  if (error) {
    console.error('Erro ao buscar lojas:', error)
    return []
  }
  return data
}

export async function getLojaById(id: string) {
  const { data, error } = await supabase
    .from('lojas')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Erro ao buscar loja:', error)
    return null
  }
  return data
}
