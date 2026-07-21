// src/services/visitas.ts
import { supabase } from '@/lib/supabase'
import { getPromotoresIds, type UserPermissions } from './permissoes'

// ============================================
// TIPOS
// ============================================

export interface Visita {
    id: string
    promotor_id: string
    loja_id: string
    check_in: string
    check_out: string | null
    observacao_check_in: string | null
    observacao_check_out: string | null
    status: 'em_andamento' | 'concluida'
    created_at: string
    promotores?: { promotor_nome: string }
    lojas?: { nome_loja: string; cod_loja: string }
}

export interface CreateCheckInDTO {
    promotor_id: string
    loja_id: string
    observacao_check_in?: string
}

export interface FinishCheckOutDTO {
    observacao_check_out?: string
}

export interface VisitaCompleta extends Visita {
    promotores: { promotor_nome: string }
    lojas: { nome_loja: string; cod_loja: string }
}

// ============================================
// CONSTANTES
// ============================================

const VISITA_SELECT = `
    *,
    promotores ( promotor_nome ),
    lojas ( nome_loja, cod_loja )
`

// ============================================
// HELPERS
// ============================================

function handleError(error: unknown, mensagem: string): never {
    console.error(mensagem, error)
    throw error
}

function isVisitaCompleta(data: unknown): data is VisitaCompleta {
    return (
        data !== null &&
        typeof data === 'object' &&
        'id' in data &&
        'promotores' in data &&
        'lojas' in data
    )
}

// ============================================
// FUNÇÕES DE CONSULTA (COM FILTRO DE PERMISSÃO)
// ============================================

/**
 * Buscar visitas em andamento (filtradas por permissão do usuário)
 */
export async function getVisitasEmAndamento(
    permissions: UserPermissions
): Promise<VisitaCompleta[]> {
    const promotoresIds = await getPromotoresIds(permissions)

    if (promotoresIds.length === 0) {
        return []
    }

    const { data, error } = await supabase
        .from('visitas')
        .select(VISITA_SELECT)
        .in('promotor_id', promotoresIds)
        .eq('status', 'em_andamento')
        .order('check_in', { ascending: false })

    if (error) {
        handleError(error, 'Erro ao buscar visitas em andamento')
    }

    return (data || []).filter(isVisitaCompleta)
}

/**
 * Buscar últimas visitas concluídas (filtradas por permissão do usuário)
 */
export async function getVisitasConcluidas(
    permissions: UserPermissions,
    limit: number = 20
): Promise<VisitaCompleta[]> {
    const promotoresIds = await getPromotoresIds(permissions)

    if (promotoresIds.length === 0) {
        return []
    }

    const { data, error } = await supabase
        .from('visitas')
        .select(VISITA_SELECT)
        .in('promotor_id', promotoresIds)
        .eq('status', 'concluida')
        .order('check_out', { ascending: false })
        .limit(limit)

    if (error) {
        handleError(error, 'Erro ao buscar visitas concluídas')
    }

    return (data || []).filter(isVisitaCompleta)
}

/**
 * Buscar todas as visitas (filtradas por permissão do usuário)
 */
export async function getVisitas(
    permissions: UserPermissions,
    limit: number = 50
): Promise<VisitaCompleta[]> {
    const promotoresIds = await getPromotoresIds(permissions)

    if (promotoresIds.length === 0) {
        return []
    }

    const { data, error } = await supabase
        .from('visitas')
        .select(VISITA_SELECT)
        .in('promotor_id', promotoresIds)
        .order('check_out', { ascending: false })
        .limit(limit)

    if (error) {
        handleError(error, 'Erro ao buscar visitas')
    }

    return (data || []).filter(isVisitaCompleta)
}

/**
 * Buscar visitas de um promotor específico (com verificação de permissão)
 */
export async function getVisitasByPromotor(
    permissions: UserPermissions,
    promotorId: string
): Promise<VisitaCompleta[]> {
    const promotoresIds = await getPromotoresIds(permissions)

    if (!promotoresIds.includes(promotorId)) {
        return []
    }

    const { data, error } = await supabase
        .from('visitas')
        .select(VISITA_SELECT)
        .eq('promotor_id', promotorId)
        .order('check_in', { ascending: false })

    if (error) {
        handleError(error, `Erro ao buscar visitas do promotor ${promotorId}`)
    }

    return (data || []).filter(isVisitaCompleta)
}

/**
 * Buscar visitas de uma loja específica (com verificação de permissão)
 */
export async function getVisitasByLoja(
    permissions: UserPermissions,
    lojaId: string
): Promise<VisitaCompleta[]> {
    const promotoresIds = await getPromotoresIds(permissions)

    if (promotoresIds.length === 0) {
        return []
    }

    const { data, error } = await supabase
        .from('visitas')
        .select(VISITA_SELECT)
        .in('promotor_id', promotoresIds)
        .eq('loja_id', lojaId)
        .order('check_in', { ascending: false })

    if (error) {
        handleError(error, `Erro ao buscar visitas da loja ${lojaId}`)
    }

    return (data || []).filter(isVisitaCompleta)
}

/**
 * Buscar uma visita por ID (com verificação de permissão)
 */
