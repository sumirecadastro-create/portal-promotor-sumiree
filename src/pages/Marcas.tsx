import { useEffect, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Edit, Package } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Marca {
  id: string
  marca_produto: string
  categoria_produto: string
  status: string
  totalPromotores?: number
}

export default function Marcas() {
  const [marcas, setMarcas] = useState<Marca[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      // Buscar todos os produtos (marcas estão na collection produtos)
      const { data: produtos, error: produtosError } = await supabase
        .from('produtos')
        .select('*')
        .order('marca_produto')

      if (produtosError) throw produtosError

      // Agrupar por marca
      const marcasMap = new Map<string, Marca>()

      produtos?.forEach(prod => {
        const marcaNome = prod.marca_produto
        const categoriaNome = prod.categoria_produto

        if (marcaNome) {
          if (!marcasMap.has(marcaNome)) {
            marcasMap.set(marcaNome, {
              id: marcaNome,
              marca_produto: marcaNome,
              categoria_produto: categoriaNome || 'Sem categoria',
              status: 'ativo',
              totalPromotores: 0
            })
          }
        }
      })

      // Buscar promotores para contar quantos representam cada marca
      const { data: promotores, error: promotoresError } = await supabase
        .from('promotores')
        .select('marca_produto')

      if (promotoresError) throw promotoresError

      // Contar promotores por marca
      promotores?.forEach(prom => {
        const marcaNome = prom.marca_produto
        if (marcaNome) {
          const marcaItem = marcasMap.get(marcaNome)
          if (marcaItem) {
            marcaItem.totalPromotores = (marcaItem.totalPromotores || 0) + 1
          }
        }
      })

      setMarcas(Array.from(marcasMap.values()))
    } catch (error) {
      console.error('Erro ao carregar marcas:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredMarcas = marcas.filter(marca =>
    marca.marca_produto?.toLowerCase().includes(search.toLowerCase())
  )

  const handleEdit = (marca: Marca) => {
    console.log('Editar marca:', marca.marca_produto)
  }

  const handleNewMarca = () => {
    console.log('Nova marca')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight">Marcas Parceiras</h2>
        </div>
        <div className="flex gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar marca..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={handleNewMarca}>
            <Plus className="mr-2 h-4 w-4" /> Nova Marca
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Nome da Marca</TableHead>
                  <TableHead>Categoria Principal</TableHead>
                  <TableHead className="text-center">Promotores</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMarcas.map((marca) => (
                  <TableRow key={marca.id}>
                    <TableCell className="pl-6 font-medium">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {marca.marca_produto}
                      </div>
                    </TableCell>
                    <TableCell>{marca.categoria_produto}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {marca.totalPromotores || 0} promotores
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={marca.status === 'ativo' ? 'default' : 'secondary'}
                        className={marca.status === 'ativo' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                      >
                        {marca.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(marca)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredMarcas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      Nenhuma marca encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
