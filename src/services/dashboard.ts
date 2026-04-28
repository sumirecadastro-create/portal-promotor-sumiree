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

export async function getDashboardData(): Promise<{
  stats: DashboardStats
  recentVisits: RecentVisit[]
}> {
  try {
    // Buscar total de lojas
    const { count: totalLojas, error: lojasError } = await supabase
      .from('lojas')
      .select('*', { count: 'exact', head: true })
    
    if (lojasError) console.error('Erro lojas:', lojasError)

    // Buscar promotores ativos
    const { count: promotoresAtivos, error: promotoresError } = await supabase
      .from('promotores')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ativo')
    
    if (promotoresError) console.error('Erro promotores:', promotoresError)

    // Buscar lojas com promotor (para cobertura)
    const { data: promotores } = await supabase
      .from('promotores')
      .select('loja_id')
      .eq('status', 'ativo')

    const lojasComPromotor = new Set(promotores?.map(p => p.loja_id).filter(Boolean))
    const cobertura = totalLojas ? Math.round((lojasComPromotor.size / totalLojas) * 100) : 0

    // Buscar visitas recentes (se a tabela existir)
    let recentVisits: RecentVisit[] = []
    
    const { data: visitas, error: visitasError } = await supabase
      .from('visitas')
      .select('*, promotores(promotor_nome), lojas(nome_loja)')
      .order('check_in', { ascending: false })
      .limit(5)
    
    if (!visitasError && visitas) {
      recentVisits = visitas.map((v: any) => ({
        id: v.id,
        promotor_nome: v.promotores?.promotor_nome || 'Desconhecido',
        loja_nome: v.lojas?.nome_loja || 'Desconhecida',
        check_in: v.check_in,
        check_out: v.check_out,
        status: v.status || 'pendente'
      }))
    }

    return {
      stats: {
        totalLojas: totalLojas || 0,
        promotoresAtivos: promotoresAtivos || 0,
        cobertura,
        visitasHoje: 0,
      },
      recentVisits,
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
    
    // Buscar relação promotores-marcas com os dados de loja
    const { data: promotoresMarcas, error } = await supabase
      .from('promotores_marcas')
      .select(`
        promotor_id,
        promotores!inner (
          loja_id,
          status
        ),
        marcas!inner (
          id,
          nome
        )
      `)
    
    if (error) {
      console.error('❌ Erro ao buscar dados:', error)
      return []
    }

    if (!promotoresMarcas || promotoresMarcas.length === 0) {
      console.log('⚠️ Nenhum relacionamento promotor-marca encontrado')
      return []
    }

    // Buscar total de lojas
    const { count: totalLojas } = await supabase
      .from('lojas')
      .select('*', { count: 'exact', head: true })

    // Mapa para contar lojas únicas por marca
    const lojasPorMarca = new Map<string, Set<string>>()
    const nomePorMarca = new Map<string, string>()

    promotoresMarcas.forEach((item: any) => {
      // Verificar se o promotor está ativo
      const promotorAtivo = item.promotores?.status === 'ativo'
      const marcaId = item.marcas?.id
      const marcaNome = item.marcas?.nome
      const lojaId = item.promotores?.loja_id
      
      if (marcaId && marcaNome && lojaId && promotorAtivo) {
        if (!lojasPorMarca.has(marcaId)) {
          lojasPorMarca.set(marcaId, new Set())
          nomePorMarca.set(marcaId, marcaNome)
        }
        lojasPorMarca.get(marcaId)!.add(lojaId)
      }
    })

    // Converter para array e ordenar
    const coberturaMarcas: MarcaCobertura[] = Array.from(lojasPorMarca.entries())
      .map(([marcaId, lojasSet]) => ({
        nome_marca: nomePorMarca.get(marcaId) || 'Desconhecida',
        total_promotores: lojasSet.size,
        cobertura_percentual: totalLojas ? Math.round((lojasSet.size / totalLojas) * 100) : 0
      }))
      .sort((a, b) => b.total_promotores - a.total_promotores)
      .slice(0, 20)

    console.log(`📊 Top ${coberturaMarcas.length} marcas encontradas`, coberturaMarcas)
    
    return coberturaMarcas
  } catch (error) {
    console.error('❌ Erro ao buscar cobertura por marca:', error)
    return []
  }
}
