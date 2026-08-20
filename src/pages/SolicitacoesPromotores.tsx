// src/pages/SolicitacoesPromotores.tsx
import { useEffect, useState } from 'react'
import { 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock,
  AlertCircle,
  Loader2,
  Search,
  Filter,
  UserPlus,
  Calendar,
  MessageSquare
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { 
  getSolicitacoes, 
  createSolicitacao, 
  updateSolicitacaoStatus,
  deleteSolicitacao,
  SolicitacaoPromotor,
  STATUS_LABELS,
  TIPO_LABELS
} from '@/services/solicitacoes'
import { Card, CardContent } from '@/components/ui/card'
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

// Mapeamento de status
const STATUS_MAP = {
  pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  analise: { label: 'Em Análise', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
  aprovado: { label: 'Aprovado', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  reprovado: { label: 'Reprovado', color: 'bg-red-100 text-red-700', icon: XCircle },
  cancelado: { label: 'Cancelado', color: 'bg-gray-100 text-gray-700', icon: XCircle },
}

export default function SolicitacoesPromotores() {
  const { user, isAdmin } = useAuth()
  const { toast } = useToast()
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoPromotor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [openModal, setOpenModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Dados para nova solicitação
  const [novaSolicitacao, setNovaSolicitacao] = useState({
    loja_id: '',
    motivo: '',
    observacoes: '',
    dias_semana_sugerido: '',
    contato_responsavel: '',
    data_necessidade: '',
    tipo_solicitacao: 'novo' as 'novo' | 'reposicao' | 'transferencia' | 'temporario',
    prioridade: 'media' as 'baixa' | 'media' | 'alta' | 'urgente',
  })

  // Dados para lojas
  const [lojas, setLojas] = useState<any[]>([])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getSolicitacoes()
      setSolicitacoes(data)
      await loadLojas()
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

  useEffect(() => {
    loadData()
  }, [])

  // 🔥 FUNÇÃO CORRIGIDA - Create Solicitacao
  const handleCreateSolicitacao = async () => {
    // Validações
    if (!novaSolicitacao.loja_id) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Selecione uma loja',
      })
      return
    }

    if (!novaSolicitacao.motivo || novaSolicitacao.motivo.trim().length < 3) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Descreva o motivo da solicitação (mínimo 3 caracteres)',
      })
      return
    }

    if (!novaSolicitacao.data_necessidade) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Selecione a data de necessidade',
      })
      return
    }

    setSaving(true)
    try {
      // 🔥 Verificar se usuário está autenticado
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Usuário não autenticado. Faça login novamente.',
        })
        return
      }

      console.log('📝 Criando solicitação:', {
        loja_id: novaSolicitacao.loja_id,
        tipo_solicitacao: novaSolicitacao.tipo_solicitacao,
        motivo: novaSolicitacao.motivo,
        prioridade: novaSolicitacao.prioridade,
        data_necessidade: novaSolicitacao.data_necessidade,
        solicitante_id: userData.user.id
      })

      // 🔥 Inserir diretamente no Supabase (mais confiável)
      const { data: solicitacao, error } = await supabase
        .from('solicitacoes_promotores')
        .insert({
          loja_id: novaSolicitacao.loja_id,
          solicitante_id: userData.user.id,
          tipo_solicitacao: novaSolicitacao.tipo_solicitacao || 'novo',
          motivo: novaSolicitacao.motivo.trim(),
          prioridade: novaSolicitacao.prioridade || 'media',
          observacoes: novaSolicitacao.observacoes || null,
          dias_semana_sugerido: novaSolicitacao.dias_semana_sugerido || null,
          contato_responsavel: novaSolicitacao.contato_responsavel || null,
          data_necessidade: novaSolicitacao.data_necessidade,
          status: 'pendente'
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Erro Supabase:', error)
        throw new Error(error.message)
      }

      console.log('✅ Solicitação criada:', solicitacao)

      toast({
        title: 'Sucesso!',
        description: 'Solicitação criada com sucesso!',
      })

      setOpenModal(false)
      resetForm()
      await loadData()

    } catch (error: any) {
      console.error('❌ Erro ao criar solicitação:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Não foi possível criar a solicitação',
      })
    } finally {
      setSaving(false)
    }
  }

  // 🔥 FUNÇÃO CORRIGIDA - Update Status
  const handleStatusUpdate = async (id: string, status: 'aprovado' | 'reprovado' | 'cancelado' | 'analise', motivo?: string) => {
    const confirmMessage = 
      status === 'aprovado' ? 'Deseja realmente aprovar esta solicitação?' :
      status === 'reprovado' ? 'Deseja realmente reprovar esta solicitação?' :
      status === 'cancelado' ? 'Deseja realmente cancelar esta solicitação?' :
      'Deseja realmente colocar esta solicitação em análise?'
    
    if (!confirm(confirmMessage)) return

    setSubmitting(true)
    try {
      const success = await updateSolicitacaoStatus(id, status, motivo)
      if (success) {
        toast({
          title: 'Sucesso',
          description: `Solicitação ${status === 'aprovado' ? 'aprovada' : status === 'reprovado' ? 'reprovada' : status === 'cancelado' ? 'cancelada' : 'em análise'} com sucesso!`,
        })
        await loadData()
      } else {
        throw new Error('Falha ao atualizar status')
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o status',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // 🔥 FUNÇÃO CORRIGIDA - Delete
  const handleDeleteSolicitacao = async (id: string, motivo: string) => {
    if (!confirm(`Deseja realmente excluir a solicitação "${motivo}"?`)) return

    try {
      const success = await deleteSolicitacao(id)
      if (success) {
        toast({
          title: 'Sucesso',
          description: 'Solicitação excluída com sucesso!',
        })
        await loadData()
      } else {
        throw new Error('Falha ao excluir solicitação')
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Não foi possível excluir a solicitação',
      })
    }
  }

  const resetForm = () => {
    setNovaSolicitacao({
      loja_id: '',
      motivo: '',
      observacoes: '',
      dias_semana_sugerido: '',
      contato_responsavel: '',
      data_necessidade: '',
      tipo_solicitacao: 'novo',
      prioridade: 'media',
    })
  }

  const filteredSolicitacoes = solicitacoes.filter(s => {
    const searchLower = search.toLowerCase()
    const matchesSearch = 
      s.motivo?.toLowerCase().includes(searchLower) ||
      s.loja?.cod_loja?.toLowerCase().includes(searchLower) ||
      s.loja?.nome_loja?.toLowerCase().includes(searchLower) ||
      false
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
                Solicite um novo promotor para uma loja
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
                    <Label htmlFor="data_necessidade">Data Necessidade *</Label>
                    <Input
                      id="data_necessidade"
                      type="date"
                      value={novaSolicitacao.data_necessidade}
                      onChange={(e) => setNovaSolicitacao({ ...novaSolicitacao, data_necessidade: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipo_solicitacao">Tipo de Solicitação</Label>
                    <Select 
                      value={novaSolicitacao.tipo_solicitacao} 
                      onValueChange={(value: any) => setNovaSolicitacao({ ...novaSolicitacao, tipo_solicitacao: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="novo">🆕 Novo Promotor</SelectItem>
                        <SelectItem value="reposicao">🔄 Reposição</SelectItem>
                        <SelectItem value="transferencia">📦 Transferência</SelectItem>
                        <SelectItem value="temporario">⏳ Temporário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prioridade">Prioridade</Label>
                    <Select 
                      value={novaSolicitacao.prioridade} 
                      onValueChange={(value: any) => setNovaSolicitacao({ ...novaSolicitacao, prioridade: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">🟢 Baixa</SelectItem>
                        <SelectItem value="media">🟡 Média</SelectItem>
                        <SelectItem value="alta">🟠 Alta</SelectItem>
                        <SelectItem value="urgente">🔴 Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="motivo">Motivo da Solicitação *</Label>
                    <Textarea
                      id="motivo"
                      placeholder="Descreva o motivo da solicitação (ex: crescimento da loja, necessidade de suporte, etc.)"
                      value={novaSolicitacao.motivo}
                      onChange={(e) => setNovaSolicitacao({ ...novaSolicitacao, motivo: e.target.value })}
                      className="min-h-[80px]"
                    />
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
                  <Button 
                    onClick={handleCreateSolicitacao} 
                    disabled={saving} 
                    style={{ background: PRIMARY_COLOR }}
                  >
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
          {filteredSolicitacoes.map((solicitacao) => (
            <Card key={solicitacao.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Informações principais */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="font-medium">
                        {solicitacao.loja?.cod_loja} - {solicitacao.loja?.nome_loja}
                      </Badge>
                      {getStatusBadge(solicitacao.status)}
                      {solicitacao.prioridade && (
                        <Badge variant="outline" className="text-xs">
                          {solicitacao.prioridade === 'urgente' && '🔴 '}
                          {solicitacao.prioridade === 'alta' && '🟠 '}
                          {solicitacao.prioridade === 'media' && '🟡 '}
                          {solicitacao.prioridade === 'baixa' && '🟢 '}
                          {solicitacao.prioridade}
                        </Badge>
                      )}
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
                      {solicitacao.tipo_solicitacao && (
                        <span>
                          📋 {TIPO_LABELS[solicitacao.tipo_solicitacao]?.label || solicitacao.tipo_solicitacao}
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
                    {/* Admin: Aprovar/Reprovar */}
                    {isAdmin && solicitacao.status === 'pendente' && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-500 hover:bg-green-600 text-white"
                          onClick={() => handleStatusUpdate(solicitacao.id, 'aprovado')}
                          disabled={submitting}
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
                          disabled={submitting}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={() => handleStatusUpdate(solicitacao.id, 'analise')}
                          disabled={submitting}
                        >
                          <AlertCircle className="h-4 w-4 mr-1" />
                          Análise
                        </Button>
                      </>
                    )}

                    {/* Admin: Excluir qualquer uma */}
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleDeleteSolicitacao(solicitacao.id, solicitacao.motivo)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    )}

                    {/* Usuário comum: Cancelar se pendente */}
                    {!isAdmin && solicitacao.status === 'pendente' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusUpdate(solicitacao.id, 'cancelado')}
                        disabled={submitting}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

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
