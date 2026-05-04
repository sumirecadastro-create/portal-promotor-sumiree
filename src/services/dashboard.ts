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
    // 🔹 Total de Lojas (filtrado para gerente)
    let lojasQuery = supabase.from('lojas').select('*', { count: 'exact', head: true })
    if (!isAdmin && lojaId) {
      lojasQuery = lojasQuery.eq('id', lojaId)
    }
    const { count: totalLojas, error: lojasError } = await lojasQuery
    if (lojasError) console.error('Erro lojas:', lojasError)

    // 🔹 Promotores Ativos (filtrado por loja)
    let promotoresQuery = supabase
      .from('promotores')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ativo')
    
    if (!isAdmin && lojaId) {
      promotoresQuery = promotoresQuery.eq('loja_id', lojaId)
    }
    const { count: promotoresAtivos, error: promotoresError } = await promotoresQuery
    if (promotoresError) console.error('Erro promotores:', promotoresError)

    // 🔹 Lojas com promotor (para cobertura) - filtrado
    let promotoresLojasQuery = supabase
      .from('promotores')
      .select('loja_id')
      .eq('status', 'ativo')
    
    if (!isAdmin && lojaId) {
      promotoresLojasQuery = promotoresLojasQuery.eq('loja_id', lojaId)
    }
    const { data: promotores } = await promotoresLojasQuery

    const lojasComPromotor = new Set(promotores?.map(p => p.loja_id).filter(Boolean))
    
    // Total de lojas para cálculo de cobertura (filtrado)
    let totalLojasCoberturaQuery = supabase.from('lojas').select('*', { count: 'exact', head: true })
    if (!isAdmin && lojaId) {
      totalLojasCoberturaQuery = totalLojasCoberturaQuery.eq('id', lojaId)
    }
    const { count: totalLojasCobertura } = await totalLojasCoberturaQuery
    
    const cobertura = totalLojasCobertura && totalLojasCobertura > 0
      ? Math.round((lojasComPromotor.size / totalLojasCobertura) * 100)
      : 0

    // 🔹 Visitas recentes (filtrado por loja)
    let recentVisits: RecentVisit[] = []
    const hoje = new Date().toISOString().split('T')[0]
    
    let visitasQuery = supabase
      .from('visitas')
      .select('*, promotores(promotor_nome), lojas(nome_loja)')
      .gte('check_in', hoje)
      .order('check_in', { ascending: false })
      .limit(10)
    
    if (!isAdmin && lojaId) {
      visitasQuery = visitasQuery.eq('loja_id', lojaId)
    }
    
    const { data: visitas, error: visitasError } = await visitasQuery
    
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

    // 🔹 Contagem de visitas hoje
    let visitasHojeQuery = supabase
      .from('visitas')
      .select('*', { count: 'exact', head: true })
      .gte('check_in', hoje)
    
    if (!isAdmin && lojaId) {
      visitasHojeQuery = visitasHojeQuery.eq('loja_id', lojaId)
    }
    const { count: visitasHoje } = await visitasHojeQuery

    return {
      stats: {
        totalLojas: totalLojas || 0,
        promotoresAtivos: promotoresAtivos || 0,
        cobertura,
        visitasHoje: visitasHoje || 0,
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

export async function getCoberturaPorMarcaComLojas(lojaId: string | null = null, isAdmin: boolean = true): Promise<MarcaCobertura[]> {
  try {
    console.log('🔍 Buscando cobertura por marca...')
    
    // Buscar relação promotores-marcas com os dados de loja
    let query = supabase
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
    
    const { data: promotoresMarcas, error } = await query
    
    if (error) {
      console.error('❌ Erro ao buscar dados:', error)
      return []
    }

    if (!promotoresMarcas || promotoresMarcas.length === 0) {
      console.log('⚠️ Nenhum relacionamento promotor-marca encontrado')
      return []
    }

    // Buscar total de lojas (filtrado para gerente)
    let totalLojasQuery = supabase.from('lojas').select('*', { count: 'exact', head: true })
    if (!isAdmin && lojaId) {
      totalLojasQuery = totalLojasQuery.eq('id', lojaId)
    }
    const { count: totalLojas } = await totalLojasQuery

    // Mapa para contar lojas únicas por marca
    const lojasPorMarca = new Map<string, Set<string>>()
    const nomePorMarca = new Map<string, string>()

    promotoresMarcas.forEach((item: any) => {
      // Verificar se o promotor está ativo
      const promotorAtivo = item.promotores?.status === 'ativo'
      const marcaId = item.marcas?.id
      const marcaNome = item.marcas?.nome
      const lojaIdPromotor = item.promotores?.loja_id
      
      // Se não for admin, filtrar apenas pela loja do gerente
      if (!isAdmin && lojaId && lojaIdPromotor !== lojaId) {
        return
      }
      
      if (marcaId && marcaNome && lojaIdPromotor && promotorAtivo) {
        if (!lojasPorMarca.has(marcaId)) {
          lojasPorMarca.set(marcaId, new Set())
          nomePorMarca.set(marcaId, marcaNome)
        }
        lojasPorMarca.get(marcaId)!.add(lojaIdPromotor)
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
