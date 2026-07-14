// src/services/dashboard.ts
import { supabase } from '@/lib/supabase'

export interface DashboardStats {
  totalLojas: number
  promotoresAtivos: number
  cobertura: number
  visitasHoje: number
}

export interface RecentVisit {
  id: string
  promotor_nome?: string
  loja_nome?: string
  check_in: string
  check_out?: string
  status: string
}

export interface MarcaCobertura {
  nome_marca: string
  total_promotores: number
  cobertura_percentual: number
}

export async function getDashboardData(
  lojaId: string | null = null, 
  isAdmin: boolean = false,
  isRegional: boolean = false,
  isGerente: boolean = false
): Promise<{
  stats: DashboardStats
  recentVisits: RecentVisit[]
}> {
  try {
    console.log('📊 Buscando dados do dashboard...', { lojaId, isAdmin, isRegional, isGerente })

    let lojaIds: string[] = []
    
    // 🔥 PRIORIDADE: ADMIN > REGIONAL > GERENTE > FALLBACK
    if (isAdmin) {
      // ADMIN: todas as lojas
      const { data: lojas } = await supabase.from('lojas').select('id')
      lojaIds = lojas?.map(l => l.id) || []
      console.log('🏪 Admin - todas:', lojaIds.length)
    } 
    else if (isRegional && lojaId) {
      // REGIONAL: lojas da região
      const { data: lojasData } = await supabase
        .from('gerentes_regionais_lojas')
        .select('loja_id')
        .eq('gerente_regional_id', lojaId)
      lojaIds = lojasData?.map(l => l.loja_id) || []
      console.log('🏪 Regional - lojas:', lojaIds.length)
    } 
    else if (isGerente && lojaId) {
      // 🔥 GERENTE: apenas a loja dele
      lojaIds = [lojaId]
      console.log('🏪 Gerente - loja:', lojaIds.length)
    } 
    else if (lojaId) {
      // Fallback: usar o lojaId se disponível
      lojaIds = [lojaId]
      console.log('🏪 Fallback - loja única:', lojaIds.length)
    }
    else {
      // Fallback final: todas as lojas (segurança)
      const { data: lojas } = await supabase.from('lojas').select('id')
      lojaIds = lojas?.map(l => l.id) || []
      console.log('🏪 Fallback - todas:', lojaIds.length)
    }

    if (lojaIds.length === 0) {
      console.log('⚠️ Nenhuma loja encontrada')
      return {
        stats: { totalLojas: 0, promotoresAtivos: 0, cobertura: 0, visitasHoje: 0 },
        recentVisits: [],
      }
    }

    console.log('🏪 Lojas permitidas FINAL:', lojaIds.length)

    const totalLojas = lojaIds.length

    // 🔥 PROMOTORES ATIVOS
    const { data: promotoresLojas, error: plError } = await supabase
      .from('promotores_lojas')
      .select('promotor_id, loja_id')
      .in('loja_id', lojaIds)

    if (plError) {
      console.error('❌ Erro ao buscar promotores_lojas:', plError)
    }

    // Lojas com promotor
    const lojasComPromotor = new Set(promotoresLojas?.map(p => p.loja_id) || [])
    const cobertura = totalLojas > 0 
      ? Math.round((lojasComPromotor.size / totalLojas) * 100) 
      : 0

    console.log('📊 Cobertura:', cobertura, '%', 'Lojas cobertas:', lojasComPromotor.size, 'de', totalLojas)

    // Promotores ativos
    const promotorIds = new Set(promotoresLojas?.map(p => p.promotor_id) || [])
    let promotoresAtivos = 0
    if (promotorIds.size > 0) {
      const { data: promotores } = await supabase
        .from('promotores')
        .select('id')
        .eq('status', 'ativo')
        .in('id', Array.from(promotorIds))
      promotoresAtivos = promotores?.length || 0
    }
    console.log('👤 Promotores ativos:', promotoresAtivos)

    // 🔥 VISITAS HOJE
    const hoje = new Date().toISOString().split('T')[0]
    
    let visitasQuery = supabase
      .from('visitas')
      .select(`
        id,
        check_in,
        check_out,
        status,
        promotor_id,
        loja_id,
        promotores:promotor_id (promotor_nome),
        lojas:loja_id (nome_loja, cod_loja)
      `)
      .gte('check_in', hoje)
      .order('check_in', { ascending: false })
      .limit(10)

    if (lojaIds.length > 0) {
      visitasQuery = visitasQuery.in('loja_id', lojaIds)
    }

    let recentVisits: RecentVisit[] = []
    let visitasHoje = 0

    const { data: visitas, error: visitasError } = await visitasQuery

    if (!visitasError && visitas) {
      recentVisits = visitas.map((v: any) => ({
        id: v.id,
        promotor_nome: v.promotores?.promotor_nome || 'Desconhecido',
        loja_nome: v.lojas?.cod_loja || v.lojas?.nome_loja || 'Desconhecida',
        check_in: v.check_in,
        check_out: v.check_out,
        status: v.status || 'pendente'
      }))
      visitasHoje = visitas.length
    } else {
      console.log('Nenhuma visita encontrada')
    }

    console.log('📋 Visitas hoje:', visitasHoje, 'Recentes:', recentVisits.length)

    return {
      stats: {
        totalLojas,
        promotoresAtivos,
        cobertura,
        visitasHoje,
      },
      recentVisits,
    }
  } catch (error) {
    console.error('❌ Erro ao carregar dashboard:', error)
    return {
      stats: { totalLojas: 0, promotoresAtivos: 0, cobertura: 0, visitasHoje: 0 },
      recentVisits: [],
    }
  }
}

