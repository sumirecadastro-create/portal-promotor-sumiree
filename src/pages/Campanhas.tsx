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
  // 🔥 Autenticação
  const { isAdmin, isGerente, userLojaId, loading: authLoading } = useAuth()
  
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

  // 🔥 Verificar permissão de acesso
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: PRIMARY_COLOR }} />
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    )
  }

  // 🔥 Se não for admin nem gerente, mostrar acesso negado
  if (!isAdmin && !isGerente) {
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
              {/* 🔥 Botão de filtro - admin vê tudo, gerente só vê se tiver mais de uma loja */}
              {(isAdmin || lojas.length > 1) && (
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

        <Card className="overflow-hidden shadow-lg border-0">
          <CardContent className="p-0 overflow-x-auto">
            <div className="min-w-[1200px]">
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
                              <CampanhaTooltip key={campanha.id} campanha={campanha}>
                                <div 
                                  className="p-1 rounded-md text-xs cursor-pointer transition-all hover:scale-105 relative group"
                                  style={{ 
                                    background: campanha.status === 'ativa' ? `${PRIMARY_COLOR}20` : 
                                               campanha.status === 'pendente' ? '#fef3c7' : '#dbeafe',
                                    borderLeft: `2px solid ${campanha.status === 'ativa' ? PRIMARY_COLOR : 
                                                          campanha.status === 'pendente' ? '#f59e0b' : '#3b82f6'}`
                                  }}
                                  onClick={() => abrirDetalhes(campanha)}
                                >
                                  <div className="font-semibold truncate flex items-center justify-between pr-4">
                                    <span>{campanha.nome}</span>
                                    <Info className="h-2.5 w-2.5 opacity-50" />
                                  </div>
                                  {campanha.promotores && campanha.promotores.length > 0 && (
                                    <div className="text-[10px] text-gray-500 truncate">
                                      {campanha.promotores.map(p => p.promotor_nome.split(' ')[0]).join(', ')}
                                    </div>
                                  )}
                                </div>
                              </CampanhaTooltip>
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

        <DetalhesCampanha 
          campanha={campanhaSelecionada}
          open={showDetalhesModal}
          onOpenChange={setShowDetalhesModal}
          onEditar={abrirEdicao}
          isAdmin={isAdmin}
        />

        {/* Modal de Edição de Campanha - apenas admin */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Editar Campanha</DialogTitle>
              <DialogDescription>
                Altere os dados da campanha. <span className="text-red-500">*</span> Campos obrigatórios.
              </DialogDescription>
            </DialogHeader>
            
            {editandoCampanha && isAdmin && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome da Campanha <span className="text-red-500">*</span></Label>
                  <Input
                    value={editandoCampanha.nome}
                    onChange={(e) => setEditandoCampanha({ ...editandoCampanha, nome: e.target.value })}
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

                <div className="space-y-2">
                  <Label>Promotores <span className="text-gray-400 text-xs">(opcional)</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {selectedPromotoresEdit.length === 0 ? "Nenhum promotor selecionado" : `${selectedPromotoresEdit.length} promotor(es) selecionado(s)`}
                        <ChevronRightIcon className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <div className="p-2 border-b">
                        <Input placeholder="Buscar promotor..." className="h-8" />
                      </div>
                      <div className="max-h-[300px] overflow-y-auto p-2">
                        {promotores.map((promotor) => (
                          <div
                            key={promotor.id}
                            className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                            onClick={() => {
                              setSelectedPromotoresEdit(prev =>
                                prev.includes(promotor.id)
                                  ? prev.filter(id => id !== promotor.id)
                                  : [...prev, promotor.id]
                              )
                            }}
                          >
                            <Checkbox checked={selectedPromotoresEdit.includes(promotor.id)} />
                            <Label className="cursor-pointer flex-1">{promotor.promotor_nome}</Label>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome da Campanha <span className="text-red-500">*</span></Label>
                    <Input
                      value={editandoCampanha.nome}
                      onChange={(e) => setEditandoCampanha({ ...editandoCampanha, nome: e.target.value })}
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

                  <div className="space-y-2">
                    <Label>Promotores <span className="text-gray-400 text-xs">(opcional)</span></Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          {selectedPromotoresEdit.length === 0 ? "Nenhum promotor selecionado" : `${selectedPromotoresEdit.length} promotor(es) selecionado(s)`}
                          <ChevronRightIcon className="h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <div className="p-2 border-b">
                          <Input placeholder="Buscar promotor..." className="h-8" />
                        </div>
                        <div className="max-h-[300px] overflow-y-auto p-2">
                          {promotores.map((promotor) => (
                            <div
                              key={promotor.id}
                              className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                              onClick={() => {
                                setSelectedPromotoresEdit(prev =>
                                  prev.includes(promotor.id)
                                    ? prev.filter(id => id !== promotor.id)
                                    : [...prev, promotor.id]
                                )
                              }}
                            >
                              <Checkbox checked={selectedPromotoresEdit.includes(promotor.id)} />
                              <Label className="cursor-pointer flex-1">{promotor.promotor_nome}</Label>
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
                        value={editandoCampanha.data_inicio}
                        onChange={(e) => setEditandoCampanha({ ...editandoCampanha, data_inicio: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data Fim <span className="text-red-500">*</span></Label>
                      <Input
                        type="date"
                        value={editandoCampanha.data_fim}
                        onChange={(e) => setEditandoCampanha({ ...editandoCampanha, data_fim: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select 
                      value={editandoCampanha.status} 
                      onValueChange={(value) => setEditandoCampanha({ ...editandoCampanha, status: value })}
                    >
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
              </div>
            )}
            
            <DialogFooter>
              {editandoCampanha && isAdmin && (
                <Button 
                  variant="destructive" 
                  onClick={() => excluirCampanha(editandoCampanha.id, editandoCampanha.nome)}
                  className="mr-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancelar
              </Button>
              {isAdmin && (
                <Button onClick={atualizarCampanha} disabled={salvando} style={{ background: PRIMARY_COLOR }}>
                  {salvando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar alterações
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Lojas para exibir</Label>
                  {isAdmin && (
                    <Button variant="ghost" size="sm" onClick={selecionarTodasLojas} className="text-xs">
                      {lojasSelecionadas.length === lojas.length ? 'Desmarcar todas' : 'Selecionar todas'}
                    </Button>
                  )}
                </div>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {lojasSelecionadas.length === 0 ? "Todas as lojas" : `${lojasSelecionadas.length} loja(s) selecionada(s)`}
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
                            <CommandItem key={loja.id} value={loja.id} onSelect={() => toggleLojaSelecionada(loja.id)}>
                              <Check className={cn("mr-2 h-4 w-4", lojasSelecionadas.includes(loja.id) ? "opacity-100" : "opacity-0")} />
                              {loja.codigo} - {loja.nome_loja}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setFiltroStatus('todos'); setLojasSelecionadas([]); }}>
                Limpar todos os filtros
              </Button>
              <Button onClick={() => setShowFilterModal(false)} style={{ background: PRIMARY_COLOR }}>
                Aplicar filtros
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Nova Campanha - apenas admin */}
        {isAdmin && (
          <Dialog open={showNovaCampanhaModal} onOpenChange={setShowNovaCampanhaModal}>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Criar Nova Campanha</DialogTitle>
                <DialogDescription>
                  Preencha os dados da campanha. <span className="text-red-500">*</span> Campos obrigatórios.
                  Promotores são opcionais.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome da Campanha <span className="text-red-500">*</span></Label>
                  <Input
                    value={novaCampanha.nome}
                    onChange={(e) => setNovaCampanha({ ...novaCampanha, nome: e.target.value })}
                    placeholder="Ex: Promoção de Verão"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Lojas <span className="text-red-500">*</span></Label>
                  <Popover open={lojasPopoverOpen} onOpenChange={setLojasPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between h-auto min-h-[40px]" onClick={abrirSelecionarLojas}>
                        <div className="flex flex-wrap gap-1">
                          {novaCampanha.loja_ids.length === 0 ? (
                            <span className="text-muted-foreground">Selecione as lojas...</span>
                          ) : (
                            <>
                              <Badge variant="secondary" className="text-xs">📦 {novaCampanha.loja_ids.length} loja(s)</Badge>
                              {novaCampanha.loja_ids.slice(0, 3).map(lojaId => {
                                const loja = lojas.find(l => l.id === lojaId)
                                return loja ? <Badge key={lojaId} variant="outline" className="text-xs">{loja.codigo}</Badge> : null
                              })}
                              {novaCampanha.loja_ids.length > 3 && <Badge variant="outline" className="text-xs">+{novaCampanha.loja_ids.length - 3}</Badge>}
                            </>
                          )}
                        </div>
                        <ChevronRightIcon className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <div className="p-2 border-b">
                        <Input placeholder="🔍 Buscar loja..." value={buscaLojasTemp} onChange={(e) => setBuscaLojasTemp(e.target.value)} className="h-8" />
                      </div>
                      <div className="max-h-[300px] overflow-y-auto p-2">
                        <div className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer border-b pb-2 mb-1">
                          <Checkbox checked={lojasSelecionadasTemp.length === lojas.length} onCheckedChange={() => {
                            if (lojasSelecionadasTemp.length === lojas.length) setLojasSelecionadasTemp([])
                            else setLojasSelecionadasTemp(lojas.map(l => l.id))
                          }} />
                          <Label className="cursor-pointer font-semibold flex-1">Selecionar todas ({lojas.length})</Label>
                        </div>
                        {lojas.filter(loja => loja.nome_loja.toLowerCase().includes(buscaLojasTemp.toLowerCase()) || (loja.codigo && loja.codigo.toLowerCase().includes(buscaLojasTemp.toLowerCase()))).map((loja) => (
                          <div key={loja.id} className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer" onClick={() => setLojasSelecionadasTemp(prev => prev.includes(loja.id) ? prev.filter(id => id !== loja.id) : [...prev, loja.id])}>
                            <Checkbox checked={lojasSelecionadasTemp.includes(loja.id)} />
                            <Label className="cursor-pointer flex-1">{loja.codigo} - {loja.nome_loja}</Label>
                          </div>
                        ))}
                      </div>
                      <div className="p-2 border-t flex justify-between">
                        <Button variant="ghost" size="sm" onClick={() => setLojasSelecionadasTemp([])}>Limpar tudo</Button>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={cancelarSelecaoLojas}>Cancelar</Button>
                          <Button size="sm" onClick={aplicarSelecaoLojas} style={{ background: PRIMARY_COLOR }}>Aplicar ({lojasSelecionadasTemp.length})</Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Promotores <span className="text-gray-400 text-xs">(opcional)</span></Label>
                  <Popover open={promotoresPopoverOpen} onOpenChange={setPromotoresPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between h-auto min-h-[40px]" onClick={abrirSelecionarPromotores}>
                        <div className="flex flex-wrap gap-1">
                          {novaCampanha.promotor_ids.length === 0 ? <span className="text-muted-foreground">Nenhum promotor selecionado</span> : <Badge variant="secondary" className="text-xs">👤 {novaCampanha.promotor_ids.length} promotor(es)</Badge>}
                        </div>
                        <ChevronRightIcon className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <div className="p-2 border-b">
                        <Input placeholder="🔍 Buscar promotor..." value={buscaPromotoresTemp} onChange={(e) => setBuscaPromotoresTemp(e.target.value)} className="h-8" />
                      </div>
                      <div className="max-h-[300px] overflow-y-auto p-2">
                        <div className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer border-b pb-2 mb-1">
                          <Checkbox checked={promotoresSelecionadosTemp.length === promotores.length} onCheckedChange={() => {
                            if (promotoresSelecionadosTemp.length === promotores.length) setPromotoresSelecionadosTemp([])
                            else setPromotoresSelecionadosTemp(promotores.map(p => p.id))
                          }} />
                          <Label className="cursor-pointer font-semibold flex-1">Selecionar todos ({promotores.length})</Label>
                        </div>
                        {promotores.filter(p => p.promotor_nome.toLowerCase().includes(buscaPromotoresTemp.toLowerCase())).map((promotor) => (
                          <div key={promotor.id} className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer" onClick={() => setPromotoresSelecionadosTemp(prev => prev.includes(promotor.id) ? prev.filter(id => id !== promotor.id) : [...prev, promotor.id])}>
                            <Checkbox checked={promotoresSelecionadosTemp.includes(promotor.id)} />
                            <Label className="cursor-pointer flex-1">{promotor.promotor_nome}</Label>
                          </div>
                        ))}
                      </div>
                      <div className="p-2 border-t flex justify-between">
                        <Button variant="ghost" size="sm" onClick={() => setPromotoresSelecionadosTemp([])}>Limpar tudo</Button>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={cancelarSelecaoPromotores}>Cancelar</Button>
                          <Button size="sm" onClick={aplicarSelecaoPromotores} style={{ background: PRIMARY_COLOR }}>Aplicar ({promotoresSelecionadosTemp.length})</Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data Início <span className="text-red-500">*</span></Label>
                    <Input type="date" value={novaCampanha.data_inicio} onChange={(e) => setNovaCampanha({ ...novaCampanha, data_inicio: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Fim <span className="text-red-500">*</span></Label>
                    <Input type="date" value={novaCampanha.data_fim} onChange={(e) => setNovaCampanha({ ...novaCampanha, data_fim: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={novaCampanha.status} onValueChange={(value: any) => setNovaCampanha({ ...novaCampanha, status: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">⏳ Pendente</SelectItem>
                      <SelectItem value="ativa">⚡ Ativa</SelectItem>
                      <SelectItem value="concluida">✅ Concluída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNovaCampanhaModal(false)}>Cancelar</Button>
                <Button onClick={criarNovaCampanha} disabled={salvando} style={{ background: PRIMARY_COLOR }}>
                  {salvando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar campanha
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </TooltipProvider>
  )
}
