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
import { getSolicitacoes, createSolicitacao, updateSolicitacaoStatus, SolicitacaoPromotor } from '@/services/solicitacoes'
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

export function SolicitacoesPromotores() {
  // 🔥 CORRIGIDO: PEGAR O USER TAMBÉM
  const { user, isAdmin } = useAuth()
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
    motivo: '',
    observacoes: '',
    dias_semana_sugerido: '',
    contato_responsavel: '',
    data_necessidade: '',
  })

  // Dados para lojas
  const [lojas, setLojas] = useState<any[]>([])

  const loadData = async () => {
    setLoading(true)
    try {
      // 🔥 CORRIGIDO: PASSAR user.id E isAdmin
      if (!user?.id) {
        console.warn('⚠️ Usuário não autenticado')
        setLoading(false)
        return
      }
      
      console.log('👤 Carregando solicitações - user:', user.id, 'isAdmin:', isAdmin)
      const data = await getSolicitacoes(user.id, isAdmin)
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
    if (user?.id) {
      loadData()
    }
  }, [user?.id])

  const handleCreateSolicitacao = async () => {
    if (!novaSolicitacao.loja_id || !novaSolicitacao.motivo || !novaSolicitacao.data_necessidade) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
      })
      return
    }

    if (!user?.id) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Usuário não autenticado',
      })
      return
    }

    setSaving(true)
    try {
      // 🔥 CORRIGIDO: PASSAR user.id E isAdmin
      const result = await createSolicitacao(
        {
          loja_id: novaSolicitacao.loja_id,
          tipo_solicitacao: 'novo',
          motivo: novaSolicitacao.motivo,
          prioridade: 'media',
          observacoes: novaSolicitacao.observacoes,
          dias_semana_sugerido: novaSolicitacao.dias_semana_sugerido,
          contato_responsavel: novaSolicitacao.contato_responsavel,
          data_necessidade: novaSolicitacao.data_necessidade,
        },
        user.id,
        isAdmin
      )
      
      if (result) {
        toast({
          title: 'Sucesso',
          description: 'Solicitação criada com sucesso!',
        })
        setOpenModal(false)
        resetForm()
        await loadData()
      } else {
        throw new Error('Falha ao criar solicitação')
      }
    } catch (error: any) {
      console.error('Erro ao criar solicitação:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Não foi possível criar a solicitação',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleStatusUpdate = async (id: string, status: 'aprovado' | 'reprovado' | 'cancelado', motivo?: string) => {
    if (!user?.id) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Usuário não autenticado',
      })
      return
    }

    const confirmMessage = status === 'aprovado' 
      ? 'Deseja realmente aprovar esta solicitação?' 
      : status === 'reprovado'
      ? 'Deseja realmente reprovar esta solicitação?'
      : 'Deseja realmente cancelar esta solicitação?'
    
    if (!confirm(confirmMessage)) return

    // 🔥 CORRIGIDO: PASSAR user.id E isAdmin
    const success = await updateSolicitacaoStatus(id, status, user.id, isAdmin, motivo)
    if (success) {
      toast({
        title: 'Sucesso',
        description: `Solicitação ${status === 'aprovado' ? 'aprovada' : status === 'reprovado' ? 'reprovada' : 'cancelada'} com sucesso!`,
      })
      await loadData()
    } else {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar o status',
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
                    <Label htmlFor="motivo">Motivo da Solicitação *</Label>
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

export default SolicitacoesPromotores
