import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Plus, Eye } from 'lucide-react'
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

interface Loja {
  id: string
  cod_loja: string
  nome_loja: string
}

export default function Lojas() {
  const [lojas, setLojas] = useState<Loja[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [newCodLoja, setNewCodLoja] = useState('')
  const [newNomeLoja, setNewNomeLoja] = useState('')
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('lojas')
        .select('*')
        .order('nome_loja')
      
      if (error) throw error
      setLojas(data || [])
    } catch (error) {
      console.error('Erro ao carregar lojas:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar as lojas',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateLoja = async () => {
    if (!newCodLoja || !newNomeLoja) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Preencha todos os campos',
      })
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('lojas')
        .insert({ cod_loja: newCodLoja, nome_loja: newNomeLoja })
      
      if (error) throw error
      
      toast({
        title: 'Sucesso',
        description: 'Loja criada com sucesso!',
      })
      setOpen(false)
      setNewCodLoja('')
      setNewNomeLoja('')
      await loadData()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Erro ao criar loja',
      })
    } finally {
      setSaving(false)
    }
  }

  const filteredLojas = lojas.filter(loja =>
    loja.cod_loja?.toLowerCase().includes(search.toLowerCase()) ||
    loja.nome_loja?.toLowerCase().includes(search.toLowerCase())
  )

  const handleViewDetails = (id: string) => {
    navigate(`/lojas/${id}`)
  }

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
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Loja
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Loja</DialogTitle>
              <DialogDescription>
                Preencha os dados para cadastrar uma nova loja.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cod_loja">Código da Loja</Label>
                <Input
                  id="cod_loja"
                  placeholder="Ex: LJ001"
                  value={newCodLoja}
                  onChange={(e) => setNewCodLoja(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome_loja">Nome da Loja</Label>
                <Input
                  id="nome_loja"
                  placeholder="Ex: Loja Centro"
                  value={newNomeLoja}
                  onChange={(e) => setNewNomeLoja(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateLoja} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Unidades Sumirê ({lojas.length})</CardTitle>
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
                  <TableHead>Código</TableHead>
                  <TableHead>Nome da Loja</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLojas.map((loja) => (
                  <TableRow key={loja.id}>
                    <TableCell className="font-medium">{loja.cod_loja}</TableCell>
                    <TableCell>{loja.nome_loja}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(loja.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLojas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
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
