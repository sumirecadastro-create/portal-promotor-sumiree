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
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface Marca {
  id: string
  nome: string
  created_at?: string
}

export default function Marcas() {
  const [marcas, setMarcas] = useState<Marca[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newMarca, setNewMarca] = useState('')
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('marcas')
        .select('*')
        .order('nome')
      
      if (error) throw error
      setMarcas(data || [])
    } catch (error) {
      console.error('Erro ao carregar marcas:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar as marcas',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateMarca = async () => {
    if (!newMarca.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Nome da marca é obrigatório',
      })
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('marcas')
        .insert({ nome: newMarca.trim() })
      
      if (error) throw error
      
      toast({
        title: 'Sucesso',
        description: 'Marca criada com sucesso!',
      })
      setOpen(false)
      setNewMarca('')
      await loadData()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Erro ao criar marca',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteMarca = async (id: string, nome: string) => {
    if (confirm(`Deseja realmente excluir a marca "${nome}"?`)) {
      try {
        const { error } = await supabase
          .from('marcas')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        
        toast({
          title: 'Sucesso',
          description: 'Marca excluída com sucesso!',
        })
        await loadData()
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: error.message || 'Erro ao excluir marca',
        })
      }
    }
  }

  const filteredMarcas = marcas.filter(marca =>
    marca.nome?.toLowerCase().includes(search.toLowerCase())
  )

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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Marca
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Marca</DialogTitle>
                <DialogDescription>
                  Cadastre uma nova marca para ser associada aos promotores.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Marca *</Label>
                  <Input
                    id="nome"
                    placeholder="Ex: Haskell"
                    value={newMarca}
                    onChange={(e) => setNewMarca(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateMarca} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lista de Marcas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Nome da Marca</TableHead>
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
                        {marca.nome}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">
                        Ativo
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMarca(marca.id, marca.nome)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Excluir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredMarcas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
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
