// NO ARQUIVO src/services/promotores.ts

export async function getPromotores(): Promise<Promotor[]> {
  const supabase = getSupabaseClient()
  
  // Consulta principal dos promotores
  const { data: promotores, error } = await supabase
    .from('promotores')
    .select(`
      *,
      lojas (id, nome_loja, cod_loja),
      gerentes (id, nome_gerente, telefone, cod_loja)
    `)
    .order('promotor_nome')
  
  if (error) throw error
  
  // Buscar as marcas para cada promotor
  const promotoresComMarcas = await Promise.all(
    (promotores || []).map(async (promotor) => {
      const { data: marcasRelacionadas } = await supabase
        .from('promotores_marcas')
        .select(`
          marca_id,
          marcas (id, nome_marca)
        `)
        .eq('promotor_id', promotor.id)
      
      const marcas = marcasRelacionadas
        ?.map(rel => rel.marcas)
        .filter(Boolean) || []
      
      return {
        ...promotor,
        marcas
      }
    })
  )
  
  return promotoresComMarcas
}
