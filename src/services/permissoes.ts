// src/services/permissoes.ts
import { supabase } from '@/lib/supabase'

// ============================================
// TIPOS
// ============================================

export type AppRole = 'admin' | 'gestor' | 'gerente' | 'regional' | 'promotor'

export interface UserPermissions {
    id: string
    app_role: AppRole
    loja_id?: string | null
}

export interface LojaPermitida {
    id: string
    cod_loja: string
    nome_loja: string
    cidade: string
}

export interface PromotorPermitido {
    id: string
    promotor_nome: string
    status: string
    dias_semana: string | null
    contato_responsavel: string | null
}

// ============================================
// CONSTANTES
// ============================================

const LOJA_SELECT = 'id, cod_loja, nome_loja, cidade'
const PROMOTOR_SELECT = 'id, promotor_nome, status, dias_semana, contato_responsavel'

// ============================================
// HELPERS
// ============================================

function handleError(error: unknown, mensagem: string): never {
    console.error(mensagem, error)
    throw error
}

/**
 * Remove duplicatas de um array
 */
function unique<T>(items: T[]): T[] {
    return [...new Set(items)]
}

/**
 * Verifica se a role está na lista de roles permitidas
 */
function hasRole(role: AppRole, ...allowedRoles: AppRole[]): boolean {
    return allowedRoles.includes(role)
}

// ============================================
// NÍVEL 1: IDs DAS LOJAS PERMITIDAS
// ============================================

/**
 * Retorna os IDs das lojas que o usuário tem permissão para ver
 */
export async function getLojasPermitidas(permissions: UserPermissions): Promise<string[]> {
    const { id, app_role, loja_id } = permissions

    // Admin ou Gestor → todas as lojas
    if (hasRole(app_role, 'admin', 'gestor')) {
        const { data, error } = await supabase
            .from('lojas')
            .select('id')

        if (error) {
            handleError(error, 'Erro ao buscar lojas para admin/gestor')
        }

        return data?.map(l => l.id) || []
    }

    // Gerente → apenas sua loja
    if (app_role === 'gerente' && loja_id) {
        return [loja_id]
    }

    // Regional → lojas da sua região
    if (app_role === 'regional') {
        const { data, error } = await supabase
            .from('gerentes_regionais_lojas')
            .select('loja_id')
            .eq('gerente_regional_id', id)

        if (error) {
            handleError(error, 'Erro ao buscar lojas do regional')
        }

        return unique(data?.map(l => l.loja_id) || [])
    }

    // Promotor → suas próprias lojas
    if (app_role === 'promotor') {
        const { data, error } = await supabase
            .from('promotores_lojas')
            .select('loja_id')
            .eq('promotor_id', id)

        if (error) {
            handleError(error, 'Erro ao buscar lojas do promotor')
        }

        return unique(data?.map(l => l.loja_id) || [])
    }

    return []
}

// ============================================
// NÍVEL 2: IDs DOS PROMOTORES PERMITIDOS
// ============================================

/**
 * Retorna apenas os IDs dos promotores que o usuário tem permissão para ver
 */
export async function getPromotoresIds(permissions: UserPermissions): Promise<string[]> {
    const { id, app_role, loja_id } = permissions

    // Admin ou Gestor → todos os promotores
    if (hasRole(app_role, 'admin', 'gestor')) {
        const { data, error } = await supabase
            .from('promotores')
            .select('id')
            .eq('status', 'ativo')

        if (error) {
            handleError(error, 'Erro ao buscar IDs de promotores para admin/gestor')
        }

        return data?.map(p => p.id) || []
    }

    // Gerente → promotores da sua loja
    if (app_role === 'gerente' && loja_id) {
        const { data, error } = await supabase
            .from('promotores_lojas')
            .select('promotor_id')
            .eq('loja_id', loja_id)

        if (error) {
            handleError(error, 'Erro ao buscar IDs de promotores do gerente')
        }

        return unique(data?.map(p => p.promotor_id) || [])
    }

    // Regional, promotor, etc → via lojas permitidas
    const lojaIds = await getLojasPermitidas(permissions)

    if (lojaIds.length === 0) {
        return []
    }

    const { data, error } = await supabase
        .from('promotores_lojas')
        .select('promotor_id')
        .in('loja_id', lojaIds)

    if (error) {
        handleError(error, 'Erro ao buscar IDs de promotores permitidos')
    }

    return unique(data?.map(p => p.promotor_id) || [])
}

// ============================================
// NÍVEL 3: DADOS COMPLETOS
// ============================================

/**
 * Retorna os promotores completos que o usuário tem permissão para ver
 */
export async function getPromotoresCompletos(
    permissions: UserPermissions
): Promise<PromotorPermitido[]> {
    const ids = await getPromotoresIds(permissions)

    if (ids.length === 0) {
        return []
    }

    const { data, error } = await supabase
        .from('promotores')
        .select(PROMOTOR_SELECT)
        .in('id', ids)
        .eq('status', 'ativo')
        .order('promotor_nome')

    if (error) {
        handleError(error, 'Erro ao buscar promotores completos')
    }

    return data || []
}

/**
 * Retorna as lojas completas que o usuário tem permissão para ver
 */
export async function getLojasCompletas(
    permissions: UserPermissions
): Promise<LojaPermitida[]> {
    const lojaIds = await getLojasPermitidas(permissions)

    if (lojaIds.length === 0) {
        return []
    }

    const { data, error } = await supabase
        .from('lojas')
        .select(LOJA_SELECT)
        .in('id', lojaIds)
        .order('nome_loja')

    if (error) {
        handleError(error, 'Erro ao buscar lojas completas')
    }

    return data || []
}

// ============================================
// NÍVEL 4: FUNÇÕES DE VERIFICAÇÃO
// ============================================

/**
 * Verifica se um usuário tem acesso a uma loja específica
 */
export async function hasAccessToLoja(
    permissions: UserPermissions,
    lojaId: string
): Promise<boolean> {
    const lojasPermitidas = await getLojasPermitidas(permissions)
    return lojasPermitidas.includes(lojaId)
}

/**
 * Verifica se um usuário tem acesso a um promotor específico
 */
export async function hasAccessToPromotor(
    permissions: UserPermissions,
    promotorId: string
): Promise<boolean> {
    const promotoresPermitidos = await getPromotoresIds(permissions)
    return promotoresPermitidos.includes(promotorId)
}
