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
  loja_ids: string[]
  gerente_ids: string[] | null  // 🔥 MUDOU: agora é array
  dias_semana: string | null
  contato_responsavel: string | null
  status: string | null
  created_at?: string
  updated_at?: string
  lojas?: {
    id: string
    nome_loja: string
    cod_loja: string
    numero_loja?: string  // Adicionado campo numero_loja
  }[]
  gerentes?: {  // 🔥 MUDOU: agora é array
    id: string
    nome_gerente: string
    telefone: string | null
    cod_loja: string | null
  }[]
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
  loja_ids?: string[]
  gerente_ids?: string[]  // 🔥 MUDOU: agora é array
  marca_ids?: string[]
  dias_semana?: string
  contato_responsavel?: string
  status?: string
}

export interface UpdatePromotorData {
  promotor_nome?: string
  loja_ids?: string[]
  gerente_ids?: string[]  // 🔥 MUDOU: agora é array
  marca_ids?: string[]
  dias_semana?: string
  contato_responsavel?: string
  status?: string
}

// Buscar todos os promotores com suas lojas, marcas, gerentes e cartas
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
      .select('promotor_id, marca_id')

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

    // Criar mapa de marcas por ID
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

    // Agrupar IDs de lojas por promotor
    const lojasIdsPorPromotor: Record<string, string[]> = {}
    lojasRel?.forEach(rel => {
      if (!lojasIdsPorPromotor[rel.promotor_id]) {
        lojasIdsPorPromotor[rel.promotor_id] = []
      }
      lojasIdsPorPromotor[rel.promotor_id].push(rel.loja_id)
    })

    // Buscar dados completos de todas as lojas relacionadas
    const todosLojasIds = [...new Set(Object.values(lojasIdsPorPromotor).flat())]
    let lojasData: any[] = []
    if (todosLojasIds.length > 0) {
      // CORREÇÃO: Buscar também o campo numero_loja
      const { data: lojas } = await supabase
        .from('lojas')
        .select('id, nome_loja, cod_loja, numero_loja')
        .in('id', todosLojasIds)
      
      // CORREÇÃO: Garantir que nome_loja tenha um valor significativo
      lojasData = (lojas || []).map(loja => ({
        ...loja,
        // Se nome_loja estiver vazio ou for igual ao código, usar numero_loja
        nome_loja: (!loja.nome_loja || loja.nome_loja === loja.cod_loja) && loja.numero_loja 
          ? loja.numero_loja 
          : loja.nome_loja
      }))
    }
    const lojasMap = new Map(lojasData.map(l => [l.id, l]))

    // Organizar lojas completas por promotor
    const lojasPorPromotor: Record<string, any[]> = {}
    Object.entries(lojasIdsPorPromotor).forEach(([promotorId, lojaIds]) => {
      lojasPorPromotor[promotorId] = lojaIds
        .map(id => lojasMap.get(id))
        .filter(Boolean)
        .filter(loja => loja !== undefined) // Filtrar lojas que existem
    })

    // Buscar todas as cartas de uma vez
    const { data: cartas, error: cartasError } = await supabase
      .from('promotores_cartas')
      .select('*')
      .eq('status', 'valido')
      .order('created_at', { ascending: false })

    if (cartasError) {
      console.error('Erro ao buscar cartas:', cartasError)
    }

    // Mapear carta mais recente por promotor
    const cartasPorPromotor: Record<string, PromotorCarta> = {}
    if (cartas && !cartasError) {
      cartas.forEach(carta => {
        if (!cartasPorPromotor[carta.promotor_id]) {
          cartasPorPromotor[carta.promotor_id] = carta
        }
      })
      console.log(`📄 Encontradas ${Object.keys(cartasPorPromotor).length} cartas`)
    }

    // 🔥 BUSCAR TODOS OS GERENTES DE UMA VEZ (novo método)
    // Primeiro, coletar todos os gerente_ids de todos os promotores
    const todosGerenteIds = promotores
      .filter(p => p.gerente_ids && Array.isArray(p.gerente_ids) && p.gerente_ids.length > 0)
      .flatMap(p => p.gerente_ids as string[])
      .filter(id => id && id.length > 0)

    let gerentesMap = new Map()
    if (todosGerenteIds.length > 0) {
      const { data: gerentesData } = await supabase
        .from('gerentes')
        .select('id, nome_gerente, telefone, cod_loja')
        .in('id', [...new Set(todosGerenteIds)])

        // CORREÇÃO: Log para debug
        const lojasDoPromotor = lojasPorPromotor[promotor.id] || []
        if (lojasDoPromotor.length === 0 && lojasIdsPorPromotor[promotor.id]?.length > 0) {
          console.warn(`⚠️ Promotor ${promotor.promotor_nome} tem ${lojasIdsPorPromotor[promotor.id].length} loja(s) vinculada(s) mas nenhuma foi encontrada na tabela lojas`)
        }

        return {
          ...promotor,
          loja_ids: lojasIdsPorPromotor[promotor.id] || [],
          lojas: lojasDoPromotor,
          gerentes: gerente,
          marcas: marcasPorPromotor[promotor.id] || [],
          carta: cartasPorPromotor[promotor.id] || null
        }
      )
    )

    const promotoresComLojas = promotoresComDados.filter(p => p.lojas && p.lojas.length > 0).length
    const promotoresComMarcas = promotoresComDados.filter(p => p.marcas && p.marcas.length > 0).length
    const totalVinculosLojas = promotoresComDados.reduce((sum, p) => sum + (p.loja_ids?.length || 0), 0)
    
    console.log(`✅ ${promotoresComDados.length} promotores carregados`)
    console.log(`   - ${promotoresComLojas} com lojas vinculadas (${totalVinculosLojas} vínculos totais)`)
    console.log(`   - ${promotoresComMarcas} com marcas vinculadas`)
    console.log(`   - ${promotoresComGerentes} com gerentes vinculados`)
    
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

    // Buscar lojas do promotor
    const { data: lojasRel, error: lojasRelError } = await supabase
      .from('promotores_lojas')
      .select('loja_id')
      .eq('promotor_id', id)

    if (lojasRelError) {
      console.error('Erro ao buscar lojas do promotor:', lojasRelError)
    }

    const lojaIds = lojasRel?.map(r => r.loja_id) || []
    
    let lojasData: any[] = []
    if (lojaIds.length > 0) {
      // CORREÇÃO: Buscar também o campo numero_loja
      const { data: lojas } = await supabase
        .from('lojas')
        .select('id, nome_loja, cod_loja, numero_loja')
        .in('id', lojaIds)
      
      // CORREÇÃO: Garantir que nome_loja tenha um valor significativo
      lojasData = (lojas || []).map(loja => ({
        ...loja,
        nome_loja: (!loja.nome_loja || loja.nome_loja === loja.cod_loja) && loja.numero_loja 
          ? loja.numero_loja 
          : loja.nome_loja
      }))
    }

    // Buscar marcas do promotor
    const { data: marcasRel, error: marcasRelError } = await supabase
      .from('promotores_marcas')
      .select('marca_id')
      .eq('promotor_id', id)

    if (marcasRelError) {
      console.error('Erro ao buscar marcas do promotor:', marcasRelError)
    }

    let marcas: MarcaRelacionada[] = []
    if (marcasRel && marcasRel.length > 0) {
      const marcaIds = marcasRel.map(r => r.marca_id)
      const { data: marcasData, error: marcasError } = await supabase
        .from('marcas')
        .select('id, nome')
        .in('id', marcaIds)

      if (!marcasError && marcasData) {
        marcas = marcasData
      }
    }

    // Buscar carta do promotor
    const { data: carta, error: cartaError } = await supabase
      .from('promotores_cartas')
      .select('*')
      .eq('promotor_id', id)
      .eq('status', 'valido')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cartaError && cartaError.code !== 'PGRST116') {
      console.error('Erro ao buscar carta:', cartaError)
    }

    // 🔥 Buscar TODOS os gerentes do promotor
    let gerentes: any[] = []
    if (promotor.gerente_ids && Array.isArray(promotor.gerente_ids) && promotor.gerente_ids.length > 0) {
      const { data: gerentesData, error: gerentesError } = await supabase
        .from('gerentes')
        .select('id, nome_gerente, telefone, cod_loja')
        .in('id', promotor.gerente_ids)

      if (!gerentesError && gerentesData) {
        gerentes = gerentesData
      }
    }

    return {
      ...promotor,
      loja_ids: lojaIds,
      lojas: lojasData,
      gerentes: gerentes,  // 🔥 Agora é um array
      marcas,
      carta: carta || null
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

// Buscar todas as lojas disponíveis para vinculação
// CORREÇÃO: Adicionar numero_loja ao retorno
export async function getLojasDisponiveis(): Promise<{ id: string; cod_loja: string; nome_loja: string; numero_loja: string }[]> {
  try {
    const { data, error } = await supabase
      .from('lojas')
      .select('id, cod_loja, nome_loja, numero_loja')
      .order('cod_loja')

    if (error) {
      console.error('Erro ao buscar lojas:', error)
      throw error
    }

    // CORREÇÃO: Garantir que nome_loja tenha um valor significativo
    const lojasCorrigidas = (data || []).map(loja => ({
      ...loja,
      nome_loja: (!loja.nome_loja || loja.nome_loja === loja.cod_loja) && loja.numero_loja 
        ? loja.numero_loja 
        : loja.nome_loja
    }))

    return lojasCorrigidas
  } catch (error) {
    console.error('Erro inesperado em getLojasDisponiveis:', error)
    return []
  }
}

// 🔥 NOVA FUNÇÃO: Buscar gerentes disponíveis
export async function getGerentesDisponiveis(): Promise<{ id: string; nome_gerente: string; telefone: string | null; cod_loja: string | null }[]> {
  try {
    const { data, error } = await supabase
      .from('gerentes')
      .select('id, nome_gerente, telefone, cod_loja')
      .order('nome_gerente')

    if (error) {
      console.error('Erro ao buscar gerentes disponíveis:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Erro inesperado em getGerentesDisponiveis:', error)
    return []
  }
}

// Criar um novo promotor
export async function createPromotor(data: CreatePromotorData): Promise<Promotor | null> {
  try {
    console.log('📝 Criando promotor:', data.promotor_nome)
    console.log('   Lojas:', data.loja_ids?.length || 0)
    console.log('   Gerentes:', data.gerente_ids?.length || 0)
    console.log('   Marcas:', data.marca_ids?.length || 0)
    
    // 🔥 Inserir o promotor com gerente_ids como array
    const { data: novoPromotor, error: promotorError } = await supabase
      .from('promotores')
      .insert({
        promotor_nome: data.promotor_nome,
        gerente_ids: data.gerente_ids && data.gerente_ids.length > 0 ? data.gerente_ids : null,
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
      } else {
        console.log(`✅ Vinculadas ${relacoesLojas.length} lojas`)
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
      } else {
        console.log(`✅ Vinculadas ${relacoesMarcas.length} marcas`)
      }
    }

    // Buscar o promotor criado com seus relacionamentos
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
    console.log('   Lojas:', data.loja_ids?.length || 0)
    console.log('   Gerentes:', data.gerente_ids?.length || 0)
    console.log('   Marcas:', data.marca_ids?.length || 0)
    
    // Preparar os dados para atualização
    const updateData: any = {}
    if (data.promotor_nome !== undefined) updateData.promotor_nome = data.promotor_nome
    if (data.gerente_ids !== undefined) {
      updateData.gerente_ids = data.gerente_ids.length > 0 ? data.gerente_ids : null
    }
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

    // Atualizar lojas - deletar todas e recriar
    if (data.loja_ids !== undefined) {
      const { error: deleteLojasError } = await supabase
        .from('promotores_lojas')
        .delete()
        .eq('promotor_id', id)

      if (deleteLojasError) {
        console.error('Erro ao deletar relações antigas de lojas:', deleteLojasError)
      }

      if (data.loja_ids.length > 0) {
        const relacoesLojas = data.loja_ids.map(loja_id => ({
          promotor_id: id,
          loja_id: loja_id
        }))

        const { error: insertLojasError } = await supabase
          .from('promotores_lojas')
          .insert(relacoesLojas)

        if (insertLojasError) {
          console.error('Erro ao inserir novas relações de lojas:', insertLojasError)
        } else {
          console.log(`✅ Atualizadas ${relacoesLojas.length} lojas`)
        }
      }
    }

    // Atualizar marcas - deletar todas e recriar
    if (data.marca_ids !== undefined) {
      const { error: deleteMarcasError } = await supabase
        .from('promotores_marcas')
        .delete()
        .eq('promotor_id', id)

      if (deleteMarcasError) {
        console.error('Erro ao deletar relações antigas de marcas:', deleteMarcasError)
      }

      if (data.marca_ids.length > 0) {
        const relacoesMarcas = data.marca_ids.map(marca_id => ({
          promotor_id: id,
          marca_id: marca_id
        }))

        const { error: insertMarcasError } = await supabase
          .from('promotores_marcas')
          .insert(relacoesMarcas)

        if (insertMarcasError) {
          console.error('Erro ao inserir novas relações de marcas:', insertMarcasError)
        } else {
          console.log(`✅ Atualizadas ${relacoesMarcas.length} marcas`)
        }
      }
    }

    // Buscar o promotor atualizado com seus relacionamentos
    return await getPromotorById(id)
  } catch (error) {
    console.error('Erro inesperado em updatePromotor:', error)
    throw error
  }
}

// Deletar um promotor (incluindo cartas do storage e todos os relacionamentos)
export async function deletePromotor(id: string): Promise<boolean> {
  try {
    console.log('🗑️ Deletando promotor:', id)
    
    // Buscar cartas do promotor para deletar os arquivos do storage
    const { data: cartas } = await supabase
      .from('promotores_cartas')
      .select('id, arquivo')
      .eq('promotor_id', id)

    // Deletar arquivos do storage
    if (cartas && cartas.length > 0) {
      for (const carta of cartas) {
        try {
          const filePath = carta.arquivo.split('/documentos/')[1]
          if (filePath) {
            await supabase.storage.from('documentos').remove([filePath])
            console.log(`🗑️ Arquivo deletado: ${filePath}`)
          }
        } catch (storageError) {
          console.error('Erro ao deletar arquivo do storage:', storageError)
        }
      }
    }

    // Deletar registros de cartas
    const { error: deleteCartasError } = await supabase
      .from('promotores_cartas')
      .delete()
      .eq('promotor_id', id)

    if (deleteCartasError) {
      console.error('Erro ao deletar cartas:', deleteCartasError)
    }

    // Deletar relações com lojas
    const { error: deleteLojasError } = await supabase
      .from('promotores_lojas')
      .delete()
      .eq('promotor_id', id)

    if (deleteLojasError) {
      console.error('Erro ao deletar relações com lojas:', deleteLojasError)
    }

    // Deletar relações com marcas
    const { error: deleteMarcasError } = await supabase
      .from('promotores_marcas')
      .delete()
      .eq('promotor_id', id)

    if (deleteMarcasError) {
      console.error('Erro ao deletar relações com marcas:', deleteMarcasError)
    }

    // Deletar o promotor
    const { error: promotorError } = await supabase
      .from('promotores')
      .delete()
      .eq('id', id)

    if (promotorError) {
      console.error('Erro ao deletar promotor:', promotorError)
      throw promotorError
    }

    console.log('✅ Promotor e todos os registros relacionados deletados com sucesso')
    return true
  } catch (error) {
    console.error('Erro inesperado em deletePromotor:', error)
    throw error
  }
}
