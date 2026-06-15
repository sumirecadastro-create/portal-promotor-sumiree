
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Filter, X, Edit, Trash2, Loader2, RefreshCw } from 'lucide-react'
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
  const [showDiagnostic, setShowDiagnostic] = useState(true)
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
      console.log('👤 isAdmin:', isAdmin, 'userLojaId:', userLojaId)
      
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
      
      // 🔥 FILTRAR CAMPANHAS POR LOJA - Se não for admin
      let campanhasQuery = supabase.from('campanhas').select('*')
      
      if (!isAdmin && userLojaId) {
        // Buscar IDs das campanhas que incluem a loja do usuário
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
          console.log(`🔍 Filtrando ${campanhaIds.length} campanhas para a loja ${userLojaId}`)
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
      
      console.log(`📊 ${campanhasData?.length || 0} campanhas encontradas no banco`)
      
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
      
      // Buscar dados completos das lojas
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
      
      // Organizar lojas por campanha
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
      
      // Formatar campanhas
      const campanhasFormatadas = campanhasData.map(camp => ({
        ...camp,
        lojas: lojasPorCampanha[camp.id] || []
      }))
      
      console.log('✅ Campanhas formatadas:', campanhasFormatadas.length)
      campanhasFormatadas.forEach(camp => {
        if (camp.lojas && camp.lojas.length > 0) {
          console.log(`📌 ${camp.nome}: ${camp.lojas.length} lojas, ${camp.data_inicio} a ${camp.data_fim}`)
        }
      })
      
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

  // FUNÇÃO CORRIGIDA - Filtrar campanhas por data e por loja do usuário
  const getCampanhasForDay = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    // Primeiro filtrar pela data
    let campanhasNoDia = campanhas.filter(campanha => {
      if (!campanha.lojas || campanha.lojas.length === 0) return false
      return dateStr >= campanha.data_inicio && dateStr <= campanha.data_fim
    })
    
    // Se não for admin, filtrar apenas campanhas que incluem a loja do usuário
    if (!isAdmin && userLojaId) {
      campanhasNoDia = campanhasNoDia.filter(campanha => {
        return campanha.lojas?.some(loja => loja.id === userLojaId)
      })
    }
    
    // Aplicar filtro de lojas do calendário (se houver)
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

  // Filtrar lojas para exibir no calendário
  const lojasFiltradas = filterLojas.length > 0 
    ? lojas.filter(loja => filterLojas.includes(loja.id))
    : lojas

  const DiagnosticPanel = () => {
    const hoje = new Date().toISOString().split('T')[0]
    const mesAtual = currentDate.getMonth() + 1
    const anoAtual = currentDate.getFullYear()
    
    const campanhasComLojas = campanhas.filter(c => c.lojas && c.lojas.length > 0)
    
    return (
      <div className="mx-6 mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-blue-800">🔍 PAINEL DE DIAGNÓSTICO</h3>
          <Button variant="ghost" size="sm" onClick={() => setShowDiagnostic(false)} className="h-6 w-6 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-blue-600">Total campanhas:</span>
            <span className="ml-2 font-bold">{campanhas.length}</span>
          </div>
          <div>
            <span className="text-blue-600">Campanhas com lojas:</span>
            <span className="ml-2 font-bold">{campanhasComLojas.length}</span>
          </div>
          <div>
            <span className="text-blue-600">Mês atual:</span>
            <span className="ml-2 font-bold">{monthNames[mesAtual - 1]} {anoAtual}</span>
          </div>
        </div>
        {campanhasComLojas.length > 0 && (
          <div className="mt-3 text-sm">
            <span className="text-blue-600">Campanhas:</span>
            <ul className="ml-4 mt-1 space-y-1">
              {campanhasComLojas.map(camp => (
                <li key={camp.id} className="text-gray-700">
                  • <strong>{camp.nome}</strong>: {camp.data_inicio} a {camp.data_fim}
                  <span className="text-green-600 ml-2">({camp.lojas?.length} lojas)</span>
                  <span className="text-gray-500 ml-2">
                    Lojas: {camp.lojas?.map(l => l.cod_loja).join(', ')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!isAdmin && userLojaId && (
          <div className="mt-3 p-2 bg-green-100 rounded text-green-800 text-sm">
            📍 Visualizando apenas campanhas da sua loja (ID: {userLojaId.substring(0, 8)})
          </div>
        )}
      </div>
    )
  }

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
        
        {showDiagnostic && <DiagnosticPanel />}
        
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
                      <Tooltip key={camp.id}>
                        <TooltipTrigger asChild>
                          <div
                            className="text-xs rounded px-1 py-0.5 truncate cursor-pointer hover:opacity-80"
                            style={{ backgroundColor: camp.cor || '#FF1686', color: '#fff' }}
                            onClick={() => isAdmin && openEditDialog(camp)}
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
    </TooltipProvider>
  )
}
