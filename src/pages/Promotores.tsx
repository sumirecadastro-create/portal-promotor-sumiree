import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, MapPin, Store } from 'lucide-react'
import { getPromotores, Promotor } from '@/services/promotores'

export default function Promotores() {
  const [promotores, setPromotores] = useState<Promotor[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    const data = await getPromotores()
    setPromotores(data)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredPromotores = promotores.filter((p) =>
    p.promotor_nome?.toLowerCase().includes(search.toLowerCase())
  )

  const getInitials = (name: string) => (name ? name.substring(0, 2).toUpperCase() : 'PR')

  // Função para obter o nome da loja
  const getLojaNome = (promoter: Promotor) => {
    return promoter.lojas?.nome_loja || 'Nenhuma loja vinculada'
  }

  // Função para obter a marca
  const getMarca = (promoter: Promotor) => {
    return promoter.marca_produto || 'Sem Marca'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar promotor..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPromotores.map((promoter) => (
            <Card key={promoter.id} className="hover:shadow-md transition-shadow group">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <Avatar className="h-20 w-20 border-2 border-background shadow-sm">
                    <AvatarImage
                      src={`https://img.usecurling.com/ppl/thumbnail?seed=${promoter.id}`}
                    />
                    <AvatarFallback>{getInitials(promoter.promotor_nome)}</AvatarFallback>
                  </Avatar>

                  <div>
                    <h3 className="font-semibold text-lg">{promoter.promotor_nome}</h3>
                    <p className="text-sm text-muted-foreground">{getMarca(promoter)}</p>
                  </div>

                  <div className="flex flex-col gap-2 w-full text-sm text-muted-foreground mt-4 text-left border-t pt-4">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 shrink-0" />
                      <span className="truncate">{getLojaNome(promoter)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="truncate">Gerente: {promoter.gerente_id || '-'}</span>
                    </div>
                  </div>

                  <div className="w-full pt-4 border-t mt-4 flex justify-end">
                    <Button variant="secondary" size="sm" disabled className="w-full">
                      Perfil
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredPromotores.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Nenhum promotor encontrado.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
