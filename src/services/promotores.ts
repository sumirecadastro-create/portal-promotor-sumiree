import { supabase } from '@/lib/supabase'

export interface PromotorCarta {
  id: string
  promotor_id: string
  arquivo: string
  nome_original: string
  data_envio: string
  data_validade: string | null
  status: 'pendente' | 'valido' | 'vencido'
  created_at: string
  updated_at: string
}

export interface Promotor {
  id: string
  promotor_nome: string
  loja_ids?: string[]  // ← mudou para array
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
  }[]
  gerentes?: {
    id: string
    nome_gerente: string
    telefone: string | null
    cod_loja: string | null
  } | null
  marcas?: MarcaRelacionada[]
  carta?: PromotorCarta | null
}

export interface MarcaRelacionada {
  id: string
  nome: string
  created_at?: string
}

export interface Marca {
  id: string
  nome: string
  created_at?: string
}

export interface CreatePromotorData {
  promotor_nome: string
  loja_ids?: string[]  // ← mudou para array
  gerente_id?: string
  marca_ids?: string[]
  dias_semana?: string
  contato_responsavel?: string
  status?: string
}

export interface UpdatePromotorData {
  promotor_nome?: string
  loja_ids?: string[]  // ← mudou para array
  gerente_id?: string
  marca_ids?: string[]
  dias_semana?: string
  contato_responsavel?: string
  status?: string
}

