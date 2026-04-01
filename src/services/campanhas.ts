import { supabase } from '@/lib/supabase'

export interface Campanha {
  id: string
  nome: string
  descricao?: string
  data_inicio: string
  data_fim: string
  cor?: string
  created_at?: string
}

export interface CampanhaComLojas extends Campanha {
  lojas?: { id: string; cod_loja: string; nome_loja: string }[]
}

export async function getCampanhas() {
  try {
    const { data, error } = await supabase
      .from('campanhas')
      .select('*')
      .order('data_inicio')
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Erro ao buscar campanhas:', error)
    return []
  }
}

export async function getCampanhasComLojas() {
  try {
    const { data, error } = await supabase
      .from('campanhas')
      .select(`
        *,
        lojas_campanhas (
          lojas (id, cod_loja, nome_loja)
        )
      `)
      .order('data_inicio')
    
    if (error) throw error
    
    // Transformar os dados para um formato mais fácil de usar
    return data.map(campanha => ({
      ...campanha,
      lojas: campanha.lojas_campanhas?.map(lc => lc.lojas).filter(Boolean) || []
    }))
  } catch (error) {
    console.error('Erro ao buscar campanhas com lojas:', error)
    return []
  }
}

export async function createCampanha(data: Omit<Campanha, 'id' | 'created_at'>, lojasIds: string[]) {
  try {
    // 1. Criar a campanha
    const { data: campanha, error: campanhaError } = await supabase
      .from('campanhas')
      .insert({
        nome: data.nome,
        descricao: data.descricao,
        data_inicio: data.data_inicio,
        data_fim: data.data_fim,
        cor: data.cor || '#FF1686'
      })
      .select()
      .single()
    
    if (campanhaError) throw campanhaError

    // 2. Associar as lojas
    if (lojasIds.length > 0) {
      const lojasCampanhas = lojasIds.map(loja_id => ({
        loja_id,
        campanha_id: campanha.id
      }))
      
      const { error: relError } = await supabase
        .from('lojas_campanhas')
        .insert(lojasCampanhas)
      
      if (relError) throw relError
    }

    return campanha
  } catch (error) {
    console.error('Erro ao criar campanha:', error)
    return null
  }
}

export async function deleteCampanha(id: string) {
  try {
    const { error } = await supabase
      .from('campanhas')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('Erro ao deletar campanha:', error)
    return false
  }
}
