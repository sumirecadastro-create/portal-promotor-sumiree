import { useEffect, useState } from 'react'
import { 
  Plus, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Clock,
  AlertCircle,
  Loader2,
  Search,
  Filter,
  ChevronDown,
  UserPlus,
  UserMinus,
  Repeat,
  Calendar,
  MessageSquare
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { getSolicitacoes, createSolicitacao, updateSolicitacaoStatus, SolicitacaoPromotor } from '@/services/solicitacoes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'

const PRIMARY_COLOR = '#FF1686'

// Opções de prioridade
const PRIORIDADES = [
  { value: 'baixa', label: 'Baixa', color: 'bg-blue-100 text-blue-700' },
  { value: 'media', label: 'Média', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'alta', label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  { value: 'urgente', label: 'Urgente', color: 'bg-red-100 text-red-700' },
]

// Opções de tipo
const TIPOS_SOLICITACAO = [
  { value: 'novo', label: 'Novo Promotor', icon: UserPlus },
  { value: 'reposicao', label: 'Reposição', icon: UserMinus },
  { value: 'transferencia', label: 'Transferência', icon: Repeat },
  { value: 'temporario', label: 'Temporário', icon: Clock },
]

// Mapeamento de status
const STATUS_MAP = {
  pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  analise: { label: 'Em Análise', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
  aprovado: { label: 'Aprovado', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  reprovado: { label: 'Reprovado', color: 'bg-red-100 text-red-700', icon: XCircle },
  cancelado: { label: 'Cancelado', color: 'bg-gray-100 text-gray-700', icon: XCircle },
}

export function SolicitacoesPromotores() {
  const { isAdmin, user } = useAuth()
  const { toast } = useToast()
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoPromotor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [openModal, setOpenModal] = useState(false)
  const [saving, setSaving] = useState(false)

  // Dados para nova solicitação
  const [novaSolicitacao, setNovaSolicitacao] = useState({
    loja_id: '',
    tipo_solicitacao: 'novo' as const,
    motivo: '',
    prioridade: 'media' as const,
    promotor_atual_id: '',
    promotor_sugerido_id: '',
    observacoes: '',
    dias_semana_sugerido: '',
    contato_responsavel: '',
    data_necessidade: '',
  })

  // Dados para lojas
  const [lojas, setLojas] = useState<any[]>([])
  const [promotores, setPromotores] = useState<any[]>([])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getSolicitacoes()
      setSolicitacoes(data)
      await loadLojas()
      await loadPromotores()
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar as solicitações',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadLojas = async () => {
    const { data } = await supabase
      .from('lojas')
      .select('id, cod_loja, nome_loja, numero_loja')
      .order('cod_loja')
    setLojas(data || [])
  }

  const loadPromotores = async () => {
    const { data } = await supabase
      .from('promotores')
      .select('id, promotor_nome, status')
      .eq('status', 'ativo')
      .order('promotor_nome')
    setPromotores(data || [])
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateSolicitacao = async () => {
    if (!novaSolicitacao.loja_id || !novaSolicitacao.motivo || !novaSolicitacao.data_necessidade) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
      })
      return
    }

    setSaving(true)
    try {
      const result = await createSolicitacao(novaSolicitacao)
      if (result) {
        toast({
          title: 'Sucesso',
          description: 'Solicitação criada com sucesso!',
        })
        setOpenModal(false)
        resetForm()
        await loadData()
      }
    } catch (error) {
      console.error('Erro ao criar solicitação:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível criar a solicitação',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleStatusUpdate = async (id: string, status: 'aprovado' | 'reprovado', motivo?: string) => {
    const confirmMessage = status === 'aprovado' 
      ? 'Deseja realmente aprovar esta solicitação?' 
      : 'Deseja realmente reprovar esta solicitação?'
    
    if (!confirm(confirmMessage)) return

    const success = await updateSolicitacaoStatus(id, status, motivo)
    if (success) {
      toast({
        title: 'Sucesso',
        description: `Solicitação ${status === 'aprovado' ? 'aprovada' : 'reprovada'} com sucesso!`,
      })
      await loadData()
    }
  }

  const resetForm = () => {
    setNovaSolicitacao({
      loja_id: '',
      tipo_solicitacao: 'novo',
      motivo: '',
      prioridade: 'media',
      promotor_atual_id: '',
      promotor_sugerido_id: '',
      observacoes: '',
      dias_semana_sugerido: '',
      contato_responsavel: '',
      data_necessidade: '',
    })
  }

  const filteredSolicitacoes = solicitacoes.filter(s => {
    const matchesSearch = s.motivo.toLowerCase().includes(search.toLowerCase()) ||
                          s.loja?.cod_loja?.toLowerCase().includes(search.toLowerCase()) ||
                          s.loja?.nome_loja?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = filterStatus === 'todos' || s.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const getStatusIcon = (status: string) => {
    const statusInfo = STATUS_MAP[status as keyof typeof STATUS_MAP]
    const Icon = statusInfo?.icon || AlertCircle
    return <Icon className="h-4 w-4" />
  }

  const getStatusBadge = (status: string) => {
    const statusInfo = STATUS_MAP[status as keyof typeof STATUS_MAP]
    return (
      <Badge className={statusInfo?.color || 'bg-gray-100'}>
        {getStatusIcon(status)}
        <span className="ml-1">{statusInfo?.label || status}</span>
      </Badge>
    )
  }

  const getPrioridadeBadge = (prioridade: string) => {
    const prio = PRIORIDADES.find(p => p.value === prioridade)
    return (
      <Badge variant="outline" className={prio?.color}>
        {prio?.label || prioridade}
      </Badge>
    )
  }

  const getTipoLabel = (tipo: string) => {
    const tipoInfo = TIPOS_SOLICITACAO.find(t => t.value === tipo)
    return tipoInfo?.label || tipo
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: PRIMARY_COLOR }} />
          <p className="text-muted-foreground">Carregando solicitações...</p>
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
                <UserPlus className="h-7 w-7" />
                Solicitação de Promotores
              </h1>
              <p className="text-pink-100 text-sm mt-1">
                Gerencie as solicitações de novos promotores para as lojas
              </p>
            </div>
            
            <Dialog open={openModal} onOpenChange={setOpenModal}>
              <DialogTrigger asChild>
                <Button className="bg-white text-primary hover:bg-gray-100">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Solicitação
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nova Solicitação de Promotor</DialogTitle>
                  <DialogDescription>
                    Preencha os dados para solicitar um novo promotor para a loja.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="loja">Loja *</Label>
                      <Select 
                        value={novaSolicitacao.loja_id} 
                        onValueChange={(value) => setNovaSolicitacao({ ...novaSolicitacao, loja_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a loja" />
                        </SelectTrigger>
                        <SelectContent>
                          {lojas.map(loja => (
                            <SelectItem key={loja.id} value={loja.id}>
                              {loja.cod_loja} - {loja.nome_loja}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tipo">Tipo de Solicitação *</Label>
                      <Select 
                        value={novaSolicitacao.tipo_solicitacao} 
                        onValueChange={(value: any) => setNovaSolicitacao({ ...novaSolicitacao, tipo_solicitacao: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS_SOLICITACAO.map(tipo => {
                            const Icon = tipo.icon
                            return (
                              <SelectItem key={tipo.value} value={tipo.value}>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  {tipo.label}
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="prioridade">Prioridade</Label>
                      <Select 
                        value={novaSolicitacao.prioridade} 
                        onValueChange={(value: any) => setNovaSolicitacao({ ...novaSolicitacao, prioridade: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a prioridade" />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORIDADES.map(prio => (
                            <SelectItem key={prio.value} value={prio.value}>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${prio.color.split(' ')[0]}`} />
                                {prio.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="data_necessidade">Data Necessidade *</Label>
                      <Input
                        id="data_necessidade"
                        type="date"
                        value={novaSolicitacao.data_necessidade}
                        onChange={(e) => setNovaSolicitacao({ ...novaSolicitacao, data_necessidade: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="motivo">Motivo *</Label>
                    <Textarea
                      id="motivo"
                      placeholder="Descreva o motivo da solicitação..."
                      value={novaSolicitacao.motivo}
                      onChange={(e) => setNovaSolicitacao({ ...novaSolicitacao, motivo: e.target.value })}
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="promotor_atual">Promotor Atual (opcional)</Label>
                      <Select 
                        value={novaSolicitacao.promotor_atual_id} 
                        onValueChange={(value) => setNovaSolicitacao({ ...novaSolicitacao, promotor_atual_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o promotor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nenhum</SelectItem>
                          {promotores.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.promotor_nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="promotor_sugerido">Promotor Sugerido (opcional)</Label>
                      <Select 
                        value={novaSolicitacao.promotor_sugerido_id} 
                        onValueChange={(value) => setNovaSolicitacao({ ...novaSolicitacao, promotor_sugerido_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o promotor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nenhum</SelectItem>
                          {promotores.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.promotor_nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dias_semana">Dias Sugeridos</Label>
                      <Input
                        id="dias_semana"
                        placeholder="Ex: Segunda, Quarta, Sexta"
                        value={novaSolicitacao.dias_semana_sugerido}
                        onChange={(e) => setNovaSolicitacao({ ...novaSolicitacao, dias_semana_sugerido: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contato">Contato Responsável</Label>
                      <Input
                        id="contato"
                        placeholder="(11) 99999-9999"
                        value={novaSolicitacao.contato_responsavel}
                        onChange={(e) => setNovaSolicitacao({ ...novaSolicitacao, contato_responsavel: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="observacoes">Observações Adicionais</Label>
                    <Textarea
                      id="observacoes"
                      placeholder="Informações adicionais sobre a solicitação..."
                      value={novaSolicitacao.observacoes}
                      onChange={(e) => setNovaSolicitacao({ ...novaSolicitacao, observacoes: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenModal(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateSolicitacao} disabled={saving} style={{ background: PRIMARY_COLOR }}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {saving ? 'Enviando...' : 'Enviar Solicitação'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por loja ou motivo..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="pendente">⏳ Pendente</SelectItem>
                <SelectItem value="analise">🔍 Em Análise</SelectItem>
                <SelectItem value="aprovado">✅ Aprovado</SelectItem>
                <SelectItem value="reprovado">❌ Reprovado</SelectItem>
                <SelectItem value="cancelado">🚫 Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredSolicitacoes.length} solicitação(ões)
          </div>
        </div>

        {/* Lista de Solicitações */}
        <div className="space-y-4">
          {filteredSolicitacoes.map((solicitacao) => {
            const statusInfo = STATUS_MAP[solicitacao.status as keyof typeof STATUS_MAP]
            
            return (
              <Card key={solicitacao.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    {/* Informações principais */}
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="font-medium">
                          {solicitacao.loja?.cod_loja} - {solicitacao.loja?.nome_loja}
                        </Badge>
                        {getPrioridadeBadge(solicitacao.prioridade)}
                        {getStatusBadge(solicitacao.status)}
                        <Badge variant="secondary">
                          {getTipoLabel(solicitacao.tipo_solicitacao)}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        <strong>Motivo:</strong> {solicitacao.motivo}
                      </p>

                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span>
                          📅 Necessidade: {new Date(solicitacao.data_necessidade).toLocaleDateString('pt-BR')}
                        </span>
                        <span>
                          📝 Criado: {new Date(solicitacao.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        {solicitacao.solicitante?.nome && (
                          <span>
                            👤 {solicitacao.solicitante.nome}
                          </span>
                        )}
                        {solicitacao.dias_semana_sugerido && (
                          <span>
                            📆 {solicitacao.dias_semana_sugerido}
                          </span>
                        )}
                      </div>

                      {solicitacao.observacoes && (
                        <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                          <MessageSquare className="h-3 w-3 inline mr-1" />
                          {solicitacao.observacoes}
                        </p>
                      )}

                      {solicitacao.motivo_reprovacao && (
                        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          <XCircle className="h-3 w-3 inline mr-1" />
                          Motivo da reprovação: {solicitacao.motivo_reprovacao}
                        </p>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex flex-wrap gap-2 md:flex-col">
                      {isAdmin && solicitacao.status === 'pendente' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-500 hover:bg-green-600 text-white"
                            onClick={() => handleStatusUpdate(solicitacao.id, 'aprovado')}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const motivo = prompt('Informe o motivo da reprovação:')
                              if (motivo !== null) {
                                handleStatusUpdate(solicitacao.id, 'reprovado', motivo || 'Sem motivo informado')
                              }
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reprovar
                          </Button>
                        </>
                      )}
                      {solicitacao.status === 'pendente' && !isAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusUpdate(solicitacao.id, 'cancelado')}
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {filteredSolicitacoes.length === 0 && (
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <h3 className="text-lg font-medium">Nenhuma solicitação encontrada</h3>
                <p className="text-sm">Crie uma nova solicitação clicando no botão "Nova Solicitação"</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
