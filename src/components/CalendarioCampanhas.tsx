import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Filter, X, Edit, Trash2, Loader2, RefreshCw, Eye, List } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'

interface Campanha {
  id: string
  nome: string
  descricao: string
  data_inicio: string
  data_fim: string
  status: string
  cor: string
  lojas?: { id: string; nome_loja: string; cod_loja: string }[]
}

interface Loja {
  id: string
  cod_loja: string
  nome_loja: string
}

// Componente para exibir todas as campanhas em um dia
function DayCampanhasModal({ 
  open, 
  onOpenChange, 
  campanhas, 
  date 
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void
  campanhas: Campanha[]
  date: Date
}) {
  const { isAdmin } = useAuth()
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Campanhas em {date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </DialogTitle>
          <DialogDescription>
            {campanhas.length} campanha(s) neste dia
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {campanhas.map((camp) => (
            <div 
              key={camp.id} 
              className="p-3 rounded-lg border border-border hover:shadow-md transition-shadow"
              style={{ borderLeftColor: camp.cor || '#FF1686', borderLeftWidth: '4px' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{camp.nome}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {camp.descricao || 'Sem descrição'}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline" className="text-[10px]">
                      {new Date(camp.data_inicio).toLocaleDateString('pt-BR')} → {new Date(camp.data_fim).toLocaleDateString('pt-BR')}
                    </Badge>
                    <Badge 
                      variant="secondary" 
                      className="text-[10px]"
                      style={{ 
                        backgroundColor: camp.status === 'ativa' ? '#d1fae5' : 
                                      camp.status === 'pendente' ? '#fef3c7' : '#dbeafe',
                        color: camp.status === 'ativa' ? '#065f46' : 
                               camp.status === 'pendente' ? '#92400e' : '#1e40af'
                      }}
                    >
                      {camp.status === 'ativa' ? '⚡ Ativa' : 
                       camp.status === 'pendente' ? '⏳ Pendente' : '✅ Concluída'}
                    </Badge>
                  </div>
                </div>
                {camp.lojas && camp.lojas.length > 0 && (
                  <Badge variant="outline" className="text-[10px] ml-2 shrink-0">
                    {camp.lojas.length} loja(s)
                  </Badge>
                )}
              </div>
              {camp.lojas && camp.lojas.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {camp.lojas.slice(0, 5).map(loja => (
                    <Badge key={loja.id} variant="outline" className="text-[9px] bg-muted/50">
                      {loja.cod_loja}
                    </Badge>
                  ))}
                  {camp.lojas.length > 5 && (
                    <Badge variant="outline" className="text-[9px] bg-muted/50">
                      +{camp.lojas.length - 5}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CalendarioCampanhas() {
  const { isAdmin, userLojaId } = useAuth()
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
  const [modalCampanhas, setModalCampanhas] = useState<Campanha[]>([])
  const [modalDate, setModalDate] = useState<Date>(new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const { toast } = useToast()

  const [newCampanha, setNewCampanha] = useState({
    nome: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    status: 'ativa',
    cor: '#FF1686'
  })

  const loadData = async () => {
    try {
      setLoading(true)
      console.log('🚀 Iniciando loadData...')
      
      // Buscar lojas
      let lojasQuery = supabase
        .from('lojas')
        .select('id, cod_loja, nome_loja')
        .order('cod_loja')
      
      if (!isAdmin && userLojaId) {
        lojasQuery = lojasQuery.eq('id', userLojaId)
      }
      
      const { data: lojasData, error: lojasError } = await lojasQuery
      
      if (lojasError) {
        console.error('Erro ao buscar lojas:', lojasError)
        throw lojasError
      }
      
      setLojas(lojasData || [])
      console.log(`✅ ${lojasData?.length || 0} lojas carregadas`)
      
      // Buscar campanhas
      let campanhasQuery = supabase.from('campanhas').select('*')
      
      if (!isAdmin && userLojaId) {
        const { data: campanhasComLoja, error: filterError } = await supabase
          .from('lojas_campanhas')
          .select('campanha_id')
          .eq('loja_id', userLojaId)
        
        if (filterError) {
          console.error('Erro ao filtrar campanhas por loja:', filterError)
        }
        
        const campanhaIds = campanhasComLoja?.map(c => c.campanha_id) || []
        
        if (campanhaIds.length > 0) {
          campanhasQuery = campanhasQuery.in('id', campanhaIds)
        } else {
          console.log('⚠️ Nenhuma campanha encontrada para esta loja')
          setCampanhas([])
          setLoading(false)
          return
        }
      }
      
      const { data: campanhasData, error: campanhasError } = await campanhasQuery
      
      if (campanhasError) {
        console.error('Erro ao buscar campanhas:', campanhasError)
        throw campanhasError
      }
      
      if (!campanhasData || campanhasData.length === 0) {
        setCampanhas([])
        setLoading(false)
        return
      }
      
      // Buscar relações lojas_campanhas
      const campanhaIds = campanhasData.map(c => c.id)
      
      const { data: lojasRel, error: lojasRelError } = await supabase
        .from('lojas_campanhas')
        .select('campanha_id, loja_id')
        .in('campanha_id', campanhaIds)
      
      if (lojasRelError) {
        console.error('Erro ao buscar lojas_campanhas:', lojasRelError)
      }
      
      const todosLojasIds = [...new Set(lojasRel?.map(r => r.loja_id) || [])]
      
      let lojasCompletas: any[] = []
      if (todosLojasIds.length > 0) {
        const { data: lojasTemp } = await supabase
          .from('lojas')
          .select('id, cod_loja, nome_loja')
          .in('id', todosLojasIds)
        lojasCompletas = lojasTemp || []
      }
      
      const lojasMap = new Map(lojasCompletas.map(l => [l.id, l]))
      
      const lojasPorCampanha: Record<string, any[]> = {}
      lojasRel?.forEach(rel => {
        if (!lojasPorCampanha[rel.campanha_id]) {
          lojasPorCampanha[rel.campanha_id] = []
        }
        const loja = lojasMap.get(rel.loja_id)
        if (loja) {
          lojasPorCampanha[rel.campanha_id].push(loja)
        }
      })
      
      const campanhasFormatadas = campanhasData.map(camp => ({
        ...camp,
        lojas: lojasPorCampanha[camp.id] || []
      }))
      
      setCampanhas(campanhasFormatadas)
      
    } catch (error) {
      console.error('❌ Erro no loadData:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar os dados',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [isAdmin, userLojaId])

  const handleCreateCampanha = async () => {
    if (!newCampanha.nome || !newCampanha.data_inicio || !newCampanha.data_fim) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
      })
      return
    }

    if (selectedLojas.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Selecione pelo menos uma loja para a campanha',
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
          status: newCampanha.status,
          cor: newCampanha.cor
        })
        .select()
        .single()

      if (campanhaError) throw campanhaError

      const lojasCampanhas = selectedLojas.map(lojaId => ({
        loja_id: lojaId,
        campanha_id: campanha.id
      }))
      
      const { error: relError } = await supabase
        .from('lojas_campanhas')
        .insert(lojasCampanhas)

      if (relError) throw relError

      toast({
        title: 'Sucesso',
        description: 'Campanha criada com sucesso!',
      })
      setOpen(false)
      resetForm()
      await loadData()
    } catch (error: any) {
      console.error('Erro ao criar campanha:', error)
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
      const { error: campanhaError } = await supabase
        .from('campanhas')
        .update({
          nome: editingCampanha.nome,
          descricao: editingCampanha.descricao,
          data_inicio: editingCampanha.data_inicio,
          data_fim: editingCampanha.data_fim,
          status: editingCampanha.status,
          cor: editingCampanha.cor
        })
        .eq('id', editingCampanha.id)

      if (campanhaError) throw campanhaError

      const { error: deleteError } = await supabase
        .from('lojas_campanhas')
        .delete()
        .eq('campanha_id', editingCampanha.id)

      if (deleteError) throw deleteError

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
      console.error('Erro ao atualizar campanha:', error)
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
      const { error: relError } = await supabase
        .from('lojas_campanhas')
        .delete()
        .eq('campanha_id', campanha.id)

      if (relError) throw relError

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
      console.error('Erro ao excluir campanha:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Erro ao excluir campanha',
      })
    }
  }

  const openEditDialog = (campanha: Campanha) => {
    if (!isAdmin) return
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
      status: 'ativa',
      cor: '#FF1686'
    })
    setSelectedLojas([])
  }

  const forceRefresh = () => {
    console.log('🔄 Forçando atualização manual...')
    loadData()
  }

  const openDayModal = (campanhasDoDia: Campanha[], date: Date) => {
    if (campanhasDoDia.length === 0) return
    setModalCampanhas(campanhasDoDia)
    setModalDate(date)
    setModalOpen(true)
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
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    let campanhasNoDia = campanhas.filter(campanha => {
      if (!campanha.lojas || campanha.lojas.length === 0) return false
      return dateStr >= campanha.data_inicio && dateStr <= campanha.data_fim
    })
    
    if (!isAdmin && userLojaId) {
      campanhasNoDia = campanhasNoDia.filter(campanha => {
        return campanha.lojas?.some(loja => loja.id === userLojaId)
      })
    }
    
    if (filterLojas.length > 0) {
      campanhasNoDia = campanhasNoDia.filter(campanha => {
        return campanha.lojas?.some(loja => filterLojas.includes(loja.id))
      })
    }
    
    return campanhasNoDia
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

  const selecionarTodasLojas = () => {
    setFilterLojas(lojas.map(loja => loja.id))
  }

  const getLojasTooltip = (campanha: Campanha) => {
    if (!campanha.lojas || campanha.lojas.length === 0) {
      return "Nenhuma loja vinculada"
    }
    
    const lojasList = campanha.lojas.map(loja => `${loja.cod_loja} - ${loja.nome_loja}`).join('\n')
    return `Lojas participantes:\n${lojasList}`
  }

  const days = getDaysInMonth(currentDate)
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

  const lojasFiltradas = filterLojas.length > 0 
    ? lojas.filter(loja => filterLojas.includes(loja.id))
    : lojas

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Calendário de Campanhas
            {!isAdmin && (
              <span className="text-sm text-primary font-normal ml-2">
                (Apenas sua loja)
              </span>
            )}
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
            
            <Button variant="outline" size="sm" onClick={forceRefresh} className="gap-1">
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            {isAdmin && (
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
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={selecionarTodasLojas}>
                          Selecionar todos
                        </Button>
                        <Button variant="ghost" size="sm" onClick={clearFilters}>
                          Limpar
                        </Button>
                      </div>
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
            )}

            {isAdmin && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <Plus className="h-4 w-4" />
                    Nova Campanha
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Nova Campanha</DialogTitle>
                    <DialogDescription>
                      Cadastre uma nova campanha e selecione as lojas participantes.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
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
                      <Label htmlFor="status">Status</Label>
                      <Select value={newCampanha.status} onValueChange={(value) => setNewCampanha({ ...newCampanha, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">⏳ Pendente</SelectItem>
                          <SelectItem value="ativa">⚡ Ativa</SelectItem>
                          <SelectItem value="concluida">✅ Concluída</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <Label>Lojas Participantes *</Label>
                      <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
                        {lojas.map((loja) => (
                          <div key={loja.id} className="flex items-center space-x-2 py-1">
                            <input
                              type="checkbox"
                              id={`loja_${loja.id}`}
                              checked={selectedLojas.includes(loja.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedLojas([...selectedLojas, loja.id])
                                } else {
                                  setSelectedLojas(selectedLojas.filter(id => id !== loja.id))
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <Label htmlFor={`loja_${loja.id}`} className="cursor-pointer text-sm">
                              {loja.cod_loja} - {loja.nome_loja}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {selectedLojas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {selectedLojas.map(lojaId => {
                            const loja = lojas.find(l => l.id === lojaId)
                            return (
                              <Badge key={lojaId} variant="secondary" className="gap-1 text-xs">
                                {loja?.cod_loja}
                                <X
                                  className="h-3 w-3 cursor-pointer hover:text-red-500"
                                  onClick={() => setSelectedLojas(selectedLojas.filter(id => id !== lojaId))}
                                />
                              </Badge>
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
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {saving ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {isAdmin && (
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Editar Campanha</DialogTitle>
                    <DialogDescription>
                      Altere os dados da campanha e as lojas participantes.
                    </DialogDescription>
                  </DialogHeader>
                  {editingCampanha && (
                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                      <div className="space-y-2">
                        <Label htmlFor="edit_nome">Nome da Campanha *</Label>
                        <Input
                          id="edit_nome"
                          value={editingCampanha.nome}
                          onChange={(e) => setEditingCampanha({ ...editingCampanha, nome: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_descricao">Descrição</Label>
                        <Textarea
                          id="edit_descricao"
                          value={editingCampanha.descricao || ''}
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
                        <Label htmlFor="edit_status">Status</Label>
                        <Select value={editingCampanha.status} onValueChange={(value) => setEditingCampanha({ ...editingCampanha, status: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendente">⏳ Pendente</SelectItem>
                            <SelectItem value="ativa">⚡ Ativa</SelectItem>
                            <SelectItem value="concluida">✅ Concluída</SelectItem>
                          </SelectContent>
                        </Select>
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
                        <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
                          {lojas.map((loja) => (
                            <div key={loja.id} className="flex items-center space-x-2 py-1">
                              <input
                                type="checkbox"
                                id={`edit_loja_${loja.id}`}
                                checked={selectedLojas.includes(loja.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedLojas([...selectedLojas, loja.id])
                                  } else {
                                    setSelectedLojas(selectedLojas.filter(id => id !== loja.id))
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                              <Label htmlFor={`edit_loja_${loja.id}`} className="cursor-pointer text-sm">
                                {loja.cod_loja} - {loja.nome_loja}
                              </Label>
                            </div>
                          ))}
                        </div>
                        {selectedLojas.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {selectedLojas.map(lojaId => {
                              const loja = lojas.find(l => l.id === lojaId)
                              return (
                                <Badge key={lojaId} variant="secondary" className="gap-1 text-xs">
                                  {loja?.cod_loja}
                                  <X
                                    className="h-3 w-3 cursor-pointer hover:text-red-500"
                                    onClick={() => setSelectedLojas(selectedLojas.filter(id => id !== lojaId))}
                                  />
                                </Badge>
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
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {saving ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
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
        
        <div className="px-6 pb-2 text-sm text-muted-foreground">
          Exibindo: {lojasFiltradas.length} de {lojas.length} lojas
        </div>
        
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
              const hasCampanhas = campanhasDoDia.length > 0
              
              return (
                <div
                  key={idx}
                  className={`min-h-[120px] border rounded-lg p-1 transition-all cursor-pointer ${
                    day.isCurrentMonth ? 'bg-background' : 'bg-muted/30 text-muted-foreground'
                  } ${isToday ? 'border-primary shadow-sm' : 'border-border'}
                  ${hasCampanhas ? 'hover:shadow-md hover:border-primary/50' : ''}
                  ${campanhasDoDia.length > 2 ? 'bg-gradient-to-b from-background to-muted/20' : ''}`}
                  onClick={() => openDayModal(campanhasDoDia, day.date)}
                >
                  <div className={`text-right text-sm p-1 ${isToday ? 'font-bold text-primary' : ''}`}>
                    {day.date.getDate()}
                    {campanhasDoDia.length > 0 && (
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        ({campanhasDoDia.length})
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 max-h-[70px] overflow-hidden">
                    {campanhasDoDia.slice(0, 3).map(camp => (
                      <Tooltip key={camp.id}>
                        <TooltipTrigger asChild>
                          <div
                            className="text-[10px] rounded px-1 py-0.5 truncate hover:opacity-80 transition-opacity"
                            style={{ backgroundColor: camp.cor || '#FF1686', color: '#fff' }}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (isAdmin) openEditDialog(camp)
                            }}
                          >
                            {camp.nome}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="top" 
                          className="max-w-xs whitespace-pre-line bg-gray-900 text-white p-2 text-xs"
                        >
                          {getLojasTooltip(camp)}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {campanhasDoDia.length > 3 && (
                      <div className="text-[10px] text-center text-muted-foreground font-medium bg-muted/50 rounded py-0.5 hover:bg-muted transition-colors">
                        +{campanhasDoDia.length - 3} mais • Clique para ver todas
                      </div>
                    )}
                    {campanhasDoDia.length === 0 && (
                      <div className="text-center text-gray-300 text-xs h-full flex items-center justify-center min-h-[60px]">
                        —
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modal para ver todas as campanhas do dia */}
      <DayCampanhasModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        campanhas={modalCampanhas}
        date={modalDate}
      />
    </TooltipProvider>
  )
}
