// src/services/visitas.ts
import { supabase } from '@/lib/supabase'

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

// ============================================
// CONSTANTES
// ============================================

/**
 * Select padrão para consultas de visitas com joins
 */
const VISITA_SELECT = `
  *,
  promotores ( promotor_nome ),
  lojas ( nome_loja, cod_loja )
`

// ============================================
// HELPERS
// ============================================

/**
 * Tratamento centralizado de erros
 */
function handleError(error: unknown, mensagem: string): never {
  console.error(mensagem, error)
  throw error
}

/**
 * Valida se um objeto é uma visita
 */
function isVisita(data: unknown): data is Visita {
  return data !== null && typeof data === 'object' && 'id' in data
}

// ============================================
// FUNÇÕES PÚBLICAS
// ============================================

/**
 * Buscar visitas em andamento
 */
export async function getVisitasEmAndamento(): Promise<Visita[]> {
  const { data, error } = await supabase
    .from('visitas')
    .select(VISITA_SELECT)
    .eq('status', 'em_andamento')
    .order('check_in', { ascending: false })

  if (error) {
    handleError(error, 'Erro ao buscar visitas em andamento')
  }

  return data || []
}

/**
 * Buscar últimas visitas concluídas
 * Ordenadas pela data de saída (mais recentes primeiro)
 */
export async function getVisitasConcluidas(limit: number = 20): Promise<Visita[]> {
  const { data, error } = await supabase
    .from('visitas')
    .select(VISITA_SELECT)
    .eq('status', 'concluida')
    .order('check_out', { ascending: false })
    .limit(limit)

  if (error) {
    handleError(error, 'Erro ao buscar visitas concluídas')
  }

  return data || []
}

/**
 * Buscar todas as visitas (para histórico completo)
 */
export async function getVisitas(limit: number = 50): Promise<Visita[]> {
  const { data, error } = await supabase
    .from('visitas')
    .select(VISITA_SELECT)
    .order('check_out', { ascending: false })
    .limit(limit)

  if (error) {
    handleError(error, 'Erro ao buscar visitas')
  }

  return data || []
}

/**
 * Buscar visitas de um promotor específico
 */
export async function getVisitasByPromotor(promotorId: string): Promise<Visita[]> {
  const { data, error } = await supabase
    .from('visitas')
    .select(VISITA_SELECT)
    .eq('promotor_id', promotorId)
    .order('check_in', { ascending: false })

  if (error) {
    handleError(error, `Erro ao buscar visitas do promotor ${promotorId}`)
  }

  return data || []
}

/**
 * Buscar visitas de uma loja específica
 */
export async function getVisitasByLoja(lojaId: string): Promise<Visita[]> {
  const { data, error } = await supabase
    .from('visitas')
    .select(VISITA_SELECT)
    .eq('loja_id', lojaId)
    .order('check_in', { ascending: false })

  if (error) {
    handleError(error, `Erro ao buscar visitas da loja ${lojaId}`)
  }

  return data || []
}

/**
 * Criar um novo check-in
 * ⚠️ O campo check_in é preenchido automaticamente pelo banco com now()
 */
export async function registrarCheckIn(data: CreateCheckInDTO): Promise<Visita> {
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

  return result
}

/**
 * Finalizar um check-out
 * ⚠️ O check_out é preenchido automaticamente pelo trigger do banco!
 * ⚠️ Não enviamos check_out no update
 */
export async function registrarCheckOut(
  id: string,
  data: FinishCheckOutDTO
): Promise<Visita> {
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

  return result
}

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
export async function getCheckInAtivo(promotorId: string): Promise<Visita | null> {
  const { data, error } = await supabase
    .from('visitas')
    .select(VISITA_SELECT)
    .eq('promotor_id', promotorId)
    .eq('status', 'em_andamento')
    .maybeSingle()

  if (error) {
    handleError(error, `Erro ao buscar check-in ativo do promotor ${promotorId}`)
  }

  return data || null
}

/**
 * Buscar uma visita por ID
 */
export async function getVisitaById(id: string): Promise<Visita | null> {
  const { data, error } = await supabase
    .from('visitas')
    .select(VISITA_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    handleError(error, `Erro ao buscar visita ${id}`)
  }

  return data || null
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

/**
 * Contar visitas por período
 */
export async function countVisitasByPeriod(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const { count, error } = await supabase
    .from('visitas')
    .select('id', { count: 'exact', head: true })
    .gte('check_in', startDate.toISOString())
    .lt('check_in', endDate.toISOString())

  if (error) {
    handleError(error, 'Erro ao contar visitas por período')
  }

  return count || 0
}
