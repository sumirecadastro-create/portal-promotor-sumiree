import { supabase } from '@/lib/supabase'

export interface SolicitacaoPromotor {
  id: string
  loja_id: string
  loja?: {
    cod_loja: string
    nome_loja: string
    numero_loja: string
  }
  solicitante_id: string
  solicitante?: {
    nome: string
    email: string
  }
  tipo_solicitacao: 'novo' | 'reposicao' | 'transferencia' | 'temporario'
  motivo: string
  status: 'pendente' | 'analise' | 'aprovado' | 'reprovado' | 'cancelado'
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
  promotor_atual_id?: string
  promotor_atual?: {
    promotor_nome: string
  }
  promotor_sugerido_id?: string
  promotor_sugerido?: {
    promotor_nome: string
  }
  observacoes?: string
  dias_semana_sugerido?: string
  contato_responsavel?: string
  data_necessidade: string
  created_at: string
  updated_at: string
  aprovado_por?: string
  data_aprovacao?: string
  reprovado_por?: string
  data_reprovacao?: string
  motivo_reprovacao?: string
}

export interface CreateSolicitacaoData {
  loja_id: string
  tipo_solicitacao: 'novo' | 'reposicao' | 'transferencia' | 'temporario'
  motivo: string
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
  promotor_atual_id?: string
  promotor_sugerido_id?: string
  observacoes?: string
  dias_semana_sugerido?: string
  contato_responsavel?: string
  data_necessidade: string
}

// Listar solicitações do usuário ou todas (admin)
export async function getSolicitacoes(): Promise<SolicitacaoPromotor[]> {
  try {
    const { data: userData } = await supabase.auth.getUser()
    const isAdmin = userData?.user?.app_role === 'admin' || userData?.user?.app_role === 'regional'

    let query = supabase
      .from('solicitacoes_promotores')
      .select(`
        *,
        loja:loja_id (cod_loja, nome_loja, numero_loja),
        solicitante:solicitante_id (nome, email),
        promotor_atual:promotor_atual_id (promotor_nome),
        promotor_sugerido:promotor_sugerido_id (promotor_nome)
      `)
      .order('created_at', { ascending: false })

    if (!isAdmin) {
      query = query.eq('solicitante_id', userData.user.id)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Erro ao buscar solicitações:', error)
    return []
  }
}

// Criar nova solicitação
export async function createSolicitacao(data: CreateSolicitacaoData): Promise<SolicitacaoPromotor | null> {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) throw new Error('Usuário não autenticado')

    const { data: solicitacao, error } = await supabase
      .from('solicitacoes_promotores')
      .insert({
        ...data,
        solicitante_id: userData.user.id,
        status: 'pendente'
      })
      .select()
      .single()

    if (error) throw error

    // Registrar no histórico
    await supabase
      .from('historico_solicitacoes')
      .insert({
        solicitacao_id: solicitacao.id,
        usuario_id: userData.user.id,
        acao: 'criacao',
        descricao: `Solicitação de ${data.tipo_solicitacao} criada`
      })

    return solicitacao
  } catch (error) {
    console.error('Erro ao criar solicitação:', error)
    return null
  }
}

// Atualizar status da solicitação (admin/regional)
export async function updateSolicitacaoStatus(
  id: string,
  status: 'aprovado' | 'reprovado' | 'cancelado',
  motivo?: string
): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) throw new Error('Usuário não autenticado')

    const updateData: any = { status }
    
    if (status === 'aprovado') {
      updateData.aprovado_por = userData.user.id
      updateData.data_aprovacao = new Date().toISOString()
    } else if (status === 'reprovado') {
      updateData.reprovado_por = userData.user.id
      updateData.data_reprovacao = new Date().toISOString()
      updateData.motivo_reprovacao = motivo
    }

    const { error } = await supabase
      .from('solicitacoes_promotores')
      .update(updateData)
      .eq('id', id)

    if (error) throw error

    // Registrar no histórico
    await supabase
      .from('historico_solicitacoes')
      .insert({
        solicitacao_id: id,
        usuario_id: userData.user.id,
        acao: status,
        descricao: `Status alterado para ${status}${motivo ? `: ${motivo}` : ''}`
      })

    return true
  } catch (error) {
    console.error('Erro ao atualizar solicitação:', error)
    return false
  }
}

// Contar solicitações por status
export async function countSolicitacoes(): Promise<{ status: string; count: number }[]> {
  try {
    const { data, error } = await supabase
      .from('solicitacoes_promotores')
      .select('status, count')
      .group('status')

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Erro ao contar solicitações:', error)
    return []
  }
}
