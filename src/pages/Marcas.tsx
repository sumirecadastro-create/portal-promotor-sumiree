import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'
import { BRANDS } from '@/lib/mock-data'

export default function Marcas() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Marcas Parceiras</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Nova Marca
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Nome da Marca</TableHead>
                <TableHead>Categoria Principal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {BRANDS.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell className="pl-6 font-medium">{brand.name}</TableCell>
                  <TableCell>{brand.category}</TableCell>
                  <TableCell>
                    <Badge variant={brand.status === 'Ativo' ? 'default' : 'secondary'}>
                      {brand.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button variant="ghost" size="sm">
                      Editar
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
