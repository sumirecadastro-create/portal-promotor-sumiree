import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Search, MapPin, Store, Plus, Edit, Trash2, X } from 'lucide-react'
import { getPromotores, Promotor, createPromotor, updatePromotor, deletePromotor, getMarcasDisponiveis, Marca } from '@/services/promotores'
import { getLojas } from '@/services/lojas'
import { getGerentes, Gerente } from '@/services/gerentes'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'

interface Loja {
  id: string
  cod_loja: string
  nome_loja: string
}

export default function Promotores() {
  const [promotores, setPromotores] = useState<Promotor[]>([])
  const [lojas, setLojas] = useState<Loja[]>([])
  const [gerentes, setGerentes] = useState<Gerente[]>([])
  const [marcasDisponiveis, setMarcasDisponiveis] = useState<Marca[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingPromotor, setEditingPromotor] = useState<Promotor | null>(null)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // Formulário de novo promotor
  const [newPromotor, setNewPromotor] = useState({
    promotor_nome: '',
    loja_id: '',
    gerente_id: '',
    marca_ids: [] as string[],
    dias_semana: '',
    contato_responsavel: '',
    status: 'ativo'
  })

  const loadData = async () => {
    try {
      const [promotoresData, lojasData, gerentesData, marcasData] = await Promise.all([
        getPromotores(),
        getLojas(),
        getGerentes(),
        getMarcasDisponiveis()
      ])
      setPromotores(promotoresData)
      setLojas(lojasData)
      setGerentes(gerentesData)
      setMarcasDisponiveis(marcasData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

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
          marca_ids: [],
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

  const handleUpdatePromotor = async () => {
    if (!editingPromotor) return
    if (!editingPromotor.promotor_nome) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Nome do promotor é obrigatório',
      })
      return
    }

    setSaving(true)
    try {
      const result = await updatePromotor(editingPromotor.id, {
        promotor_nome: editingPromotor.promotor_nome,
        loja_id: editingPromotor.loja_id,
        gerente_id: editingPromotor.gerente_id,
        marca_ids: editingPromotor.marcas?.map(m => m.id) || [],
        dias_semana: editingPromotor.dias_semana,
        contato_responsavel: editingPromotor.contato_responsavel,
        status: editingPromotor.status || 'ativo'
      })
      if (result) {
        toast({
          title: 'Sucesso',
          description: 'Promotor atualizado com sucesso!',
        })
        setEditOpen(false)
        setEditingPromotor(null)
        await loadData()
      } else {
        throw new Error('Erro ao atualizar promotor')
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Erro ao atualizar promotor',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePromotor = async (promotor: Promotor) => {
    if (!confirm(`Deseja realmente excluir o promotor "${promotor.promotor_nome}"?`)) return

    try {
      const result = await deletePromotor(promotor.id)
      if (result) {
        toast({
          title: 'Sucesso',
          description: 'Promotor excluído com sucesso!',
        })
        await loadData()
      } else {
        throw new Error('Erro ao excluir promotor')
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Erro ao excluir promotor',
      })
    }
  }

  const openEditDialog = (promotor: Promotor) => {
    setEditingPromotor({ ...promotor })
    setEditOpen(true)
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

  const getMarcasText = (promoter: Promotor) => {
    if (!promoter.marcas || promoter.marcas.length === 0) return 'Sem marcas'
    return promoter.marcas.map(m => m.nome_marca).join(', ')
  }

  // Função para toggle de marca no multiselect
  const toggleMarca = (marcaId: string, currentIds: string[]) => {
    if (currentIds.includes(marcaId)) {
      return currentIds.filter(id => id !== marcaId)
    } else {
      return [...currentIds, marcaId]
    }
  }

  // Componente de multiselect para marcas
  const MarcasMultiSelect = ({ 
    selectedIds, 
    onChange, 
    disabled = false 
  }: { 
    selectedIds: string[], 
    onChange: (ids: string[]) => void,
    disabled?: boolean
  }) => {
    const [open, setOpen] = useState(false)

    const selectedMarcas = marcasDisponiveis.filter(m => selectedIds.includes(m.id))

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled}
            className="w-full justify-between min-h-[40px] h-auto"
          >
            <div className="flex flex-wrap gap-1">
              {selectedMarcas.length > 0 ? (
                selectedMarcas.map(marca => (
                  <Badge key={marca.id} variant="secondary" className="text-xs">
                    {marca.nome_marca}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">Selecione as marcas...</span>
              )}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <div className="p-2 border-b">
            <Input
              placeholder="Buscar marca..."
              className="h-8"
              onChange={(e) => {
                // Filtro seria implementado aqui
              }}
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {marcasDisponiveis.map((marca) => (
              <div
                key={marca.id}
                className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                onClick={() => onChange(toggleMarca(marca.id, selectedIds))}
              >
                <Checkbox
                  checked={selectedIds.includes(marca.id)}
                  onCheckedChange={() => onChange(toggleMarca(marca.id, selectedIds))}
                />
                <Label className="cursor-pointer flex-1">{marca.nome_marca}</Label>
              </div>
            ))}
            {marcasDisponiveis.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                Nenhuma marca cadastrada
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    )
  }

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
                    {gerentes
                      .filter(g => {
                        const lojaSelecionada = lojas.find(l => l.id === newPromotor.loja_id)
                        return lojaSelecionada ? g.cod_loja === lojaSelecionada.cod_loja : false
                      })
                      .map((gerente) => (
                        <SelectItem key={gerente.id} value={gerente.id}>
                          {gerente.nome_gerente} {gerente.telefone ? `- ${gerente.telefone}` : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Marcas que Atende</Label>
                <MarcasMultiSelect
                  selectedIds={newPromotor.marca_ids}
                  onChange={(ids) => setNewPromotor({ ...newPromotor, marca_ids: ids })}
                />
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

        {/* Dialog de Edição */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Promotor</DialogTitle>
              <DialogDescription>
                Altere os dados do promotor.
              </DialogDescription>
            </DialogHeader>
            {editingPromotor && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_promotor_nome">Nome do Promotor *</Label>
                  <Input
                    id="edit_promotor_nome"
                    placeholder="Nome completo"
                    value={editingPromotor.promotor_nome}
                    onChange={(e) => setEditingPromotor({ ...editingPromotor, promotor_nome: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_loja_id">Loja Vinculada</Label>
                  <Select
                    value={editingPromotor.loja_id || ''}
                    onValueChange={(value) => {
                      setEditingPromotor({ ...editingPromotor, loja_id: value, gerente_id: '' })
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
                  <Label htmlFor="edit_gerente_id">Gerente Responsável</Label>
                  <Select
                    value={editingPromotor.gerente_id || ''}
                    onValueChange={(value) => setEditingPromotor({ ...editingPromotor, gerente_id: value })}
                    disabled={!editingPromotor.loja_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={editingPromotor.loja_id ? "Selecione um gerente" : "Primeiro selecione uma loja"} />
                    </SelectTrigger>
                    <SelectContent>
                      {gerentes
                        .filter(g => {
                          const lojaSelecionada = lojas.find(l => l.id === editingPromotor.loja_id)
                          return lojaSelecionada ? g.cod_loja === lojaSelecionada.cod_loja : false
                        })
                        .map((gerente) => (
                          <SelectItem key={gerente.id} value={gerente.id}>
                            {gerente.nome_gerente} {gerente.telefone ? `- ${gerente.telefone}` : ''}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Marcas que Atende</Label>
                  <MarcasMultiSelect
                    selectedIds={editingPromotor.marcas?.map(m => m.id) || []}
                    onChange={(ids) => setEditingPromotor({ 
                      ...editingPromotor, 
                      marcas: marcasDisponiveis.filter(m => ids.includes(m.id))
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_dias_semana">Dias de Atuação</Label>
                  <Input
                    id="edit_dias_semana"
                    placeholder="Ex: Segunda, Terça, Quarta"
                    value={editingPromotor.dias_semana || ''}
                    onChange={(e) => setEditingPromotor({ ...editingPromotor, dias_semana: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_contato_responsavel">Contato / Telefone</Label>
                  <Input
                    id="edit_contato_responsavel"
                    placeholder="(11) 99999-9999"
                    value={editingPromotor.contato_responsavel || ''}
                    onChange={(e) => setEditingPromotor({ ...editingPromotor, contato_responsavel: e.target.value })}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdatePromotor} disabled={saving}>
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
            <Card key={promoter.id} className="hover:shadow-md transition-shadow group relative">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <Avatar className="h-20 w-20 border-2 border-background shadow-sm">
                    <AvatarFallback className="text-2xl font-medium bg-primary/10 text-primary">
                      {getInitials(promoter.promotor_nome)}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <h3 className="font-semibold text-lg">{promoter.promotor_nome}</h3>
                    <p className="text-sm text-muted-foreground">{getMarcasText(promoter)}</p>
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

                  <div className="w-full pt-4 border-t mt-4 flex justify-end gap-2">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => openEditDialog(promoter)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleDeletePromotor(promoter)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
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
