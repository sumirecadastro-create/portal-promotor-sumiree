import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PROMOTERS } from '@/lib/mock-data'
import { Search, Plus, Phone } from 'lucide-react'

export default function Promotores() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar promotor..." className="pl-8" />
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Novo Promotor
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {PROMOTERS.map((promoter) => (
          <Card key={promoter.id} className="hover:shadow-md transition-shadow group">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  <Avatar className="h-20 w-20 border-2 border-background shadow-sm">
                    <AvatarImage src={promoter.avatar} />
                    <AvatarFallback>{promoter.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {promoter.status === 'Check-in Ativo' && (
                    <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-background bg-emerald-500 animate-pulse" />
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-lg">{promoter.name}</h3>
                  <p className="text-sm text-muted-foreground">{promoter.category}</p>
                </div>

                <Badge
                  variant={promoter.status === 'Folga' ? 'secondary' : 'outline'}
                  className="mt-2"
                >
                  {promoter.status}
                </Badge>

                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                  <Phone className="h-4 w-4" />
                  {promoter.phone}
                </div>

                <div className="w-full pt-4 border-t mt-4 flex justify-between items-center">
                  <div className="text-xs text-muted-foreground text-left">
                    Marcas:
                    <br />
                    <span className="font-medium text-foreground">
                      {promoter.brands.join(', ')}
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    asChild
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Link to={`/promotores/${promoter.id}`}>Perfil</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
