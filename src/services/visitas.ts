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
    check_in_manual?: string
}

export interface FinishCheckOutDTO {
    observacao_check_out?: string
    check_out_manual?: string
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

/**
 * 🔥 Formata data/hora para exibição amigável
 */
export function formatarDataHora(data: string | null): string {
    if (!data) return '—'
    return new Date(data).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

/**
 * 🔥 Calcula duração entre duas datas
 */
export function calcularDuracao(checkIn: string, checkOut: string | null): string {
    if (!checkOut) return 'Em andamento'
    
    const inicio = new Date(checkIn)
    const fim = new Date(checkOut)
    const diffMs = fim.getTime() - inicio.getTime()
    
    if (diffMs < 0) return 'Data inválida'
    
    const diffMin = Math.floor(diffMs / 60000)
    const diffHoras = Math.floor(diffMin / 60)
    const diffMinutos = diffMin % 60
    
    if (diffHoras > 0) {
        return `${diffHoras}h ${diffMinutos}min`
    }
    return `${diffMinutos}min`
}

/**
 * 🔥 Verifica se uma visita está atrasada (mais de 4 horas)
 */
export function isVisitaAtrasada(checkIn: string): boolean {
    const inicio = new Date(checkIn)
    const agora = new Date()
    const diffMs = agora.getTime() - inicio.getTime()
    const diffHoras = diffMs / (1000 * 60 * 60)
    return diffHoras > 4
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
// FUNÇÕES DE ESCRITA (NOVAS E MODIFICADAS)
// ============================================

/**
 * 🔥 VERIFICAR se um promotor tem check-in ativo em uma loja ESPECÍFICA
 * (não bloqueia check-in em outras lojas)
 */
export async function temCheckInAtivoNaLoja(
    promotorId: string,
    lojaId: string
): Promise<boolean> {
    const { data, error } = await supabase
        .from('visitas')
        .select('id')
        .eq('promotor_id', promotorId)
        .eq('loja_id', lojaId)
        .eq('status', 'em_andamento')
        .maybeSingle()

    if (error) {
        handleError(error, `Erro ao verificar check-in ativo do promotor ${promotorId} na loja ${lojaId}`)
    }

    return !!data
}

/**
 * 🔥 VERIFICAR se um promotor tem check-in ativo em QUALQUER loja
 * (usado apenas para alerta, não para bloquear)
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
 * 🔥 BUSCAR TODOS os check-ins ativos de um promotor
 */
export async function getCheckInsAtivosDoPromotor(
    promotorId: string
): Promise<VisitaCompleta[]> {
    const { data, error } = await supabase
        .from('visitas')
        .select(VISITA_SELECT)
        .eq('promotor_id', promotorId)
        .eq('status', 'em_andamento')
        .order('check_in', { ascending: true })

    if (error) {
        handleError(error, `Erro ao buscar check-ins ativos do promotor ${promotorId}`)
    }

    return (data || []).filter(isVisitaCompleta)
}

/**
 * 🔥 BUSCAR check-ins ativos por loja
 */
export async function getCheckInsAtivosPorLoja(
    lojaId: string
): Promise<VisitaCompleta[]> {
    const { data, error } = await supabase
        .from('visitas')
        .select(VISITA_SELECT)
        .eq('loja_id', lojaId)
        .eq('status', 'em_andamento')
        .order('check_in', { ascending: true })

    if (error) {
        handleError(error, `Erro ao buscar check-ins ativos da loja ${lojaId}`)
    }

    return (data || []).filter(isVisitaCompleta)
}

/**
 * 🔥 FINALIZAR AUTOMATICAMENTE check-ins antigos (mais de 24h)
 * Deve ser chamado por um cron job ou ao carregar a página
 */
export async function finalizarCheckInsAntigos(): Promise<number> {
    const dataLimite = new Date()
    dataLimite.setHours(dataLimite.getHours() - 24)

    const { data, error } = await supabase
        .from('visitas')
        .update({
            check_out: dataLimite.toISOString(),
            status: 'concluida',
            observacao_check_out: 'Finalizado automaticamente (excedeu 24h)'
        })
        .eq('status', 'em_andamento')
        .lt('check_in', dataLimite.toISOString())
        .select('id')

    if (error) {
        handleError(error, 'Erro ao finalizar check-ins antigos')
    }

    return data?.length || 0
}

/**
 * 🔥 FINALIZAR AUTOMATICAMENTE todos os check-ins do dia anterior
 * Deve ser chamado por um cron job à meia-noite
 */
export async function finalizarCheckInsDiaAnterior(): Promise<number> {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    
    const ontem = new Date(hoje)
    ontem.setDate(ontem.getDate() - 1)

    const { data, error } = await supabase
        .from('visitas')
        .update({
            check_out: ontem.toISOString(),
            status: 'concluida',
            observacao_check_out: 'Finalizado automaticamente (fim do dia)'
        })
        .eq('status', 'em_andamento')
        .lt('check_in', hoje.toISOString())
        .select('id')

    if (error) {
        handleError(error, 'Erro ao finalizar check-ins do dia anterior')
    }

    return data?.length || 0
}

/**
 * Buscar check-in ativo de um promotor (retorna apenas um)
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
 * 🔥 CRIAR CHECK-IN (sem bloquear outras lojas)
 */
export async function registrarCheckIn(data: CreateCheckInDTO): Promise<VisitaCompleta> {
    // 🔥 Verificar se já tem check-in ativo na MESMA loja
    const temAtivoNaLoja = await temCheckInAtivoNaLoja(data.promotor_id, data.loja_id)

    if (temAtivoNaLoja) {
        throw new Error('Este promotor já tem um check-in ativo nesta loja')
    }

    // Usa check_in_manual se fornecido, senão usa o horário atual
    const checkIn = data.check_in_manual || new Date().toISOString()

    const { data: result, error } = await supabase
        .from('visitas')
        .insert({
            promotor_id: data.promotor_id,
            loja_id: data.loja_id,
            check_in: checkIn,
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
 * 🔥 FINALIZAR CHECK-OUT (com validação de data)
 */
export async function registrarCheckOut(
    id: string,
    data: FinishCheckOutDTO
): Promise<VisitaCompleta> {
    // 🔥 Verificar se a visita existe e está em andamento
    const { data: visitaAtual, error: buscaError } = await supabase
        .from('visitas')
        .select('*')
        .eq('id', id)
        .eq('status', 'em_andamento')
        .maybeSingle()

    if (buscaError || !visitaAtual) {
        throw new Error('Visita não encontrada ou já finalizada')
    }

    // Usa check_out_manual se fornecido, senão usa o horário atual
    const checkOut = data.check_out_manual || new Date().toISOString()

    // 🔥 Validar se o checkout não é antes do check-in
    const checkInDate = new Date(visitaAtual.check_in)
    const checkOutDate = new Date(checkOut)
    
    if (checkOutDate < checkInDate) {
        throw new Error('O horário de saída não pode ser anterior ao horário de entrada')
    }

    const { data: result, error } = await supabase
        .from('visitas')
        .update({
            check_out: checkOut,
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
        .gte('check_in', hoje.toISOString())

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

/**
 * 🔥 Buscar estatísticas detalhadas de visitas
 */
export async function getEstatisticasVisitas(
    permissions: UserPermissions,
    periodo?: { inicio: Date; fim: Date }
): Promise<{
    total: number
    em_andamento: number
    concluidas: number
    tempo_medio_minutos: number
    visitas_por_dia: { data: string; total: number }[]
}> {
    const promotoresIds = await getPromotoresIds(permissions)

    if (promotoresIds.length === 0) {
        return {
            total: 0,
            em_andamento: 0,
            concluidas: 0,
            tempo_medio_minutos: 0,
            visitas_por_dia: []
        }
    }

    let query = supabase
        .from('visitas')
        .select('*')
        .in('promotor_id', promotoresIds)

    if (periodo) {
        query = query
            .gte('check_in', periodo.inicio.toISOString())
            .lte('check_in', periodo.fim.toISOString())
    }

    const { data, error } = await query

    if (error) {
        handleError(error, 'Erro ao buscar estatísticas de visitas')
    }

    const visitas = data || []
    const em_andamento = visitas.filter(v => v.status === 'em_andamento').length
    const concluidas = visitas.filter(v => v.status === 'concluida').length

    // Calcular tempo médio (apenas visitas concluídas com check_out)
    const tempos = visitas
        .filter(v => v.status === 'concluida' && v.check_out)
        .map(v => {
            const inicio = new Date(v.check_in)
            const fim = new Date(v.check_out)
            return (fim.getTime() - inicio.getTime()) / 60000 // minutos
        })
        .filter(t => t > 0)

    const tempo_medio_minutos = tempos.length > 0
        ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length)
        : 0

    // Agrupar por dia
    const visitasPorDia: Record<string, number> = {}
    visitas.forEach(v => {
        const dia = new Date(v.check_in).toLocaleDateString('pt-BR')
        visitasPorDia[dia] = (visitasPorDia[dia] || 0) + 1
    })

    const visitas_por_dia = Object.entries(visitasPorDia)
        .map(([data, total]) => ({ data, total }))
        .sort((a, b) => a.data.localeCompare(b.data))

    return {
        total: visitas.length,
        em_andamento,
        concluidas,
        tempo_medio_minutos,
        visitas_por_dia
    }
}
