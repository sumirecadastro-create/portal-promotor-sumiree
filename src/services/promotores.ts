import { supabase } from '@/lib/supabase'

export interface Promotor {
  id: string
  promotor_nome: string
  loja_id: string | null
  gerente_id: string | null
  dias_semana: string | null
  contato_responsavel: string | null
  status: string | null
  created_at?: string
  updated_at?: string
  lojas?: {
    id: string
    nome_loja: string
    cod_loja: string
  } | null
  gerentes?: {
    id: string
    nome_gerente: string
    telefone: string | null
    cod_loja: string | null
  } | null
  marcas?: MarcaRelacionada[]
}

export interface MarcaRelacionada {
  id: string
  nome: string  // ← mudou de nome_marca para nome
  created_at?: string
}

export interface Marca {
  id: string
  nome: string  // ← mudou de nome_marca para nome
  created_at?: string
}

export interface CreatePromotorData {
  promotor_nome: string
  loja_id?: string
  gerente_id?: string
  marca_ids?: string[]
  dias_semana?: string
  contato_responsavel?: string
  status?: string
}

export interface UpdatePromotorData {
  promotor_nome?: string
  loja_id?: string
  gerente_id?: string
  marca_ids?: string[]
  dias_semana?: string
  contato_responsavel?: string
  status?: string
}

// Buscar todos os promotores com suas marcas, lojas e gerentes
export async function getPromotores(): Promise<Promotor[]> {
  try {
    console.log('🚀 Buscando promotores...')
    
    // Buscar todos os promotores
    const { data: promotores, error } = await supabase
      .from('promotores')
      .select('*')
      .order('promotor_nome')

    if (error) {
      console.error('Erro ao buscar promotores:', error)
      throw error
    }

    if (!promotores || promotores.length === 0) {
      console.log('Nenhum promotor encontrado')
      return []
    }

    console.log(`📊 Encontrados ${promotores.length} promotores`)

    // Buscar todas as relações promotores_marcas de uma vez
    const { data: relacoes, error: relacoesError } = await supabase
      .from('promotores_marcas')
      .select('*')

    if (relacoesError) {
      console.error('Erro ao buscar relações:', relacoesError)
      return promotores.map(p => ({ ...p, marcas: [] }))
    }

    // Buscar todas as marcas
    const { data: marcas, error: marcasError } = await supabase
      .from('marcas')
      .select('id, nome')

    if (marcasError) {
      console.error('Erro ao buscar marcas:', marcasError)
      return promotores.map(p => ({ ...p, marcas: [] }))
    }

    // Criar um mapa de marcas por ID
    const marcasMap = new Map()
    marcas?.forEach(marca => {
      marcasMap.set(marca.id, marca)
    })

    // Agrupar marcas por promotor
    const marcasPorPromotor: Record<string, MarcaRelacionada[]> = {}
    relacoes?.forEach(relacao => {
      if (!marcasPorPromotor[relacao.promotor_id]) {
        marcasPorPromotor[relacao.promotor_id] = []
      }
      const marca = marcasMap.get(relacao.marca_id)
      if (marca) {
        marcasPorPromotor[relacao.promotor_id].push(marca)
      }
    })

    // Buscar lojas e gerentes para cada promotor
    const promotoresComDados = await Promise.all(
      promotores.map(async (promotor) => {
        let loja = null
        let gerente = null

        if (promotor.loja_id) {
          const { data: lojaData } = await supabase
            .from('lojas')
            .select('id, nome_loja, cod_loja')
            .eq('id', promotor.loja_id)
            .single()
          loja = lojaData
        }

        if (promotor.gerente_id) {
          const { data: gerenteData } = await supabase
            .from('gerentes')
            .select('id, nome_gerente, telefone, cod_loja')
            .eq('id', promotor.gerente_id)
            .single()
          gerente = gerenteData
        }

        return {
          ...promotor,
          lojas: loja,
          gerentes: gerente,
          marcas: marcasPorPromotor[promotor.id] || []
        }
      })
    )

    console.log(`✅ ${promotoresComDados.filter(p => p.marcas && p.marcas.length > 0).length} promotores com marcas`)
    
    return promotoresComDados
  } catch (error) {
    console.error('Erro inesperado em getPromotores:', error)
    throw error
  }
}

// Buscar um promotor específico por ID
export async function getPromotorById(id: string): Promise<Promotor | null> {
  try {
    const { data: promotor, error } = await supabase
      .from('promotores')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Erro ao buscar promotor por ID:', error)
      throw error
    }

    if (!promotor) return null

    // Buscar as marcas do promotor
    const { data: relacoes, error: relacoesError } = await supabase
      .from('promotores_marcas')
      .select('marca_id')
      .eq('promotor_id', id)

    if (relacoesError) {
      console.error('Erro ao buscar marcas do promotor:', relacoesError)
      return { ...promotor, marcas: [] }
    }

    let marcas: MarcaRelacionada[] = []
    if (relacoes && relacoes.length > 0) {
      const marcaIds = relacoes.map(r => r.marca_id)
      const { data: marcasData, error: marcasError } = await supabase
        .from('marcas')
        .select('id, nome')
        .in('id', marcaIds)

      if (!marcasError && marcasData) {
        marcas = marcasData
      }
    }

    // Buscar loja e gerente
    let loja = null
    let gerente = null

    if (promotor.loja_id) {
      const { data: lojaData } = await supabase
        .from('lojas')
        .select('id, nome_loja, cod_loja')
        .eq('id', promotor.loja_id)
        .single()
      loja = lojaData
    }

    if (promotor.gerente_id) {
      const { data: gerenteData } = await supabase
        .from('gerentes')
        .select('id, nome_gerente, telefone, cod_loja')
        .eq('id', promotor.gerente_id)
        .single()
      gerente = gerenteData
    }

    return {
      ...promotor,
      lojas: loja,
      gerentes: gerente,
      marcas
    }
  } catch (error) {
    console.error('Erro inesperado em getPromotorById:', error)
    throw error
  }
}