// Buscar todos os promotores com suas marcas, lojas, gerentes e cartas
export async function getPromotores(): Promise<Promotor[]> {
  try {
    console.log('🚀 Buscando promotores...')
    
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

    // Buscar relações promotores_lojas
    const { data: lojasRel, error: lojasRelError } = await supabase
      .from('promotores_lojas')
      .select('promotor_id, loja_id')

    if (lojasRelError) {
      console.error('Erro ao buscar relações lojas:', lojasRelError)
    }

    // Buscar relações promotores_marcas
    const { data: marcasRel, error: marcasRelError } = await supabase
      .from('promotores_marcas')
      .select('*')

    if (marcasRelError) {
      console.error('Erro ao buscar relações marcas:', marcasRelError)
    }

    // Buscar todas as marcas
    const { data: marcas, error: marcasError } = await supabase
      .from('marcas')
      .select('id, nome')

    if (marcasError) {
      console.error('Erro ao buscar marcas:', marcasError)
    }

    const marcasMap = new Map()
    marcas?.forEach(marca => {
      marcasMap.set(marca.id, marca)
    })

    // Agrupar marcas por promotor
    const marcasPorPromotor: Record<string, MarcaRelacionada[]> = {}
    marcasRel?.forEach(rel => {
      if (!marcasPorPromotor[rel.promotor_id]) {
        marcasPorPromotor[rel.promotor_id] = []
      }
      const marca = marcasMap.get(rel.marca_id)
      if (marca) {
        marcasPorPromotor[rel.promotor_id].push(marca)
      }
    })

    // Agrupar lojas por promotor
    const lojasIdsPorPromotor: Record<string, string[]> = {}
    lojasRel?.forEach(rel => {
      if (!lojasIdsPorPromotor[rel.promotor_id]) {
        lojasIdsPorPromotor[rel.promotor_id] = []
      }
      lojasIdsPorPromotor[rel.promotor_id].push(rel.loja_id)
    })

    // Buscar todas as lojas
    const todosLojasIds = [...new Set(Object.values(lojasIdsPorPromotor).flat())]
    let lojasData: any[] = []
    if (todosLojasIds.length > 0) {
      const { data: lojas } = await supabase
        .from('lojas')
        .select('id, nome_loja, cod_loja')
        .in('id', todosLojasIds)
      lojasData = lojas || []
    }
    const lojasMap = new Map(lojasData.map(l => [l.id, l]))

    // Organizar lojas por promotor
    const lojasPorPromotor: Record<string, any[]> = {}
    Object.entries(lojasIdsPorPromotor).forEach(([promotorId, lojaIds]) => {
      lojasPorPromotor[promotorId] = lojaIds.map(id => lojasMap.get(id)).filter(Boolean)
    })

    // Buscar cartas
    const { data: cartas, error: cartasError } = await supabase
      .from('promotores_cartas')
      .select('*')
      .eq('status', 'valido')
      .order('created_at', { ascending: false })

    if (cartasError) {
      console.error('Erro ao buscar cartas:', cartasError)
    }

    const cartasPorPromotor: Record<string, PromotorCarta> = {}
    if (cartas && !cartasError) {
      cartas.forEach(carta => {
        if (!cartasPorPromotor[carta.promotor_id]) {
          cartasPorPromotor[carta.promotor_id] = carta
        }
      })
    }

    // Buscar gerentes para cada promotor
    const promotoresComDados = await Promise.all(
      promotores.map(async (promotor) => {
        let gerente = null

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
          loja_ids: lojasIdsPorPromotor[promotor.id] || [],
          lojas: lojasPorPromotor[promotor.id] || [],
          gerentes: gerente,
          marcas: marcasPorPromotor[promotor.id] || [],
          carta: cartasPorPromotor[promotor.id] || null
        }
      })
    )

    console.log(`✅ ${promotoresComDados.length} promotores carregados`)
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

    if (error) throw error
    if (!promotor) return null

    // Buscar lojas do promotor
    const { data: lojasRel } = await supabase
      .from('promotores_lojas')
      .select('loja_id')
      .eq('promotor_id', id)

    const lojaIds = lojasRel?.map(r => r.loja_id) || []
    
    let lojasData: any[] = []
    if (lojaIds.length > 0) {
      const { data: lojas } = await supabase
        .from('lojas')
        .select('id, nome_loja, cod_loja')
        .in('id', lojaIds)
      lojasData = lojas || []
    }

    // Buscar marcas
    const { data: marcasRel } = await supabase
      .from('promotores_marcas')
      .select('marca_id')
      .eq('promotor_id', id)

    let marcas: MarcaRelacionada[] = []
    if (marcasRel && marcasRel.length > 0) {
      const marcaIds = marcasRel.map(r => r.marca_id)
      const { data: marcasData } = await supabase
        .from('marcas')
        .select('id, nome')
        .in('id', marcaIds)
      marcas = marcasData || []
    }

    // Buscar carta
    const { data: carta } = await supabase
      .from('promotores_cartas')
      .select('*')
      .eq('promotor_id', id)
      .eq('status', 'valido')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Buscar gerente
    let gerente = null
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
      loja_ids: lojaIds,
      lojas: lojasData,
      gerentes: gerente,
      marcas,
      carta: carta || null
    }
  } catch (error) {
    console.error('Erro inesperado em getPromotorById:', error)
    throw error
  }
}

// Buscar todas as marcas disponíveis
export async function getMarcasDisponiveis(): Promise<Marca[]> {
  try {
    const { data, error } = await supabase
      .from('marcas')
      .select('id, nome')
      .order('nome')

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Erro em getMarcasDisponiveis:', error)
    throw error
  }
}

// Criar um novo promotor
export async function createPromotor(data: CreatePromotorData): Promise<Promotor | null> {
  try {
    console.log('📝 Criando promotor:', data.promotor_nome)
    
    const { data: novoPromotor, error: promotorError } = await supabase
      .from('promotores')
      .insert({
        promotor_nome: data.promotor_nome,
        gerente_id: data.gerente_id || null,
        dias_semana: data.dias_semana || null,
        contato_responsavel: data.contato_responsavel || null,
        status: data.status || 'ativo'
      })
      .select()
      .single()

    if (promotorError) throw promotorError

    // Inserir relações com lojas
    if (data.loja_ids && data.loja_ids.length > 0 && novoPromotor) {
      const relacoesLojas = data.loja_ids.map(loja_id => ({
        promotor_id: novoPromotor.id,
        loja_id: loja_id
      }))

      const { error: lojasError } = await supabase
        .from('promotores_lojas')
        .insert(relacoesLojas)

      if (lojasError) {
        console.error('Erro ao vincular lojas:', lojasError)
      }
    }

    // Inserir relações com marcas
    if (data.marca_ids && data.marca_ids.length > 0 && novoPromotor) {
      const relacoesMarcas = data.marca_ids.map(marca_id => ({
        promotor_id: novoPromotor.id,
        marca_id: marca_id
      }))

      const { error: marcasError } = await supabase
        .from('promotores_marcas')
        .insert(relacoesMarcas)

      if (marcasError) {
        console.error('Erro ao vincular marcas:', marcasError)
      }
    }

    return await getPromotorById(novoPromotor.id)
  } catch (error) {
    console.error('Erro em createPromotor:', error)
    throw error
  }
}

