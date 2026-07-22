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

export interface PromotorCarta {
    id: string
    promotor_id: string
    arquivo: string
    nome_original: string
    data_envio: string
    data_validade: string | null
    status: 'pendente' | 'valido' | 'vencido'
    created_at: string
    updated_at: string
}

export interface PromotorCompleto {
    id: string
    promotor_nome: string
    status: string
    dias_semana: string | null
    contato_responsavel: string | null
    loja_ids: string[]
    gerente_ids: string[] | null
    lojas: {
        id: string
        cod_loja: string
        nome_loja: string
        numero_loja?: string
    }[]
    gerentes: {
        id: string
        nome_gerente: string
        telefone: string | null
        cod_loja: string | null
    }[]
    marcas: {
        id: string
        nome: string
    }[]
    carta: PromotorCarta | null
}

// ============================================
// CONSTANTES
// ============================================

const LOJA_SELECT = 'id, cod_loja, nome_loja, cidade'
const PROMOTOR_COMPLETO_SELECT = `
    id,
    promotor_nome,
    status,
    dias_semana,
    contato_responsavel,
    promotores_lojas(
        lojas(
            id,
            cod_loja,
            nome_loja,
            numero_loja,
            gerente_id,
            gerentes(
                id,
                nome_gerente,
                telefone,
                cod_loja
            )
        )
    ),
    promotores_marcas(
        marcas(
            id,
            nome
        )
    )
`

// ============================================
// HELPERS
// ============================================

function handleError(error: unknown, mensagem: string): never {
    console.error(mensagem, error)
    throw error
}

function unique<T>(items: T[]): T[] {
    return [...new Set(items)]
}

function hasRole(role: AppRole, ...allowedRoles: AppRole[]): boolean {
    return allowedRoles.includes(role)
}

// ============================================
// NÍVEL 1: IDs DAS LOJAS PERMITIDAS
// ============================================

export async function getLojasPermitidas(permissions: UserPermissions): Promise<string[]> {
    const { id, app_role, loja_id } = permissions

    if (hasRole(app_role, 'admin', 'gestor')) {
        const { data, error } = await supabase
            .from('lojas')
            .select('id')

        if (error) {
            handleError(error, 'Erro ao buscar lojas para admin/gestor')
        }

        return data?.map(l => l.id) || []
    }

    if (app_role === 'gerente' && loja_id) {
        return [loja_id]
    }

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

export async function getPromotoresIds(permissions: UserPermissions): Promise<string[]> {
    const { id, app_role, loja_id } = permissions

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

export async function getPromotoresCompletos(
    permissions: UserPermissions
): Promise<PromotorCompleto[]> {
    const ids = await getPromotoresIds(permissions)

    if (ids.length === 0) {
        return []
    }

    const { data, error } = await supabase
        .from('promotores')
        .select(PROMOTOR_COMPLETO_SELECT)
        .in('id', ids)
        .eq('status', 'ativo')
        .order('promotor_nome')

    if (error) {
        handleError(error, 'Erro ao buscar promotores completos')
    }

    if (!data || data.length === 0) {
        return []
    }

    // Buscar cartas separadamente
    const { data: cartasData, error: cartasError } = await supabase
        .from('promotores_cartas')
        .select('*')
        .eq('status', 'valido')
        .order('created_at', { ascending: false })

    if (cartasError) {
        console.error('Erro ao buscar cartas:', cartasError)
    }

    const cartasPorPromotor: Record<string, PromotorCarta> = {}
    if (cartasData) {
        cartasData.forEach(carta => {
            if (!cartasPorPromotor[carta.promotor_id]) {
                cartasPorPromotor[carta.promotor_id] = carta
            }
        })
    }

    const result = data.map((promotor: any) => {
        // Extrair lojas com seus gerentes
        const lojasComGerentes = promotor.promotores_lojas
            ?.map((pl: any) => pl.lojas)
            .filter(Boolean) || []

        // Extrair gerentes únicos das lojas
        const gerentesMap = new Map()
        lojasComGerentes.forEach((loja: any) => {
            if (loja.gerentes) {
                gerentesMap.set(loja.gerentes.id, loja.gerentes)
            }
        })
        const gerentes = Array.from(gerentesMap.values())

        // Extrair marcas
        const marcas = promotor.promotores_marcas
            ?.map((pm: any) => pm.marcas)
            .filter(Boolean) || []

        // Extrair lojas (sem os gerentes aninhados)
        const lojas = lojasComGerentes.map((loja: any) => ({
            id: loja.id,
            cod_loja: loja.cod_loja,
            nome_loja: loja.nome_loja,
            numero_loja: loja.numero_loja
        }))

        // Extrair IDs das lojas
        const loja_ids = lojas.map(l => l.id)

        return {
            id: promotor.id,
            promotor_nome: promotor.promotor_nome,
            status: promotor.status,
            dias_semana: promotor.dias_semana,
            contato_responsavel: promotor.contato_responsavel,
            loja_ids,
            gerente_ids: promotor.gerente_ids || [],
            lojas,
            gerentes,
            marcas,
            carta: cartasPorPromotor[promotor.id] || null
        }
    })

    return result
}

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

export async function hasAccessToLoja(
    permissions: UserPermissions,
    lojaId: string
): Promise<boolean> {
    const lojasPermitidas = await getLojasPermitidas(permissions)
    return lojasPermitidas.includes(lojaId)
}

export async function hasAccessToPromotor(
    permissions: UserPermissions,
    promotorId: string
): Promise<boolean> {
    const promotoresPermitidos = await getPromotoresIds(permissions)
    return promotoresPermitidos.includes(promotorId)
}
