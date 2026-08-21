// services/notificacoes.ts
import { supabase } from '@/lib/supabase'

export interface Notificacao {
    id: string
    usuario_id: string
    tipo: 'checkin' | 'solicitacao' | 'campanha' | 'acao' | 'sistema'
    titulo: string
    mensagem: string
    link: string | null
    lida: boolean
    created_at: string
}

/**
 * 🔥 Buscar notificações do usuário
 */
export async function getNotificacoes(): Promise<Notificacao[]> {
    try {
        const { data: userData } = await supabase.auth.getUser()
        const user = userData?.user

        if (!user) return []

        const { data, error } = await supabase
            .from('notificacoes')
            .select('*')
            .eq('usuario_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('❌ Erro ao buscar notificações:', error)
        return []
    }
}

/**
 * 🔥 Buscar notificações não lidas
 */
export async function getNotificacoesNaoLidas(): Promise<Notificacao[]> {
    try {
        const { data: userData } = await supabase.auth.getUser()
        const user = userData?.user

        if (!user) return []

        const { data, error } = await supabase
            .from('notificacoes')
            .select('*')
            .eq('usuario_id', user.id)
            .eq('lida', false)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('❌ Erro ao buscar notificações não lidas:', error)
        return []
    }
}

/**
 * 🔥 Contar notificações não lidas
 */
export async function countNotificacoesNaoLidas(): Promise<number> {
    try {
        const { data: userData } = await supabase.auth.getUser()
        const user = userData?.user

        if (!user) return 0

        const { count, error } = await supabase
            .from('notificacoes')
            .select('id', { count: 'exact', head: true })
            .eq('usuario_id', user.id)
            .eq('lida', false)

        if (error) throw error
        return count || 0
    } catch (error) {
        console.error('❌ Erro ao contar notificações:', error)
        return 0
    }
}

/**
 * 🔥 Marcar notificação como lida
 */
export async function marcarNotificacaoComoLida(id: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('notificacoes')
            .update({ lida: true })
            .eq('id', id)

        if (error) throw error
        return true
    } catch (error) {
        console.error('❌ Erro ao marcar notificação como lida:', error)
        return false
    }
}

/**
 * 🔥 Marcar todas as notificações como lidas
 */
export async function marcarTodasNotificacoesComoLidas(): Promise<boolean> {
    try {
        const { data: userData } = await supabase.auth.getUser()
        const user = userData?.user

        if (!user) return false

        const { error } = await supabase
            .from('notificacoes')
            .update({ lida: true })
            .eq('usuario_id', user.id)
            .eq('lida', false)

        if (error) throw error
        return true
    } catch (error) {
        console.error('❌ Erro ao marcar todas notificações como lidas:', error)
        return false
    }
}

/**
 * 🔥 Criar notificação (para uso em triggers/testes)
 */
export async function criarNotificacaoManual(
    usuarioId: string,
    tipo: string,
    titulo: string,
    mensagem: string,
    link?: string
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('notificacoes')
            .insert({
                usuario_id: usuarioId,
                tipo,
                titulo,
                mensagem,
                link: link || null
            })

        if (error) throw error
        return true
    } catch (error) {
        console.error('❌ Erro ao criar notificação:', error)
        return false
    }
}

/**
 * 🔥 Deletar notificação
 */
export async function deletarNotificacao(id: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('notificacoes')
            .delete()
            .eq('id', id)

        if (error) throw error
        return true
    } catch (error) {
        console.error('❌ Erro ao deletar notificação:', error)
        return false
    }
}