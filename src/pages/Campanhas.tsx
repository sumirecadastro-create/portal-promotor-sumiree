import { useState, useEffect } from 'react'
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Plus, 
  TrendingUp, 
  CheckCircle2, 
  Clock,
  Store,
  Users,
  Loader2,
  X,
  Save,
  Search,
  Check,
  ChevronRight as ChevronRightIcon
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

// Interfaces
interface Loja {
  id: string
  nome_loja: string
  codigo?: string
}

interface Promotor {
  id: string
  promotor_nome: string
}

interface Campanha {
  id: string
  nome: string
  data_inicio: string
  data_fim: string
  status: string
  tipo?: string
  loja_ids?: string[]
  promotor_ids?: string[]
  lojas?: Loja[]
  promotores?: Promotor[]
}

const PRIMARY_COLOR = '#FF1686'

// Componente Checkbox
function Checkbox({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <div
      className={cn(
        "w-4 h-4 border rounded cursor-pointer flex items-center justify-center transition-colors",
        checked && "bg-pink-500 border-pink-500"
      )}
      onClick={() => onCheckedChange(!checked)}
    >
      {checked && <Check className="h-3 w-3 text-white" />}
    </div>
  )
}

export default function Campanhas() {
  // Estados principais
  const [mesAtual, setMesAtual] = useState(new Date())
  const [lojaFiltroNome, setLojaFiltroNome] = useState('')
  const [lojas, setLojas] = useState<Loja[]>([])
  const [promotores, setPromotores] = useState<Promotor[]>([])
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Estados dos modais
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [showNovaCampanhaModal, setShowNovaCampanhaModal] = useState(false)
  
  // Estado dos filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [lojasSelecionadas, setLojasSelecionadas] = useState<string[]>([])
  const [buscaLojaFiltro, setBuscaLojaFiltro] = useState('')
  
  // Estado da nova campanha
  const [novaCampanha, setNovaCampanha] = useState({
    nome: '',
    loja_ids: [] as string[],
    promotor_ids: [] as string[],
    data_inicio: '',
    data_fim: '',
    status: 'pendente' as const,
    tipo: 'promocao'
  })
  const [salvando, setSalvando] = useState(false)
  
  // Estados do Popover de Lojas (Nova Campanha)
  const [lojasPopoverOpen, setLojasPopoverOpen] = useState(false)
  const [buscaLojasTemp, setBuscaLojasTemp] = useState('')
  const [lojasSelecionadasTemp, setLojasSelecionadasTemp] = useState<string[]>([])
  
  // Estados do Popover de Promotores (Nova Campanha)
  const [promotoresPopoverOpen, setPromotoresPopoverOpen] = useState(false)
  const [buscaPromotoresTemp, setBuscaPromotoresTemp] = useState('')
  const [promotoresSelecionadosTemp, setPromotoresSelecionadosTemp] = useState<string[]>([])

  const ano = mesAtual.getFullYear()
  const mes = mesAtual.getMonth()
  
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const dias = Array.from({ length: diasNoMes }, (_, i) => i + 1)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  // Funções do Popover de Lojas
  const abrirSelecionarLojas = () => {
    setLojasSelecionadasTemp([...novaCampanha.loja_ids])
    setBuscaLojasTemp('')
    setLojasPopoverOpen(true)
  }

  const aplicarSelecaoLojas = () => {
    setNovaCampanha(prev => ({ ...prev, loja_ids: [...lojasSelecionadasTemp] }))
    setLojasPopoverOpen(false)
  }

  const cancelarSelecaoLojas = () => {
    setLojasPopoverOpen(false)
  }

  // Funções do Popover de Promotores
  const abrirSelecionarPromotores = () => {
    setPromotoresSelecionadosTemp([...novaCampanha.promotor_ids])
    setBuscaPromotoresTemp('')
    setPromotoresPopoverOpen(true)
  }

  const aplicarSelecaoPromotores = () => {
    setNovaCampanha(prev => ({ ...prev, promotor_ids: [...promotoresSelecionadosTemp] }))
    setPromotoresPopoverOpen(false)
  }

  const cancelarSelecaoPromotores = () => {
    setPromotoresPopoverOpen(false)
  }

  // Buscar lojas do Supabase
  async function carregarLojas() {
    try {
      const { data, error } = await supabase
        .from('lojas')
        .select('*')
        .order('nome_loja', { ascending: true })
      
      if (error) throw error
      
      const lojasFormatadas = (data || []).map((loja: any) => ({
        id: loja.id,
        nome_loja: loja.nome_loja,
        codigo: loja.cod_loja || loja.nome_loja.substring(0, 8)
      }))
      
      setLojas(lojasFormatadas)
    } catch (err) {
      console.error('Erro ao carregar lojas:', err)
      setError('Não foi possível carregar as lojas')
    }
  }

  // Buscar promotores ativos
  async function carregarPromotores() {
    try {
      const { data, error } = await supabase
        .from('promotores')
        .select('id, promotor_nome')
        .eq('status', 'ativo')
        .order('promotor_nome')
      
      if (error) throw error
      setPromotores(data || [])
    } catch (err) {
      console.error('Erro ao carregar promotores:', err)
    }
  }

  // Buscar campanhas do Supabase
  async function carregarCampanhas() {
    try {
      const startDate = new Date(ano, mes, 1).toISOString()
      const endDate = new Date(ano, mes + 1, 0).toISOString()
      
      let query = supabase
        .from('campanhas')
        .select('*')
        .gte('data_inicio', startDate)
        .lte('data_fim', endDate)
      
      if (filtroStatus !== 'todos') {
        query = query.eq('status', filtroStatus)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      // Buscar lojas e promotores para cada campanha
      const campanhasComRelacoes = await Promise.all((data || []).map(async (campanha) => {
        // Buscar lojas da campanha
        const { data: lojasRel } = await supabase
          .from('campanhas_lojas')
          .select('loja_id')
          .eq('campanha_id', campanha.id)
        
        const lojaIds = lojasRel?.map(r => r.loja_id) || []
        
        const { data: lojasData } = await supabase
          .from('lojas')
          .select('id, nome_loja, cod_loja')
          .in('id', lojaIds)
        
        // Buscar promotores da campanha
        const { data: promotoresRel } = await supabase
          .from('campanhas_promotores')
          .select('promotor_id')
          .eq('campanha_id', campanha.id)
        
        const promotorIds = promotoresRel?.map(r => r.promotor_id) || []
        
        const { data: promotoresData } = await supabase
          .from('promotores')
          .select('id, promotor_nome')
          .in('id', promotorIds)
        
        return {
          ...campanha,
          loja_ids: lojaIds,
          promotor_ids: promotorIds,
          lojas: lojasData || [],
          promotores: promotoresData || []
        }
      }))
      
      setCampanhas(campanhasComRelacoes)
    } catch (err) {
      console.error('Erro ao carregar campanhas:', err)
    }
  }

  async function carregarDados() {
    setLoading(true)
    setError(null)
    await Promise.all([carregarLojas(), carregarPromotores(), carregarCampanhas()])
    setLoading(false)
  }

  useEffect(() => {
    carregarDados()
  }, [mesAtual, filtroStatus])

  // Filtrar lojas
  const lojasFiltradas = lojas.filter(loja => {
    const matchNome = loja.nome_loja.toLowerCase().includes(lojaFiltroNome.toLowerCase()) ||
      (loja.codigo && loja.codigo.toLowerCase().includes(lojaFiltroNome.toLowerCase()))
    
    const matchSelecao = lojasSelecionadas.length === 0 || lojasSelecionadas.includes(loja.id)
    
    return matchNome && matchSelecao
  })

  function getCampanhasDoDia(lojaId: string, dia: number) {
    const dataAtual = new Date(ano, mes, dia)
    dataAtual.setHours(0, 0, 0, 0)
    
    return campanhas.filter(campanha => {
      const inicio = new Date(campanha.data_inicio)
      const fim = new Date(campanha.data_fim)
      inicio.setHours(0, 0, 0, 0)
      fim.setHours(23, 59, 59, 999)
      // Verifica se a loja está na lista de lojas da campanha
      return campanha.loja_ids?.includes(lojaId) && dataAtual >= inicio && dataAtual <= fim
    })
  }

  function isHoje(dia: number) {
    return hoje.getDate() === dia && 
           hoje.getMonth() === mes && 
           hoje.getFullYear() === ano
  }

  function mudarMes(delta: number) {
    setMesAtual(new Date(ano, mes + delta, 1))
  }

  // Funções para gerenciar lojas selecionadas (filtro)
  function toggleLojaSelecionada(lojaId: string) {
    setLojasSelecionadas(prev =>
      prev.includes(lojaId)
        ? prev.filter(id => id !== lojaId)
        : [...prev, lojaId]
    )
  }

  function selecionarTodasLojas() {
    if (lojasSelecionadas.length === lojas.length) {
      setLojasSelecionadas([])
    } else {
      setLojasSelecionadas(lojas.map(l => l.id))
    }
  }

  async function criarNovaCampanha() {
    if (!novaCampanha.nome || !novaCampanha.data_inicio || !novaCampanha.data_fim) {
      alert('Preencha todos os campos obrigatórios')
      return
    }

    if (novaCampanha.loja_ids.length === 0) {
      alert('Selecione pelo menos uma loja para a campanha')
      return
    }

    setSalvando(true)
    try {
      // 1. Criar a campanha
      const { data: campanha, error: campanhaError } = await supabase
        .from('campanhas')
        .insert([{
          nome: novaCampanha.nome,
          data_inicio: novaCampanha.data_inicio,
          data_fim: novaCampanha.data_fim,
          status: novaCampanha.status,
          tipo: novaCampanha.tipo
        }])
        .select()
        .single()

      if (campanhaError) throw campanhaError

      // 2. Inserir relações com lojas
      if (novaCampanha.loja_ids.length > 0) {
        const relacoesLojas = novaCampanha.loja_ids.map(loja_id => ({
          campanha_id: campanha.id,
          loja_id: loja_id
        }))

        const { error: lojasError } = await supabase
          .from('campanhas_lojas')
          .insert(relacoesLojas)

        if (lojasError) throw lojasError
      }

      // 3. Inserir relações com promotores
      if (novaCampanha.promotor_ids.length > 0) {
        const relacoesPromotores = novaCampanha.promotor_ids.map(promotor_id => ({
          campanha_id: campanha.id,
          promotor_id: promotor_id
        }))

        const { error: promotoresError } = await supabase
          .from('campanhas_promotores')
          .insert(relacoesPromotores)

        if (promotoresError) throw promotoresError
      }

      setShowNovaCampanhaModal(false)
      setNovaCampanha({
        nome: '',
        loja_ids: [],
        promotor_ids: [],
        data_inicio: '',
        data_fim: '',
        status: 'pendente',
        tipo: 'promocao'
      })
      await carregarCampanhas()
      
      alert('Campanha criada com sucesso!')
    } catch (err) {
      console.error('Erro ao criar campanha:', err)
      alert('Erro ao criar campanha. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  
  const filtrosAtivos = (filtroStatus !== 'todos' ? 1 : 0) + (lojasSelecionadas.length > 0 ? 1 : 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: PRIMARY_COLOR }} />
          <p className="text-gray-500">Carregando calendário...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="rounded-lg p-6 text-white" style={{ background: `linear-gradient(135deg, ${PRIMARY_COLOR} 0%, #cc1168 100%)` }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-7 w-7" />
              Calendário de Campanhas
            </h1>
            <p className="text-pink-100 text-sm mt-1">
              {lojas.length} lojas cadastradas • {campanhas.length} campanhas no período
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              size="sm" 
              className="bg-white/20 hover:bg-white/30 text-white"
              onClick={() => setShowFilterModal(true)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtrar
              {filtrosAtivos > 0 && (
                <Badge className="ml-2 bg-white text-pink-600" variant="secondary">
                  {filtrosAtivos}
                </Badge>
              )}
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              style={{ background: 'white', color: PRIMARY_COLOR }} 
              className="hover:bg-gray-100"
              onClick={() => setShowNovaCampanhaModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Campanha
            </Button>
          </div>
        </div>
      </div>

      {/* Controles do mês */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => mudarMes(-1)}>
            <ChevronLeft className="h-4 w-4" />
            Mês anterior
          </Button>
          <Button variant="outline" size="sm" onClick={() => mudarMes(1)}>
            Próximo mês
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="text-xl font-bold text-gray-800">
          {mesAtual.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="w-64">
          <Input
            placeholder="🔍 Buscar loja por nome..."
            value={lojaFiltroNome}
            onChange={(e) => setLojaFiltroNome(e.target.value)}
            className="border-gray-300 focus:border-pink-500 focus:ring-pink-500"
          />
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 text-sm bg-gray-50 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: PRIMARY_COLOR }}></div>
          <span>Campanha Ativa</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
          <span>Pendente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span>Concluída</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
          <span>Hoje</span>
        </div>
        {filtroStatus !== 'todos' && (
          <div className="flex items-center gap-2 ml-4">
            <Badge variant="outline" className="text-xs">
              Status: {filtroStatus === 'ativa' ? 'Ativa' : filtroStatus === 'pendente' ? 'Pendente' : 'Concluída'}
            </Badge>
          </div>
        )}
        {lojasSelecionadas.length > 0 && (
          <div className="flex items-center gap-2 ml-4">
            <Badge variant="outline" className="text-xs">
              {lojasSelecionadas.length} loja(s) selecionada(s)
            </Badge>
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto text-gray-500 text-xs">
          <span>Exibindo: {lojasFiltradas.length} de {lojas.length} lojas</span>
        </div>
      </div>

      {/* Calendário */}
      <Card className="overflow-hidden shadow-lg border-0">
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-[1200px]">
            {/* Cabeçalho com dias */}
            <div className="grid border-b sticky top-0 z-20" 
              style={{ gridTemplateColumns: `250px repeat(${dias.length}, 70px)` }}>
              <div className="p-3 font-bold text-gray-700 sticky left-0 z-10 border-r" style={{ background: '#f9fafb' }}>
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4" style={{ color: PRIMARY_COLOR }} />
                  Loja / Dia
                </div>
              </div>
              {dias.map((dia) => {
                const data = new Date(ano, mes, dia)
                const nomeDia = diasSemana[data.getDay()]
                const isDiaHoje = isHoje(dia)
                return (
                  <div key={dia} className={cn(
                    "p-2 text-center font-semibold border-r",
                    isDiaHoje && "bg-yellow-50"
                  )}>
                    <div className="text-lg font-bold">{dia}</div>
                    <div className="text-xs text-gray-500">{nomeDia}</div>
                  </div>
                )
              })}
            </div>

            {/* Linhas das lojas */}
            {lojasFiltradas.map((loja) => (
              <div key={loja.id} className="grid border-b hover:bg-gray-50 transition-colors"
                style={{ gridTemplateColumns: `250px repeat(${dias.length}, 70px)` }}>
                
                <div className="p-3 font-medium sticky left-0 bg-white z-10 border-r">
                  <div className="font-bold text-gray-800">
                    {loja.codigo || loja.id.substring(0, 6)}
                  </div>
                  <div className="text-xs text-gray-500 truncate" title={loja.nome_loja}>
                    {loja.nome_loja}
                  </div>
                </div>

                {/* Dias */}
                {dias.map((dia) => {
                  const campanhasDoDia = getCampanhasDoDia(loja.id, dia)
                  const isDiaHoje = isHoje(dia)
                  
                  return (
                    <div key={dia} className={cn(
                      "p-1 border-r min-h-[80px] align-top",
                      isDiaHoje && "bg-yellow-50"
                    )}>
                      {campanhasDoDia.length > 0 ? (
                        <div className="space-y-1">
                          {campanhasDoDia.map((campanha) => (
                            <div 
                              key={campanha.id} 
                              className="p-1 rounded-md text-xs cursor-pointer transition-all hover:scale-105"
                              style={{ 
                                background: campanha.status === 'ativa' ? `${PRIMARY_COLOR}20` : 
                                           campanha.status === 'pendente' ? '#fef3c7' : '#dbeafe',
                                borderLeft: `2px solid ${campanha.status === 'ativa' ? PRIMARY_COLOR : 
                                                      campanha.status === 'pendente' ? '#f59e0b' : '#3b82f6'}`
                              }}
                            >
                              <div className="font-semibold truncate">{campanha.nome}</div>
                              {campanha.promotores && campanha.promotores.length > 0 && (
                                <div className="text-[10px] text-gray-500 truncate">
                                  {campanha.promotores.map(p => p.promotor_nome.split(' ')[0]).join(', ')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-gray-300 text-xs h-full flex items-center justify-center">
                          —
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}

            {lojasFiltradas.length === 0 && (
              <div className="text-center py-20 text-gray-500">
                <Store className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Nenhuma loja encontrada</p>
                <p className="text-sm">Tente ajustar os filtros ou a busca</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Filtro */}
      <Dialog open={showFilterModal} onOpenChange={setShowFilterModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Filtrar Campanhas</DialogTitle>
            <DialogDescription>
              Selecione as lojas e status que deseja visualizar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* Filtro por Status */}
            <div className="space-y-2">
              <Label>Status da Campanha</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Lojas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Lojas para exibir</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={selecionarTodasLojas}
                  className="text-xs"
                >
                  {lojasSelecionadas.length === lojas.length ? 'Desmarcar todas' : 'Selecionar todas'}
                </Button>
              </div>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {lojasSelecionadas.length === 0
                      ? "Todas as lojas"
                      : `${lojasSelecionadas.length} loja(s) selecionada(s)`}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar loja..." />
                    <CommandList>
                      <CommandEmpty>Nenhuma loja encontrada.</CommandEmpty>
                      <CommandGroup>
                        {lojas.map((loja) => (
                          <CommandItem
                            key={loja.id}
                            value={loja.id}
                            onSelect={() => toggleLojaSelecionada(loja.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                lojasSelecionadas.includes(loja.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {loja.codigo} - {loja.nome_loja}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {lojasSelecionadas.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {lojasSelecionadas.slice(0, 5).map(lojaId => {
                    const loja = lojas.find(l => l.id === lojaId)
                    return (
                      <Badge key={lojaId} variant="secondary" className="text-xs">
                        {loja?.codigo}
                        <X 
                          className="ml-1 h-3 w-3 cursor-pointer" 
                          onClick={() => toggleLojaSelecionada(lojaId)}
                        />
                      </Badge>
                    )
                  })}
                  {lojasSelecionadas.length > 5 && (
                    <Badge variant="secondary" className="text-xs">
                      +{lojasSelecionadas.length - 5}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setFiltroStatus('todos')
              setLojasSelecionadas([])
            }}>
              Limpar todos os filtros
            </Button>
            <Button onClick={() => setShowFilterModal(false)} style={{ background: PRIMARY_COLOR }}>
              Aplicar filtros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Nova Campanha - COM POPOVER */}
      <Dialog open={showNovaCampanhaModal} onOpenChange={setShowNovaCampanhaModal}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Criar Nova Campanha</DialogTitle>
            <DialogDescription>
              Preencha os dados da campanha. Os campos com * são obrigatórios.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Nome da Campanha */}
            <div className="space-y-2">
              <Label>Nome da Campanha *</Label>
              <Input
                value={novaCampanha.nome}
                onChange={(e) => setNovaCampanha({ ...novaCampanha, nome: e.target.value })}
                placeholder="Ex: Promoção de Verão"
              />
            </div>

            {/* Lojas - POPOVER */}
            <div className="space-y-2">
              <Label>Lojas *</Label>
              <Popover open={lojasPopoverOpen} onOpenChange={setLojasPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between h-auto min-h-[40px]"
                    onClick={abrirSelecionarLojas}
                  >
                    <div className="flex flex-wrap gap-1">
                      {novaCampanha.loja_ids.length === 0 ? (
                        <span className="text-muted-foreground">Selecione as lojas...</span>
                      ) : (
                        <>
                          <Badge variant="secondary" className="text-xs">
                            📦 {novaCampanha.loja_ids.length} loja(s) selecionada(s)
                          </Badge>
                          {novaCampanha.loja_ids.slice(0, 3).map(lojaId => {
                            const loja = lojas.find(l => l.id === lojaId)
                            return loja ? (
                              <Badge key={lojaId} variant="outline" className="text-xs">
                                {loja.codigo}
                              </Badge>
                            ) : null
                          })}
                          {novaCampanha.loja_ids.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{novaCampanha.loja_ids.length - 3}
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                    <ChevronRightIcon className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <div className="p-2 border-b">
                    <Input
                      placeholder="🔍 Buscar loja por nome ou código..."
                      value={buscaLojasTemp}
                      onChange={(e) => setBuscaLojasTemp(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  
                  <div className="max-h-[300px] overflow-y-auto p-2">
                    <div className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer border-b pb-2 mb-1">
                      <Checkbox
                        checked={lojasSelecionadasTemp.length === lojas.length && lojas.length > 0}
                        onCheckedChange={() => {
                          if (lojasSelecionadasTemp.length === lojas.length) {
                            setLojasSelecionadasTemp([])
                          } else {
                            setLojasSelecionadasTemp(lojas.map(l => l.id))
                          }
                        }}
                      />
                      <Label className="cursor-pointer font-semibold flex-1">
                        Selecionar todas as lojas ({lojas.length})
                      </Label>
                    </div>
                    
                    {lojas
                      .filter(loja => {
                        const busca = buscaLojasTemp.toLowerCase()
                        return loja.nome_loja.toLowerCase().includes(busca) ||
                               (loja.codigo && loja.codigo.toLowerCase().includes(busca))
                      })
                      .map((loja) => (
                        <div
                          key={loja.id}
                          className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                          onClick={() => {
                            setLojasSelecionadasTemp(prev =>
                              prev.includes(loja.id)
                                ? prev.filter(id => id !== loja.id)
                                : [...prev, loja.id]
                            )
                          }}
                        >
                          <Checkbox
                            checked={lojasSelecionadasTemp.includes(loja.id)}
                            onCheckedChange={() => {}}
                          />
                          <Label className="cursor-pointer flex-1">
                            <span className="font-mono text-xs">{loja.codigo}</span> - {loja.nome_loja}
                          </Label>
                        </div>
                      ))}
                    
                    {lojas.filter(loja => {
                      const busca = buscaLojasTemp.toLowerCase()
                      return loja.nome_loja.toLowerCase().includes(busca) ||
                             (loja.codigo && loja.codigo.toLowerCase().includes(busca))
                    }).length === 0 && (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        Nenhuma loja encontrada
                      </div>
                    )}
                  </div>
                  
                  <div className="p-2 border-t flex justify-between">
                    <Button variant="ghost" size="sm" onClick={() => setLojasSelecionadasTemp([])}>
                      Limpar tudo
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={cancelarSelecaoLojas}>
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={aplicarSelecaoLojas} style={{ background: PRIMARY_COLOR }}>
                        Aplicar ({lojasSelecionadasTemp.length})
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Promotores - POPOVER */}
            <div className="space-y-2">
              <Label>Promotores</Label>
              <Popover open={promotoresPopoverOpen} onOpenChange={setPromotoresPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between h-auto min-h-[40px]"
                    onClick={abrirSelecionarPromotores}
                  >
                    <div className="flex flex-wrap gap-1">
                      {novaCampanha.promotor_ids.length === 0 ? (
                        <span className="text-muted-foreground">Selecione os promotores...</span>
                      ) : (
                        <>
                          <Badge variant="secondary" className="text-xs">
                            👤 {novaCampanha.promotor_ids.length} promotor(es) selecionado(s)
                          </Badge>
                          {novaCampanha.promotor_ids.slice(0, 3).map(promotorId => {
                            const promotor = promotores.find(p => p.id === promotorId)
                            return promotor ? (
                              <Badge key={promotorId} variant="outline" className="text-xs">
                                {promotor.promotor_nome.split(' ')[0]}
                              </Badge>
                            ) : null
                          })}
                          {novaCampanha.promotor_ids.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{novaCampanha.promotor_ids.length - 3}
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                    <ChevronRightIcon className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <div className="p-2 border-b">
                    <Input
                      placeholder="🔍 Buscar promotor por nome..."
                      value={buscaPromotoresTemp}
                      onChange={(e) => setBuscaPromotoresTemp(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  
                  <div className="max-h-[300px] overflow-y-auto p-2">
                    <div className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer border-b pb-2 mb-1">
                      <Checkbox
                        checked={promotoresSelecionadosTemp.length === promotores.length && promotores.length > 0}
                        onCheckedChange={() => {
                          if (promotoresSelecionadosTemp.length === promotores.length) {
                            setPromotoresSelecionadosTemp([])
                          } else {
                            setPromotoresSelecionadosTemp(promotores.map(p => p.id))
                          }
                        }}
                      />
                      <Label className="cursor-pointer font-semibold flex-1">
                        Selecionar todos os promotores ({promotores.length})
                      </Label>
                    </div>
                    
                    {promotores
                      .filter(promotor => {
                        const busca = buscaPromotoresTemp.toLowerCase()
                        return promotor.promotor_nome.toLowerCase().includes(busca)
                      })
                      .map((promotor) => (
                        <div
                          key={promotor.id}
                          className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                          onClick={() => {
                            setPromotoresSelecionadosTemp(prev =>
                              prev.includes(promotor.id)
                                ? prev.filter(id => id !== promotor.id)
                                : [...prev, promotor.id]
                            )
                          }}
                        >
                          <Checkbox
                            checked={promotoresSelecionadosTemp.includes(promotor.id)}
                            onCheckedChange={() => {}}
                          />
                          <Label className="cursor-pointer flex-1">
                            {promotor.promotor_nome}
                          </Label>
                        </div>
                      ))}
                    
                    {promotores.filter(promotor => {
                      const busca = buscaPromotoresTemp.toLowerCase()
                      return promotor.promotor_nome.toLowerCase().includes(busca)
                    }).length === 0 && (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        Nenhum promotor encontrado
                      </div>
                    )}
                  </div>
                  
                  <div className="p-2 border-t flex justify-between">
                    <Button variant="ghost" size="sm" onClick={() => setPromotoresSelecionadosTemp([])}>
                      Limpar tudo
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={cancelarSelecaoPromotores}>
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={aplicarSelecaoPromotores} style={{ background: PRIMARY_COLOR }}>
                        Aplicar ({promotoresSelecionadosTemp.length})
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início *</Label>
                <Input
                  type="date"
                  value={novaCampanha.data_inicio}
                  onChange={(e) => setNovaCampanha({ ...novaCampanha, data_inicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim *</Label>
                <Input
                  type="date"
                  value={novaCampanha.data_fim}
                  onChange={(e) => setNovaCampanha({ ...novaCampanha, data_fim: e.target.value })}
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={novaCampanha.status} onValueChange={(value: any) => setNovaCampanha({ ...novaCampanha, status: value })}>
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
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovaCampanhaModal(false)}>
              Cancelar
            </Button>
            <Button onClick={criarNovaCampanha} disabled={salvando} style={{ background: PRIMARY_COLOR }}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar campanha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
