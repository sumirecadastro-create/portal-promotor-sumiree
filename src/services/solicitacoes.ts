// services/solicitacoes.ts
import { supabase } from '@/lib/supabase'

// ============================================
// TIPOS
// ============================================

export type TipoSolicitacao = 'novo' | 'reposicao' | 'transferencia' | 'temporario'
export type StatusSolicitacao = 'pendente' | 'analise' | 'aprovado' | 'reprovado' | 'cancelado'
export type PrioridadeSolicitacao = 'baixa' | 'media' | 'alta' | 'urgente'

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
    tipo_solicitacao: TipoSolicitacao
    motivo: string
    status: StatusSolicitacao
    prioridade: PrioridadeSolicitacao
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
    tipo_solicitacao: TipoSolicitacao
    motivo: string
    prioridade: PrioridadeSolicitacao
    promotor_atual_id?: string
    promotor_sugerido_id?: string
    observacoes?: string
    dias_semana_sugerido?: string
    contato_responsavel?: string
    data_necessidade: string
}

// ============================================
// CONSTANTES
// ============================================

const SOLICITACAO_SELECT = `
    *,
    loja:loja_id (
        cod_loja,
        nome_loja,
        numero_loja
    ),
    solicitante:solicitante_id (
        nome,
        email
    ),
    promotor_atual:promotor_atual_id (
        promotor_nome
    ),
    promotor_sugerido:promotor_sugerido_id (
        promotor_nome
    )
`

// ============================================
// MAPEAMENTOS PARA UI (APENAS DADOS, SEM JSX)
// ============================================

export const STATUS_LABELS: Record<StatusSolicitacao, { label: string; color: string; icon: string }> = {
    pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700', icon: '⏳' },
    analise: { label: 'Em Análise', color: 'bg-blue-100 text-blue-700', icon: '🔍' },
    aprovado: { label: 'Aprovado', color: 'bg-green-100 text-green-700', icon: '✅' },
    reprovado: { label: 'Reprovado', color: 'bg-red-100 text-red-700', icon: '❌' },
    cancelado: { label: 'Cancelado', color: 'bg-gray-100 text-gray-700', icon: '🚫' }
}

export const PRIORIDADE_LABELS: Record<PrioridadeSolicitacao, { label: string; color: string; order: number }> = {
    baixa: { label: 'Baixa', color: 'bg-gray-100 text-gray-700', order: 1 },
    media: { label: 'Média', color: 'bg-blue-100 text-blue-700', order: 2 },
    alta: { label: 'Alta', color: 'bg-orange-100 text-orange-700', order: 3 },
    urgente: { label: 'Urgente', color: 'bg-red-100 text-red-700', order: 4 }
}

export const TIPO_LABELS: Record<TipoSolicitacao, { label: string; description: string }> = {
    novo: { label: 'Novo Promotor', description: 'Solicitação de um novo promotor para a loja' },
    reposicao: { label: 'Reposição', description: 'Substituição de um promotor atual' },
    transferencia: { label: 'Transferência', description: 'Transferência de promotor entre lojas' },
    temporario: { label: 'Temporário', description: 'Solicitação de promotor temporário' }
}

// ============================================
// FUNÇÃO AUXILIAR - GARANTIR USUÁRIO INTERNO
// ============================================

/**
 * 🔥 Garante que o usuário existe na tabela usuários_internos
 * Retorna o ID do usuário interno ou null se falhar
 */
async function ensureUsuarioInterno(userId: string, email?: string, nome?: string): Promise<string | null> {
    try {
        // 🔥 Verificar se o usuário já existe
        const { data: existing, error: checkError } = await supabase
            .from('usuários_internos')
            .select('id')
            .eq('id', userId)
            .maybeSingle()

        if (checkError) {
            console.error('❌ Erro ao verificar usuário interno:', checkError)
            return null
        }

        if (existing) {
            return existing.id
        }

        // 🔥 Criar o usuário em usuários_internos
        const nomeUsuario = nome || email?.split('@')[0] || 'Usuário'
        const { error: insertError } = await supabase
            .from('usuários_internos')
            .insert({
                id: userId,
                nome: nomeUsuario,
                email: email || null,
                app_role: 'promotor',
                status: 'ativo'
            })

        if (insertError) {
            console.error('❌ Erro ao criar usuário interno:', insertError)
            return null
        }

        console.log('✅ Usuário interno criado com sucesso:', userId)
        return userId
    } catch (error) {
        console.error('❌ Erro ao garantir usuário interno:', error)
        return null
    }
}

