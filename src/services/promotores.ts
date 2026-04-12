// services/promotores.ts (versão com 'nome' em vez de 'nome_marca')
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
  marcas?: { id: string; nome: string }[]  // ← mudou de nome_marca para nome
}

export interface Marca {
  id: string
  nome: string  // ← mudou de nome_marca para nome
  created_at?: string
}

export async function getPromotores(): Promise<Promotor[]> {
  try {
    console.log('🔍 Buscando promotores...')
    
    const { data: promotores, error } = await supabase
      .from('promotores')
      .select('*')
      .order('promotor_nome')
    
    if (error) {
      console.error('❌ Erro ao buscar promotores:', error)
      return []
    }

    if (!promotores || promotores.length === 0) {
      console.log('⚠️ Nenhum promotor encontrado')
      return []
    }

    console.log(`📊 Encontrados ${promotores.length} promotores`)

    // Buscar lojas
    const { data: lojas } = await supabase
      .from('lojas')
      .select('id, cod_loja, nome_loja')

    // Buscar gerentes
    const { data: gerentes } = await supabase
      .from('gerentes')
      .select('id, nome_gerente, telefone, cod_loja')

    // Buscar relacionamentos com marcas
    let marcasMap: Map<string, any[]> = new Map()
    
    const { data: relacoes } = await supabase
      .from('promotores_marcas')
      .select('promotor_id, marca_id')
    
    if (relacoes && relacoes.length > 0) {
      const marcaIds = [...new Set(relacoes.map(r => r.marca_id))]
      const { data: marcasData } = await supabase
        .from('marcas')
        .select('id, nome')  // ← mudou para 'nome'
        .in('id', marcaIds)
      
      const marcasPorId = new Map(marcasData?.map(m => [m.id, m]) || [])
      
      relacoes.forEach(rel => {
        const marca = marcasPorId.get(rel.marca_id)
        if (marca) {
          if (!marcasMap.has(rel.promotor_id)) {
            marcasMap.set(rel.promotor_id, [])
          }
          marcasMap.get(rel.promotor_id)!.push(marca)
        }
      })
    }

    // Montar os dados completos
    const promotoresCompletos: Promotor[] = promotores.map(promotor => {
      const loja = lojas?.find(l => l.id === promotor.loja_id)
      const gerente = gerentes?.find(g => g.id === promotor.gerente_id)
      const marcas = marcasMap.get(promotor.id) || []

      return {
        ...promotor,
        lojas: loja || null,
        gerentes: gerente || null,
        marcas: marcas
      }
    })

    console.log('✅ Dados processados com sucesso')
    return promotoresCompletos

  } catch (error) {
    console.error('❌ Erro fatal em getPromotores:', error)
    return []
  }
}

export async function getPromotorById(id: string): Promise<Promotor | null> {
  try {
    const { data: promotor, error } = await supabase
      .from('promotores')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error || !promotor) {
      console.error('Erro ao buscar promotor:', error)
      return null
    }

    const { data: loja } = await supabase
      .from('lojas')
      .select('id, cod_loja, nome_loja')
      .eq('id', promotor.loja_id || '')
      .single()
      .catch(() => ({ data: null }))

    const { data: gerente } = await supabase
      .from('gerentes')
      .select('id, nome_gerente, telefone')
      .eq('id', promotor.gerente_id || '')
      .single()
      .catch(() => ({ data: null }))

    let marcas: { id: string; nome: string }[] = []
    const { data: relacoes } = await supabase
      .from('promotores_marcas')
      .select('marca_id')
      .eq('promotor_id', id)
    
    if (relacoes && relacoes.length > 0) {
      const marcaIds = relacoes.map(r => r.marca_id)
      const { data: marcasData } = await supabase
        .from('marcas')
        .select('id, nome')  // ← mudou para 'nome'
        .in('id', marcaIds)
      
      marcas = marcasData || []
    }

    return {
      ...promotor,
      lojas: loja || null,
      gerentes: gerente || null,
      marcas: marcas
    }
  } catch (error) {
    console.error('Erro ao buscar promotor por ID:', error)
    return null
  }
}

export async function getMarcasDisponiveis(): Promise<Marca[]> {
  try {
    const { data, error } = await supabase
      .from('marcas')
      .select('id, nome')  // ← mudou para 'nome'
      .order('nome')  // ← mudou para 'nome'
    
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
    
    if (error || !promotor) {
      console.error('Erro ao criar promotor:', error)
      return null
    }

    if (marca_ids && marca_ids.length > 0) {
      const links = marca_ids.map(marca_id => ({
        promotor_id: promotor.id,
        marca_id: marca_id
      }))
      
      await supabase.from('promotores_marcas').insert(links)
    }

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

    if (marca_ids !== undefined) {
      await supabase.from('promotores_marcas').delete().eq('promotor_id', id)
      
      if (marca_ids.length > 0) {
        const links = marca_ids.map(marca_id => ({
          promotor_id: id,
          marca_id: marca_id
        }))
        await supabase.from('promotores_marcas').insert(links)
      }
    }

    return await getPromotorById(id)
  } catch (error) {
    console.error('Erro ao atualizar promotor:', error)
    return null
  }
}

export async function deletePromotor(id: string): Promise<boolean> {
  try {
    await supabase.from('promotores_marcas').delete().eq('promotor_id', id)
    
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
