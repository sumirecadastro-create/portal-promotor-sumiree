import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { STORES } from '@/lib/mock-data'
import { Search, Plus } from 'lucide-react'

export default function Lojas() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por código ou nome..." className="pl-8" />
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Nova Loja
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-lg">Unidades Sumirê</CardTitle>
        </CardHeader>
        <CardContent className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Região</TableHead>
                <TableHead>Cobertura</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {STORES.map((store) => (
                <TableRow key={store.id}>
                  <TableCell className="font-mono text-xs">{store.code}</TableCell>
                  <TableCell className="font-medium">{store.name}</TableCell>
                  <TableCell>{store.region}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden max-w-[100px]">
                        <div
                          className="bg-primary h-full rounded-full"
                          style={{ width: `${store.coverage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{store.coverage}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={store.status === 'Ativo' ? 'default' : 'secondary'}>
                      {store.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/lojas/${store.id}`}>Ver Detalhes</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