// Buscar todas as marcas disponíveis para cadastro
export async function getMarcasDisponiveis(): Promise<Marca[]> {
  try {
    const { data, error } = await supabase
      .from('marcas')
      .select('id, nome')
      .order('nome')

    if (error) {
      console.error('Erro ao buscar marcas disponíveis:', error)
      throw error
    }

    console.log(`📦 ${data?.length || 0} marcas disponíveis`)
    return data || []
  } catch (error) {
    console.error('Erro inesperado em getMarcasDisponiveis:', error)
    throw error
  }
}

// Criar um novo promotor
export async function createPromotor(data: CreatePromotorData): Promise<Promotor | null> {
  try {
    console.log('📝 Criando promotor:', data.promotor_nome)
    
    // Inserir o promotor
    const { data: novoPromotor, error: promotorError } = await supabase
      .from('promotores')
      .insert({
        promotor_nome: data.promotor_nome,
        loja_id: data.loja_id || null,
        gerente_id: data.gerente_id || null,
        dias_semana: data.dias_semana || null,
        contato_responsavel: data.contato_responsavel || null,
        status: data.status || 'ativo'
      })
      .select()
      .single()

    if (promotorError) {
      console.error('Erro ao criar promotor:', promotorError)
      throw promotorError
    }

    // Se houver marcas, inserir as relações
    if (data.marca_ids && data.marca_ids.length > 0 && novoPromotor) {
      console.log(`🔗 Vinculando ${data.marca_ids.length} marcas`)
      
      const relacoes = data.marca_ids.map(marca_id => ({
        promotor_id: novoPromotor.id,
        marca_id: marca_id
      }))

      const { error: relacoesError } = await supabase
        .from('promotores_marcas')
        .insert(relacoes)

      if (relacoesError) {
        console.error('Erro ao vincular marcas:', relacoesError)
      }
    }

    // Buscar o promotor criado com suas marcas
    if (novoPromotor) {
      return await getPromotorById(novoPromotor.id)
    }

    return null
  } catch (error) {
    console.error('Erro inesperado em createPromotor:', error)
    throw error
  }
}

// Atualizar um promotor existente
export async function updatePromotor(id: string, data: UpdatePromotorData): Promise<Promotor | null> {
  try {
    console.log('✏️ Atualizando promotor:', id)
    
    // Preparar os dados para atualização
    const updateData: any = {}
    if (data.promotor_nome !== undefined) updateData.promotor_nome = data.promotor_nome
    if (data.loja_id !== undefined) updateData.loja_id = data.loja_id || null
    if (data.gerente_id !== undefined) updateData.gerente_id = data.gerente_id || null
    if (data.dias_semana !== undefined) updateData.dias_semana = data.dias_semana || null
    if (data.contato_responsavel !== undefined) updateData.contato_responsavel = data.contato_responsavel || null
    if (data.status !== undefined) updateData.status = data.status
    updateData.updated_at = new Date().toISOString()

    // Atualizar o promotor
    const { error: promotorError } = await supabase
      .from('promotores')
      .update(updateData)
      .eq('id', id)

    if (promotorError) {
      console.error('Erro ao atualizar promotor:', promotorError)
      throw promotorError
    }

    // Atualizar as marcas (se fornecidas)
    if (data.marca_ids !== undefined) {
      console.log(`🔗 Atualizando marcas: ${data.marca_ids.length}`)
      
      // Deletar todas as relações atuais
      const { error: deleteError } = await supabase
        .from('promotores_marcas')
        .delete()
        .eq('promotor_id', id)

      if (deleteError) {
        console.error('Erro ao deletar relações antigas:', deleteError)
        throw deleteError
      }

      // Inserir as novas relações
      if (data.marca_ids.length > 0) {
        const relacoes = data.marca_ids.map(marca_id => ({
          promotor_id: id,
          marca_id: marca_id
        }))

        const { error: insertError } = await supabase
          .from('promotores_marcas')
          .insert(relacoes)

        if (insertError) {
          console.error('Erro ao inserir novas relações:', insertError)
          throw insertError
        }
      }
    }

    // Buscar o promotor atualizado com suas marcas
    return await getPromotorById(id)
  } catch (error) {
    console.error('Erro inesperado em updatePromotor:', error)
    throw error
  }
}

// Deletar um promotor
export async function deletePromotor(id: string): Promise<boolean> {
  try {
    console.log('🗑️ Deletando promotor:', id)
    
    // Primeiro, deletar as relações com marcas
    const { error: relacoesError } = await supabase
      .from('promotores_marcas')
      .delete()
      .eq('promotor_id', id)

    if (relacoesError) {
      console.error('Erro ao deletar relações do promotor:', relacoesError)
      throw relacoesError
    }

    // Depois, deletar o promotor
    const { error: promotorError } = await supabase
      .from('promotores')
      .delete()
      .eq('id', id)

    if (promotorError) {
      console.error('Erro ao deletar promotor:', promotorError)
      throw promotorError
    }

    return true
  } catch (error) {
    console.error('Erro inesperado em deletePromotor:', error)
    throw error
  }
}
