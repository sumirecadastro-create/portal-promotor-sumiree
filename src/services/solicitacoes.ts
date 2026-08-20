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

export interface UpdateSolicitacaoData {
    tipo_solicitacao?: TipoSolicitacao
    motivo?: string
    prioridade?: PrioridadeSolicitacao
    promotor_atual_id?: string
    promotor_sugerido_id?: string
    observacoes?: string
    dias_semana_sugerido?: string
    contato_responsavel?: string
    data_necessidade?: string
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
// FUNÇÕES DE CONSULTA
// ============================================

/**
 * 🔥 Buscar todas as solicitações (filtradas por permissão)
 * - ADMIN: vê todas
 * - REGIONAL: vê solicitações das lojas da sua região
 * - GERENTE: vê solicitações da sua loja
 * - PROMOTOR: vê apenas suas próprias solicitações
 */
export async function getSolicitacoes(): Promise<SolicitacaoPromotor[]> {
    try {
        const { data: userData } = await supabase.auth.getUser()
        const user = userData?.user

        if (!user) {
            console.warn('Usuário não autenticado')
            return []
        }

        const appRole = user.app_role || 'promotor'

        let query = supabase
            .from('solicitacoes_promotores')
            .select(SOLICITACAO_SELECT)
            .order('created_at', { ascending: false })

        // 🔥 ADMIN: vê todas
        if (appRole === 'admin') {
            // sem filtro
        }
        // 🔥 REGIONAL: vê solicitações das lojas da região
        else if (appRole === 'regional') {
            // Buscar lojas da região
            const { data: lojasRegional } = await supabase
                .from('gerentes_regionais_lojas')
                .select('loja_id')
                .eq('gerente_regional_id', user.id)

            const lojaIds = lojasRegional?.map(l => l.loja_id) || []

            if (lojaIds.length === 0) {
                return []
            }

            query = query.in('loja_id', lojaIds)
        }
        // 🔥 GERENTE: vê solicitações da sua loja
        else if (appRole === 'gerente' && user.loja_id) {
            query = query.eq('loja_id', user.loja_id)
        }
        // 🔥 PROMOTOR: vê apenas suas próprias solicitações
        else {
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
        const { data: userData } = await supabase.auth.getUser()
        const user = userData?.user

        if (!user) {
            throw new Error('Usuário não autenticado')
        }

        // Validar campos obrigatórios
        if (!data.loja_id) throw new Error('Loja é obrigatória')
        if (!data.motivo) throw new Error('Motivo é obrigatório')
        if (!data.data_necessidade) throw new Error('Data de necessidade é obrigatória')

        const { data: solicitacao, error } = await supabase
            .from('solicitacoes_promotores')
            .insert({
                loja_id: data.loja_id,
                solicitante_id: user.id,
                tipo_solicitacao: data.tipo_solicitacao || 'novo',
                motivo: data.motivo,
                prioridade: data.prioridade || 'media',
                promotor_atual_id: data.promotor_atual_id || null,
                promotor_sugerido_id: data.promotor_sugerido_id || null,
                observacoes: data.observacoes || null,
                dias_semana_sugerido: data.dias_semana_sugerido || null,
                contato_responsavel: data.contato_responsavel || null,
                data_necessidade: data.data_necessidade,
                status: 'pendente'
            })
            .select(SOLICITACAO_SELECT)
            .single()

        if (error) throw error

        // 🔥 Registrar no histórico (opcional - tabela precisa existir)
        try {
            await supabase
                .from('historico_solicitacoes')
                .insert({
                    solicitacao_id: solicitacao.id,
                    usuario_id: user.id,
                    acao: 'criacao',
                    descricao: `Solicitação de ${data.tipo_solicitacao} criada`
                })
        } catch (histError) {
            console.warn('⚠️ Erro ao registrar histórico:', histError)
            // Não falha a operação principal
        }

        return solicitacao
    } catch (error) {
        console.error('❌ Erro ao criar solicitação:', error)
        return null
    }
}

/**
 * 🔥 Atualizar dados da solicitação (apenas pendente)
 */
export async function updateSolicitacao(
    id: string,
    data: UpdateSolicitacaoData
): Promise<SolicitacaoPromotor | null> {
    try {
        const { data: solicitacaoAtual } = await supabase
            .from('solicitacoes_promotores')
            .select('status')
            .eq('id', id)
            .single()

        if (!solicitacaoAtual || solicitacaoAtual.status !== 'pendente') {
            throw new Error('Apenas solicitações pendentes podem ser editadas')
        }

        const updateData: any = {}
        if (data.tipo_solicitacao !== undefined) updateData.tipo_solicitacao = data.tipo_solicitacao
        if (data.motivo !== undefined) updateData.motivo = data.motivo
        if (data.prioridade !== undefined) updateData.prioridade = data.prioridade
        if (data.promotor_atual_id !== undefined) updateData.promotor_atual_id = data.promotor_atual_id
        if (data.promotor_sugerido_id !== undefined) updateData.promotor_sugerido_id = data.promotor_sugerido_id
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
        } else if (status === 'cancelado') {
            // Não precisa de campos extras
        } else if (status === 'analise') {
            // Não precisa de campos extras
        }

        const { error } = await supabase
            .from('solicitacoes_promotores')
            .update(updateData)
            .eq('id', id)

        if (error) throw error

        // 🔥 Registrar no histórico
        try {
            await supabase
                .from('historico_solicitacoes')
                .insert({
                    solicitacao_id: id,
                    usuario_id: user.id,
                    acao: status,
                    descricao: `Status alterado para ${status}${motivo ? `: ${motivo}` : ''}`
                })
        } catch (histError) {
            console.warn('⚠️ Erro ao registrar histórico:', histError)
        }

        return true
    } catch (error) {
        console.error('❌ Erro ao atualizar status da solicitação:', error)
        return false
    }
}

/**
 * 🔥 Deletar solicitação (apenas pendente e dono)
 */
export async function deleteSolicitacao(id: string): Promise<boolean> {
    try {
        const { data: userData } = await supabase.auth.getUser()
        const user = userData?.user

        if (!user) {
            throw new Error('Usuário não autenticado')
        }

        // Verificar se a solicitação existe e é do usuário
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

        if (solicitacao.solicitante_id !== user.id) {
            const appRole = user.app_role || 'promotor'
            if (appRole !== 'admin') {
                throw new Error('Você não tem permissão para excluir esta solicitação')
            }
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

/**
 * 🔥 Contar solicitações por prioridade
 */
export async function countSolicitacoesByPrioridade(): Promise<{ prioridade: PrioridadeSolicitacao; count: number }[]> {
    try {
        const { data, error } = await supabase
            .from('solicitacoes_promotores')
            .select('prioridade')

        if (error) throw error

        const counts: Record<PrioridadeSolicitacao, number> = {
            baixa: 0,
            media: 0,
            alta: 0,
            urgente: 0
        }

        data?.forEach((item: { prioridade: PrioridadeSolicitacao }) => {
            if (item.prioridade in counts) {
                counts[item.prioridade]++
            }
        })

        return Object.entries(counts).map(([prioridade, count]) => ({
            prioridade: prioridade as PrioridadeSolicitacao,
            count
        }))
    } catch (error) {
        console.error('❌ Erro ao contar solicitações por prioridade:', error)
        return []
    }
}

// ============================================
// UTILIDADES
// ============================================

/**
 * 🔥 Mapeamento de status para exibição
 */
export const STATUS_LABELS: Record<StatusSolicitacao, { label: string; color: string; icon: string }> = {
    pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700', icon: '⏳' },
    analise: { label: 'Em Análise', color: 'bg-blue-100 text-blue-700', icon: '🔍' },
    aprovado: { label: 'Aprovado', color: 'bg-green-100 text-green-700', icon: '✅' },
    reprovado: { label: 'Reprovado', color: 'bg-red-100 text-red-700', icon: '❌' },
    cancelado: { label: 'Cancelado', color: 'bg-gray-100 text-gray-700', icon: '🚫' }
}

/**
 * 🔥 Mapeamento de prioridade para exibição
 */
export const PRIORIDADE_LABELS: Record<PrioridadeSolicitacao, { label: string; color: string; order: number }> = {
    baixa: { label: 'Baixa', color: 'bg-gray-100 text-gray-700', order: 1 },
    media: { label: 'Média', color: 'bg-blue-100 text-blue-700', order: 2 },
    alta: { label: 'Alta', color: 'bg-orange-100 text-orange-700', order: 3 },
    urgente: { label: 'Urgente', color: 'bg-red-100 text-red-700', order: 4 }
}

/**
 * 🔥 Mapeamento de tipo para exibição
 */
export const TIPO_LABELS: Record<TipoSolicitacao, { label: string; description: string }> = {
    novo: { label: 'Novo Promotor', description: 'Solicitação de um novo promotor para a loja' },
    reposicao: { label: 'Reposição', description: 'Substituição de um promotor atual' },
    transferencia: { label: 'Transferência', description: 'Transferência de promotor entre lojas' },
    temporario: { label: 'Temporário', description: 'Solicitação de promotor temporário' }
}