/**
 * 🔥 Busca um usuário admin para fallback
 */
async function getAdminUserFallback(): Promise<string | null> {
    try {
        const { data: admin, error } = await supabase
            .from('usuários_internos')
            .select('id')
            .eq('app_role', 'admin')
            .limit(1)
            .maybeSingle()

        if (error) {
            console.error('❌ Erro ao buscar admin:', error)
            return null
        }

        return admin?.id || null
    } catch (error) {
        console.error('❌ Erro ao buscar admin:', error)
        return null
    }
}

// ============================================
// FUNÇÕES DE CONSULTA
// ============================================

/**
 * 🔥 Buscar todas as solicitações (filtradas por permissão)
 */
export async function getSolicitacoes(): Promise<SolicitacaoPromotor[]> {
    try {
        const { data: userData } = await supabase.auth.getUser()
        const user = userData?.user

        if (!user) {
            console.warn('⚠️ Usuário não autenticado')
            return []
        }

        const appRole = user.app_role || 'promotor'

        let query = supabase
            .from('solicitacoes_promotores')
            .select(SOLICITACAO_SELECT)
            .order('created_at', { ascending: false })

        if (appRole === 'admin') {
            // sem filtro
        } else if (appRole === 'regional') {
            const { data: lojasRegional } = await supabase
                .from('gerentes_regionais_lojas')
                .select('loja_id')
                .eq('gerente_regional_id', user.id)

            const lojaIds = lojasRegional?.map(l => l.loja_id) || []

            if (lojaIds.length === 0) {
                return []
            }

            query = query.in('loja_id', lojaIds)
        } else if (appRole === 'gerente' && user.loja_id) {
            query = query.eq('loja_id', user.loja_id)
        } else {
            query = query.eq('solicitante_id', user.id)
        }

        const { data, error } = await query

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('❌ Erro ao buscar solicitações:', error)
        return []
    }
}

/**
 * 🔥 Buscar solicitações por loja
 */
