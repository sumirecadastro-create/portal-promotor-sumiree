import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, MapPin, Store, Plus } from 'lucide-react'
import { getPromotores, Promotor, createPromotor } from '@/services/promotores'
import { getLojas } from '@/services/lojas'
import { getGerentes, Gerente } from '@/services/gerentes'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Loja {
  id: string
  cod_loja: string
  nome_loja: string
}

interface Produto {
  id: string
  marca_produto: string
  fabricante_produto: string
}

export default function Promotores() {
  const [promotores, setPromotores] = useState<Promotor[]>([])
  const [lojas, setLojas] = useState<Loja[]>([])
  const [gerentes, setGerentes] = useState<Gerente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // Formulário de novo promotor
  const [newPromotor, setNewPromotor] = useState({
    promotor_nome: '',
    loja_id: '',
    gerente_id: '',
    marca_produto: '',
    fabricante_produto: '',
    dias_semana: '',
    contato_responsavel: '',
    status: 'ativo'
  })

  const loadData = async () => {
    try {
      const [promotoresData, lojasData, gerentesData, produtosData] = await Promise.all([
        getPromotores(),
        getLojas(),
        getGerentes(),
        supabase.from('produtos').select('id, marca_produto, fabricante_produto')
      ])
      setPromotores(promotoresData)
      setLojas(lojasData)
      setGerentes(gerentesData)
      if (produtosData.data) setProdutos(produtosData.data)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Quando a loja é selecionada, filtrar os gerentes daquela loja
  const gerentesFiltrados = gerentes.filter(g => 
    newPromotor.loja_id ? g.cod_loja === newPromotor.loja_id : true
  )

  const handleCreatePromotor = async () => {
    if (!newPromotor.promotor_nome) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Nome do promotor é obrigatório',
      })
      return
    }

    setSaving(true)
    try {
      const result = await createPromotor(newPromotor)
      if (result) {
        toast({
          title: 'Sucesso',
          description: 'Promotor criado com sucesso!',
        })
        setOpen(false)
        setNewPromotor({
          promotor_nome: '',
          loja_id: '',
          gerente_id: '',
          marca_produto: '',
          fabricante_produto: '',
          dias_semana: '',
          contato_responsavel: '',
          status: 'ativo'
        })
        await loadData()
      } else {
        throw new Error('Erro ao criar promotor')
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Erro ao criar promotor',
      })
    } finally {
      setSaving(false)
    }
  }

  const filteredPromotores = promotores.filter((p) =>
    p.promotor_nome?.toLowerCase().includes(search.toLowerCase())
  )

  const getInitials = (name: string) => (name ? name.substring(0, 2).toUpperCase() : 'PR')

  const getLojaNome = (promoter: Promotor) => {
    return promoter.lojas?.nome_loja || 'Nenhuma loja vinculada'
  }

  const getGerenteNome = (promoter: Promotor) => {
    return promoter.gerentes?.nome_gerente || 'Sem gerente'
  }

  const getMarca = (promoter: Promotor) => {
    return promoter.marca_produto || 'Sem Marca'
  }

  // Obter lista única de marcas e fabricantes dos produtos
  const marcas = [...new Set(produtos.map(p => p.marca_produto).filter(Boolean))]
  const fabricantes = [...new Set(produtos.map(p => p.fabricante_produto).filter(Boolean))]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar promotor..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Promotor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Promotor</DialogTitle>
              <DialogDescription>
                Preencha os dados para cadastrar um novo promotor.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="promotor_nome">Nome do Promotor *</Label>
                <Input
                  id="promotor_nome"
                  placeholder="Nome completo"
                  value={newPromotor.promotor_nome}
                  onChange={(e) => setNewPromotor({ ...newPromotor, promotor_nome: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="loja_id">Loja Vinculada</Label>
                <Select
                  value={newPromotor.loja_id}
                  onValueChange={(value) => {
                    setNewPromotor({ ...newPromotor, loja_id: value, gerente_id: '' })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma loja" />
                  </SelectTrigger>
                  <SelectContent>
                    {lojas.map((loja) => (
                      <SelectItem key={loja.id} value={loja.id}>
                        {loja.cod_loja} - {loja.nome_loja}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gerente_id">Gerente Responsável</Label>
                <Select
                  value={newPromotor.gerente_id}
                  onValueChange={(value) => setNewPromotor({ ...newPromotor, gerente_id: value })}
                  disabled={!newPromotor.loja_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={newPromotor.loja_id ? "Selecione um gerente" : "Primeiro selecione uma loja"} />
                  </SelectTrigger>
                  <SelectContent>
                    {gerentesFiltrados.map((gerente) => (
                      <SelectItem key={gerente.id} value={gerente.id}>
                        {gerente.nome_gerente} {gerente.telefone ? `- ${gerente.telefone}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="marca_produto">Marca que Atende</Label>
                  <Select
                    value={newPromotor.marca_produto}
                    onValueChange={(value) => setNewPromotor({ ...newPromotor, marca_produto: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma marca" />
                    </SelectTrigger>
                    <SelectContent>
                      {marcas.map((marca) => (
                        <SelectItem key={marca} value={marca}>
                          {marca}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fabricante_produto">Fabricante que Atende</Label>
                  <Select
                    value={newPromotor.fabricante_produto}
                    onValueChange={(value) => setNewPromotor({ ...newPromotor, fabricante_produto: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um fabricante" />
                    </SelectTrigger>
                    <SelectContent>
                      {fabricantes.map((fabricante) => (
                        <SelectItem key={fabricante} value={fabricante}>
                          {fabricante}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dias_semana">Dias de Atuação</Label>
                <Input
                  id="dias_semana"
                  placeholder="Ex: Segunda, Terça, Quarta"
                  value={newPromotor.dias_semana}
                  onChange={(e) => setNewPromotor({ ...newPromotor, dias_semana: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contato_responsavel">Contato / Telefone</Label>
                <Input
                  id="contato_responsavel"
                  placeholder="(11) 99999-9999"
                  value={newPromotor.contato_responsavel}
                  onChange={(e) => setNewPromotor({ ...newPromotor, contato_responsavel: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreatePromotor} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPromotores.map((promoter) => (
            <Card key={promoter.id} className="hover:shadow-md transition-shadow group">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <Avatar className="h-20 w-20 border-2 border-background shadow-sm">
                    <AvatarImage
                      src={`https://img.usecurling.com/ppl/thumbnail?seed=${promoter.id}`}
                    />
                    <AvatarFallback>{getInitials(promoter.promotor_nome)}</AvatarFallback>
                  </Avatar>

                  <div>
                    <h3 className="font-semibold text-lg">{promoter.promotor_nome}</h3>
                    <p className="text-sm text-muted-foreground">{getMarca(promoter)}</p>
                  </div>

                  <div className="flex flex-col gap-2 w-full text-sm text-muted-foreground mt-4 text-left border-t pt-4">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 shrink-0" />
                      <span className="truncate">{getLojaNome(promoter)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="truncate">Gerente: {getGerenteNome(promoter)}</span>
                    </div>
                    {promoter.dias_semana && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium">Dias:</span>
                        <span>{promoter.dias_semana}</span>
                      </div>
                    )}
                  </div>

                  <div className="w-full pt-4 border-t mt-4 flex justify-end">
                    <Button variant="secondary" size="sm" disabled className="w-full">
                      Perfil
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredPromotores.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Nenhum promotor encontrado.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
