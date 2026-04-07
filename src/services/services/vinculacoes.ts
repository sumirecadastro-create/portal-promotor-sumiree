import { supabase } from '@/lib/supabase'

export interface Vinculacao {
  id: string
  promotor_id: string
  loja_id: string
  data_inicio: string
  data_fim?: string
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface VinculacaoCompleta extends Vinculacao {
  promotor?: {
    id: string
    promotor_nome: string
    email: string
    telefone: string
  }
  loja?: {
    id: string
    cod_loja: string
    nome_loja: string
    endereco: string
  }
}

// Buscar vinculações ativas de um promotor
export async function getVinculacoesPromotor(promotorId: string): Promise<Vinculacao[]> {
  const { data, error } = await supabase
    .from('vinculacoes_promotor_loja')
    .select('*')
    .eq('promotor_id', promotorId)
    .eq('ativo', true)
  
  if (error) throw error
  return data || []
}

// Buscar loja vinculada a um promotor
export async function getLojaVinculada(promotorId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('vinculacoes_promotor_loja')
    .select('loja_id')
    .eq('promotor_id', promotorId)
    .eq('ativo', true)
    .single()
  
  if (error) return null
  return data?.loja_id || null
}

// Buscar todas as vinculações ativas (para gerente)
export async function getAllVinculacoes(): Promise<VinculacaoCompleta[]> {
  const { data, error } = await supabase
    .from('vinculacoes_promotor_loja')
    .select(`
      *,
      promotor:promotores(id, promotor_nome, email, telefone),
      loja:lojas(id, cod_loja, nome_loja, endereco)
    `)
    .eq('ativo', true)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

// Criar vinculação
export async function createVinculacao(
  promotorId: string,
  lojaId: string
): Promise<Vinculacao> {
  // Verificar se promotor já tem vinculação ativa
  const existing = await getVinculacoesPromotor(promotorId)
  if (existing.length > 0) {
    throw new Error('Promotor já possui uma vinculação ativa')
  }

  // Verificar se loja já tem promotor
  const { data: lojaVinculada } = await supabase
    .from('vinculacoes_promotor_loja')
    .select('id')
    .eq('loja_id', lojaId)
    .eq('ativo', true)
    .single()

  if (lojaVinculada) {
    throw new Error('Loja já possui um promotor vinculado')
  }

  const { data, error } = await supabase
    .from('vinculacoes_promotor_loja')
    .insert({
      promotor_id: promotorId,
      loja_id: lojaId,
      data_inicio: new Date().toISOString(),
      ativo: true
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Desativar vinculação
export async function desativarVinculacao(vinculacaoId: string): Promise<void> {
  const { error } = await supabase
    .from('vinculacoes_promotor_loja')
    .update({
      ativo: false,
      data_fim: new Date().toISOString()
    })
    .eq('id', vinculacaoId)
  
  if (error) throw error
}

// Buscar lojas sem promotor
export async function getLojasSemPromotor(): Promise<any[]> {
  const { data: vinculacoes } = await supabase
    .from('vinculacoes_promotor_loja')
    .select('loja_id')
    .eq('ativo', true)
  
  const lojasOcupadas = new Set(vinculacoes?.map(v => v.loja_id) || [])
  
  const { data: todasLojas } = await supabase
    .from('lojas')
    .select('*')
    .order('nome_loja')
  
  return (todasLojas || []).filter(loja => !lojasOcupadas.has(loja.id))
}

// Buscar promotores sem loja
export async function getPromotoresSemLoja(): Promise<any[]> {
  const { data: vinculacoes } = await supabase
    .from('vinculacoes_promotor_loja')
    .select('promotor_id')
    .eq('ativo', true)
  
  const promotoresOcupados = new Set(vinculacoes?.map(v => v.promotor_id) || [])
  
  const { data: todosPromotores } = await supabase
    .from('promotores')
    .select('*')
    .eq('status', 'ativo')
    .order('promotor_nome')
  
  return (todosPromotores || []).filter(p => !promotoresOcupados.has(p.id))
}