export async function getCoberturaPorMarcaComLojas(
  lojaId: string | null = null, 
  isAdmin: boolean = false,
  isRegional: boolean = false,
  isGerente: boolean = false
): Promise<MarcaCobertura[]> {
  try {
    console.log('🔍 Buscando cobertura por marca...', { lojaId, isAdmin, isRegional, isGerente })

    let lojaIds: string[] = []

    // 🔥 PRIORIDADE: ADMIN > REGIONAL > GERENTE > FALLBACK
    if (isAdmin) {
      const { data: lojas } = await supabase.from('lojas').select('id')
      lojaIds = lojas?.map(l => l.id) || []
      console.log('🏪 Admin (marcas) - todas:', lojaIds.length)
    } 
    else if (isRegional && lojaId) {
      const { data: lojasData } = await supabase
        .from('gerentes_regionais_lojas')
        .select('loja_id')
        .eq('gerente_regional_id', lojaId)
      lojaIds = lojasData?.map(l => l.loja_id) || []
      console.log('🏪 Regional (marcas) - lojas:', lojaIds.length)
    } 
    else if (isGerente && lojaId) {
      lojaIds = [lojaId]
      console.log('🏪 Gerente (marcas) - loja:', lojaIds.length)
    } 
    else if (lojaId) {
      lojaIds = [lojaId]
      console.log('🏪 Fallback (marcas) - loja:', lojaIds.length)
    }
    else {
      const { data: lojas } = await supabase.from('lojas').select('id')
      lojaIds = lojas?.map(l => l.id) || []
      console.log('🏪 Fallback (marcas) - todas:', lojaIds.length)
    }

    if (lojaIds.length === 0) {
      console.log('⚠️ Nenhuma loja encontrada para marcas')
      return []
    }

    const { data: promotoresLojas, error: plError } = await supabase
      .from('promotores_lojas')
      .select('promotor_id')
      .in('loja_id', lojaIds)

    if (plError) {
      console.error('❌ Erro ao buscar promotores_lojas:', plError)
      return []
    }

    const promotorIds = promotoresLojas?.map(p => p.promotor_id) || []

    if (promotorIds.length === 0) {
      console.log('⚠️ Nenhum promotor encontrado nas lojas')
      return []
    }

    const { data: marcasData, error: marcasError } = await supabase
      .from('promotores_marcas')
      .select(`
        marca_id,
        marcas!inner (id, nome)
      `)
      .in('promotor_id', promotorIds)

    if (marcasError) {
      console.error('❌ Erro ao buscar marcas:', marcasError)
      return []
    }

    const marcasCount: Record<string, { nome: string; count: number }> = {}

    marcasData?.forEach((item: any) => {
      const marcaNome = item.marcas?.nome || 'Desconhecida'
      if (!marcasCount[marcaNome]) {
        marcasCount[marcaNome] = { nome: marcaNome, count: 0 }
      }
      marcasCount[marcaNome].count++
    })

    const totalLojas = lojaIds.length

    const resultado = Object.values(marcasCount)
      .sort((a, b) => b.count - a.count)
      .map(item => ({
        nome_marca: item.nome,
        total_promotores: item.count,
        cobertura_percentual: totalLojas > 0 ? Math.round((item.count / totalLojas) * 100) : 0
      }))

    console.log(`📊 ${resultado.length} marcas encontradas`)
    return resultado

  } catch (error) {
    console.error('❌ Erro ao buscar cobertura por marca:', error)
    return []
  }
}