export async function getVisitaById(
    permissions: UserPermissions,
    id: string
): Promise<VisitaCompleta | null> {
    const { data, error } = await supabase
        .from('visitas')
        .select(VISITA_SELECT)
        .eq('id', id)
        .maybeSingle()

    if (error) {
        handleError(error, `Erro ao buscar visita ${id}`)
    }

    if (!data) {
        return null
    }

    // Verificar se o usuário tem permissão para ver esta visita
    const promotoresIds = await getPromotoresIds(permissions)
    if (!promotoresIds.includes(data.promotor_id)) {
        return null
    }

    return isVisitaCompleta(data) ? data : null
}

// ============================================
// FUNÇÕES DE ESCRITA (SEM FILTRO DE PERMISSÃO - APENAS VALIDAÇÃO)
// ============================================

/**
 * Verificar se um promotor tem check-in ativo
 */
export async function temCheckInAtivo(promotorId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('visitas')
        .select('id')
        .eq('promotor_id', promotorId)
        .eq('status', 'em_andamento')
        .maybeSingle()

    if (error) {
        handleError(error, `Erro ao verificar check-in ativo do promotor ${promotorId}`)
    }

    return !!data
}

/**
 * Buscar check-in ativo de um promotor
 */
export async function getCheckInAtivo(promotorId: string): Promise<VisitaCompleta | null> {
    const { data, error } = await supabase
        .from('visitas')
        .select(VISITA_SELECT)
        .eq('promotor_id', promotorId)
        .eq('status', 'em_andamento')
        .maybeSingle()

    if (error) {
        handleError(error, `Erro ao buscar check-in ativo do promotor ${promotorId}`)
    }

    if (!data) {
        return null
    }

    return isVisitaCompleta(data) ? data : null
}

/**
 * Criar um novo check-in
 * ⚠️ O campo check_in é preenchido automaticamente pelo banco com now()
 */
export async function registrarCheckIn(data: CreateCheckInDTO): Promise<VisitaCompleta> {
    const { data: result, error } = await supabase
        .from('visitas')
        .insert({
            promotor_id: data.promotor_id,
            loja_id: data.loja_id,
            observacao_check_in: data.observacao_check_in || null,
            status: 'em_andamento'
        })
        .select(VISITA_SELECT)
        .single()

    if (error) {
        handleError(error, 'Erro ao registrar check-in')
    }

    if (!isVisitaCompleta(result)) {
        throw new Error('Dados da visita incompletos após criação')
    }

    return result
}

/**
 * Finalizar um check-out
 * ⚠️ O check_out é preenchido automaticamente pelo trigger do banco!
 */
export async function registrarCheckOut(
    id: string,
    data: FinishCheckOutDTO
): Promise<VisitaCompleta> {
    const { data: result, error } = await supabase
        .from('visitas')
        .update({
            observacao_check_out: data.observacao_check_out || null,
            status: 'concluida'
        })
        .eq('id', id)
        .select(VISITA_SELECT)
        .single()

    if (error) {
        handleError(error, `Erro ao registrar check-out da visita ${id}`)
    }

    if (!isVisitaCompleta(result)) {
        throw new Error('Dados da visita incompletos após atualização')
    }

    return result
}

/**
 * Cancelar um check-in em andamento
 */
export async function cancelarCheckIn(id: string): Promise<void> {
    const { error } = await supabase
        .from('visitas')
        .delete()
        .eq('id', id)
        .eq('status', 'em_andamento')

    if (error) {
        handleError(error, `Erro ao cancelar check-in ${id}`)
    }
}

// ============================================
// FUNÇÕES AGREGADORAS
// ============================================

/**
 * Contar visitas por período (filtradas por permissão)
 */
export async function countVisitasByPeriod(
    permissions: UserPermissions,
    startDate: Date,
    endDate: Date
): Promise<number> {
    const promotoresIds = await getPromotoresIds(permissions)

    if (promotoresIds.length === 0) {
        return 0
    }

    const { count, error } = await supabase
        .from('visitas')
        .select('id', { count: 'exact', head: true })
        .in('promotor_id', promotoresIds)
        .gte('check_in', startDate.toISOString())
        .lt('check_in', endDate.toISOString())

    if (error) {
        handleError(error, 'Erro ao contar visitas por período')
    }

    return count || 0
}

/**
 * Buscar resumo de visitas do dia (filtrado por permissão)
 */
export async function getResumoVisitasHoje(
    permissions: UserPermissions
): Promise<{ em_andamento: number; concluidas: number; total: number }> {
    const promotoresIds = await getPromotoresIds(permissions)

    if (promotoresIds.length === 0) {
        return { em_andamento: 0, concluidas: 0, total: 0 }
    }

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
        .from('visitas')
        .select('status')
        .in('promotor_id', promotoresIds)
        .gte('created_at', hoje.toISOString())

    if (error) {
        handleError(error, 'Erro ao buscar resumo de visitas de hoje')
    }

    const em_andamento = data?.filter(v => v.status === 'em_andamento').length || 0
    const concluidas = data?.filter(v => v.status === 'concluida').length || 0

    return {
        em_andamento,
        concluidas,
        total: data?.length || 0
    }
}
