// src/services/permissoes.ts

import { supabase } from '@/lib/supabase'

// ============================================
// TIPOS
// ============================================

export type AppRole = 'admin' | 'gerente' | 'regional' | 'promotor'

export interface UserPermissions {
    id: string
    app_role: AppRole
    loja_id: string | null
}

export interface PromotorPermitido {
    id: string
    promotor_nome: string
    status: string
}

export interface LojaPermitida {
    id: string
    cod_loja: string
    nome_loja: string
    cidade: string
    gerente_id: string | null
}

// ============================================
// FUNÇÕES
// ============================================

/**
 * 🔥 Buscar IDs dos promotores que o usuário tem permissão para ver
 * 
 * REGRAS:
 * - ADMIN: vê todos os promotores ativos
 * - GERENTE: vê apenas promotores da sua loja (via promotores_lojas)
 * - REGIONAL: vê promotores das lojas que gerencia
 * - PROMOTOR: vê apenas seus próprios dados
 */
export async function getPromotoresIds(
    permissions: UserPermissions
): Promise<string[]> {
    try {
        // 🔥 ADMIN: vê todos os promotores ativos
        if (permissions.app_role === 'admin') {
            const { data, error } = await supabase
                .from('promotores')
                .select('id')
                .eq('status', 'ativo')
            
            if (error) throw error
            return data?.map(p => p.id) || []
        }

        // 🔥 GERENTE: vê apenas promotores da sua loja (via promotores_lojas)
        if (permissions.app_role === 'gerente' && permissions.loja_id) {
            const { data, error } = await supabase
                .from('promotores_lojas')
                .select('promotor_id')
                .eq('loja_id', permissions.loja_id)
            
            if (error) throw error
            
            // Retorna os IDs dos promotores vinculados à loja do gerente
            const ids = data?.map(p => p.promotor_id) || []
            return [...new Set(ids)] // Remove duplicatas (segurança)
        }

        // 🔥 REGIONAL: vê promotores das lojas que gerencia
        if (permissions.app_role === 'regional' && permissions.loja_id) {
            // Buscar IDs das lojas que o regional gerencia
            const { data: lojasData, error: lojasError } = await supabase
                .from('gerentes_regionais_lojas')
                .select('loja_id')
                .eq('gerente_regional_id', permissions.loja_id)
            
            if (lojasError) throw lojasError
            
            const lojaIds = lojasData?.map(l => l.loja_id) || []
            
            if (lojaIds.length === 0) return []
            
            // Buscar promotores dessas lojas
            const { data, error } = await supabase
                .from('promotores_lojas')
                .select('promotor_id')
                .in('loja_id', lojaIds)
            
            if (error) throw error
            
            const ids = data?.map(p => p.promotor_id) || []
            return [...new Set(ids)] // Remove duplicatas
        }

        // 🔥 PROMOTOR: vê apenas seus próprios dados
        if (permissions.app_role === 'promotor') {
            return [permissions.id]
        }

        // Caso não se enquadre em nenhum dos papéis acima
        return []
    } catch (error) {
        console.error('❌ Erro ao buscar promotores IDs:', error)
        return []
    }
}

/**
 * 🔥 Buscar promotores completos (com permissão)
 */
export async function getPromotoresCompletos(
    permissions: UserPermissions
): Promise<PromotorPermitido[]> {
    try {
        const ids = await getPromotoresIds(permissions)
        
        if (ids.length === 0) return []

        const { data, error } = await supabase
            .from('promotores')
            .select('id, promotor_nome, status')
            .in('id', ids)
            .eq('status', 'ativo')
            .order('promotor_nome')

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('❌ Erro ao buscar promotores completos:', error)
        return []
    }
}

/**
 * 🔥 Buscar lojas completas (com permissão)
 * 
 * REGRAS:
 * - ADMIN: vê todas as lojas
 * - GERENTE: vê apenas sua loja
 * - REGIONAL: vê as lojas que gerencia
 * - PROMOTOR: vê apenas lojas onde atua
 */
