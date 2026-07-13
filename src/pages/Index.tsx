// src/services/dashboard.ts
import { supabase } from '@/lib/supabase'

export interface DashboardStats {
  totalLojas: number
  totalPromotores: number
  checkinsHoje: number
  cobertura: number
}

export interface RecentVisit {
  id: string
  promotor_nome: string
  loja_nome: string
  status: string
  check_in: string
  check_out: string | null
}

export interface CoberturaMarca {
  nome_marca: string
  total_promotores: number
  cobertura_percentual: number
}

export async function getDashboardData(lojaId?: string | null, isAdmin?: boolean): Promise<{
  stats: DashboardStats
  recentVisits: RecentVisit[]
}> {
  try {
    console.log('📊 Buscando dados do dashboard...', { lojaId, isAdmin })

    // 🔥 1. Buscar lojas (com filtro)
    let lojasQuery = supabase.from('lojas').select('id')
    
    if (!isAdmin && lojaId) {
      // Se for Regional, buscar lojas que ele gerencia
      if (lojaId) {
        const { data: lojasData } = await supabase
          .from('gerentes_regionais_lojas')
          .select('loja_id')
          .eq('gerente_regional_id', lojaId)
        
        const lojaIds = lojasData?.map(l => l.loja_id) || []
        if (lojaIds.length > 0) {
          lojasQuery = lojasQuery.in('id', lojaIds)
        } else {
          // Se não tiver lojas, retorna vazio
          return {
            stats: {
              totalLojas: 0,
              totalPromotores: 0,
              checkinsHoje: 0,
              cobertura: 0
            },
            recentVisits: []
          }
        }
      }
    }

    const { data: lojas, error: lojasError } = await lojasQuery

    if (lojasError) {
      console.error('❌ Erro ao buscar lojas:', lojasError)
    }

    const totalLojas = lojas?.length || 0
    const lojaIds = lojas?.map(l => l.id) || []

    // 🔥 2. Buscar promotores ativos
    const { data: promotores, error: promotoresError } = await supabase
      .from('promotores')
      .select('id')
      .eq('status', 'ativo')

    if (promotoresError) {
      console.error('❌ Erro ao buscar promotores:', promotoresError)
    }

    const totalPromotores = promotores?.length || 0
    const promotorIds = promotores?.map(p => p.id) || []

    // 🔥 3. Buscar cobertura (lojas com promotor)
    let coberturaQuery = supabase
      .from('promotores_lojas')
      .select('loja_id')
      .in('promotor_id', promotorIds)

    if (lojaIds.length > 0) {
      coberturaQuery = coberturaQuery.in('loja_id', lojaIds)
    }

    const { data: cobertura, error: coberturaError } = await coberturaQuery

    if (coberturaError) {
      console.error('❌ Erro ao buscar cobertura:', coberturaError)
    }

    const lojasComPromotor = new Set(cobertura?.map(c => c.loja_id) || [])
    const coberturaPercentual = totalLojas > 0 
      ? Math.round((lojasComPromotor.size / totalLojas) * 100) 
      : 0

    console.log('📊 Cobertura:', {
      totalLojas,
      lojasComPromotor: lojasComPromotor.size,
      coberturaPercentual
    })

    // 🔥 4. Buscar check-ins de hoje
    const hoje = new Date().toISOString().split('T')[0]
    let checkinsQuery = supabase
      .from('check_ins')
      .select('id')
      .gte('created_at', hoje)
      .lt('created_at', hoje + 'T23:59:59')

    if (lojaIds.length > 0) {
      checkinsQuery = checkinsQuery.in('loja_id', lojaIds)
    }

    const { data: checkins, error: checkinsError } = await checkinsQuery

    if (checkinsError) {
      console.error('❌ Erro ao buscar check-ins:', checkinsError)
    }

    const checkinsHoje = checkins?.length || 0

    // 🔥 5. Buscar visitas recentes
    let visitsQuery = supabase
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
      .order('check_in', { ascending: false })
      .limit(10)

    if (lojaIds.length > 0) {
      visitsQuery = visitsQuery.in('loja_id', lojaIds)
    }

    const { data: visits, error: visitsError } = await visitsQuery

    if (visitsError) {
      console.error('❌ Erro ao buscar visitas:', visitsError)
    }

    const recentVisits: RecentVisit[] = (visits || []).map((v: any) => ({
      id: v.id,
      promotor_nome: v.promotores?.promotor_nome || 'Desconhecido',
      loja_nome: v.lojas?.cod_loja || v.lojas?.nome_loja || 'Desconhecida',
      status: v.status || 'em_andamento',
      check_in: v.check_in,
      check_out: v.check_out
    }))

    console.log('✅ Dashboard carregado:', {
      totalLojas,
      totalPromotores,
      checkinsHoje,
      coberturaPercentual,
      recentVisits: recentVisits.length
    })

    return {
      stats: {
        totalLojas,
        totalPromotores,
        checkinsHoje,
        cobertura: coberturaPercentual
      },
      recentVisits
    }

  } catch (error) {
    console.error('❌ Erro ao carregar dashboard:', error)
    return {
      stats: {
        totalLojas: 0,
        totalPromotores: 0,
        checkinsHoje: 0,
        cobertura: 0
      },
      recentVisits: []
    }
  }
}

export async function getCoberturaPorMarcaComLojas(
  lojaId?: string | null,
  isAdmin?: boolean
): Promise<CoberturaMarca[]> {
  try {
    console.log('🔍 Buscando cobertura por marca...', { lojaId, isAdmin })

    // 🔥 Buscar lojas permitidas
    let lojaIds: string[] = []

    if (!isAdmin && lojaId) {
      const { data: lojasData } = await supabase
        .from('gerentes_regionais_lojas')
        .select('loja_id')
        .eq('gerente_regional_id', lojaId)
      
      lojaIds = lojasData?.map(l => l.loja_id) || []
      
      if (lojaIds.length === 0) {
        return []
      }
    } else {
      const { data: lojas } = await supabase.from('lojas').select('id')
      lojaIds = lojas?.map(l => l.id) || []
    }

    // 🔥 Buscar promotores das lojas permitidas
    const { data: promotoresLojas } = await supabase
      .from('promotores_lojas')
      .select('promotor_id')
      .in('loja_id', lojaIds)

    const promotorIds = promotoresLojas?.map(p => p.promotor_id) || []

    if (promotorIds.length === 0) {
      return []
    }

    // 🔥 Buscar marcas desses promotores
    const { data: marcasData, error: marcasError } = await supabase
      .from('promotores_marcas')
      .select(`
        marca_id,
        marcas (id, nome)
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

    console.log('📊 Top', resultado.length, 'marcas encontradas', resultado.slice(0, 5))
    
    return resultado

  } catch (error) {
    console.error('❌ Erro ao buscar cobertura por marca:', error)
    return []
  }
}
