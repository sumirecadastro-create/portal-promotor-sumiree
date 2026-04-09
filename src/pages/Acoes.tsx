import { useState, useEffect } from 'react'
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Plus, 
  CheckCircle2, 
  Clock,
  AlertCircle,
  Store,
  Users,
  Loader2,
  X,
  Save,
  Search,
  Check,
  Target,
  Zap,
  Wrench,
  Truck,
  GraduationCap,
  ClipboardList
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

interface Acao {
  id: string
  nome: string
  loja_id: string
  data_inicio: string
  data_fim: string
  responsaveis: string[]
  status: string
  tipo: string
  prioridade: string
  descricao?: string
}

const PRIMARY_COLOR = '#FF1686'

// Configuração de status
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'concluida':
      return { color: '#10b981', bg: '#d1fae5', icon: CheckCircle2, label: 'Concluída' }
    case 'em_andamento':
      return { color: PRIMARY_COLOR, bg: `${PRIMARY_COLOR}20`, icon: Zap, label: 'Em Andamento' }
    case 'pendente':
      return { color: '#f59e0b', bg: '#fef3c7', icon: Clock, label: 'Pendente' }
    case 'agendada':
      return { color: '#3b82f6', bg: '#dbeafe', icon: Calendar, label: 'Agendada' }
    default:
      return { color: '#6b7280', bg: '#f3f4f6', icon: AlertCircle, label: 'Desconhecida' }
  }
}

// Configuração de prioridade
const getPrioridadeConfig = (prioridade: string) => {
  switch (prioridade) {
    case 'alta':
      return { color: '#ef4444', bg: '#fee2e2', label: '🔴 Alta', icon: '🔴' }
    case 'media':
      return { color: '#f59e0b', bg: '#fef3c7', label: '🟡 Média', icon: '🟡' }
    case 'baixa':
      return { color: '#10b981', bg: '#d1fae5', label: '🟢 Baixa', icon: '🟢' }
    default:
      return { color: '#6b7280', bg: '#f3f4f6', label: '⚪ Normal', icon: '⚪' }
  }
}

// Configuração de tipo
const getTipoConfig = (tipo: string) => {
  switch (tipo) {
    case 'manutencao':
      return { icon: Wrench, label: 'Manutenção' }
    case 'logistica':
      return { icon: Truck, label: 'Logística' }
    case 'treinamento':
      return { icon: GraduationCap, label: 'Treinamento' }
    case 'controle':
      return { icon: ClipboardList, label: 'Controle' }
    default:
      return { icon: Target, label: 'Outra' }
  }
}

