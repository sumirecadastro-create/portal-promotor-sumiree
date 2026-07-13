// src/services/solicitacoes.ts
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

// 🔥 LISTAR SOLICITAÇÕES (RECEBE O USUÁRIO COMO PARÂMETRO)
export async function getSolicitacoes(userId: string, isAdmin: boolean): Promise<SolicitacaoPromotor[]> {
  try {
    console.log('👤 Buscando solicitações para usuário:', userId, 'isAdmin:', isAdmin)

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

    // Se não for admin, filtrar pelo usuário
    if (!isAdmin) {
      query = query.eq('solicitante_id', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ Erro ao buscar solicitações:', error)
      throw error
    }
    
    console.log('✅ Solicitações encontradas:', data?.length || 0)
    return data || []
  } catch (error) {
    console.error('❌ Erro ao buscar solicitações:', error)
    return []
  }
}

// 🔥 CRIAR SOLICITAÇÃO (RECEBE O USUÁRIO COMO PARÂMETRO)
export async function createSolicitacao(
  data: CreateSolicitacaoData,
  userId: string,
  isAdmin: boolean
): Promise<SolicitacaoPromotor | null> {
  try {
    if (!userId) {
      console.error('❌ Usuário não autenticado')
      throw new Error('Usuário não autenticado')
    }

    console.log('👤 Criando solicitação para usuário:', userId)

    // 🔥 VERIFICAR SE O USUÁRIO TEM PERMISSÃO PARA CRIAR
    // Gerentes só podem criar para sua própria loja
    if (!isAdmin) {
      // Buscar a loja do gerente
      const { data: userData } = await supabase
        .from('usuarios_internos')
        .select('loja_id')
        .eq('id', userId)
        .single()
      
      if (userData && userData.loja_id !== data.loja_id) {
        throw new Error('Você só pode criar solicitações para sua própria loja')
      }
    }

    const { data: solicitacao, error } = await supabase
      .from('solicitacoes_promotores')
      .insert({
        loja_id: data.loja_id,
        tipo_solicitacao: data.tipo_solicitacao || 'novo',
        motivo: data.motivo,
        prioridade: data.prioridade || 'media',
        solicitante_id: userId,
        status: 'pendente',
        observacoes: data.observacoes || null,
        dias_semana_sugerido: data.dias_semana_sugerido || null,
        contato_responsavel: data.contato_responsavel || null,
        data_necessidade: data.data_necessidade,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Erro Supabase ao criar solicitação:', error)
      throw error
    }

    console.log('✅ Solicitação criada com sucesso:', solicitacao.id)

    // Registrar no histórico (opcional)
    try {
      await supabase
        .from('historico_solicitacoes')
        .insert({
          solicitacao_id: solicitacao.id,
          usuario_id: userId,
          acao: 'criacao',
          descricao: `Solicitação de ${data.tipo_solicitacao} criada`
        })
    } catch (histError) {
      console.warn('⚠️ Erro ao registrar histórico:', histError)
    }

    return solicitacao
  } catch (error) {
    console.error('❌ Erro ao criar solicitação:', error)
    return null
  }
}

// 🔥 ATUALIZAR STATUS (RECEBE O USUÁRIO COMO PARÂMETRO)
export async function updateSolicitacaoStatus(
  id: string,
  status: 'aprovado' | 'reprovado' | 'cancelado',
  userId: string,
  isAdmin: boolean,
  motivo?: string
): Promise<boolean> {
  try {
    if (!userId) {
      console.error('❌ Usuário não autenticado')
      throw new Error('Usuário não autenticado')
    }

    // Verificar permissão
    if (!isAdmin) {
      throw new Error('Apenas administradores podem alterar o status')
    }

    console.log('👤 Atualizando solicitação:', id, 'para status:', status)

    const updateData: any = { 
      status,
      updated_at: new Date().toISOString()
    }
    
    if (status === 'aprovado') {
      updateData.aprovado_por = userId
      updateData.data_aprovacao = new Date().toISOString()
    } else if (status === 'reprovado') {
      updateData.reprovado_por = userId
      updateData.data_reprovacao = new Date().toISOString()
      updateData.motivo_reprovacao = motivo || null
    }

    const { error } = await supabase
      .from('solicitacoes_promotores')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error('❌ Erro ao atualizar solicitação:', error)
      throw error
    }

    // Registrar no histórico
    try {
      await supabase
        .from('historico_solicitacoes')
        .insert({
          solicitacao_id: id,
          usuario_id: userId,
          acao: status,
          descricao: `Status alterado para ${status}${motivo ? `: ${motivo}` : ''}`
        })
    } catch (histError) {
      console.warn('⚠️ Erro ao registrar histórico:', histError)
    }

    console.log('✅ Solicitação atualizada com sucesso')
    return true
  } catch (error) {
    console.error('❌ Erro ao atualizar solicitação:', error)
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
