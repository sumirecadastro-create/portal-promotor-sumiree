import { useState, useEffect } from 'react'
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Plus, 
  CheckCircle2, 
  Clock,
  Store,
  Users,
  Loader2,
  X,
  Save,
  Search,
  Check,
  ChevronRight as ChevronRightIcon,
  Info,
  Calendar as CalendarIcon,
  Tag,
  MapPin,
  User,
  Edit,
  Trash2
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'

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

// Componente de Detalhes da Campanha
function DetalhesCampanha({ 
  campanha, 
  open, 
  onOpenChange,
  onEditar,
  isAdmin
}: { 
  campanha: Campanha | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onEditar: (campanha: Campanha) => void;
  isAdmin: boolean;
}) {
  if (!campanha) return null

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ativa': return { text: 'Ativa', color: 'text-green-600', bg: 'bg-green-100' }
      case 'pendente': return { text: 'Pendente', color: 'text-yellow-600', bg: 'bg-yellow-100' }
      case 'concluida': return { text: 'Concluída', color: 'text-blue-600', bg: 'bg-blue-100' }
      default: return { text: status, color: 'text-gray-600', bg: 'bg-gray-100' }
    }
  }

  const getTipoIcon = (tipo?: string) => {
    switch (tipo) {
      case 'promocao': return '🎉'
      case 'evento': return '📅'
      case 'lancamento': return '🚀'
      default: return '📢'
    }
  }

  const statusInfo = getStatusText(campanha.status)

  const handleEditar = () => {
    onOpenChange(false)
    onEditar(campanha)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{getTipoIcon(campanha.tipo)}</span>
            {campanha.nome}
          </DialogTitle>
          <DialogDescription>
            Detalhes completos da campanha
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Status</span>
            <Badge className={cn(statusInfo.bg, statusInfo.color)}>
              {statusInfo.text}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Período</span>
            <div className="text-right">
              <div className="text-sm font-medium">
                {new Date(campanha.data_inicio).toLocaleDateString('pt-BR')}
              </div>
              <div className="text-xs text-gray-400">até</div>
              <div className="text-sm font-medium">
                {new Date(campanha.data_fim).toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Duração</span>
            <span className="text-sm">
              {Math.ceil((new Date(campanha.data_fim).getTime() - new Date(campanha.data_inicio).getTime()) / (1000 * 60 * 60 * 24))} dias
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Store className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-500">Lojas Participantes</span>
              <Badge variant="secondary" className="text-xs">
                {campanha.lojas?.length || 0} loja(s)
              </Badge>
            </div>
            {campanha.lojas && campanha.lojas.length > 0 ? (
              <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                {campanha.lojas.map(loja => (
                  <div key={loja.id} className="text-sm flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-gray-400" />
                    <span className="font-mono text-xs">{loja.codigo}</span>
                    <span className="text-gray-600">-</span>
                    <span className="text-gray-600">{loja.nome_loja}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Nenhuma loja vinculada</p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-500">Promotores Responsáveis</span>
              <Badge variant="secondary" className="text-xs">
                {campanha.promotores?.length || 0} promotor(es)
              </Badge>
            </div>
            {campanha.promotores && campanha.promotores.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {campanha.promotores.map(promotor => (
                  <Badge key={promotor.id} variant="outline" className="gap-1">
                    <User className="h-3 w-3" />
                    {promotor.promotor_nome}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Nenhum promotor vinculado</p>
            )}
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {isAdmin && (
            <Button onClick={handleEditar} style={{ background: PRIMARY_COLOR }}>
              <Edit className="h-4 w-4 mr-2" />
              Editar Campanha
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Componente de Tooltip da Campanha
function CampanhaTooltip({ campanha, children }: { campanha: Campanha; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs p-3 bg-gray-900 text-white">
        <div className="space-y-2">
          <p className="font-semibold text-sm">{campanha.nome}</p>
          <div className="text-xs space-y-1">
            <p>📅 {new Date(campanha.data_inicio).toLocaleDateString('pt-BR')} até {new Date(campanha.data_fim).toLocaleDateString('pt-BR')}</p>
            <p>🏪 {campanha.lojas?.length || 0} lojas participantes</p>
            <p>👥 {campanha.promotores?.length || 0} promotores</p>
            <p className="text-gray-300 text-xs">Clique para ver mais detalhes</p>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

export default function Campanhas() {
  // 🔥 Autenticação - ADICIONADO isRegional
  const { isAdmin, isGerente, isRegional, userLojaId, loading: authLoading } = useAuth()
  
  // Estados principais
  const [mesAtual, setMesAtual] = useState(new Date())
  const [lojaFiltroNome, setLojaFiltroNome] = useState('')
  const [lojas, setLojas] = useState<Loja[]>([])
  const [promotores, setPromotores] = useState<Promotor[]>([])
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [showNovaCampanhaModal, setShowNovaCampanhaModal] = useState(false)
  const [showDetalhesModal, setShowDetalhesModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [campanhaSelecionada, setCampanhaSelecionada] = useState<Campanha | null>(null)
  const [editandoCampanha, setEditandoCampanha] = useState<Campanha | null>(null)
  
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [lojasSelecionadas, setLojasSelecionadas] = useState<string[]>([])
  const [buscaLojaFiltro, setBuscaLojaFiltro] = useState('')
  
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
  
  const [lojasPopoverOpen, setLojasPopoverOpen] = useState(false)
  const [buscaLojasTemp, setBuscaLojasTemp] = useState('')
  const [lojasSelecionadasTemp, setLojasSelecionadasTemp] = useState<string[]>([])
  
  const [promotoresPopoverOpen, setPromotoresPopoverOpen] = useState(false)
  const [buscaPromotoresTemp, setBuscaPromotoresTemp] = useState('')
  const [promotoresSelecionadosTemp, setPromotoresSelecionadosTemp] = useState<string[]>([])

  const ano = mesAtual.getFullYear()
  const mes = mesAtual.getMonth()
  
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const dias = Array.from({ length: diasNoMes }, (_, i) => i + 1)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const abrirDetalhes = (campanha: Campanha) => {
    setCampanhaSelecionada(campanha)
    setShowDetalhesModal(true)
  }

  const abrirEdicao = (campanha: Campanha) => {
    setEditandoCampanha({ ...campanha })
    setSelectedLojasEdit(campanha.lojas?.map(l => l.id) || [])
    setSelectedPromotoresEdit(campanha.promotores?.map(p => p.id) || [])
    setShowEditModal(true)
  }

  const [selectedLojasEdit, setSelectedLojasEdit] = useState<string[]>([])
  const [selectedPromotoresEdit, setSelectedPromotoresEdit] = useState<string[]>([])

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

  // 🔥 Buscar lojas do Supabase com filtro por permissão do gerente
  async function carregarLojas() {
    try {
      let query = supabase
        .from('lojas')
        .select('*')
        .order('nome_loja', { ascending: true })
      
      // Se for gerente (não admin), filtrar apenas a loja dele
      if (isGerente && !isAdmin && userLojaId) {
        query = query.eq('id', userLojaId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      const lojasFormatadas = (data || []).map((loja: any) => ({
        id: loja.id,
        nome_loja: loja.nome_loja,
        codigo: loja.cod_loja || loja.nome_loja.substring(0, 8)
      }))
      
      setLojas(lojasFormatadas)
      
      // Se for gerente e tem apenas uma loja, auto-selecionar
      if (isGerente && !isAdmin && userLojaId && lojasFormatadas.length === 1) {
        setLojasSelecionadas([userLojaId])
      }
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

  // 🔥 Buscar campanhas do Supabase com filtro por permissão do gerente
  async function carregarCampanhas() {
    try {
      const startDate = `${ano}-${String(mes + 1).padStart(2, '0')}-01`
      const lastDay = new Date(ano, mes + 1, 0).getDate()
      const endDate = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      
      // Buscar IDs das lojas permitidas para o gerente
      let lojasPermitidasIds: string[] = []
      
      if (isGerente && !isAdmin) {
        if (userLojaId) {
          lojasPermitidasIds = [userLojaId]
        } else {
          // Gerente sem loja específica - buscar todas as lojas
          const { data: lojasData } = await supabase
            .from('lojas')
            .select('id')
          lojasPermitidasIds = lojasData?.map(l => l.id) || []
        }
      }
      
      // Buscar campanhas
      let query = supabase
        .from('campanhas')
        .select('*')
        .lte('data_inicio', endDate)
        .gte('data_fim', startDate)
      
      if (filtroStatus !== 'todos') {
        query = query.eq('status', filtroStatus)
      }
      
      const { data: campanhasData, error: campanhasError } = await query
      
      if (campanhasError) throw campanhasError
      
      if (!campanhasData || campanhasData.length === 0) {
        setCampanhas([])
        return
      }
      
      const campanhaIds = campanhasData.map(c => c.id)
      
      // Buscar relações com lojas
      let lojasRelQuery = supabase
        .from('lojas_campanhas')
        .select('campanha_id, loja_id')
        .in('campanha_id', campanhaIds)
      
      // Se for gerente, filtrar apenas as lojas permitidas
      if (isGerente && !isAdmin && lojasPermitidasIds.length > 0) {
        lojasRelQuery = lojasRelQuery.in('loja_id', lojasPermitidasIds)
      }
      
      const { data: lojasRel, error: lojasRelError } = await lojasRelQuery
      
      if (lojasRelError) console.error('Erro ao buscar relações com lojas:', lojasRelError)
      
      // Filtrar apenas campanhas que têm pelo menos uma loja permitida
      const campanhaIdsPermitidas = new Set(lojasRel?.map(rel => rel.campanha_id) || [])
      const campanhasFiltradas = campanhasData.filter(c => campanhaIdsPermitidas.has(c.id))
      
      // Buscar relações com promotores
      const { data: promotoresRel, error: promotoresRelError } = await supabase
        .from('promotores_campanhas')
        .select('campanha_id, promotor_id')
        .in('campanha_id', campanhasFiltradas.map(c => c.id))
      
      if (promotoresRelError) console.error('Erro ao buscar relações com promotores:', promotoresRelError)
      
      const lojasPorCampanha: Record<string, string[]> = {}
      lojasRel?.forEach(rel => {
        if (!lojasPorCampanha[rel.campanha_id]) {
          lojasPorCampanha[rel.campanha_id] = []
        }
        lojasPorCampanha[rel.campanha_id].push(rel.loja_id)
      })
      
      const promotoresPorCampanha: Record<string, string[]> = {}
      promotoresRel?.forEach(rel => {
        if (!promotoresPorCampanha[rel.campanha_id]) {
          promotoresPorCampanha[rel.campanha_id] = []
        }
        promotoresPorCampanha[rel.campanha_id].push(rel.promotor_id)
      })
      
      const todosLojasIds = new Set(Object.values(lojasPorCampanha).flat())
      let lojasData: any[] = []
      if (todosLojasIds.size > 0) {
        const { data: lojas } = await supabase
          .from('lojas')
          .select('id, nome_loja, cod_loja')
          .in('id', Array.from(todosLojasIds))
        lojasData = lojas || []
      }
      const lojasMap = new Map(lojasData.map(l => [l.id, l]))
      
      const todosPromotoresIds = new Set(Object.values(promotoresPorCampanha).flat())
      let promotoresData: any[] = []
      if (todosPromotoresIds.size > 0) {
        const { data: promotores } = await supabase
          .from('promotores')
          .select('id, promotor_nome')
          .in('id', Array.from(todosPromotoresIds))
        promotoresData = promotores || []
      }
      const promotoresMap = new Map(promotoresData.map(p => [p.id, p]))
      
      const campanhasComRelacoes = campanhasFiltradas.map(campanha => {
        const lojaIds = lojasPorCampanha[campanha.id] || []
        const promotorIds = promotoresPorCampanha[campanha.id] || []
        
        return {
          ...campanha,
          loja_ids: lojaIds,
          promotor_ids: promotorIds,
          lojas: lojaIds.map(id => lojasMap.get(id)).filter(Boolean),
          promotores: promotorIds.map(id => promotoresMap.get(id)).filter(Boolean)
        }
      })
      
      setCampanhas(campanhasComRelacoes)
    } catch (err) {
      console.error('Erro ao carregar campanhas:', err)
      setError('Não foi possível carregar as campanhas')
    }
  }

  async function carregarDados() {
    setLoading(true)
    setError(null)
    await Promise.all([carregarLojas(), carregarPromotores(), carregarCampanhas()])
    setLoading(false)
  }

  useEffect(() => {
    if (!authLoading) {
      carregarDados()
    }
  }, [mesAtual, filtroStatus, authLoading, isGerente, isAdmin, userLojaId])

  const lojasFiltradas = lojas.filter(loja => {
    const matchNome = loja.nome_loja.toLowerCase().includes(lojaFiltroNome.toLowerCase()) ||
      (loja.codigo && loja.codigo.toLowerCase().includes(lojaFiltroNome.toLowerCase()))
    
    const matchSelecao = lojasSelecionadas.length === 0 || lojasSelecionadas.includes(loja.id)
    
    return matchNome && matchSelecao
  })

  function getCampanhasDoDia(lojaId: string, dia: number) {
    const dateStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    
    return campanhas.filter(campanha => {
      if (!campanha.loja_ids?.includes(lojaId)) return false
      return dateStr >= campanha.data_inicio && dateStr <= campanha.data_fim
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

  async function criarNovaCampanha() {
    if (!novaCampanha.nome || !novaCampanha.data_inicio || !novaCampanha.data_fim) {
      alert('Preencha os campos obrigatórios: Nome, Data Início e Data Fim')
      return
    }

    if (novaCampanha.loja_ids.length === 0) {
      alert('Selecione pelo menos uma loja para a campanha')
      return
    }

    setSalvando(true)
    try {
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

      if (novaCampanha.loja_ids.length > 0) {
        const relacoesLojas = novaCampanha.loja_ids.map(loja_id => ({
          campanha_id: campanha.id,
          loja_id: loja_id
        }))

        const { error: lojasError } = await supabase
          .from('lojas_campanhas')
          .insert(relacoesLojas)

        if (lojasError) throw lojasError
      }

      if (novaCampanha.promotor_ids && novaCampanha.promotor_ids.length > 0) {
        const relacoesPromotores = novaCampanha.promotor_ids.map(promotor_id => ({
          campanha_id: campanha.id,
          promotor_id: promotor_id
        }))

        const { error: promotoresError } = await supabase
          .from('promotores_campanhas')
          .insert(relacoesPromotores)

        if (promotoresError) {
          console.error('Erro ao vincular promotores:', promotoresError)
        }
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

  async function atualizarCampanha() {
    if (!editandoCampanha) return
    if (!editandoCampanha.nome || !editandoCampanha.data_inicio || !editandoCampanha.data_fim) {
      alert('Preencha os campos obrigatórios: Nome, Data Início e Data Fim')
      return
    }

    if (selectedLojasEdit.length === 0) {
      alert('Selecione pelo menos uma loja para a campanha')
      return
    }

    setSalvando(true)
    try {
      const { error: campanhaError } = await supabase
        .from('campanhas')
        .update({
          nome: editandoCampanha.nome,
          data_inicio: editandoCampanha.data_inicio,
          data_fim: editandoCampanha.data_fim,
          status: editandoCampanha.status,
          tipo: editandoCampanha.tipo
        })
        .eq('id', editandoCampanha.id)

      if (campanhaError) throw campanhaError

      const { error: deleteLojasError } = await supabase
        .from('lojas_campanhas')
        .delete()
        .eq('campanha_id', editandoCampanha.id)

      if (deleteLojasError) throw deleteLojasError

      if (selectedLojasEdit.length > 0) {
        const relacoesLojas = selectedLojasEdit.map(loja_id => ({
          campanha_id: editandoCampanha.id,
          loja_id: loja_id
        }))

        const { error: lojasError } = await supabase
          .from('lojas_campanhas')
          .insert(relacoesLojas)

        if (lojasError) throw lojasError
      }

      const { error: deletePromotoresError } = await supabase
        .from('promotores_campanhas')
        .delete()
        .eq('campanha_id', editandoCampanha.id)

      if (deletePromotoresError) throw deletePromotoresError

      if (selectedPromotoresEdit.length > 0) {
        const relacoesPromotores = selectedPromotoresEdit.map(promotor_id => ({
          campanha_id: editandoCampanha.id,
          promotor_id: promotor_id
        }))

        const { error: promotoresError } = await supabase
          .from('promotores_campanhas')
          .insert(relacoesPromotores)

        if (promotoresError) throw promotoresError
      }

      setShowEditModal(false)
      setEditandoCampanha(null)
      await carregarCampanhas()
      
      alert('Campanha atualizada com sucesso!')
    } catch (err) {
      console.error('Erro ao atualizar campanha:', err)
      alert('Erro ao atualizar campanha. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  async function excluirCampanha(id: string, nome: string) {
    if (!confirm(`Deseja realmente excluir a campanha "${nome}"?`)) return

    try {
      const { error: deleteLojasError } = await supabase
        .from('lojas_campanhas')
        .delete()
        .eq('campanha_id', id)

      if (deleteLojasError) throw deleteLojasError

      const { error: deletePromotoresError } = await supabase
        .from('promotores_campanhas')
        .delete()
        .eq('campanha_id', id)

      if (deletePromotoresError) throw deletePromotoresError

      const { error: campanhaError } = await supabase
        .from('campanhas')
        .delete()
        .eq('id', id)

      if (campanhaError) throw campanhaError

      await carregarCampanhas()
      alert('Campanha excluída com sucesso!')
    } catch (err) {
      console.error('Erro ao excluir campanha:', err)
      alert('Erro ao excluir campanha. Tente novamente.')
    }
  }

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const filtrosAtivos = (filtroStatus !== 'todos' ? 1 : 0) + (lojasSelecionadas.length > 0 ? 1 : 0)

  // 🔥 VERIFICAÇÃO DE CARREGAMENTO
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: PRIMARY_COLOR }} />
          <p className="text-gray-500">Carregando calendário de campanhas...</p>
        </div>
      </div>
    )
  }

  // ✅ CORRIGIDO: PERMISSÃO PARA ADMIN, GERENTE E REGIONAL
  if (!isAdmin && !isGerente && !isRegional) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
          <p className="text-gray-500">Você não tem permissão para visualizar esta página.</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
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
              {/* 🔥 Botão de filtro */}
              {(isAdmin || (isGerente && lojas.length > 1) || (isRegional && lojas.length > 1)) && (
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
              )}
              
              {/* 🔥 Botão de nova campanha - apenas admin pode criar */}
              {isAdmin && (
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
              )}
            </div>
          </div>
        </div>

        {/* ... resto do código igual ... */}
      </div>
    </TooltipProvider>
  )
}
