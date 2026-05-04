import { useAuth } from './use-auth'

export function useStoreFilter() {
  const { isAdmin, userLojaId } = useAuth()

  const addStoreFilter = (query: any, storeIdField: string = 'loja_id') => {
    if (!isAdmin && userLojaId) {
      return query.eq(storeIdField, userLojaId)
    }
    return query
  }

  return { addStoreFilter, isAdmin, userLojaId }
}