// Atualizar um promotor existente
export async function updatePromotor(id: string, data: UpdatePromotorData): Promise<Promotor | null> {
  try {
    console.log('✏️ Atualizando promotor:', id)
    
    const updateData: any = {}
    if (data.promotor_nome !== undefined) updateData.promotor_nome = data.promotor_nome
    if (data.gerente_id !== undefined) updateData.gerente_id = data.gerente_id || null
    if (data.dias_semana !== undefined) updateData.dias_semana = data.dias_semana || null
    if (data.contato_responsavel !== undefined) updateData.contato_responsavel = data.contato_responsavel || null
    if (data.status !== undefined) updateData.status = data.status
    updateData.updated_at = new Date().toISOString()

    const { error: promotorError } = await supabase
      .from('promotores')
      .update(updateData)
      .eq('id', id)

    if (promotorError) throw promotorError

    // Atualizar lojas
    if (data.loja_ids !== undefined) {
      await supabase.from('promotores_lojas').delete().eq('promotor_id', id)
      
      if (data.loja_ids.length > 0) {
        const relacoesLojas = data.loja_ids.map(loja_id => ({
          promotor_id: id,
          loja_id: loja_id
        }))
        await supabase.from('promotores_lojas').insert(relacoesLojas)
      }
    }

    // Atualizar marcas
    if (data.marca_ids !== undefined) {
      await supabase.from('promotores_marcas').delete().eq('promotor_id', id)
      
      if (data.marca_ids.length > 0) {
        const relacoesMarcas = data.marca_ids.map(marca_id => ({
          promotor_id: id,
          marca_id: marca_id
        }))
        await supabase.from('promotores_marcas').insert(relacoesMarcas)
      }
    }

    return await getPromotorById(id)
  } catch (error) {
    console.error('Erro em updatePromotor:', error)
    throw error
  }
}

// Deletar um promotor
export async function deletePromotor(id: string): Promise<boolean> {
  try {
    console.log('🗑️ Deletando promotor:', id)
    
    // Buscar cartas para deletar arquivos
    const { data: cartas } = await supabase
      .from('promotores_cartas')
      .select('id, arquivo')
      .eq('promotor_id', id)

    if (cartas && cartas.length > 0) {
      for (const carta of cartas) {
        try {
          const filePath = carta.arquivo.split('/documentos/')[1]
          if (filePath) {
            await supabase.storage.from('documentos').remove([filePath])
          }
        } catch (storageError) {
          console.error('Erro ao deletar arquivo:', storageError)
        }
      }
    }

    // Deletar registros relacionados
    await supabase.from('promotores_cartas').delete().eq('promotor_id', id)
    await supabase.from('promotores_lojas').delete().eq('promotor_id', id)
    await supabase.from('promotores_marcas').delete().eq('promotor_id', id)

    // Deletar promotor
    const { error: promotorError } = await supabase
      .from('promotores')
      .delete()
      .eq('id', id)

    if (promotorError) throw promotorError

    console.log('✅ Promotor deletado com sucesso')
    return true
  } catch (error) {
    console.error('Erro em deletePromotor:', error)
    throw error
  }
}
