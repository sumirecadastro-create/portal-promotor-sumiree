// Adicione no final do arquivo promotores.ts, antes do export

// Buscar todos os gerentes disponíveis
export async function getGerentesDisponiveis(): Promise<{ id: string; nome_gerente: string; telefone: string | null; cod_loja: string | null }[]> {
  try {
    const { data, error } = await supabase
      .from('gerentes')
      .select('id, nome_gerente, telefone, cod_loja')
      .order('nome_gerente')

    if (error) {
      console.error('Erro ao buscar gerentes disponíveis:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Erro inesperado em getGerentesDisponiveis:', error)
    return []
  }
}
