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
import { Plus, Search, Edit, Package } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

interface Categoria {
  id: string
  categoria_produto: string
  totalSkus: number
  promotoresEspecializados: number
}

export default function Categorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      // Buscar todos os produtos para agrupar por categoria
      const produtos = await pb.collection('produtos').getList(1, 1000, {
        sort: 'categoria_produto'
      })

      // Agrupar por categoria
      const categoriasMap = new Map<string, Categoria>()
      
      produtos.items.forEach(prod => {
        const catNome = prod.categoria_produto
        if (catNome) {
          if (!categoriasMap.has(catNome)) {
            categoriasMap.set(catNome, {
              id: catNome,
              categoria_produto: catNome,
              totalSkus: 0,
              promotoresEspecializados: 0
            })
          }
          const cat = categoriasMap.get(catNome)!
          cat.totalSkus += 1
        }
      })

      // Buscar promotores para contar especializações
      const promotores = await pb.collection('promotores').getList(1, 1000, {
        expand: 'marca_produto'
      })

      // Contar promotores por categoria (via marcas)
      promotores.items.forEach(prom => {
        const marca = prom.expand?.marca_produto
        if (marca && marca.categoria_produto) {
          const cat = categoriasMap.get(marca.categoria_produto)
          if (cat) {
            cat.promotoresEspecializados += 1
          }
        }
      })

      setCategorias(Array.from(categoriasMap.values()))
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('produtos', () => loadData())
  useRealtime('promotores', () => loadData())

  const filteredCategorias = categorias.filter(cat =>
    cat.categoria_produto?.toLowerCase().includes(search.toLowerCase())
  )

  const handleEdit = (categoria: Categoria) => {
    // Implementar edição depois
    console.log('Editar categoria:', categoria.categoria_produto)
  }

  const handleNewCategoria = () => {
    // Implementar nova categoria depois
    console.log('Nova categoria')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight">Categorias de Produtos</h2>
        </div>
        <div className="flex gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar categoria..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={handleNewCategoria}>
            <Plus className="mr-2 h-4 w-4" /> Nova Categoria
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
                  <TableHead className="pl-6">Nome da Categoria</TableHead>
                  <TableHead className="text-right">Total de SKUs</TableHead>
                  <TableHead className="text-right">Promotores Especializados</TableHead>
                  <TableHead className="text-right pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategorias.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="pl-6 font-medium">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {cat.categoria_produto}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{cat.totalSkus}</TableCell>
                    <TableCell className="text-right">{cat.promotoresEspecializados}</TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(cat)}>
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCategorias.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      Nenhuma categoria encontrada.
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
