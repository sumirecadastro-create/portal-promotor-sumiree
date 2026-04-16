import { supabase } from '@/lib/supabaseClient'

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

// Upload da carta para o Storage do Supabase
export async function uploadCartaPromotor(
  promotorId: string,
  file: File
): Promise<{ success: boolean; data?: PromotorCarta; error?: string }> {
  try {
    // 1. Upload do PDF para o Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${promotorId}_${Date.now()}.${fileExt}`
    const filePath = `cartas_promotores/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('documentos')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    // 2. Pegar URL pública do arquivo
    const { data: urlData } = supabase.storage
      .from('documentos')
      .getPublicUrl(filePath)

    const arquivoUrl = urlData.publicUrl

    // 3. Inserir registro na tabela promotores_cartas
    const { data, error: insertError } = await supabase
      .from('promotores_cartas')
      .insert({
        promotor_id: promotorId,
        arquivo: arquivoUrl,
        nome_original: file.name,
        data_envio: new Date().toISOString().split('T')[0],
        status: 'valido'
      })
      .select()
      .single()

    if (insertError) throw insertError

    return { success: true, data }
  } catch (error: any) {
    console.error('Erro no upload:', error)
    return { success: false, error: error.message }
  }
}

// Buscar carta de um promotor
export async function getCartaPromotor(promotorId: string): Promise<PromotorCarta | null> {
  const { data, error } = await supabase
    .from('promotores_cartas')
    .select('*')
    .eq('promotor_id', promotorId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    console.error('Erro ao buscar carta:', error)
  }

  return data || null
}

// Deletar carta
export async function deleteCartaPromotor(cartaId: string, filePath: string) {
  // Deletar do Storage
  await supabase.storage.from('documentos').remove([filePath])
  
  // Deletar do banco
  const { error } = await supabase
    .from('promotores_cartas')
    .delete()
    .eq('id', cartaId)

  if (error) throw error
}
