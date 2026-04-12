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
  lojas?: { id: string; cod_loja: string; nome_loja: string } | null
  gerentes?: { id: string; nome_gerente: string; telefone?: string } | null
  marcas?: { id: string; nome_marca: string }[]
}

export interface Marca {
  id: string
  nome_marca: string
  created_at?: string
}

export async function getPromotores(): Promise<Promotor[]> {
  try {
    console.log('🔍 Buscando promotores no Supabase...')
    
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
    
    if (error) {
      console.error('❌ Erro na query do Supabase:', error)
      throw error
    }

    console.log('📦 Dados brutos do Supabase:', data)
    console.log('📊 Quantidade de registros:', data?.length || 0)

    if (!data || data.length === 0) {
      console.log('⚠️ Nenhum promotor encontrado')
      return []
    }

    // Transformar os dados com segurança
    const promotoresFormatados: Promotor[] = data.map(promotor => {
      // Processar marcas com segurança
      let marcas: { id: string; nome_marca: string }[] = []
      
      if (promotor.promotores_marcas && Array.isArray(promotor.promotores_marcas)) {
        marcas = promotor.promotores_marcas
          .filter((pm: any) => pm && pm.marcas)
          .map((pm: any) => ({
            id: pm.marcas.id,
            nome_marca: pm.marcas.nome_marca
          }))
      }

      return {
        id: promotor.id,
        promotor_nome: promotor.promotor_nome || '',
        loja_id: promotor.loja_id || undefined,
        gerente_id: promotor.gerente_id || undefined,
        dias_semana: promotor.dias_semana || undefined,
        contato_responsavel: promotor.contato_responsavel || undefined,
        status: promotor.status || 'ativo',
        created_at: promotor.created_at,
        lojas: promotor.lojas || null,
        gerentes: promotor.gerentes || null,
        marcas: marcas
      }
    })

    console.log('✅ Promotores formatados:', promotoresFormatados.length)
    return promotoresFormatados
    
  } catch (error) {
    console.error('❌ Erro ao buscar promotores:', error)
    return []
  }
}

export async function getPromotorById(id: string): Promise<Promotor | null> {
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
    
    if (error) {
      console.error('Erro ao buscar promotor por ID:', error)
      return null
    }

    if (!data) return null

    // Processar marcas com segurança
    let marcas: { id: string; nome_marca: string }[] = []
    
    if (data.promotores_marcas && Array.isArray(data.promotores_marcas)) {
      marcas = data.promotores_marcas
        .filter((pm: any) => pm && pm.marcas)
        .map((pm: any) => ({
          id: pm.marcas.id,
          nome_marca: pm.marcas.nome_marca
        }))
    }

    return {
      id: data.id,
      promotor_nome: data.promotor_nome || '',
      loja_id: data.loja_id || undefined,
      gerente_id: data.gerente_id || undefined,
      dias_semana: data.dias_semana || undefined,
      contato_responsavel: data.contato_responsavel || undefined,
      status: data.status || 'ativo',
      created_at: data.created_at,
      lojas: data.lojas || null,
      gerentes: data.gerentes || null,
      marcas: marcas
    }
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
    
    if (error) {
      console.error('Erro ao buscar marcas:', error)
      return []
    }
    
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
}): Promise<Promotor | null> {
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
    
    if (error) {
      console.error('Erro ao criar promotor:', error)
      return null
    }

    // 2. Vincular as marcas
    if (marca_ids && marca_ids.length > 0 && promotor) {
      const links = marca_ids.map((marca_id: string) => ({
        promotor_id: promotor.id,
        marca_id: marca_id
      }))
      
      const { error: linkError } = await supabase
        .from('promotores_marcas')
        .insert(links)
      
      if (linkError) {
        console.error('Erro ao vincular marcas:', linkError)
        // Não retorna erro, apenas log
      }
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
}): Promise<Promotor | null> {
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
    
    if (updateError) {
      console.error('Erro ao atualizar promotor:', updateError)
      return null
    }

    // 2. Atualizar marcas (se foi enviado)
    if (marca_ids !== undefined) {
      // Remover vínculos antigos
      const { error: deleteError } = await supabase
        .from('promotores_marcas')
        .delete()
        .eq('promotor_id', id)
      
      if (deleteError) {
        console.error('Erro ao remover vínculos antigos:', deleteError)
      }

      // Adicionar novos vínculos
      if (marca_ids.length > 0) {
        const links = marca_ids.map((marca_id: string) => ({
          promotor_id: id,
          marca_id: marca_id
        }))
        
        const { error: insertError } = await supabase
          .from('promotores_marcas')
          .insert(links)
        
        if (insertError) {
          console.error('Erro ao inserir novos vínculos:', insertError)
        }
      }
    }

    // 3. Retornar o promotor atualizado
    return await getPromotorById(id)
  } catch (error) {
    console.error('Erro ao atualizar promotor:', error)
    return null
  }
}

export async function deletePromotor(id: string): Promise<boolean> {
  try {
    // Deletar vínculos primeiro
    const { error: deleteLinksError } = await supabase
      .from('promotores_marcas')
      .delete()
      .eq('promotor_id', id)
    
    if (deleteLinksError) {
      console.warn('Erro ao deletar vínculos:', deleteLinksError)
    }

    const { error } = await supabase
      .from('promotores')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Erro ao deletar promotor:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Erro ao deletar promotor:', error)
    return false
  }
}
