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

export async function getDashboardData(lojaId: string | null = null, isAdmin: boolean = true): Promise<{
  stats: DashboardStats
  recentVisits: RecentVisit[]
}> {
  try {
    console.log('📊 Buscando dados do dashboard...', { lojaId, isAdmin })

    // 🔥 1. Buscar lojas permitidas
    let lojaIds: string[] = []
    
    if (!isAdmin && lojaId) {
      // Verificar se é Regional ou Gerente de Loja
      const { data: userData } = await supabase
        .from('usuarios_internos')
        .select('role')
        .eq('id', lojaId)
        .single()
      
      if (userData?.role === 'regional' || userData?.role === 'gerente_regional') {
        // Regional: buscar lojas que gerencia
        const { data: lojasData } = await supabase
          .from('gerentes_regionais_lojas')
          .select('loja_id')
          .eq('gerente_regional_id', lojaId)
        lojaIds = lojasData?.map(l => l.loja_id) || []
      } else if (userData?.role === 'gerente') {
        // Gerente de loja: usar a loja dele
        lojaIds = [lojaId]
      } else {
        // Fallback: buscar todas
        const { data: lojas } = await supabase.from('lojas').select('id')
        lojaIds = lojas?.map(l => l.id) || []
      }
    } else {
      // Admin: todas as lojas
      const { data: lojas } = await supabase.from('lojas').select('id')
      lojaIds = lojas?.map(l => l.id) || []
    }

    console.log('🏪 Lojas permitidas:', lojaIds.length)

    // 🔥 2. Total de Lojas
    const totalLojas = lojaIds.length

    // 🔥 3. Promotores Ativos
    const { data: promotores, error: promotoresError } = await supabase
      .from('promotores')
      .select('id, loja_ids')
      .eq('status', 'ativo')

    if (promotoresError) {
      console.error('❌ Erro ao buscar promotores:', promotoresError)
    }

    // Filtrar promotores que estão nas lojas permitidas
    const promotoresFiltrados = (promotores || []).filter(p => {
      if (!p.loja_ids) return false
      return p.loja_ids.some((id: string) => lojaIds.includes(id))
    })

    const promotoresAtivos = promotoresFiltrados.length
    console.log('👤 Promotores ativos:', promotoresAtivos)

    // 🔥 4. Cobertura (lojas com promotor)
    const { data: promotoresLojas, error: plError } = await supabase
      .from('promotores_lojas')
      .select('loja_id')
      .in('loja_id', lojaIds)

    if (plError) {
      console.error('❌ Erro ao buscar promotores_lojas:', plError)
    }

    const lojasComPromotor = new Set(promotoresLojas?.map(p => p.loja_id) || [])
    const cobertura = totalLojas > 0 
      ? Math.round((lojasComPromotor.size / totalLojas) * 100) 
      : 0

    console.log('📊 Cobertura:', cobertura, '%', 'Lojas cobertas:', lojasComPromotor.size, 'de', totalLojas)

    // 🔥 5. Visitas hoje
    const hoje = new Date().toISOString().split('T')[0]
    
    // Buscar check-ins (se a tabela for check_ins)
    let visitasQuery = supabase
      .from('check_ins')
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

    // Se não tiver check_ins, tentar visitas
    let recentVisits: RecentVisit[] = []
    let visitasHoje = 0

    const { data: checkins, error: checkinsError } = await visitasQuery

    if (checkinsError) {
      // Tentar tabela visitas como fallback
      console.log('Tabela check_ins não encontrada, tentando visitas...')
      
      const visitasQuery2 = supabase
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

      const { data: visitas, error: visitasError } = await visitasQuery2

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
      }
    } else if (checkins) {
      recentVisits = checkins.map((v: any) => ({
        id: v.id,
        promotor_nome: v.promotores?.promotor_nome || 'Desconhecido',
        loja_nome: v.lojas?.cod_loja || v.lojas?.nome_loja || 'Desconhecida',
        check_in: v.check_in,
        check_out: v.check_out,
        status: v.status || 'pendente'
      }))
      visitasHoje = checkins.length
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

export async function getCoberturaPorMarcaComLojas(lojaId: string | null = null, isAdmin: boolean = true): Promise<MarcaCobertura[]> {
  try {
    console.log('🔍 Buscando cobertura por marca...', { lojaId, isAdmin })

    // 🔥 Buscar lojas permitidas
    let lojaIds: string[] = []

    if (!isAdmin && lojaId) {
      const { data: userData } = await supabase
        .from('usuarios_internos')
        .select('role')
        .eq('id', lojaId)
        .single()

      if (userData?.role === 'regional' || userData?.role === 'gerente_regional') {
        const { data: lojasData } = await supabase
          .from('gerentes_regionais_lojas')
          .select('loja_id')
          .eq('gerente_regional_id', lojaId)
        lojaIds = lojasData?.map(l => l.loja_id) || []
      } else if (userData?.role === 'gerente') {
        lojaIds = [lojaId]
      } else {
        const { data: lojas } = await supabase.from('lojas').select('id')
        lojaIds = lojas?.map(l => l.id) || []
      }
    } else {
      const { data: lojas } = await supabase.from('lojas').select('id')
      lojaIds = lojas?.map(l => l.id) || []
    }

    if (lojaIds.length === 0) {
      console.log('⚠️ Nenhuma loja encontrada')
      return []
    }

    // 🔥 Buscar promotores das lojas permitidas
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

    // 🔥 Buscar marcas desses promotores
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

    // 🔥 Agrupar por marca
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

// Função adicional para buscar campanhas ativas para o dashboard
export async function getCampanhasAtivas(lojaId: string | null = null, isAdmin: boolean = true): Promise<any[]> {
  try {
    const hoje = new Date().toISOString().split('T')[0]

    // Buscar campanhas
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

    // Buscar lojas das campanhas
    const campanhaIds = campanhas.map(c => c.id)
    const { data: lojasCampanhas } = await supabase
      .from('lojas_campanhas')
      .select('campanha_id, loja_id')
      .in('campanha_id', campanhaIds)

    // Filtrar por lojas permitidas
    const campanhaComLojas = campanhas.filter(campanha => {
      const lojas = lojasCampanhas?.filter(lc => lc.campanha_id === campanha.id) || []
      const lojaIdsCampanha = lojas.map(l => l.loja_id)
      
      if (!isAdmin && lojaId) {
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

// Função adicional para buscar ações ativas para o dashboard
export async function getAcoesAtivas(lojaId: string | null = null, isAdmin: boolean = true): Promise<any[]> {
  try {
    const hoje = new Date().toISOString().split('T')[0]

    // Buscar ações
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

    // Buscar lojas das ações
    const acaoIds = acoes.map(a => a.id)
    const { data: lojasAcoes } = await supabase
      .from('acoes_lojas')
      .select('acao_id, loja_id')
      .in('acao_id', acaoIds)

    // Filtrar por lojas permitidas
    const acaoComLojas = acoes.filter(acao => {
      const lojas = lojasAcoes?.filter(la => la.acao_id === acao.id) || []
      const lojaIdsAcao = lojas.map(l => l.loja_id)
      
      if (!isAdmin && lojaId) {
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
