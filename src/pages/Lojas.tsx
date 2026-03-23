import { useEffect, useState } from 'react'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { getLojas } from '@/services/lojas'
import { RecordModel } from 'pocketbase'
import { useRealtime } from '@/hooks/use-realtime'

export default function Lojas() {
  const [lojas, setLojas] = useState<RecordModel[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    const data = await getLojas()
    setLojas(data)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('lojas', () => loadData())

  const filteredLojas = lojas.filter(
    (loja) =>
      loja.loja_nome.toLowerCase().includes(search.toLowerCase()) ||
      loja.cod_loja.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou nome..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-lg">Unidades Sumirê ({filteredLojas.length})</CardTitle>
        </CardHeader>
        <CardContent className="mt-4">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Código</TableHead>
                  <TableHead>Nome da Loja</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLojas.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-mono text-xs">{store.cod_loja}</TableCell>
                    <TableCell className="font-medium">{store.loja_nome}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/lojas/${store.id}`}>Ver Detalhes</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLojas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Nenhuma loja encontrada.
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
