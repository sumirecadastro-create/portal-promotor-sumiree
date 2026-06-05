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
  ClipboardList,
  ChevronRight as ChevronRightIcon,
  Info,
  Calendar as CalendarIcon,
  Tag,
  MapPin,
  FileText,
  Flag,
  Edit,
  Trash2,
  Gift,
  ShoppingBag,
  Ticket,
  Balloon,
  Sparkles,
  Microscope,
  Megaphone
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
  loja_ids: string[]
  data_inicio: string
  data_fim: string
  status: string
  tipo: string
  descricao?: string
  lojas?: Loja[]
}

const PRIMARY_COLOR = '#FF1686'

// Função auxiliar para formatar data local para YYYY-MM-DD
function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Função para obter o primeiro dia do mês no formato YYYY-MM-DD
function getFirstDayOfMonth(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-01`
}

// Função para obter o último dia do mês no formato YYYY-MM-DD
function getLastDayOfMonth(year: number, month: number): string {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

// Configuração de status (sem prioridade)
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

// Configuração de tipo
const getTipoConfig = (tipo: string) => {
  switch (tipo) {
    case 'compre_ganhe':
      return { icon: Gift, label: 'Compre e Ganhe', description: 'Promoção onde o cliente compra e ganha brindes', color: '#FF1686' }
    case 'compre_aplique':
      return { icon: ShoppingBag, label: 'Compre e Aplique', description: 'Promoção onde o cliente compra e aplica o produto', color: '#FF1686' }
    case 'compre_concorra':
      return { icon: Ticket, label: 'Compre e Concorra', description: 'Promoção onde o cliente compra e concorre a prêmios', color: '#FF1686' }
    case 'estouro_balão':
      return { icon: Balloon, label: 'Estouro de Balão', description: 'Dinâmica de estouro de balões com prêmios', color: '#FF1686' }
    case 'roleta_premiada':
      return { icon: Sparkles, label: 'Roleta Premiada', description: 'Dinâmica de roleta para clientes', color: '#FF1686' }
    case 'analise_capilar':
      return { icon: Microscope, label: 'Análise Capilar', description: 'Análise e diagnóstico capilar personalizado', color: '#FF1686' }
    case 'abordagem':
      return { icon: Megaphone, label: 'Abordagem', description: 'Abordagem ativa de clientes', color: '#FF1686' }
    default:
      return { icon: Target, label: 'Outra', description: 'Outros tipos de ação', color: '#6b7280' }
  }
}

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

// Função para atualizar automaticamente os status das ações baseado nas datas
async function atualizarStatusAcoes() {
  try {
    const hoje = new Date().toISOString().split('T')[0]
    console.log('📅 Atualizando status das ações... Data atual:', hoje)
    
    // Buscar todas as ações que não estão concluídas
    const { data: acoes, error } = await supabase
      .from('acoes')
      .select('id, data_inicio, data_fim, status')
      .neq('status', 'concluida')
    
    if (error) throw error
    if (!acoes || acoes.length === 0) return
    
    const updates = []
    
    for (const acao of acoes) {
      let novoStatus = null
      
      if (hoje < acao.data_inicio) {
        novoStatus = 'agendada'
      } else if (hoje >= acao.data_inicio && hoje <= acao.data_fim) {
        novoStatus = 'em_andamento'
      } else if (hoje > acao.data_fim) {
        novoStatus = 'concluida'
      }
      
      if (novoStatus && novoStatus !== acao.status) {
        updates.push(
          supabase.from('acoes').update({ status: novoStatus }).eq('id', acao.id)
        )
        console.log(`🔄 Ação ${acao.id}: ${acao.status} → ${novoStatus}`)
      }
    }
    
    if (updates.length > 0) {
      await Promise.all(updates)
      console.log(`✅ ${updates.length} ações tiveram status atualizado`)
    }
    
  } catch (error) {
    console.error('Erro ao atualizar status das ações:', error)
  }
}

// Componente de Detalhes da Ação (sem prioridade)
function DetalhesAcao({ 
  acao, 
  open, 
  onOpenChange,
  onEditar
}: { 
  acao: Acao | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onEditar: (acao: Acao) => void;
}) {
  if (!acao) return null

  const statusConfig = getStatusConfig(acao.status)
  const tipoConfig = getTipoConfig(acao.tipo)
  const StatusIcon = statusConfig.icon
  const TipoIcon = tipoConfig.icon

  const calcularDias = () => {
    const inicio = new Date(acao.data_inicio + 'T00:00:00')
    const fim = new Date(acao.data_fim + 'T00:00:00')
    const diffTime = Math.abs(fim.getTime() - inicio.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  const getStatusBadgeColor = () => {
    switch (acao.status) {
      case 'em_andamento': return 'text-pink-600 bg-pink-100'
      case 'concluida': return 'text-green-600 bg-green-100'
      case 'pendente': return 'text-yellow-600 bg-yellow-100'
      case 'agendada': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const handleEditar = () => {
    onOpenChange(false)
    onEditar(acao)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TipoIcon className="h-5 w-5" style={{ color: tipoConfig.color }} />
            {acao.nome}
          </DialogTitle>
          <DialogDescription>
            Detalhes completos da ação
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flag className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-500">Status</span>
            </div>
            <Badge className={cn(getStatusBadgeColor(), "text-sm")}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Tag className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-500">Tipo</span>
            </div>
            <div className="flex items-center gap-2">
              <TipoIcon className="h-4 w-4" style={{ color: tipoConfig.color }} />
              <span className="text-sm font-medium">{tipoConfig.label}</span>
              <span className="text-xs text-gray-400">- {tipoConfig.description}</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <CalendarIcon className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-500">Período</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs text-gray-500">Data Início</div>
                  <div className="font-medium">
                    {new Date(acao.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <div className="text-gray-400">→</div>
                <div>
                  <div className="text-xs text-gray-500">Data Fim</div>
                  <div className="font-medium">
                    {new Date(acao.data_fim + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Duração</div>
                  <div className="font-medium text-right">{calcularDias()} dias</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Store className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-500">Lojas Participantes</span>
              <Badge variant="secondary" className="text-xs">
                {acao.lojas?.length || 0} loja(s)
              </Badge>
            </div>
            {acao.lojas && acao.lojas.length > 0 ? (
              <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                {acao.lojas.map(loja => (
                  <div key={loja.id} className="text-sm flex items-center gap-2 p-1 hover:bg-gray-50 rounded">
                    <MapPin className="h-3 w-3 text-gray-400" />
                    <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{loja.codigo}</span>
                    <span className="text-gray-600">-</span>
                    <span className="text-gray-600">{loja.nome_loja}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Nenhuma loja vinculada</p>
            )}
          </div>

          {acao.descricao && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-500">Descrição</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                {acao.descricao}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={handleEditar} style={{ background: PRIMARY_COLOR }}>
            <Edit className="h-4 w-4 mr-2" />
            Editar Ação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Componente de Tooltip da Ação (sem prioridade)
function AcaoTooltip({ acao, children }: { acao: Acao; children: React.ReactNode }) {
  const statusConfig = getStatusConfig(acao.status)
  const tipoConfig = getTipoConfig(acao.tipo)
  const TipoIcon = tipoConfig.icon

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs p-3 bg-gray-900 text-white">
        <div className="space-y-2">
          <p className="font-semibold text-sm flex items-center gap-2">
            <TipoIcon className="h-3 w-3" />
            {acao.nome}
          </p>
          <div className="text-xs space-y-1">
            <p className="flex items-center gap-2">
              <span className="opacity-70">Status:</span>
              <span style={{ color: statusConfig.color }}>{statusConfig.label}</span>
            </p>
            <p>📅 {new Date(acao.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')} até {new Date(acao.data_fim + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
            <p>🏪 {acao.lojas?.length || 0} lojas participantes</p>
            <p className="text-gray-400 text-[10px] mt-1">Clique para ver mais detalhes</p>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
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
  const [showDetalhesModal, setShowDetalhesModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [acaoSelecionada, setAcaoSelecionada] = useState<Acao | null>(null)
  const [editandoAcao, setEditandoAcao] = useState<Acao | null>(null)
  
  // Estado dos filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [lojasSelecionadas, setLojasSelecionadas] = useState<string[]>([])
  
  // Estado da nova ação (sem prioridade)
  const [novaAcao, setNovaAcao] = useState({
    nome: '',
    loja_ids: [] as string[],
    data_inicio: '',
    data_fim: '',
    status: 'pendente' as const,
    tipo: 'compre_ganhe',
    descricao: ''
  })
  const [salvando, setSalvando] = useState(false)
  
  // Estado para edição
  const [selectedLojasEdit, setSelectedLojasEdit] = useState<string[]>([])
  
  // Estados do Popover de Lojas
  const [lojasPopoverOpen, setLojasPopoverOpen] = useState(false)
  const [buscaLojasTemp, setBuscaLojasTemp] = useState('')
  const [lojasSelecionadasTemp, setLojasSelecionadasTemp] = useState<string[]>([])

  const ano = mesAtual.getFullYear()
  const mes = mesAtual.getMonth()
  
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const dias = Array.from({ length: diasNoMes }, (_, i) => i + 1)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  // Data atual no formato YYYY-MM-DD para comparação
  const hojeStr = formatLocalDate(hoje)

  // Abrir modal de detalhes
  const abrirDetalhes = (acao: Acao) => {
    setAcaoSelecionada(acao)
    setShowDetalhesModal(true)
  }

  // Abrir modal de edição
  const abrirEdicao = (acao: Acao) => {
    setEditandoAcao({ ...acao })
    setSelectedLojasEdit(acao.lojas?.map(l => l.id) || [])
    setShowEditModal(true)
  }

  // Funções do Popover
  const abrirSelecionarLojas = () => {
    setLojasSelecionadasTemp([...novaAcao.loja_ids])
    setBuscaLojasTemp('')
    setLojasPopoverOpen(true)
  }

  const aplicarSelecaoLojas = () => {
    setNovaAcao(prev => ({ ...prev, loja_ids: [...lojasSelecionadasTemp] }))
    setLojasPopoverOpen(false)
  }

  const cancelarSelecaoLojas = () => {
    setLojasPopoverOpen(false)
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

  // Buscar ações do Supabase com suas lojas
  async function carregarAcoes() {
    try {
      const startDate = getFirstDayOfMonth(ano, mes)
      const endDate = getLastDayOfMonth(ano, mes)
      
      console.log('📅 Buscando ações que cruzam o período:', startDate, 'até:', endDate)
      
      let query = supabase
        .from('acoes')
        .select('*')
        .lte('data_inicio', endDate)
        .gte('data_fim', startDate)
      
      if (filtroStatus !== 'todos') {
        query = query.eq('status', filtroStatus)
      }
      
      if (filtroTipo !== 'todos') {
        query = query.eq('tipo', filtroTipo)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      // Buscar as lojas relacionadas para cada ação
      const acoesComLojas = await Promise.all((data || []).map(async (acao) => {
        const { data: relacoes } = await supabase
          .from('acoes_lojas')
          .select('loja_id')
          .eq('acao_id', acao.id)
        
        if (relacoes && relacoes.length > 0) {
          const lojaIds = relacoes.map(r => r.loja_id)
          const { data: lojasData } = await supabase
            .from('lojas')
            .select('id, nome_loja, cod_loja')
            .in('id', lojaIds)
          
          return { 
            ...acao, 
            loja_ids: lojaIds,
            lojas: lojasData || []
          }
        }
        
        return { 
          ...acao, 
          loja_ids: [],
          lojas: []
        }
      }))
      
      setAcoes(acoesComLojas)
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

  // useEffect com atualização automática de status
  useEffect(() => {
    const init = async () => {
      // Primeiro atualiza os status automaticamente
      await atualizarStatusAcoes()
      // Depois carrega os dados
      await carregarDados()
    }
    init()
  }, [mesAtual, filtroStatus, filtroTipo])

  // Filtrar lojas
  const lojasFiltradas = lojas.filter(loja => {
    const matchNome = loja.nome_loja.toLowerCase().includes(lojaFiltroNome.toLowerCase()) ||
      (loja.codigo && loja.codigo.toLowerCase().includes(lojaFiltroNome.toLowerCase()))
    
    const matchSelecao = lojasSelecionadas.length === 0 || lojasSelecionadas.includes(loja.id)
    
    return matchNome && matchSelecao
  })

  // Função para obter ações do dia (sem ordenação por prioridade)
  function getAcoesDoDia(lojaId: string, dia: number) {
    const dateStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    
    return acoes.filter(acao => {
      if (!acao.loja_ids?.includes(lojaId)) return false
      return dateStr >= acao.data_inicio && dateStr <= acao.data_fim
    })
  }

  function isHoje(dia: number) {
    const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    return dataStr === hojeStr
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
    if (!novaAcao.nome || !novaAcao.data_inicio || !novaAcao.data_fim) {
      alert('Preencha todos os campos obrigatórios')
      return
    }

    if (novaAcao.loja_ids.length === 0) {
      alert('Selecione pelo menos uma loja para a ação')
      return
    }

    setSalvando(true)
    try {
      const { data: acao, error: acaoError } = await supabase
        .from('acoes')
        .insert([{
          nome: novaAcao.nome,
          data_inicio: novaAcao.data_inicio,
          data_fim: novaAcao.data_fim,
          status: novaAcao.status,
          tipo: novaAcao.tipo,
          descricao: novaAcao.descricao
        }])
        .select()
        .single()

      if (acaoError) throw acaoError

      const relacoes = novaAcao.loja_ids.map(loja_id => ({
        acao_id: acao.id,
        loja_id: loja_id
      }))

      const { error: relacoesError } = await supabase
        .from('acoes_lojas')
        .insert(relacoes)

      if (relacoesError) throw relacoesError

      setShowNovaAcaoModal(false)
      setNovaAcao({
        nome: '',
        loja_ids: [],
        data_inicio: '',
        data_fim: '',
        status: 'pendente',
        tipo: 'compre_ganhe',
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

  async function atualizarAcao() {
    if (!editandoAcao) return
    if (!editandoAcao.nome || !editandoAcao.data_inicio || !editandoAcao.data_fim) {
      alert('Preencha todos os campos obrigatórios')
      return
    }

    if (selectedLojasEdit.length === 0) {
      alert('Selecione pelo menos uma loja para a ação')
      return
    }

    setSalvando(true)
    try {
      const { error: acaoError } = await supabase
        .from('acoes')
        .update({
          nome: editandoAcao.nome,
          data_inicio: editandoAcao.data_inicio,
          data_fim: editandoAcao.data_fim,
          status: editandoAcao.status,
          tipo: editandoAcao.tipo,
          descricao: editandoAcao.descricao
        })
        .eq('id', editandoAcao.id)

      if (acaoError) throw acaoError

      const { error: deleteError } = await supabase
        .from('acoes_lojas')
        .delete()
        .eq('acao_id', editandoAcao.id)

      if (deleteError) throw deleteError

      if (selectedLojasEdit.length > 0) {
        const relacoes = selectedLojasEdit.map(loja_id => ({
          acao_id: editandoAcao.id,
          loja_id: loja_id
        }))

        const { error: relacoesError } = await supabase
          .from('acoes_lojas')
          .insert(relacoes)

        if (relacoesError) throw relacoesError
      }

      setShowEditModal(false)
      setEditandoAcao(null)
      await carregarAcoes()
      
      alert('Ação atualizada com sucesso!')
    } catch (err) {
      console.error('Erro ao atualizar ação:', err)
      alert('Erro ao atualizar ação. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  async function excluirAcao(id: string, nome: string) {
    if (!confirm(`Deseja realmente excluir a ação "${nome}"?`)) return

    try {
      const { error: deleteRelError } = await supabase
        .from('acoes_lojas')
        .delete()
        .eq('acao_id', id)

      if (deleteRelError) throw deleteRelError

      const { error: acaoError } = await supabase
        .from('acoes')
        .delete()
        .eq('id', id)

      if (acaoError) throw acaoError

      await carregarAcoes()
      alert('Ação excluída com sucesso!')
    } catch (err) {
      console.error('Erro ao excluir ação:', err)
      alert('Erro ao excluir ação. Tente novamente.')
    }
  }

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  
  const filtrosAtivos = (filtroStatus !== 'todos' ? 1 : 0) + 
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

  // Lista de tipos de ação
  const tiposAcao = [
    { value: 'compre_ganhe', label: '🎁 Compre e Ganhe', description: 'Promoção onde o cliente compra e ganha brindes' },
    { value: 'compre_aplique', label: '🛍️ Compre e Aplique', description: 'Promoção onde o cliente compra e aplica o produto' },
    { value: 'compre_concorra', label: '🎫 Compre e Concorra', description: 'Promoção onde o cliente compra e concorre a prêmios' },
    { value: 'estouro_balão', label: '🎈 Estouro de Balão', description: 'Dinâmica de estouro de balões com prêmios' },
    { value: 'roleta_premiada', label: '✨ Roleta Premiada', description: 'Dinâmica de roleta para clientes' },
    { value: 'analise_capilar', label: '🔬 Análise Capilar', description: 'Análise e diagnóstico capilar personalizado' },
    { value: 'abordagem', label: '📢 Abordagem', description: 'Abordagem ativa de clientes' }
  ]

  return (
    <TooltipProvider>
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
          {filtroStatus !== 'todos' && (
            <Badge variant="outline" className="text-xs">
              Status: {filtroStatus === 'em_andamento' ? 'Em Andamento' : 
                       filtroStatus === 'concluida' ? 'Concluída' : 
                       filtroStatus === 'pendente' ? 'Pendente' : 'Agendada'}
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
                              const tipoConfig = getTipoConfig(acao.tipo)
                              const StatusIcon = statusConfig.icon
                              const TipoIcon = tipoConfig.icon
                              
                              return (
                                <AcaoTooltip key={acao.id} acao={acao}>
                                  <div 
                                    className="p-1.5 rounded-md text-xs cursor-pointer transition-all hover:scale-105 relative group"
                                    style={{ 
                                      background: statusConfig.bg,
                                      borderLeft: `3px solid ${statusConfig.color}`
                                    }}
                                    onClick={() => abrirDetalhes(acao)}
                                  >
                                    <div className="flex items-center justify-between mb-0.5">
                                      <div className="flex items-center gap-1">
                                        <TipoIcon className="h-3 w-3" style={{ color: PRIMARY_COLOR }} />
                                        <span className="font-semibold">{acao.nome}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <StatusIcon className="h-3 w-3" style={{ color: statusConfig.color }} />
                                        <Info className="h-2.5 w-2.5 opacity-50" />
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-[10px] text-gray-400">
                                        {new Date(acao.data_inicio + 'T00:00:00').getDate() === dia ? 
                                          (new Date(acao.data_fim + 'T00:00:00').getDate() === dia ? 'Único' : 'Início') :
                                          (new Date(acao.data_fim + 'T00:00:00').getDate() === dia ? 'Fim' : '')}
                                      </span>
                                    </div>
                                  </div>
                                </AcaoTooltip>
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

        {/* Modal de Detalhes */}
        <DetalhesAcao 
          acao={acaoSelecionada}
          open={showDetalhesModal}
          onOpenChange={setShowDetalhesModal}
          onEditar={abrirEdicao}
        />

        {/* Modal de Edição */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Editar Ação</DialogTitle>
              <DialogDescription>
                Altere os dados da ação. <span className="text-red-500">*</span> Campos obrigatórios.
              </DialogDescription>
            </DialogHeader>
            
            {editandoAcao && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome da Ação <span className="text-red-500">*</span></Label>
                  <Input
                    value={editandoAcao.nome}
                    onChange={(e) => setEditandoAcao({ ...editandoAcao, nome: e.target.value })}
                    placeholder="Ex: Promoção de Verão"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Lojas <span className="text-red-500">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {selectedLojasEdit.length === 0 ? "Selecione as lojas..." : `${selectedLojasEdit.length} loja(s) selecionada(s)`}
                        <ChevronRightIcon className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <div className="p-2 border-b">
                        <Input placeholder="Buscar loja..." className="h-8" />
                      </div>
                      <div className="max-h-[300px] overflow-y-auto p-2">
                        {lojas.map((loja) => (
                          <div
                            key={loja.id}
                            className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                            onClick={() => {
                              setSelectedLojasEdit(prev =>
                                prev.includes(loja.id)
                                  ? prev.filter(id => id !== loja.id)
                                  : [...prev, loja.id]
                              )
                            }}
                          >
                            <Checkbox checked={selectedLojasEdit.includes(loja.id)} />
                            <Label className="cursor-pointer flex-1">
                              {loja.codigo} - {loja.nome_loja}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data Início <span className="text-red-500">*</span></Label>
                    <Input
                      type="date"
                      value={editandoAcao.data_inicio}
                      onChange={(e) => setEditandoAcao({ ...editandoAcao, data_inicio: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Fim <span className="text-red-500">*</span></Label>
                    <Input
                      type="date"
                      value={editandoAcao.data_fim}
                      onChange={(e) => setEditandoAcao({ ...editandoAcao, data_fim: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select 
                      value={editandoAcao.tipo} 
                      onValueChange={(value) => setEditandoAcao({ ...editandoAcao, tipo: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposAcao.map(tipo => (
                          <SelectItem key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select 
                      value={editandoAcao.status} 
                      onValueChange={(value) => setEditandoAcao({ ...editandoAcao, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">⏳ Pendente</SelectItem>
                        <SelectItem value="em_andamento">⚡ Em Andamento</SelectItem>
                        <SelectItem value="agendada">📅 Agendada</SelectItem>
                        <SelectItem value="concluida">✅ Concluída</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <textarea
                    className="w-full min-h-[80px] p-2 border rounded-md text-sm"
                    value={editandoAcao.descricao || ''}
                    onChange={(e) => setEditandoAcao({ ...editandoAcao, descricao: e.target.value })}
                    placeholder="Descrição detalhada da ação..."
                  />
                </div>
              </div>
            )}
            
            <DialogFooter>
              {editandoAcao && (
                <Button 
                  variant="destructive" 
                  onClick={() => excluirAcao(editandoAcao.id, editandoAcao.nome)}
                  className="mr-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancelar
              </Button>
              <Button onClick={atualizarAcao} disabled={salvando} style={{ background: PRIMARY_COLOR }}>
                {salvando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

              <div className="space-y-2">
                <Label>Tipo de Ação</Label>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {tiposAcao.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                    <div className="p-2 border-b">
                      <Input
                        placeholder="Buscar loja..."
                        className="h-8"
                        value={buscaLojasTemp}
                        onChange={(e) => setBuscaLojasTemp(e.target.value)}
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2">
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
                            onClick={() => toggleLojaSelecionada(loja.id)}
                          >
                            <Checkbox
                              checked={lojasSelecionadas.includes(loja.id)}
                              onCheckedChange={() => toggleLojaSelecionada(loja.id)}
                            />
                            <Label className="cursor-pointer flex-1">
                              <span className="font-mono text-xs">{loja.codigo}</span> - {loja.nome_loja}
                            </Label>
                          </div>
                        ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setFiltroStatus('todos')
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
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Criar Nova Ação</DialogTitle>
              <DialogDescription>
                Preencha os dados da ação. Os campos com * são obrigatórios.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome da Ação *</Label>
                <Input
                  value={novaAcao.nome}
                  onChange={(e) => setNovaAcao({ ...novaAcao, nome: e.target.value })}
                  placeholder="Ex: Promoção de Verão"
                />
              </div>

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
                        {novaAcao.loja_ids.length === 0 ? (
                          <span className="text-muted-foreground">Selecione as lojas...</span>
                        ) : (
                          <>
                            <Badge variant="secondary" className="text-xs">
                              📦 {novaAcao.loja_ids.length} loja(s) selecionada(s)
                            </Badge>
                            {novaAcao.loja_ids.slice(0, 3).map(lojaId => {
                              const loja = lojas.find(l => l.id === lojaId)
                              return loja ? (
                                <Badge key={lojaId} variant="outline" className="text-xs">
                                  {loja.codigo}
                                </Badge>
                              ) : null
                            })}
                            {novaAcao.loja_ids.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{novaAcao.loja_ids.length - 3}
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
                <p className="text-xs text-muted-foreground">
                  Clique para selecionar uma ou mais lojas
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Início *</Label>
                  <Input
                    type="date"
                    value={novaAcao.data_inicio}
                    onChange={(e) => setNovaAcao({ ...novaAcao, data_inicio: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim *</Label>
                  <Input
                    type="date"
                    value={novaAcao.data_fim}
                    onChange={(e) => setNovaAcao({ ...novaAcao, data_fim: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={novaAcao.tipo} onValueChange={(value) => setNovaAcao({ ...novaAcao, tipo: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposAcao.map(tipo => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={novaAcao.status} onValueChange={(value: any) => setNovaAcao({ ...novaAcao, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">⏳ Pendente</SelectItem>
                      <SelectItem value="em_andamento">⚡ Em Andamento</SelectItem>
                      <SelectItem value="agendada">📅 Agendada</SelectItem>
                      <SelectItem value="concluida">✅ Concluída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <textarea
                  className="w-full min-h-[80px] p-2 border rounded-md text-sm"
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
    </TooltipProvider>
  )
}
