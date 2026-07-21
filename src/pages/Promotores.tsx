// ============================================
// FUNÇÃO CORRIGIDA COM JOINS
// ============================================

const carregarPromotoresComLojas = async (promotorIds: string[]) => {
  if (promotorIds.length === 0) return []

  const { data: promotoresData, error: promotoresError } = await supabase
    .from('promotores')
    .select(`
      *,
      promotores_lojas(
        lojas(
          id,
          cod_loja,
          nome_loja,
          gerente_id,
          gerentes(
            id,
            nome_gerente,
            telefone,
            cod_loja
          )
        )
      ),
      promotores_marcas(
        marcas(
          id,
          nome
        )
      )
    `)
    .eq('status', 'ativo')
    .in('id', promotorIds)
    .order('promotor_nome')

  if (promotoresError) throw promotoresError

  return promotoresData.map((promotor) => {
    // Extrair lojas com seus gerentes
    const lojasComGerentes = promotor.promotores_lojas
      ?.map((pl: any) => pl.lojas)
      .filter(Boolean) || []

    // Extrair gerentes únicos das lojas
    const gerentesMap = new Map()
    lojasComGerentes.forEach((loja: any) => {
      if (loja.gerentes) {
        gerentesMap.set(loja.gerentes.id, loja.gerentes)
      }
    })
    const gerentes = Array.from(gerentesMap.values())

    // Extrair marcas
    const marcas = promotor.promotores_marcas
      ?.map((pm: any) => pm.marcas)
      .filter(Boolean) || []

    // Extrair lojas (sem os gerentes aninhados)
    const lojas = lojasComGerentes.map((loja: any) => ({
      id: loja.id,
      cod_loja: loja.cod_loja,
      nome_loja: loja.nome_loja,
      gerente_id: loja.gerente_id
    }))

    return {
      ...promotor,
      lojas,
      gerentes,
      marcas,
      carta: null
    }
  })
}

// ============================================
// FUNÇÃO LOAD DATA ATUALIZADA
// ============================================

const loadData = async () => {
  setLoading(true)
  setError(null)
  
  try {
    console.log('🚀 Carregando dados...')
    
    // Buscar lojas permitidas
    let lojaIdsPermitidas: string[] = []
    
    if (isAdmin) {
      const { data: lojas } = await supabase.from('lojas').select('id')
      lojaIdsPermitidas = lojas?.map(l => l.id) || []
    } else if (isRegional && userLojaId) {
      const { data } = await supabase
        .from('gerentes_regionais_lojas')
        .select('loja_id')
        .eq('gerente_regional_id', userLojaId)
      lojaIdsPermitidas = data?.map(l => l.loja_id) || []
    } else if (isGerente && userLojaId) {
      lojaIdsPermitidas = [userLojaId]
    } else {
      const { data: lojas } = await supabase.from('lojas').select('id')
      lojaIdsPermitidas = lojas?.map(l => l.id) || []
    }

    // Buscar promotores filtrados
    let promotoresData = []
    
    if (lojaIdsPermitidas.length > 0) {
      const { data: promotoresLojas } = await supabase
        .from('promotores_lojas')
        .select('promotor_id')
        .in('loja_id', lojaIdsPermitidas)
      
      const promotorIds = [...new Set(promotoresLojas?.map(p => p.promotor_id) || [])]
      
      if (promotorIds.length > 0) {
        promotoresData = await carregarPromotoresComLojas(promotorIds)
      } else {
        promotoresData = []
      }
    } else {
      promotoresData = await getPromotores()
    }

    // Buscar lojas
    let lojasData = []
    if (lojaIdsPermitidas.length > 0) {
      const { data, error } = await supabase
        .from('lojas')
        .select('*')
        .in('id', lojaIdsPermitidas)
        .order('nome_loja')
      
      if (error) throw error
      lojasData = data || []
    } else {
      lojasData = await getLojas()
    }

    // Buscar gerentes e marcas
    const [gerentesData, marcasData] = await Promise.all([
      getGerentesDisponiveis(),
      getMarcasDisponiveis()
    ])
    
    setPromotores(Array.isArray(promotoresData) ? promotoresData : [])
    setLojas(Array.isArray(lojasData) ? lojasData : [])
    setGerentes(Array.isArray(gerentesData) ? gerentesData : [])
    setMarcasDisponiveis(Array.isArray(marcasData) ? marcasData : [])
    
  } catch (err: any) {
    console.error('❌ Erro ao carregar:', err)
    setError(err instanceof Error ? err : new Error(err?.message || 'Erro desconhecido'))
    toast({
      variant: 'destructive',
      title: 'Erro ao carregar',
      description: err?.message || 'Não foi possível carregar os dados',
    })
  } finally {
    setLoading(false)
  }
}
