import { supabase } from '@/lib/supabase'

export interface Promotor {
  id: string
  promotor_nome: string
  loja_id?: string
  gerente_id?: string
  dias_semana?: string
  contato_responsavel?: string
  status?: string
  created_at?: string
  lojas?: { id: string; cod_loja: string; nome_loja: string }
  gerentes?: { id: string; nome_gerente: string; telefone?: string }
  marcas?: { id: string; nome_marca: string }[]
}

export interface Marca {
  id: string
  nome_marca: string
  created_at?: string
}

export async function getPromotores() {
  try {
    const { data, error } = await supabase
      .from('promotores')
      .select(`
        *,
        lojas (id, cod_loja, nome_loja),
        gerentes (id, nome_gerente, telefone),
        promotores_marcas (
          marcas (id, nome_marca)
        )
      `)
      .order('promotor_nome')
    
    if (error) throw error

    // Transformar os dados para incluir marcas como array
    const promotoresFormatados = data?.map(promotor => ({
      ...promotor,
      marcas: promotor.promotores_marcas
        ?.map((pm: any) => pm.marcas)
        .filter(Boolean) || []
    }))

    return promotoresFormatados || []
  } catch (error) {
    console.error('Erro ao buscar promotores:', error)
    return []
  }
}

export async function getPromotorById(id: string) {
  try {
    const { data, error } = await supabase
      .from('promotores')
      .select(`
        *,
        lojas (id, cod_loja, nome_loja),
        gerentes (id, nome_gerente, telefone),
        promotores_marcas (
          marcas (id, nome_marca)
        )
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error

    // Transformar os dados para incluir marcas como array
    const promotorFormatado = {
      ...data,
      marcas: data.promotores_marcas
        ?.map((pm: any) => pm.marcas)
        .filter(Boolean) || []
    }

    return promotorFormatado
  } catch (error) {
    console.error('Erro ao buscar promotor:', error)
    return null
  }
}

export async function getMarcasDisponiveis(): Promise<Marca[]> {
  try {
    const { data, error } = await supabase
      .from('marcas')
      .select('id, nome_marca')
      .order('nome_marca')
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Erro ao buscar marcas:', error)
    return []
  }
}

export async function createPromotor(data: {
  promotor_nome: string
  loja_id?: string
  gerente_id?: string
  dias_semana?: string
  contato_responsavel?: string
  status?: string
  marca_ids?: string[]
}) {
  try {
    const { marca_ids, ...promotorData } = data

    // 1. Criar o promotor
    const { data: promotor, error } = await supabase
      .from('promotores')
      .insert({
        promotor_nome: promotorData.promotor_nome,
        loja_id: promotorData.loja_id || null,
        gerente_id: promotorData.gerente_id || null,
        dias_semana: promotorData.dias_semana || null,
        contato_responsavel: promotorData.contato_responsavel || null,
        status: promotorData.status || 'ativo'
      })
      .select()
      .single()
    
    if (error) throw error

    // 2. Vincular as marcas
    if (marca_ids && marca_ids.length > 0 && promotor) {
      const links = marca_ids.map((marca_id: string) => ({
        promotor_id: promotor.id,
        marca_id: marca_id
      }))
      
      const { error: linkError } = await supabase
        .from('promotores_marcas')
        .insert(links)
      
      if (linkError) throw linkError
    }

    // 3. Retornar o promotor com as marcas
    return await getPromotorById(promotor.id)
  } catch (error) {
    console.error('Erro ao criar promotor:', error)
    return null
  }
}

export async function updatePromotor(id: string, data: {
  promotor_nome?: string
  loja_id?: string
  gerente_id?: string
  dias_semana?: string
  contato_responsavel?: string
  status?: string
  marca_ids?: string[]
}) {
  try {
    const { marca_ids, ...promotorData } = data

    // 1. Atualizar dados do promotor
    const { error: updateError } = await supabase
      .from('promotores')
      .update({
        promotor_nome: promotorData.promotor_nome,
        loja_id: promotorData.loja_id || null,
        gerente_id: promotorData.gerente_id || null,
        dias_semana: promotorData.dias_semana || null,
        contato_responsavel: promotorData.contato_responsavel || null,
        status: promotorData.status || 'ativo'
      })
      .eq('id', id)
    
    if (updateError) throw updateError

    // 2. Atualizar marcas (se foi enviado)
    if (marca_ids !== undefined) {
      // Remover vínculos antigos
      const { error: deleteError } = await supabase
        .from('promotores_marcas')
        .delete()
        .eq('promotor_id', id)
      
      if (deleteError) throw deleteError

      // Adicionar novos vínculos
      if (marca_ids.length > 0) {
        const links = marca_ids.map((marca_id: string) => ({
          promotor_id: id,
          marca_id: marca_id
        }))
        
        const { error: insertError } = await supabase
          .from('promotores_marcas')
          .insert(links)
        
        if (insertError) throw insertError
      }
    }

    // 3. Retornar o promotor atualizado
    return await getPromotorById(id)
  } catch (error) {
    console.error('Erro ao atualizar promotor:', error)
    return null
  }
}

export async function deletePromotor(id: string) {
  try {
    // Os vínculos em promotores_marcas serão deletados automaticamente
    // se houver CASCADE configurado, ou podemos deletar manualmente
    const { error: deleteLinksError } = await supabase
      .from('promotores_marcas')
      .delete()
      .eq('promotor_id', id)
    
    if (deleteLinksError) {
      console.warn('Erro ao deletar vínculos:', deleteLinksError)
      // Continua mesmo se não conseguir deletar os vínculos
    }

    const { error } = await supabase
      .from('promotores')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('Erro ao deletar promotor:', error)
    return false
  }
}
