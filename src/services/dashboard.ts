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
  nome: string
  total_promotores: number
  cobertura_percentual: number
}

export async function getDashboardData(): Promise<{
  stats: DashboardStats
  recentVisits: RecentVisit[]
}> {
  try {
    // Buscar lojas
    const { data: lojas, error: lojasError } = await supabase
      .from('lojas')
      .select('*')
    
    if (lojasError) throw lojasError

    // Buscar promotores
    const { data: promotores, error: promotoresError } = await supabase
      .from('promotores')
      .select('*')
    
    if (promotoresError) throw promotoresError

    // Buscar visitas de hoje
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString()

    const { data: visitasHoje, error: visitasHojeError } = await supabase
      .from('visitas')
      .select('*')
      .gte('check_in', todayStr)
    
    if (visitasHojeError) throw visitasHojeError

    // Buscar visitas recentes
    const { data: recentVisits, error: recentVisitsError } = await supabase
      .from('visitas')
      .select('*, promotores(promotor_nome), lojas(nome_loja)')
      .order('check_in', { ascending: false })
      .limit(5)
    
    if (recentVisitsError) throw recentVisitsError

    // Calcular cobertura
    const lojasComPromotores = new Set(promotores?.map(p => p.loja_id).filter(Boolean))
    const cobertura = lojas?.length > 0 
      ? Math.round((lojasComPromotores.size / lojas.length) * 100) 
      : 0

    return {
      stats: {
        totalLojas: lojas?.length || 0,
        promotoresAtivos: promotores?.length || 0,
        cobertura,
        visitasHoje: visitasHoje?.length || 0,
      },
      recentVisits: recentVisits?.map(v => ({
        id: v.id,
        promotor_nome: v.promotores?.promotor_nome || 'Desconhecido',
        loja_nome: v.lojas?.nome_loja || 'Desconhecida',
        check_in: v.check_in,
        check_out: v.check_out,
        status: v.status || 'pendente'
      })) || [],
    }
  } catch (error) {
    console.error('Failed to load dashboard data', error)
    return {
      stats: { totalLojas: 0, promotoresAtivos: 0, cobertura: 0, visitasHoje: 0 },
      recentVisits: [],
    }
  }
}

export async function getCoberturaPorMarcaComLojas(): Promise<MarcaCobertura[]> {
  try {
    console.log('🔍 Buscando cobertura por marca...')
    
    // Buscar todos os promotores com suas marcas e lojas
    const { data: promotores, error } = await supabase
      .from('promotores')
      .select(`
        id,
        loja_id,
        promotores_marcas (
          marcas (
            id,
            nome
          )
        )
      `)
    
    if (error) {
      console.error('❌ Erro ao buscar dados:', error)
      return []
    }

    if (!promotores || promotores.length === 0) {
      console.log('⚠️ Nenhum promotor encontrado')
      return []
    }

    // Buscar total de lojas
    const { data: lojas } = await supabase
      .from('lojas')
      .select('id')
    
    const totalLojas = lojas?.length || 1

    // Mapa para contar lojas únicas por marca
    const lojasPorMarca = new Map<string, Set<string>>()
    const nomePorMarca = new Map<string, string>()

    promotores.forEach(promotor => {
      const marcas = promotor.promotores_marcas?.map(pm => pm.marcas).filter(Boolean) || []
      
      marcas.forEach(marca => {
        if (marca && marca.id && marca.nome_marca && promotor.loja_id) {
          if (!lojasPorMarca.has(marca.id)) {
            lojasPorMarca.set(marca.id, new Set())
            nomePorMarca.set(marca.id, marca.nome_marca)
          }
          lojasPorMarca.get(marca.id)!.add(promotor.loja_id)
        }
      })
    })

    // Calcular cobertura percentual
    const coberturaMarcas: MarcaCobertura[] = Array.from(lojasPorMarca.entries()).map(([marcaId, lojasSet]) => ({
      nome_marca: nomePorMarca.get(marcaId) || 'Desconhecida',
      total_promotores: lojasSet.size,
      cobertura_percentual: Math.round((lojasSet.size / totalLojas) * 100)
    }))

    // Ordenar por total de lojas (maior para menor) e pegar top 20
    const top20 = coberturaMarcas
      .sort((a, b) => b.total_promotores - a.total_promotores)
      .slice(0, 20)

    console.log(`📊 Top ${top20.length} marcas encontradas`)
    
    return top20

  } catch (error) {
    console.error('❌ Erro ao buscar cobertura por marca:', error)
    return []
  }
}
