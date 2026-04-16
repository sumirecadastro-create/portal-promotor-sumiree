import { supabase } from '@/lib/supabase'  // ← mudou de supabaseClient para supabase

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
    console.log('📤 Fazendo upload da carta para o promotor:', promotorId)
    
    // 1. Upload do PDF para o Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${promotorId}_${Date.now()}.${fileExt}`
    const filePath = `cartas_promotores/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('documentos')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Erro no upload para storage:', uploadError)
      throw uploadError
    }

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

    if (insertError) {
      console.error('Erro ao inserir registro:', insertError)
      throw insertError
    }

    console.log('✅ Carta enviada com sucesso:', data)
    return { success: true, data }
  } catch (error: any) {
    console.error('Erro no upload:', error)
    return { success: false, error: error.message }
  }
}

// Buscar carta de um promotor
export async function getCartaPromotor(promotorId: string): Promise<PromotorCarta | null> {
  try {
    const { data, error } = await supabase
      .from('promotores_cartas')
      .select('*')
      .eq('promotor_id', promotorId)
      .eq('status', 'valido')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar carta:', error)
    }

    return data || null
  } catch (error) {
    console.error('Erro inesperado em getCartaPromotor:', error)
    return null
  }
}

// Deletar carta
export async function deleteCartaPromotor(cartaId: string, filePath: string): Promise<boolean> {
  try {
    console.log('🗑️ Deletando carta:', cartaId)
    
    // Deletar do Storage
    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from('documentos')
        .remove([filePath])
      
      if (storageError) {
        console.error('Erro ao deletar arquivo do storage:', storageError)
      }
    }
    
    // Deletar do banco
    const { error: deleteError } = await supabase
      .from('promotores_cartas')
      .delete()
      .eq('id', cartaId)

    if (deleteError) {
      console.error('Erro ao deletar registro:', deleteError)
      throw deleteError
    }

    console.log('✅ Carta deletada com sucesso')
    return true
  } catch (error) {
    console.error('Erro ao deletar carta:', error)
    throw error
  }
}
