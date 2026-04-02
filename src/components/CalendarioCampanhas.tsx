import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Filter, X, Edit, Trash2 } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface Campanha {
  id: string
  nome: string
  descricao: string
  data_inicio: string
  data_fim: string
  cor: string
  lojas?: { id: string; nome_loja: string; cod_loja: string }[]
}

interface Loja {
  id: string
  cod_loja: string
  nome_loja: string
}

export function CalendarioCampanhas() {
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [lojas, setLojas] = useState<Loja[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingCampanha, setEditingCampanha] = useState<Campanha | null>(null)
  const [saving, setSaving] = useState(false)
  const [selectedLojas, setSelectedLojas] = useState<string[]>([])
  const [filterLojas, setFilterLojas] = useState<string[]>([])
  const [showFilter, setShowFilter] = useState(false)
  const { toast } = useToast()

  const [newCampanha, setNewCampanha] = useState({
    nome: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    cor: '#FF1686'
  })

  const loadData = async () => {
    try {
      const [campanhasRes, lojasRes] = await Promise.all([
        supabase
          .from('campanhas')
          .select(`
            *,
            lojas_campanhas (
              lojas (id, cod_loja, nome_loja)
            )
          `)
          .order('data_inicio'),
        supabase.from('lojas').select('id, cod_loja, nome_loja').order('nome_loja')
      ])

      if (campanhasRes.error) throw campanhasRes.error
      if (lojasRes.error) throw lojasRes.error

      const campanhasFormatadas = campanhasRes.data.map(camp => ({
        ...camp,
        lojas: camp.lojas_campanhas?.map(lc => lc.lojas).filter(Boolean) || []
      }))

      setCampanhas(campanhasFormatadas)
      setLojas(lojasRes.data || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateCampanha = async () => {
    if (!newCampanha.nome || !newCampanha.data_inicio || !newCampanha.data_fim) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
      })
      return
    }

    setSaving(true)
    try {
      const { data: campanha, error: campanhaError } = await supabase
        .from('campanhas')
        .insert({
          nome: newCampanha.nome,
          descricao: newCampanha.descricao,
          data_inicio: newCampanha.data_inicio,
          data_fim: newCampanha.data_fim,
          cor: newCampanha.cor
        })
        .select()
        .single()

      if (campanhaError) throw campanhaError

      if (selectedLojas.length > 0) {
        const lojasCampanhas = selectedLojas.map(lojaId => ({
          loja_id: lojaId,
          campanha_id: campanha.id
        }))
        
        const { error: relError } = await supabase
          .from('lojas_campanhas')
          .insert(lojasCampanhas)

        if (relError) throw relError
      }

      toast({
        title: 'Sucesso',
        description: 'Campanha criada com sucesso!',
      })
      setOpen(false)
      resetForm()
      await loadData()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Erro ao criar campanha',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEditCampanha = async () => {
    if (!editingCampanha) return
    if (!editingCampanha.nome || !editingCampanha.data_inicio || !editingCampanha.data_fim) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
      })
      return
    }

    setSaving(true)
    try {
      // Atualizar campanha
      const { error: campanhaError } = await supabase
        .from('campanhas')
        .update({
          nome: editingCampanha.nome,
          descricao: editingCampanha.descricao,
          data_inicio: editingCampanha.data_inicio,
          data_fim: editingCampanha.data_fim,
          cor: editingCampanha.cor
        })
        .eq('id', editingCampanha.id)

      if (campanhaError) throw campanhaError

      // Remover relações antigas
      const { error: deleteError } = await supabase
        .from('lojas_campanhas')
        .delete()
        .eq('campanha_id', editingCampanha.id)

      if (deleteError) throw deleteError

      // Adicionar novas relações
      if (selectedLojas.length > 0) {
        const lojasCampanhas = selectedLojas.map(lojaId => ({
          loja_id: lojaId,
          campanha_id: editingCampanha.id
        }))
        
        const { error: relError } = await supabase
          .from('lojas_campanhas')
          .insert(lojasCampanhas)

        if (relError) throw relError
      }

      toast({
        title: 'Sucesso',
        description: 'Campanha atualizada com sucesso!',
      })
      setEditOpen(false)
      setEditingCampanha(null)
      resetForm()
      await loadData()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Erro ao atualizar campanha',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCampanha = async (campanha: Campanha) => {
    if (!confirm(`Deseja realmente excluir a campanha "${campanha.nome}"?`)) return

    try {
      // Remover relações primeiro
      const { error: relError } = await supabase
        .from('lojas_campanhas')
        .delete()
        .eq('campanha_id', campanha.id)

      if (relError) throw relError

      // Remover campanha
      const { error: campanhaError } = await supabase
        .from('campanhas')
        .delete()
        .eq('id', campanha.id)

      if (campanhaError) throw campanhaError

      toast({
        title: 'Sucesso',
        description: 'Campanha excluída com sucesso!',
      })
      await loadData()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Erro ao excluir campanha',
      })
    }
  }

  const openEditDialog = (campanha: Campanha) => {
    setEditingCampanha(campanha)
    setSelectedLojas(campanha.lojas?.map(l => l.id) || [])
    setEditOpen(true)
  }

  const resetForm = () => {
    setNewCampanha({
      nome: '',
      descricao: '',
      data_inicio: '',
      data_fim: '',
      cor: '#FF1686'
    })
    setSelectedLojas([])
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days = []
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false
      })
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      })
    }
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      })
    }
    
    return days
  }

  const getCampanhasForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    
    let campanhasFiltradas = campanhas.filter(camp => {
      const inicio = camp.data_inicio
      const fim = camp.data_fim
      return dateStr >= inicio && dateStr <= fim
    })

    if (filterLojas.length > 0) {
      campanhasFiltradas = campanhasFiltradas.filter(camp => {
        return camp.lojas?.some(loja => filterLojas.includes(loja.id))
      })
    }

    return campanhasFiltradas
  }

  const changeMonth = (increment: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + increment)
      return newDate
    })
  }

  const toggleFilterLoja = (lojaId: string) => {
    setFilterLojas(prev =>
      prev.includes(lojaId)
        ? prev.filter(id => id !== lojaId)
        : [...prev, lojaId]
    )
  }

  const clearFilters = () => {
    setFilterLojas([])
  }

  const days = getDaysInMonth(currentDate)
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Calendário de Campanhas
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium min-w-[140px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <Button variant="outline" size="icon" onClick={() => changeMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="relative">
            <Button 
              variant={filterLojas.length > 0 ? "default" : "outline"} 
              size="sm"
              onClick={() => setShowFilter(!showFilter)}
              className="gap-1"
            >
              <Filter className="h-4 w-4" />
              Filtrar Lojas
              {filterLojas.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1">
                  {filterLojas.length}
                </Badge>
              )}
            </Button>
            
            {showFilter && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-popover border rounded-lg shadow-lg z-10 p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">Filtrar por loja</h4>
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Limpar
                  </Button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {lojas.map(loja => (
                    <label key={loja.id} className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterLojas.includes(loja.id)}
                        onChange={() => toggleFilterLoja(loja.id)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{loja.cod_loja} - {loja.nome_loja}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Nova Campanha
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Campanha</DialogTitle>
                <DialogDescription>
                  Cadastre uma nova campanha e selecione as lojas participantes.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Campanha *</Label>
                  <Input
                    id="nome"
                    placeholder="Ex: Promoção de Verão"
                    value={newCampanha.nome}
                    onChange={(e) => setNewCampanha({ ...newCampanha, nome: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    placeholder="Detalhes da campanha..."
                    value={newCampanha.descricao}
                    onChange={(e) => setNewCampanha({ ...newCampanha, descricao: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="data_inicio">Data Início *</Label>
                    <Input
                      id="data_inicio"
                      type="date"
                      value={newCampanha.data_inicio}
                      onChange={(e) => setNewCampanha({ ...newCampanha, data_inicio: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="data_fim">Data Fim *</Label>
                    <Input
                      id="data_fim"
                      type="date"
                      value={newCampanha.data_fim}
                      onChange={(e) => setNewCampanha({ ...newCampanha, data_fim: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cor">Cor da Campanha</Label>
                  <Input
                    id="cor"
                    type="color"
                    value={newCampanha.cor}
                    onChange={(e) => setNewCampanha({ ...newCampanha, cor: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lojas Participantes</Label>
                  <Select
                    value={selectedLojas[0] || ''}
                    onValueChange={(value) => {
                      if (!selectedLojas.includes(value)) {
                        setSelectedLojas([...selectedLojas, value])
                      }
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
                  {selectedLojas.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedLojas.map(lojaId => {
                        const loja = lojas.find(l => l.id === lojaId)
                        return (
                          <span key={lojaId} className="bg-muted px-2 py-1 rounded-md text-sm flex items-center gap-1">
                            {loja?.cod_loja}
                            <button
                              type="button"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => setSelectedLojas(selectedLojas.filter(id => id !== lojaId))}
                            >
                              ×
                            </button>
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateCampanha} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog de Edição */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Campanha</DialogTitle>
                <DialogDescription>
                  Altere os dados da campanha e as lojas participantes.
                </DialogDescription>
              </DialogHeader>
              {editingCampanha && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_nome">Nome da Campanha *</Label>
                    <Input
                      id="edit_nome"
                      placeholder="Ex: Promoção de Verão"
                      value={editingCampanha.nome}
                      onChange={(e) => setEditingCampanha({ ...editingCampanha, nome: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_descricao">Descrição</Label>
                    <Textarea
                      id="edit_descricao"
                      placeholder="Detalhes da campanha..."
                      value={editingCampanha.descricao}
                      onChange={(e) => setEditingCampanha({ ...editingCampanha, descricao: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit_data_inicio">Data Início *</Label>
                      <Input
                        id="edit_data_inicio"
                        type="date"
                        value={editingCampanha.data_inicio}
                        onChange={(e) => setEditingCampanha({ ...editingCampanha, data_inicio: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_data_fim">Data Fim *</Label>
                      <Input
                        id="edit_data_fim"
                        type="date"
                        value={editingCampanha.data_fim}
                        onChange={(e) => setEditingCampanha({ ...editingCampanha, data_fim: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_cor">Cor da Campanha</Label>
                    <Input
                      id="edit_cor"
                      type="color"
                      value={editingCampanha.cor}
                      onChange={(e) => setEditingCampanha({ ...editingCampanha, cor: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Lojas Participantes</Label>
                    <Select
                      value={selectedLojas[0] || ''}
                      onValueChange={(value) => {
                        if (!selectedLojas.includes(value)) {
                          setSelectedLojas([...selectedLojas, value])
                        }
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
                    {selectedLojas.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedLojas.map(lojaId => {
                          const loja = lojas.find(l => l.id === lojaId)
                          return (
                            <span key={lojaId} className="bg-muted px-2 py-1 rounded-md text-sm flex items-center gap-1">
                              {loja?.cod_loja}
                              <button
                                type="button"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => setSelectedLojas(selectedLojas.filter(id => id !== lojaId))}
                              >
                                ×
                              </button>
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleEditCampanha} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      {filterLojas.length > 0 && (
        <div className="px-6 pb-2 flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Filtrando por:</span>
          {filterLojas.map(lojaId => {
            const loja = lojas.find(l => l.id === lojaId)
            return (
              <Badge key={lojaId} variant="secondary" className="gap-1">
                {loja?.cod_loja}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-red-500"
                  onClick={() => toggleFilterLoja(lojaId)}
                />
              </Badge>
            )
          })}
        </div>
      )}
      
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
          {days.map((day, idx) => {
            const campanhasDoDia = getCampanhasForDay(day.date)
            const isToday = day.date.toDateString() === new Date().toDateString()
            
            return (
              <div
                key={idx}
                className={`min-h-[120px] border rounded-lg p-1 transition-all ${
                  day.isCurrentMonth ? 'bg-background' : 'bg-muted/30 text-muted-foreground'
                } ${isToday ? 'border-primary shadow-sm' : 'border-border'}`}
              >
                <div className={`text-right text-sm p-1 ${isToday ? 'font-bold text-primary' : ''}`}>
                  {day.date.getDate()}
                </div>
                <div className="space-y-1">
                  {campanhasDoDia.slice(0, 2).map(camp => (
                    <div
                      key={camp.id}
                      className="group relative text-xs rounded px-1 py-0.5 truncate cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: camp.cor || '#FF1686', color: '#fff' }}
                      onClick={() => openEditDialog(camp)}
                    >
                      {camp.nome}
                      <button
                        className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteCampanha(camp)
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-white hover:text-red-200" />
                      </button>
                    </div>
                  ))}
                  {campanhasDoDia.length > 2 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{campanhasDoDia.length - 2}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
