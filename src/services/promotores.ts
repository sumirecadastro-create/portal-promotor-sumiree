import pb from '@/lib/pocketbase/client'
import { RecordModel } from 'pocketbase'

export async function getPromotores() {
  try {
    const result = await pb.collection('promotores').getList(1, 100, {
      sort: 'promotor_nome',
      expand: 'loja_id,gerente_id,marca_produto'
    })
    return result.items
  } catch (error) {
    console.error('Erro ao buscar promotores:', error)
    return []
  }
}

export async function getPromotorById(id: string) {
  try {
    const promotor = await pb.collection('promotores').getOne(id, {
      expand: 'loja_id,gerente_id,marca_produto'
    })
    return promotor
  } catch (error) {
    console.error('Erro ao buscar promotor:', error)
    return null
  }
}
