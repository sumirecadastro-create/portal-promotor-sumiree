import { useParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, MapPin, UserCircle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import pb from '@/lib/pocketbase/client'
import { RecordModel } from 'pocketbase'
import { useRealtime } from '@/hooks/use-realtime'

export default function LojaDetail() {
  const { id } = useParams()
  const [store, setStore] = useState<RecordModel | null>(null)
  const [promotores, setPromotores] = useState<RecordModel[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!id) return
    try {
      const storeData = await pb.collection('lojas').getOne(id)
      setStore(storeData)

      const promotoresData = await pb.collection('promotores').getFullList({
        filter: `cod_loja = "${id}"`,
        expand: 'marca_produto',
      })
      setPromotores(promotoresData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  useRealtime('lojas', () => loadData())
  useRealtime('promotores', () => loadData())

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/lojas">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">Loja não encontrada</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/lojas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{store.loja_nome}</h2>
          <p className="text-muted-foreground font-mono text-sm">Código: {store.cod_loja}</p>
        </div>
        <Badge variant="default" className="ml-auto bg-emerald-500 hover:bg-emerald-600">
          Ativa
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações da Unidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">Endereço</p>
                <p className="text-muted-foreground text-sm">Não especificado no sistema</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <UserCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">Gerente</p>
                <p className="text-muted-foreground text-sm">Responsável da loja</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Promotores Alocados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {promotores.map((promoter) => (
                <div
                  key={promoter.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage
                        src={`https://img.usecurling.com/ppl/thumbnail?seed=${promoter.id}`}
                      />
                      <AvatarFallback>{promoter.promotor_nome?.charAt(0) || 'P'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{promoter.promotor_nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {promoter.expand?.marca_produto?.categoria_produto || 'Sem categoria'}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/promotores/${promoter.id}`}>Ver</Link>
                  </Button>
                </div>
              ))}
              {promotores.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum promotor alocado.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
