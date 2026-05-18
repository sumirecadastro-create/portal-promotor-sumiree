const loadData = async () => {
  try {
    setLoading(true)
    console.log('🚀 Iniciando loadData...')
    
    // Buscar lojas
    let lojasQuery = supabase
      .from('lojas')
      .select('id, cod_loja, nome_loja')
      .order('nome_loja')
    
    if (!isAdmin && userLojaId) {
      lojasQuery = lojasQuery.eq('id', userLojaId)
    }
    
    const { data: lojasData, error: lojasError } = await lojasQuery
    
    if (lojasError) {
      console.error('Erro ao buscar lojas:', lojasError)
      throw lojasError
    }
    
    setLojas(lojasData || [])
    console.log(`✅ ${lojasData?.length || 0} lojas carregadas`)
    
    // Buscar TODAS as campanhas (sem filtro de data aqui)
    const { data: campanhasData, error: campanhasError } = await supabase
      .from('campanhas')
      .select('*')
      .order('data_inicio')
    
    if (campanhasError) {
      console.error('Erro ao buscar campanhas:', campanhasError)
      throw campanhasError
    }
    
    console.log(`📊 ${campanhasData?.length || 0} campanhas encontradas no banco`)
    console.log('Campanhas brutas:', campanhasData)
    
    if (!campanhasData || campanhasData.length === 0) {
      console.log('❌ Nenhuma campanha encontrada!')
      setCampanhas([])
      setLoading(false)
      return
    }
    
    // Buscar relações com lojas para TODAS as campanhas
    const campanhaIds = campanhasData.map(c => c.id)
    console.log('IDs das campanhas:', campanhaIds)
    
    const { data: lojasRel, error: lojasRelError } = await supabase
      .from('lojas_campanhas')
      .select('campanha_id, loja_id')
      .in('campanha_id', campanhaIds)
    
    if (lojasRelError) {
      console.error('Erro ao buscar lojas_campanhas:', lojasRelError)
    } else {
      console.log(`🔗 ${lojasRel?.length || 0} relações encontradas em lojas_campanhas`)
    }
    
    // Buscar dados completos das lojas relacionadas
    const todosLojasIds = [...new Set(lojasRel?.map(r => r.loja_id) || [])]
    console.log('IDs das lojas relacionadas:', todosLojasIds)
    
    let lojasCompletas: any[] = []
    if (todosLojasIds.length > 0) {
      const { data: lojasTemp } = await supabase
        .from('lojas')
        .select('id, cod_loja, nome_loja')
        .in('id', todosLojasIds)
      lojasCompletas = lojasTemp || []
      console.log(`🏪 ${lojasCompletas.length} lojas completas carregadas`)
    }
    
    const lojasMap = new Map(lojasCompletas.map(l => [l.id, l]))
    
    // Organizar lojas por campanha
    const lojasPorCampanha: Record<string, any[]> = {}
    lojasRel?.forEach(rel => {
      if (!lojasPorCampanha[rel.campanha_id]) {
        lojasPorCampanha[rel.campanha_id] = []
      }
      const loja = lojasMap.get(rel.loja_id)
      if (loja) {
        lojasPorCampanha[rel.campanha_id].push(loja)
      }
    })
    
    // Formatar campanhas
    const campanhasFormatadas = campanhasData.map(camp => ({
      ...camp,
      lojas: lojasPorCampanha[camp.id] || []
    }))
    
    console.log('✅ Campanhas formatadas:', campanhasFormatadas.length)
    campanhasFormatadas.forEach(camp => {
      console.log(`📌 ${camp.nome}: ${camp.lojas?.length || 0} lojas, datas: ${camp.data_inicio} a ${camp.data_fim}`)
    })
    
    setCampanhas(campanhasFormatadas)
    
  } catch (error) {
    console.error('❌ Erro no loadData:', error)
    toast({
      variant: 'destructive',
      title: 'Erro',
      description: 'Não foi possível carregar os dados',
    })
  } finally {
    setLoading(false)
  }
}
