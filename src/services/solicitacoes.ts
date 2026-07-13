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

// 🔥 FUNÇÃO AUXILIAR: BUSCAR USUÁRIO POR EMAIL OU ID
async function buscarUsuario(identifier: string): Promise<{ id: string; loja_id: string } | null> {
  // Tentar buscar por ID (UUID) primeiro
  const { data: byId, error: errorId } = await supabase
    .from('usuarios_internos')
    .select('id, loja_id')
    .eq('id', identifier)
    .maybeSingle()

  if (byId) {
    return byId
  }

  // Se não encontrou pelo ID, tentar por email
  const { data: byEmail, error: errorEmail } = await supabase
    .from('usuarios_internos')
    .select('id, loja_id')
    .eq('email', identifier)
    .maybeSingle()

  if (byEmail) {
    return byEmail
  }

  console.error('❌ Usuário não encontrado:', identifier, 'Erro ID:', errorId, 'Erro Email:', errorEmail)
  return null
}

// Listar solicitações
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

    // 🔥 Se não for admin, buscar apenas as solicitações do usuário
    if (!isAdmin && userId) {
      // Buscar o ID correto do usuário
      const userData = await buscarUsuario(userId)
      if (userData) {
        query = query.eq('solicitante_id', userData.id)
        console.log('🔍 Filtrando por solicitante_id:', userData.id)
      } else {
        console.warn('⚠️ Usuário não encontrado, retornando lista vazia')
        return []
      }
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

// 🔥 CRIAR SOLICITAÇÃO (CORRIGIDO)
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

    console.log('👤 Criando solicitação - userId:', userId)

    // 🔥 BUSCAR O USUÁRIO CORRETO
    const userData = await buscarUsuario(userId)
    
    if (!userData) {
      console.error('❌ Usuário não encontrado na tabela usuarios_internos')
      throw new Error('Usuário não encontrado')
    }

    console.log('✅ Usuário encontrado - ID:', userData.id, 'Loja:', userData.loja_id)

    // 🔥 DETERMINAR A LOJA
    let lojaId = data.loja_id
    
    // Se não for admin, usar a loja do usuário
    if (!isAdmin) {
      if (userData.loja_id) {
        lojaId = userData.loja_id
        console.log('🔒 Usando loja do usuário:', lojaId)
      } else {
        throw new Error('Usuário não tem loja vinculada')
      }
    }

    // 🔥 GARANTIR QUE A DATA ESTÁ NO FORMATO CORRETO
    const dataNecessidade = typeof data.data_necessidade === 'string' 
      ? data.data_necessidade 
      : new Date(data.data_necessidade).toISOString().split('T')[0]

    // 🔥 CONSTRUIR OBJETO DE INSERÇÃO
    const insertData = {
      loja_id: lojaId,
      solicitante_id: userData.id,  // ← ID CORRETO DA TABELA usuarios_internos
      tipo_solicitacao: data.tipo_solicitacao || 'novo',
      motivo: data.motivo,
      prioridade: data.prioridade || 'media',
      status: 'pendente',
      observacoes: data.observacoes || null,
      dias_semana_sugerido: data.dias_semana_sugerido || null,
      contato_responsavel: data.contato_responsavel || null,
      data_necessidade: dataNecessidade,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log('📦 Dados a serem inseridos:', insertData)

    const { data: solicitacao, error } = await supabase
      .from('solicitacoes_promotores')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ Erro Supabase ao criar solicitação:', error)
      throw error
    }

    console.log('✅ Solicitação criada com sucesso:', solicitacao.id)
    return solicitacao

  } catch (error) {
    console.error('❌ Erro ao criar solicitação:', error)
    return null
  }
}

// Atualizar status da solicitação
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
      return false
    }

    if (!isAdmin) {
      console.error('❌ Apenas administradores podem alterar status')
      return false
    }

    console.log('👤 Atualizando solicitação:', id, 'para status:', status)

    // 🔥 BUSCAR O USUÁRIO CORRETO
    const userData = await buscarUsuario(userId)
    
    if (!userData) {
      console.error('❌ Usuário não encontrado')
      return false
    }

    const updateData: any = { 
      status,
      updated_at: new Date().toISOString()
    }
    
    if (status === 'aprovado') {
      updateData.aprovado_por = userData.id
      updateData.data_aprovacao = new Date().toISOString()
    } else if (status === 'reprovado') {
      updateData.reprovado_por = userData.id
      updateData.data_reprovacao = new Date().toISOString()
      updateData.motivo_reprovacao = motivo || null
    }

    const { error } = await supabase
      .from('solicitacoes_promotores')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error('❌ Erro ao atualizar solicitação:', error)
      return false
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