export async function getSolicitacoesByLoja(lojaId: string): Promise<SolicitacaoPromotor[]> {
    try {
        const { data, error } = await supabase
            .from('solicitacoes_promotores')
            .select(SOLICITACAO_SELECT)
            .eq('loja_id', lojaId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('❌ Erro ao buscar solicitações por loja:', error)
        return []
    }
}

/**
 * 🔥 Buscar solicitações por status
 */
export async function getSolicitacoesByStatus(status: StatusSolicitacao): Promise<SolicitacaoPromotor[]> {
    try {
        const { data, error } = await supabase
            .from('solicitacoes_promotores')
            .select(SOLICITACAO_SELECT)
            .eq('status', status)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('❌ Erro ao buscar solicitações por status:', error)
        return []
    }
}

/**
 * 🔥 Buscar uma solicitação por ID
 */
export async function getSolicitacaoById(id: string): Promise<SolicitacaoPromotor | null> {
    try {
        const { data, error } = await supabase
            .from('solicitacoes_promotores')
            .select(SOLICITACAO_SELECT)
            .eq('id', id)
            .single()

        if (error) throw error
        return data
    } catch (error) {
        console.error('❌ Erro ao buscar solicitação por ID:', error)
        return null
    }
}

// ============================================
// FUNÇÕES DE ESCRITA
// ============================================

/**
 * 🔥 Criar nova solicitação
 */
export async function createSolicitacao(data: CreateSolicitacaoData): Promise<SolicitacaoPromotor | null> {
    try {
        // 🔥 1. Buscar usuário autenticado
        const { data: userData } = await supabase.auth.getUser()
        const user = userData?.user

        if (!user) {
            console.error('❌ Usuário não autenticado')
            throw new Error('Usuário não autenticado. Faça login novamente.')
        }

        console.log('👤 Usuário autenticado:', user.id, user.email)

        // 🔥 2. Garantir que o usuário existe em usuários_internos
        let solicitanteId = await ensureUsuarioInterno(user.id, user.email, user.user_metadata?.nome)

        // 🔥 3. Se não conseguiu criar o usuário, usar fallback admin
        if (!solicitanteId) {
            console.warn('⚠️ Não foi possível criar usuário interno, tentando fallback admin...')
            const adminId = await getAdminUserFallback()
            
            if (adminId) {
                solicitanteId = adminId
                console.log('✅ Usando admin como fallback:', adminId)
            } else {
                console.error('❌ Nenhum admin encontrado para fallback')
                throw new Error('Não foi possível identificar o solicitante. Contate o administrador.')
            }
        }

        // 🔥 4. Validar dados obrigatórios
        if (!data.loja_id) {
            throw new Error('Loja é obrigatória')
        }
        if (!data.motivo || data.motivo.trim().length < 3) {
            throw new Error('Motivo é obrigatório (mínimo 3 caracteres)')
        }
        if (!data.data_necessidade) {
            throw new Error('Data de necessidade é obrigatória')
        }

        console.log('📝 Criando solicitação:', {
            loja_id: data.loja_id,
            solicitante_id: solicitanteId,
            tipo_solicitacao: data.tipo_solicitacao || 'novo',
            motivo: data.motivo.trim(),
            prioridade: data.prioridade || 'media',
            data_necessidade: data.data_necessidade
        })

        // 🔥 5. Inserir a solicitação
        const { data: solicitacao, error } = await supabase
            .from('solicitacoes_promotores')
            .insert({
                loja_id: data.loja_id,
                solicitante_id: solicitanteId,
                tipo_solicitacao: data.tipo_solicitacao || 'novo',
                motivo: data.motivo.trim(),
                prioridade: data.prioridade || 'media',
                observacoes: data.observacoes || null,
                dias_semana_sugerido: data.dias_semana_sugerido || null,
                contato_responsavel: data.contato_responsavel || null,
                data_necessidade: data.data_necessidade,
                status: 'pendente'
            })
            .select(SOLICITACAO_SELECT)
            .single()

        if (error) {
            console.error('❌ Erro Supabase ao criar solicitação:', error)
            
            // 🔥 6. Se o erro for de foreign key, tentar criar usuário novamente
            if (error.message?.includes('foreign key')) {
                console.warn('⚠️ Erro de foreign key, tentando recriar usuário...')
                
                const newUserId = await ensureUsuarioInterno(user.id, user.email, user.user_metadata?.nome || user.email)
                
                if (newUserId) {
                    const { data: retryData, error: retryError } = await supabase
                        .from('solicitacoes_promotores')
                        .insert({
                            loja_id: data.loja_id,
                            solicitante_id: newUserId,
                            tipo_solicitacao: data.tipo_solicitacao || 'novo',
                            motivo: data.motivo.trim(),
                            prioridade: data.prioridade || 'media',
                            observacoes: data.observacoes || null,
                            dias_semana_sugerido: data.dias_semana_sugerido || null,
                            contato_responsavel: data.contato_responsavel || null,
                            data_necessidade: data.data_necessidade,
                            status: 'pendente'
                        })
                        .select(SOLICITACAO_SELECT)
                        .single()

                    if (retryError) {
                        console.error('❌ Erro na segunda tentativa:', retryError)
                        throw new Error('Erro ao criar solicitação: ' + retryError.message)
                    }

                    return retryData
                }

                const adminId = await getAdminUserFallback()
                if (adminId) {
                    const { data: adminData, error: adminError } = await supabase
                        .from('solicitacoes_promotores')
                        .insert({
                            loja_id: data.loja_id,
                            solicitante_id: adminId,
                            tipo_solicitacao: data.tipo_solicitacao || 'novo',
                            motivo: data.motivo.trim(),
                            prioridade: data.prioridade || 'media',
                            observacoes: data.observacoes || null,
                            dias_semana_sugerido: data.dias_semana_sugerido || null,
                            contato_responsavel: data.contato_responsavel || null,
                            data_necessidade: data.data_necessidade,
                            status: 'pendente'
                        })
                        .select(SOLICITACAO_SELECT)
                        .single()

                    if (adminError) {
                        console.error('❌ Erro com admin fallback:', adminError)
                        throw new Error('Erro ao criar solicitação: ' + adminError.message)
                    }

                    return adminData
                }

                throw new Error('Erro de foreign key: usuário não encontrado e não foi possível criar')
            }

            throw new Error(error.message)
        }

        console.log('✅ Solicitação criada com sucesso:', solicitacao.id)
        return solicitacao

    } catch (error: any) {
        console.error('❌ Erro ao criar solicitação:', error)
        throw new Error(error.message || 'Não foi possível criar a solicitação')
    }
}

/**
 * 🔥 Atualizar dados da solicitação (apenas pendente)
 */
export async function updateSolicitacao(
    id: string,
    data: Partial<CreateSolicitacaoData>
): Promise<SolicitacaoPromotor | null> {
    try {
        const { data: solicitacaoAtual, error: checkError } = await supabase
            .from('solicitacoes_promotores')
            .select('status')
            .eq('id', id)
            .single()

        if (checkError) throw checkError

        if (solicitacaoAtual.status !== 'pendente') {
            throw new Error('Apenas solicitações pendentes podem ser editadas')
        }

        const updateData: any = {}
        if (data.tipo_solicitacao !== undefined) updateData.tipo_solicitacao = data.tipo_solicitacao
        if (data.motivo !== undefined) updateData.motivo = data.motivo
        if (data.prioridade !== undefined) updateData.prioridade = data.prioridade
        if (data.observacoes !== undefined) updateData.observacoes = data.observacoes
        if (data.dias_semana_sugerido !== undefined) updateData.dias_semana_sugerido = data.dias_semana_sugerido
        if (data.contato_responsavel !== undefined) updateData.contato_responsavel = data.contato_responsavel
        if (data.data_necessidade !== undefined) updateData.data_necessidade = data.data_necessidade

        const { data: solicitacao, error } = await supabase
            .from('solicitacoes_promotores')
            .update(updateData)
            .eq('id', id)
            .select(SOLICITACAO_SELECT)
            .single()

        if (error) throw error
        return solicitacao
    } catch (error) {
        console.error('❌ Erro ao atualizar solicitação:', error)
        return null
    }
}

/**
 * 🔥 Atualizar status da solicitação
 */
export async function updateSolicitacaoStatus(
    id: string,
    status: 'aprovado' | 'reprovado' | 'cancelado' | 'analise',
    motivo?: string
): Promise<boolean> {
    try {
        const { data: userData } = await supabase.auth.getUser()
        const user = userData?.user

        if (!user) {
            throw new Error('Usuário não autenticado')
        }

        const updateData: any = { status }

        if (status === 'aprovado') {
            updateData.aprovado_por = user.id
            updateData.data_aprovacao = new Date().toISOString()
        } else if (status === 'reprovado') {
            updateData.reprovado_por = user.id
            updateData.data_reprovacao = new Date().toISOString()
            if (motivo) {
                updateData.motivo_reprovacao = motivo
            }
        }

        const { error } = await supabase
            .from('solicitacoes_promotores')
            .update(updateData)
            .eq('id', id)

        if (error) throw error
        return true
    } catch (error) {
        console.error('❌ Erro ao atualizar status:', error)
        return false
    }
}

/**
 * 🔥 Deletar solicitação
 */
export async function deleteSolicitacao(id: string): Promise<boolean> {
    try {
        const { data: userData } = await supabase.auth.getUser()
        const user = userData?.user

        if (!user) {
            throw new Error('Usuário não autenticado')
        }

        const { data: solicitacao } = await supabase
            .from('solicitacoes_promotores')
            .select('status, solicitante_id')
            .eq('id', id)
            .single()

        if (!solicitacao) {
            throw new Error('Solicitação não encontrada')
        }

        if (solicitacao.status !== 'pendente') {
            throw new Error('Apenas solicitações pendentes podem ser excluídas')
        }

        const appRole = user.app_role || 'promotor'
        if (solicitacao.solicitante_id !== user.id && appRole !== 'admin') {
            throw new Error('Você não tem permissão para excluir esta solicitação')
        }

        const { error } = await supabase
            .from('solicitacoes_promotores')
            .delete()
            .eq('id', id)

        if (error) throw error
        return true
    } catch (error) {
        console.error('❌ Erro ao deletar solicitação:', error)
        return false
    }
}

// ============================================
// FUNÇÕES AGREGADORAS
// ============================================

/**
 * 🔥 Contar solicitações por status
 */
export async function countSolicitacoes(): Promise<{ status: StatusSolicitacao; count: number }[]> {
    try {
        const { data, error } = await supabase
            .from('solicitacoes_promotores')
            .select('status')

        if (error) throw error

        const counts: Record<StatusSolicitacao, number> = {
            pendente: 0,
            analise: 0,
            aprovado: 0,
            reprovado: 0,
            cancelado: 0
        }

        data?.forEach((item: { status: StatusSolicitacao }) => {
            if (item.status in counts) {
                counts[item.status]++
            }
        })

        return Object.entries(counts).map(([status, count]) => ({
            status: status as StatusSolicitacao,
            count
        }))
    } catch (error) {
        console.error('❌ Erro ao contar solicitações:', error)
        return []
    }
}

/**
 * 🔥 Contar solicitações pendentes
 */
export async function countSolicitacoesPendentes(): Promise<number> {
    try {
        const { count, error } = await supabase
            .from('solicitacoes_promotores')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pendente')

        if (error) throw error
        return count || 0
    } catch (error) {
        console.error('❌ Erro ao contar solicitações pendentes:', error)
        return 0
    }
}
