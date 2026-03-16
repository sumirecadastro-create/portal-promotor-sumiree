import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { CATEGORIES } from '@/lib/mock-data'

export default function Categorias() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Categorias de Produtos</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Nova Categoria
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Nome da Categoria</TableHead>
                <TableHead className="text-right">Total de SKUs</TableHead>
                <TableHead className="text-right">Promotores Especializados</TableHead>
                <TableHead className="text-right pr-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CATEGORIES.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="pl-6 font-medium">{cat.name}</TableCell>
                  <TableCell className="text-right">{cat.items}</TableCell>
                  <TableCell className="text-right">{cat.activePromoters}</TableCell>
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
