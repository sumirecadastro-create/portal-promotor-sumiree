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
  nome_marca: string
  categoria_id?: string | null
  status?: string | null
}

export interface Marca {
  id: string
  nome_marca: string
  categoria_id: string | null
  status: string | null
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
    // Primeiro, buscar todos os promotores com lojas e gerentes
    const { data: promotores, error } = await supabase
      .from('promotores')
      .select(`
        *,
        lojas (
          id,
          nome_loja,
          cod_loja
        ),
        gerentes (
          id,
          nome_gerente,
          telefone,
          cod_loja
        )
      `)
      .order('promotor_nome')

    if (error) {
      console.error('Erro ao buscar promotores:', error)
      throw error
    }

    if (!promotores || promotores.length === 0) {
      return []
    }

    // Buscar todas as marcas relacionadas para todos os promotores de uma vez
    const promotorIds = promotores.map(p => p.id)
    
    const { data: relacoesMarcas, error: relacoesError } = await supabase
      .from('promotores_marcas')
      .select(`
        promotor_id,
        marca_id,
        marcas (
          id,
          nome_marca,
          categoria_id,
          status
        )
      `)
      .in('promotor_id', promotorIds)

    if (relacoesError) {
      console.error('Erro ao buscar relações com marcas:', relacoesError)
      // Se der erro nas marcas, retorna os promotores sem marcas
      return promotores.map(promotor => ({
        ...promotor,
        marcas: []
      }))
    }

    // Organizar as marcas por promotor
    const marcasPorPromotor: Record<string, MarcaRelacionada[]> = {}
    
    relacoesMarcas?.forEach(relacao => {
      if (relacao.marcas) {
        if (!marcasPorPromotor[relacao.promotor_id]) {
          marcasPorPromotor[relacao.promotor_id] = []
        }
        marcasPorPromotor[relacao.promotor_id].push(relacao.marcas as MarcaRelacionada)
      }
    })

    // Combinar os dados
    const promotoresComMarcas = promotores.map(promotor => ({
      ...promotor,
      marcas: marcasPorPromotor[promotor.id] || []
    }))

    return promotoresComMarcas
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
      .select(`
        *,
        lojas (
          id,
          nome_loja,
          cod_loja
        ),
        gerentes (
          id,
          nome_gerente,
          telefone,
          cod_loja
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Erro ao buscar promotor por ID:', error)
      throw error
    }

    if (!promotor) return null

    // Buscar as marcas do promotor
    const { data: marcasRelacionadas, error: marcasError } = await supabase
      .from('promotores_marcas')
      .select(`
        marca_id,
        marcas (
          id,
          nome_marca,
          categoria_id,
          status
        )
      `)
      .eq('promotor_id', id)

    if (marcasError) {
      console.error('Erro ao buscar marcas do promotor:', marcasError)
      return { ...promotor, marcas: [] }
    }

    const marcas = marcasRelacionadas
      ?.map(rel => rel.marcas)
      .filter(Boolean) as MarcaRelacionada[] || []

    return { ...promotor, marcas }
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
      .select('*')
      .eq('status', 'ativo')
      .order('nome_marca')

    if (error) {
      console.error('Erro ao buscar marcas disponíveis:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Erro inesperado em getMarcasDisponiveis:', error)
    throw error
  }
}

// Criar um novo promotor
export async function createPromotor(data: CreatePromotorData): Promise<Promotor | null> {
  try {
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
      const relacoes = data.marca_ids.map(marca_id => ({
        promotor_id: novoPromotor.id,
        marca_id: marca_id
      }))

      const { error: relacoesError } = await supabase
        .from('promotores_marcas')
        .insert(relacoes)

      if (relacoesError) {
        console.error('Erro ao vincular marcas:', relacoesError)
        // Não vamos deletar o promotor, apenas logar o erro
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

// Buscar promotores por loja
export async function getPromotoresByLoja(lojaId: string): Promise<Promotor[]> {
  try {
    const { data, error } = await supabase
      .from('promotores')
      .select(`
        *,
        lojas (
          id,
          nome_loja,
          cod_loja
        ),
        gerentes (
          id,
          nome_gerente,
          telefone,
          cod_loja
        )
      `)
      .eq('loja_id', lojaId)
      .order('promotor_nome')

    if (error) {
      console.error('Erro ao buscar promotores por loja:', error)
      throw error
    }

    if (!data || data.length === 0) return []

    // Buscar as marcas para estes promotores
    const promotorIds = data.map(p => p.id)
    const { data: relacoesMarcas, error: relacoesError } = await supabase
      .from('promotores_marcas')
      .select(`
        promotor_id,
        marca_id,
        marcas (
          id,
          nome_marca,
          categoria_id,
          status
        )
      `)
      .in('promotor_id', promotorIds)

    if (relacoesError) {
      console.error('Erro ao buscar marcas:', relacoesError)
      return data.map(p => ({ ...p, marcas: [] }))
    }

    const marcasPorPromotor: Record<string, MarcaRelacionada[]> = {}
    relacoesMarcas?.forEach(rel => {
      if (rel.marcas) {
        if (!marcasPorPromotor[rel.promotor_id]) {
          marcasPorPromotor[rel.promotor_id] = []
        }
        marcasPorPromotor[rel.promotor_id].push(rel.marcas as MarcaRelacionada)
      }
    })

    return data.map(p => ({
      ...p,
      marcas: marcasPorPromotor[p.id] || []
    }))
  } catch (error) {
    console.error('Erro inesperado em getPromotoresByLoja:', error)
    throw error
  }
}