export async function getCampanhasAtivas(
  lojaId: string | null = null, 
  isAdmin: boolean = false,
  isRegional: boolean = false,
  isGerente: boolean = false
): Promise<any[]> {
  try {
    const hoje = new Date().toISOString().split('T')[0]

    // Buscar lojas permitidas
    let lojaIds: string[] = []
    if (isRegional && lojaId) {
      const { data: lojasData } = await supabase
        .from('gerentes_regionais_lojas')
        .select('loja_id')
        .eq('gerente_regional_id', lojaId)
      lojaIds = lojasData?.map(l => l.loja_id) || []
    } else if (isGerente && lojaId) {
      lojaIds = [lojaId]
    }

    const { data: campanhas, error } = await supabase
      .from('campanhas')
      .select('*')
      .eq('status', 'ativa')
      .lte('data_inicio', hoje)
      .gte('data_fim', hoje)

    if (error) {
      console.error('Erro ao buscar campanhas ativas:', error)
      return []
    }

    if (!campanhas || campanhas.length === 0) {
      return []
    }

    const campanhaIds = campanhas.map(c => c.id)
    const { data: lojasCampanhas } = await supabase
      .from('lojas_campanhas')
      .select('campanha_id, loja_id')
      .in('campanha_id', campanhaIds)

    const campanhaComLojas = campanhas.filter(campanha => {
      const lojas = lojasCampanhas?.filter(lc => lc.campanha_id === campanha.id) || []
      const lojaIdsCampanha = lojas.map(l => l.loja_id)
      
      if (!isAdmin && lojaIds.length > 0) {
        return lojaIdsCampanha.some(id => lojaIds.includes(id))
      } else if (!isAdmin && lojaId) {
        return lojaIdsCampanha.includes(lojaId)
      }
      return true
    })

    return campanhaComLojas
  } catch (error) {
    console.error('Erro ao buscar campanhas ativas:', error)
    return []
  }
}

export async function getAcoesAtivas(
  lojaId: string | null = null, 
  isAdmin: boolean = false,
  isRegional: boolean = false,
  isGerente: boolean = false
): Promise<any[]> {
  try {
    const hoje = new Date().toISOString().split('T')[0]

    // Buscar lojas permitidas
    let lojaIds: string[] = []
    if (isRegional && lojaId) {
      const { data: lojasData } = await supabase
        .from('gerentes_regionais_lojas')
        .select('loja_id')
        .eq('gerente_regional_id', lojaId)
      lojaIds = lojasData?.map(l => l.loja_id) || []
    } else if (isGerente && lojaId) {
      lojaIds = [lojaId]
    }

    const { data: acoes, error } = await supabase
      .from('acoes')
      .select('*')
      .in('status', ['em_andamento', 'pendente'])
      .lte('data_inicio', hoje)
      .gte('data_fim', hoje)

    if (error) {
      console.error('Erro ao buscar ações ativas:', error)
      return []
    }

    if (!acoes || acoes.length === 0) {
      return []
    }

    const acaoIds = acoes.map(a => a.id)
    const { data: lojasAcoes } = await supabase
      .from('acoes_lojas')
      .select('acao_id, loja_id')
      .in('acao_id', acaoIds)

    const acaoComLojas = acoes.filter(acao => {
      const lojas = lojasAcoes?.filter(la => la.acao_id === acao.id) || []
      const lojaIdsAcao = lojas.map(l => l.loja_id)
      
      if (!isAdmin && lojaIds.length > 0) {
        return lojaIdsAcao.some(id => lojaIds.includes(id))
      } else if (!isAdmin && lojaId) {
        return lojaIdsAcao.includes(lojaId)
      }
      return true
    })

    return acaoComLojas
  } catch (error) {
    console.error('Erro ao buscar ações ativas:', error)
    return []
  }
}
