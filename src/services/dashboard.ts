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

    // Como não temos tabela 'visitas', retornamos array vazio
    // Você pode criar esta tabela depois
    const recentVisits: RecentVisit[] = []

    return {
      stats: {
        totalLojas: totalLojas || 0,
        promotoresAtivos: promotoresAtivos || 0,
        cobertura,
        visitasHoje: 0,
      },
      recentVisits: [],
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
    
    // Buscar todas as marcas
    const { data: marcas, error: marcasError } = await supabase
      .from('marcas')
      .select('id, nome_marca')
    
    if (marcasError) {
      console.error('❌ Erro ao buscar marcas:', marcasError)
      return []
    }

    if (!marcas || marcas.length === 0) {
      console.log('⚠️ Nenhuma marca encontrada')
      return []
    }

    // Buscar total de lojas
    const { count: totalLojas } = await supabase
      .from('lojas')
      .select('*', { count: 'exact', head: true })

    // Para cada marca, contar quantos promotores (via relação)
    const coberturaMarcas: MarcaCobertura[] = []
    
    for (const marca of marcas) {
      // Buscar promotores associados a esta marca
      const { data: promotores } = await supabase
        .from('promotores')
        .select('loja_id')
        .eq('marca_produto', marca.nome_marca)  // Usando campo da tabela promotores
        .eq('status', 'ativo')

      const lojasUnicas = new Set(promotores?.map(p => p.loja_id).filter(Boolean))
      const totalLojasMarca = lojasUnicas.size
      
      coberturaMarcas.push({
        nome_marca: marca.nome_marca,
        total_promotores: totalLojasMarca,
        cobertura_percentual: totalLojas ? Math.round((totalLojasMarca / totalLojas) * 100) : 0
      })
    }

    // Ordenar por total de lojas (maior para menor) e pegar top 20
    const top20 = coberturaMarcas
      .sort((a, b) => b.total_promotores - a.total_promotores)
      .slice(0, 20)

    console.log(`📊 Top ${top20.length} marcas encontradas`, top20)
    
    return top20

  } catch (error) {
    console.error('❌ Erro ao buscar cobertura por marca:', error)
    return []
  }
}