export default function Acoes() {
  // Estados principais
  const [mesAtual, setMesAtual] = useState(new Date())
  const [lojaFiltroNome, setLojaFiltroNome] = useState('')
  const [lojas, setLojas] = useState<Loja[]>([])
  const [acoes, setAcoes] = useState<Acao[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Estados dos modais
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [showNovaAcaoModal, setShowNovaAcaoModal] = useState(false)
  
  // Estado dos filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>('todas')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [lojasSelecionadas, setLojasSelecionadas] = useState<string[]>([])
  
  // Estado da nova ação
  const [novaAcao, setNovaAcao] = useState({
    nome: '',
    loja_id: '',
    data_inicio: '',
    data_fim: '',
    responsaveis: [''],
    status: 'pendente' as const,
    tipo: 'manutencao',
    prioridade: 'media',
    descricao: ''
  })
  const [salvando, setSalvando] = useState(false)

  const ano = mesAtual.getFullYear()
  const mes = mesAtual.getMonth()
  
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const dias = Array.from({ length: diasNoMes }, (_, i) => i + 1)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

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
        codigo: loja.codigo || loja.nome_loja.substring(0, 8)
      }))
      
      setLojas(lojasFormatadas)
    } catch (err) {
      console.error('Erro ao carregar lojas:', err)
      setError('Não foi possível carregar as lojas')
    }
  }

  // Buscar ações do Supabase
  async function carregarAcoes() {
    try {
      const startDate = new Date(ano, mes, 1).toISOString()
      const endDate = new Date(ano, mes + 1, 0).toISOString()
      
      let query = supabase
        .from('acoes')
        .select('*')
        .gte('data_inicio', startDate)
        .lte('data_fim', endDate)
      
      if (filtroStatus !== 'todos') {
        query = query.eq('status', filtroStatus)
      }
      
      if (filtroPrioridade !== 'todas') {
        query = query.eq('prioridade', filtroPrioridade)
      }
      
      if (filtroTipo !== 'todos') {
        query = query.eq('tipo', filtroTipo)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      setAcoes(data || [])
    } catch (err) {
      console.error('Erro ao carregar ações:', err)
    }
  }

  async function carregarDados() {
    setLoading(true)
    setError(null)
    await Promise.all([carregarLojas(), carregarAcoes()])
    setLoading(false)
  }

  useEffect(() => {
    carregarDados()
  }, [mesAtual, filtroStatus, filtroPrioridade, filtroTipo])

  // Filtrar lojas
  const lojasFiltradas = lojas.filter(loja => {
    const matchNome = loja.nome_loja.toLowerCase().includes(lojaFiltroNome.toLowerCase()) ||
      (loja.codigo && loja.codigo.toLowerCase().includes(lojaFiltroNome.toLowerCase()))
    
    const matchSelecao = lojasSelecionadas.length === 0 || lojasSelecionadas.includes(loja.id)
    
    return matchNome && matchSelecao
  })

  function getAcoesDoDia(lojaId: string, dia: number) {
    const dataAtual = new Date(ano, mes, dia)
    dataAtual.setHours(0, 0, 0, 0)
    
    return acoes.filter(acao => {
      const inicio = new Date(acao.data_inicio)
      const fim = new Date(acao.data_fim)
      inicio.setHours(0, 0, 0, 0)
      fim.setHours(23, 59, 59, 999)
      return acao.loja_id === lojaId && dataAtual >= inicio && dataAtual <= fim
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

  async function criarNovaAcao() {
    if (!novaAcao.nome || !novaAcao.loja_id || !novaAcao.data_inicio || !novaAcao.data_fim) {
      alert('Preencha todos os campos obrigatórios')
      return
    }

    setSalvando(true)
    try {
      const { error } = await supabase
        .from('acoes')
        .insert([{
          nome: novaAcao.nome,
          loja_id: novaAcao.loja_id,
          data_inicio: novaAcao.data_inicio,
          data_fim: novaAcao.data_fim,
          responsaveis: novaAcao.responsaveis.filter(r => r.trim() !== ''),
          status: novaAcao.status,
          tipo: novaAcao.tipo,
          prioridade: novaAcao.prioridade,
          descricao: novaAcao.descricao
        }])

      if (error) throw error

      setShowNovaAcaoModal(false)
      setNovaAcao({
        nome: '',
        loja_id: '',
        data_inicio: '',
        data_fim: '',
        responsaveis: [''],
        status: 'pendente',
        tipo: 'manutencao',
        prioridade: 'media',
        descricao: ''
      })
      await carregarAcoes()
      
      alert('Ação criada com sucesso!')
    } catch (err) {
      console.error('Erro ao criar ação:', err)
      alert('Erro ao criar ação. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  function adicionarResponsavel() {
    setNovaAcao({
      ...novaAcao,
      responsaveis: [...novaAcao.responsaveis, '']
    })
  }

  function removerResponsavel(index: number) {
    setNovaAcao({
      ...novaAcao,
      responsaveis: novaAcao.responsaveis.filter((_, i) => i !== index)
    })
  }

  function atualizarResponsavel(index: number, valor: string) {
    const novosResponsaveis = [...novaAcao.responsaveis]
    novosResponsaveis[index] = valor
    setNovaAcao({ ...novaAcao, responsaveis: novosResponsaveis })
  }

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  
  const filtrosAtivos = (filtroStatus !== 'todos' ? 1 : 0) + 
                        (filtroPrioridade !== 'todas' ? 1 : 0) + 
                        (filtroTipo !== 'todos' ? 1 : 0) + 
                        (lojasSelecionadas.length > 0 ? 1 : 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: PRIMARY_COLOR }} />
          <p className="text-gray-500">Carregando calendário de ações...</p>
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
              <Target className="h-7 w-7" />
              Calendário de Ações
            </h1>
            <p className="text-pink-100 text-sm mt-1">
              {lojas.length} lojas cadastradas • {acoes.length} ações no período
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
              onClick={() => setShowNovaAcaoModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Ação
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
            style={{ '--tw-ring-color': PRIMARY_COLOR } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 text-sm bg-gray-50 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: PRIMARY_COLOR }}></div>
          <span>Em Andamento</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
          <span>Concluída</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
          <span>Pendente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span>Agendada</span>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <span>🔴 Alta</span>
          <span>🟡 Média</span>
          <span>🟢 Baixa</span>
        </div>
        {filtroStatus !== 'todos' && (
          <Badge variant="outline" className="text-xs">
            Status: {filtroStatus === 'em_andamento' ? 'Em Andamento' : 
                     filtroStatus === 'concluida' ? 'Concluída' : 
                     filtroStatus === 'pendente' ? 'Pendente' : 'Agendada'}
          </Badge>
        )}
        {filtroPrioridade !== 'todas' && (
          <Badge variant="outline" className="text-xs">
            Prioridade: {filtroPrioridade === 'alta' ? '🔴 Alta' : 
                         filtroPrioridade === 'media' ? '🟡 Média' : '🟢 Baixa'}
          </Badge>
        )}
        {lojasSelecionadas.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {lojasSelecionadas.length} loja(s) selecionada(s)
          </Badge>
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
              style={{ gridTemplateColumns: `250px repeat(${dias.length}, 80px)` }}>
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
                style={{ gridTemplateColumns: `250px repeat(${dias.length}, 80px)` }}>
                
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
                  const acoesDoDia = getAcoesDoDia(loja.id, dia)
                  const isDiaHoje = isHoje(dia)
                  
                  return (
                    <div key={dia} className={cn(
                      "p-1 border-r min-h-[100px] align-top",
                      isDiaHoje && "bg-yellow-50"
                    )}>
                      {acoesDoDia.length > 0 ? (
                        <div className="space-y-1.5">
                          {acoesDoDia.map((acao) => {
                            const statusConfig = getStatusConfig(acao.status)
                            const prioridadeConfig = getPrioridadeConfig(acao.prioridade)
                            const tipoConfig = getTipoConfig(acao.tipo)
                            const StatusIcon = statusConfig.icon
                            const TipoIcon = tipoConfig.icon
                            
                            return (
                              <div 
                                key={acao.id} 
                                className="p-1.5 rounded-md text-xs cursor-pointer transition-all hover:scale-105"
                                style={{ 
                                  background: statusConfig.bg,
                                  borderLeft: `3px solid ${statusConfig.color}`
                                }}
                              >
                                <div className="flex items-center justify-between mb-0.5">
                                  <div className="flex items-center gap-1">
                                    <TipoIcon className="h-3 w-3" style={{ color: PRIMARY_COLOR }} />
                                    <span className="font-semibold truncate">{acao.nome}</span>
                                  </div>
                                  <StatusIcon className="h-3 w-3" style={{ color: statusConfig.color }} />
                                </div>
                                <div className="text-gray-600 truncate text-[10px]">
                                  {acao.responsaveis?.slice(0, 1).join(', ')}
                                  {acao.responsaveis?.length > 1 && ` +${acao.responsaveis.length - 1}`}
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-[10px]">{prioridadeConfig.label}</span>
                                  <span className="text-[10px] text-gray-400">
                                    {new Date(acao.data_inicio).getDate() === dia ? 
                                      (new Date(acao.data_fim).getDate() === dia ? 'Único' : 'Início') :
                                      (new Date(acao.data_fim).getDate() === dia ? 'Fim' : '')
                                    }
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="text-center text-gray-300 text-xs h-full flex items-center justify-center min-h-[80px]">
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
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Filtrar Ações</DialogTitle>
            <DialogDescription>
              Selecione os filtros para visualizar as ações desejadas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* Filtro por Status */}
            <div className="space-y-2">
              <Label>Status da Ação</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="agendada">Agendada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Prioridade */}
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={filtroPrioridade} onValueChange={setFiltroPrioridade}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="alta">🔴 Alta</SelectItem>
                  <SelectItem value="media">🟡 Média</SelectItem>
                  <SelectItem value="baixa">🟢 Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Tipo */}
            <div className="space-y-2">
              <Label>Tipo de Ação</Label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                  <SelectItem value="logistica">Logística</SelectItem>
                  <SelectItem value="treinamento">Treinamento</SelectItem>
                  <SelectItem value="controle">Controle</SelectItem>
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
              setFiltroPrioridade('todas')
              setFiltroTipo('todos')
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

      {/* Modal de Nova Ação */}
      <Dialog open={showNovaAcaoModal} onOpenChange={setShowNovaAcaoModal}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Nova Ação</DialogTitle>
            <DialogDescription>
              Preencha os dados da ação. Os campos com * são obrigatórios.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Nome da Ação *</Label>
              <Input
                className="col-span-3"
                value={novaAcao.nome}
                onChange={(e) => setNovaAcao({ ...novaAcao, nome: e.target.value })}
                placeholder="Ex: Troca de Display"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Loja *</Label>
              <Select value={novaAcao.loja_id} onValueChange={(value) => setNovaAcao({ ...novaAcao, loja_id: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione uma loja" />
                </SelectTrigger>
                <SelectContent>
                  {lojas.map((loja) => (
                    <SelectItem key={loja.id} value={loja.id}>
                      {loja.codigo} - {loja.nome_loja}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Data Início *</Label>
              <Input
                type="date"
                className="col-span-3"
                value={novaAcao.data_inicio}
                onChange={(e) => setNovaAcao({ ...novaAcao, data_inicio: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Data Fim *</Label>
              <Input
                type="date"
                className="col-span-3"
                value={novaAcao.data_fim}
                onChange={(e) => setNovaAcao({ ...novaAcao, data_fim: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Tipo</Label>
              <Select value={novaAcao.tipo} onValueChange={(value) => setNovaAcao({ ...novaAcao, tipo: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                  <SelectItem value="logistica">Logística</SelectItem>
                  <SelectItem value="treinamento">Treinamento</SelectItem>
                  <SelectItem value="controle">Controle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Prioridade</Label>
              <Select value={novaAcao.prioridade} onValueChange={(value) => setNovaAcao({ ...novaAcao, prioridade: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">🟢 Baixa</SelectItem>
                  <SelectItem value="media">🟡 Média</SelectItem>
                  <SelectItem value="alta">🔴 Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Status</Label>
              <Select value={novaAcao.status} onValueChange={(value: any) => setNovaAcao({ ...novaAcao, status: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="agendada">Agendada</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Responsáveis</Label>
              <div className="col-span-3 space-y-2">
                {novaAcao.responsaveis.map((responsavel, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={responsavel}
                      onChange={(e) => atualizarResponsavel(index, e.target.value)}
                      placeholder={`Responsável ${index + 1}`}
                      className="flex-1"
                    />
                    {novaAcao.responsaveis.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removerResponsavel(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={adicionarResponsavel}
                  className="w-full"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Adicionar responsável
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Descrição</Label>
              <textarea
                className="col-span-3 min-h-[80px] p-2 border rounded-md text-sm"
                value={novaAcao.descricao}
                onChange={(e) => setNovaAcao({ ...novaAcao, descricao: e.target.value })}
                placeholder="Descrição detalhada da ação..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovaAcaoModal(false)}>
              Cancelar
            </Button>
            <Button onClick={criarNovaAcao} disabled={salvando} style={{ background: PRIMARY_COLOR }}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar ação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