export async function getLojasCompletas(
    permissions: UserPermissions
): Promise<LojaPermitida[]> {
    try {
        // 🔥 ADMIN: vê todas as lojas
        if (permissions.app_role === 'admin') {
            const { data, error } = await supabase
                .from('lojas')
                .select('*')
                .order('nome_loja')
            
            if (error) throw error
            return data || []
        }

        // 🔥 GERENTE: vê apenas sua loja
        if (permissions.app_role === 'gerente' && permissions.loja_id) {
            const { data, error } = await supabase
                .from('lojas')
                .select('*')
                .eq('id', permissions.loja_id)
            
            if (error) throw error
            return data || []
        }

        // 🔥 REGIONAL: vê as lojas que gerencia
        if (permissions.app_role === 'regional' && permissions.loja_id) {
            const { data: lojasData, error: lojasError } = await supabase
                .from('gerentes_regionais_lojas')
                .select('loja_id')
                .eq('gerente_regional_id', permissions.loja_id)
            
            if (lojasError) throw lojasError
            
            const lojaIds = lojasData?.map(l => l.loja_id) || []
            
            if (lojaIds.length === 0) return []
            
            const { data, error } = await supabase
                .from('lojas')
                .select('*')
                .in('id', lojaIds)
                .order('nome_loja')
            
            if (error) throw error
            return data || []
        }

        // 🔥 PROMOTOR: vê apenas lojas onde atua
        if (permissions.app_role === 'promotor') {
            const { data, error } = await supabase
                .from('promotores_lojas')
                .select('loja_id')
                .eq('promotor_id', permissions.id)
            
            if (error) throw error
            
            const lojaIds = data?.map(l => l.loja_id) || []
            
            if (lojaIds.length === 0) return []
            
            const { data: lojasData, error: lojasError } = await supabase
                .from('lojas')
                .select('*')
                .in('id', lojaIds)
                .order('nome_loja')
            
            if (lojasError) throw lojasError
            return lojasData || []
        }

        return []
    } catch (error) {
        console.error('❌ Erro ao buscar lojas completas:', error)
        return []
    }
}

/**
 * 🔥 Verificar se um promotor está vinculado a uma loja específica
 * 
 * Útil para validações antes de criar check-in
 */
export async function promotorVinculadoLoja(
    promotorId: string,
    lojaId: string
): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('promotores_lojas')
            .select('id')
            .eq('promotor_id', promotorId)
            .eq('loja_id', lojaId)
            .maybeSingle()

        if (error) throw error
        return !!data
    } catch (error) {
        console.error('❌ Erro ao verificar vínculo promotor-loja:', error)
        return false
    }
}

/**
 * 🔥 Buscar todas as lojas vinculadas a um promotor
 */
export async function getLojasDoPromotor(
    promotorId: string
): Promise<{ id: string; cod_loja: string; nome_loja: string }[]> {
    try {
        const { data, error } = await supabase
            .from('promotores_lojas')
            .select(`
                loja_id,
                lojas (
                    id,
                    cod_loja,
                    nome_loja
                )
            `)
            .eq('promotor_id', promotorId)

        if (error) throw error
        
        return data?.map(item => ({
            id: item.lojas.id,
            cod_loja: item.lojas.cod_loja,
            nome_loja: item.lojas.nome_loja
        })) || []
    } catch (error) {
        console.error('❌ Erro ao buscar lojas do promotor:', error)
        return []
    }
}

/**
 * 🔥 Buscar todos os gerentes vinculados a um promotor (via lojas)
 */
export async function getGerentesDoPromotor(
    promotorId: string
): Promise<{ id: string; nome_gerente: string }[]> {
    try {
        const { data, error } = await supabase
            .from('promotores_lojas')
            .select(`
                lojas (
                    gerente_id,
                    gerentes (
                        id,
                        nome_gerente
                    )
                )
            `)
            .eq('promotor_id', promotorId)

        if (error) throw error
        
        // Extrair gerentes únicos
        const gerentesMap = new Map()
        data?.forEach(item => {
            if (item.lojas?.gerentes) {
                gerentesMap.set(item.lojas.gerentes.id, item.lojas.gerentes)
            }
        })
        
        return Array.from(gerentesMap.values()).map(g => ({
            id: g.id,
            nome_gerente: g.nome_gerente
        }))
    } catch (error) {
        console.error('❌ Erro ao buscar gerentes do promotor:', error)
        return []
    }
}
