import { useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { STORES, PROMOTERS } from '@/lib/mock-data'
import { ArrowLeft, MapPin, Phone, UserCircle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default function LojaDetail() {
  const { id } = useParams()
  const store = STORES.find((s) => s.id === id) || STORES[0]

  // Mock finding assigned promoters
  const assignedPromoters = PROMOTERS.slice(0, 2)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/lojas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{store.name}</h2>
          <p className="text-muted-foreground font-mono text-sm">Código: {store.code}</p>
        </div>
        <Badge variant={store.status === 'Ativo' ? 'default' : 'secondary'} className="ml-auto">
          {store.status}
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
                <p className="text-muted-foreground text-sm">{store.address}</p>
                <p className="text-muted-foreground text-sm">{store.region}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <UserCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">Gerente</p>
                <p className="text-muted-foreground text-sm">{store.manager}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">Contato</p>
                <p className="text-muted-foreground text-sm">(11) 3456-7890</p>
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
              {assignedPromoters.map((promoter) => (
                <div
                  key={promoter.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={promoter.avatar} />
                      <AvatarFallback>{promoter.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{promoter.name}</p>
                      <p className="text-xs text-muted-foreground">{promoter.category}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/promotores/${promoter.id}`}>Ver</Link>
                  </Button>
                </div>
              ))}
              {assignedPromoters.length === 0 && (
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
