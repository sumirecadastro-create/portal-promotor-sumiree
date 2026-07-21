import { useEffect, useState, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Store,
  User,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  FileText
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  getVisitasEmAndamento,
  getVisitasConcluidas,
  criarCheckIn,
  finalizarCheckIn,
  verificarCheckInAtivo,
  type Visita
} from '@/services/visitas'

// ============================================
// TIPOS
// ============================================

interface Promotor {
  id: string
  promotor_nome: string
  telefone: string | null
  status: string
}

interface Loja {
  id: string
  cod_loja: string
  nome_loja: string
  cidade: string
  endereco: string
  telefone: string | null
}

interface AuthUser {
  id: string
  email: string
  role: string
  nome: string
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function CheckIn() {
  const { toast } = useToast()
  const { user } = useAuth() as { user: AuthUser | null }

  // Estados
  const [promotores, setPromotores] = useState<Promotor[]>([])
  const [lojas, setLojas] = useState<Loja[]>([])
  const [visitasEmAndamento, setVisitasEmAndamento] = useState<Visita[]>([])
  const [visitasConcluidas, setVisitasConcluidas] = useState<Visita[]>([])
  const [loading, setLoading] = useState(true)
  const [searchPromotor, setSearchPromotor] = useState('')
  const [searchLoja, setSearchLoja] = useState('')

  // Estado do formulário
  const [selectedPromotor, setSelectedPromotor] = useState<Promotor | null>(null)
  const [selectedLoja, setSelectedLoja] = useState<Loja | null>(null)
  const [observacaoCheckIn, setObservacaoCheckIn] = useState('')
  const [observacaoCheckOut, setObservacaoCheckOut] = useState('')
  const [visitaSelecionada, setVisitaSelecionada] = useState<Visita | null>(null)

  // Dialogs
  const [dialogAberto, setDialogAberto] = useState(false)
  const [dialogTipo, setDialogTipo] = useState<'check-in' | 'check-out'>('check-in')
  const [loadingAction, setLoadingAction] = useState(false)

  // ============================================
  // MEMOIZATION
  // ============================================

  const promotoresMap = useMemo(
    () => new Map(promotores.map(p => [p.id, p])),
    [promotores]
  )

  const lojasMap = useMemo(
    () => new Map(lojas.map(l => [l.id, l])),
    [lojas]
  )

  const promotoresFiltrados = useMemo(() => {
    if (!searchPromotor.trim()) return promotores
    return promotores.filter(p =>
      p.promotor_nome.toLowerCase().includes(searchPromotor.toLowerCase())
    )
  }, [promotores, searchPromotor])

  const lojasFiltradas = useMemo(() => {
    if (!searchLoja.trim()) return lojas
    return lojas.filter(l =>
      l.nome_loja.toLowerCase().includes(searchLoja.toLowerCase()) ||
      l.cod_loja.toLowerCase().includes(searchLoja.toLowerCase())
    )
  }, [lojas, searchLoja])

  // ============================================
  // FUNÇÕES DE CARREGAMENTO
  // ============================================

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [promotoresResult, lojasResult, emAndamentoResult, concluidasResult] = await Promise.all([
        // 1. Buscar promotores ativos
        supabase
          .from('promotores')
          .select('id, promotor_nome, telefone, status')
          .eq('status', 'ativo')
          .order('promotor_nome'),

        // 2. Buscar lojas
        supabase
          .from('lojas')
          .select('id, cod_loja, nome_loja, cidade, endereco, telefone')
          .order('nome_loja'),

        // 3. Buscar visitas em andamento
        getVisitasEmAndamento(),

        // 4. Buscar últimas 20 visitas concluídas
        getVisitasConcluidas(20)
      ])

      if (promotoresResult.error) throw promotoresResult.error
      if (lojasResult.error) throw lojasResult.error

      setPromotores(promotoresResult.data || [])
      setLojas(lojasResult.data || [])
      setVisitasEmAndamento(emAndamentoResult)
      setVisitasConcluidas(concluidasResult)

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados',
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const recarregarVisitas = useCallback(async () => {
    try {
      const [emAndamentoResult, concluidasResult] = await Promise.all([
        getVisitasEmAndamento(),
        getVisitasConcluidas(20)
      ])
      setVisitasEmAndamento(emAndamentoResult)
      setVisitasConcluidas(concluidasResult)
    } catch (error: any) {
      console.error('Erro ao recarregar visitas:', error)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ============================================
  // FUNÇÕES DE CHECK-IN / CHECK-OUT
  // ============================================

  const handleCheckIn = async () => {
    if (!selectedPromotor || !selectedLoja) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Selecione um promotor e uma loja',
      })
      return
    }

    setLoadingAction(true)
    try {
      // Verificar se já há check-in ativo
      const temAtivo = await verificarCheckInAtivo(selectedPromotor.id)

      if (temAtivo) {
        toast({
          variant: 'destructive',
          title: 'Check-in já realizado',
          description: 'Este promotor já está em atendimento em outra loja',
        })
        setLoadingAction(false)
        return
      }

      // Criar check-in (o banco registra check_in com now())
      const novaVisita = await criarCheckIn({
        promotor_id: selectedPromotor.id,
        loja_id: selectedLoja.id,
        observacao_check_in: observacaoCheckIn || undefined
      })

      toast({
        title: '✅ Check-in realizado!',
        description: `${selectedPromotor.promotor_nome} iniciou atendimento em ${selectedLoja.nome_loja}`,
      })

      // Resetar formulário
      setDialogAberto(false)
      setObservacaoCheckIn('')
      setSelectedPromotor(null)
      setSelectedLoja(null)

      // Recarregar
      await recarregarVisitas()

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao fazer check-in',
        description: error.message,
      })
    } finally {
      setLoadingAction(false)
    }
  }

  const handleCheckOut = async () => {
    if (!visitaSelecionada) return

    setLoadingAction(true)
    try {
      // ⚠️ NÃO ENVIAMOS check_out - o trigger faz isso automaticamente!
      await finalizarCheckIn(visitaSelecionada.id, {
        observacao_check_out: observacaoCheckOut || undefined
      })

      toast({
        title: '✅ Check-out realizado!',
        description: `Atendimento finalizado`,
      })

      setDialogAberto(false)
      setObservacaoCheckOut('')
      setVisitaSelecionada(null)

      // Recarregar
      await recarregarVisitas()

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao fazer check-out',
        description: error.message,
      })
    } finally {
      setLoadingAction(false)
    }
  }

  // ============================================
  // FUNÇÕES AUXILIARES
  // ============================================

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return '??'
    return name.substring(0, 2).toUpperCase()
  }

  const formatarData = (data: string) => {
    if (!data) return '—'
    return format(new Date(data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  }

  const formatarDistancia = (data: string) => {
    if (!data) return '—'
    return formatDistanceToNow(new Date(data), { addSuffix: true, locale: ptBR })
  }

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Check-in / Check-out</h1>
          <p className="text-muted-foreground">
            Gerencie os atendimentos dos promotores nas lojas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            onClick={() => {
              setDialogTipo('check-in')
              setDialogAberto(true)
            }}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Novo Check-in
          </Button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Em andamento</p>
              <p className="text-2xl font-bold">{visitasEmAndamento.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Concluídos</p>
              <p className="text-2xl font-bold">{visitasConcluidas.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
              <User className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Promotores</p>
              <p className="text-2xl font-bold">{promotores.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
              <Store className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lojas</p>
              <p className="text-2xl font-bold">{lojas.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Check-ins em Andamento */}
      {visitasEmAndamento.length > 0 && (
        <div>
          <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5 text-green-600" />
            Check-ins em Andamento
          </h2>
          <div className="grid gap-3">
            {visitasEmAndamento.map((visita) => {
              const promotor = promotoresMap.get(visita.promotor_id)
              const loja = lojasMap.get(visita.loja_id)
              return (
                <Card key={visita.id} className="border-green-200 dark:border-green-800">
                  <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-green-100 text-green-700">
                          {getInitials(promotor?.promotor_nome || 'Desconhecido')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{promotor?.promotor_nome || 'Desconhecido'}</p>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <Store className="h-3 w-3" />
                          <span>{loja?.nome_loja || 'Loja não encontrada'}</span>
                          <span className="text-xs">({loja?.cod_loja})</span>
                          <span className="text-xs">•</span>
                          <Clock className="h-3 w-3" />
                          <span>Desde {formatarData(visita.check_in)}</span>
                          <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                            {formatarDistancia(visita.check_in)}
                          </Badge>
                        </div>
                        {visita.observacao_check_in && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <FileText className="h-3 w-3 inline mr-1" />
                            {visita.observacao_check_in}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setVisitaSelecionada(visita)
                        setDialogTipo('check-out')
                        setObservacaoCheckOut('')
                        setDialogAberto(true)
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Finalizar
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Últimos Atendimentos */}
      <div>
        <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          Últimos Atendimentos
        </h2>
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : visitasConcluidas.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p>Nenhum atendimento concluído</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {visitasConcluidas.map((visita) => {
              const promotor = promotoresMap.get(visita.promotor_id)
              const loja = lojasMap.get(visita.loja_id)
              return (
                <Card key={visita.id}>
                  <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-gray-100">
                          {getInitials(promotor?.promotor_nome || 'Desconhecido')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{promotor?.promotor_nome || 'Desconhecido'}</p>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <Store className="h-3 w-3" />
                          <span>{loja?.nome_loja || 'Loja não encontrada'}</span>
                          <span className="text-xs">({loja?.cod_loja})</span>
                          <span className="text-xs">•</span>
                          <Clock className="h-3 w-3" />
                          <span>Entrada: {formatarData(visita.check_in)}</span>
                          {visita.check_out && (
                            <>
                              <span className="text-xs">•</span>
                              <span>Saída: {formatarData(visita.check_out)}</span>
                            </>
                          )}
                        </div>
                        {(visita.observacao_check_in || visita.observacao_check_out) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <FileText className="h-3 w-3 inline mr-1" />
                            {visita.observacao_check_in}
                            {visita.observacao_check_in && visita.observacao_check_out && ' | '}
                            {visita.observacao_check_out}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-blue-600 border-blue-600">
                      Concluído
                    </Badge>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* ====== DIALOG DE CHECK-IN / CHECK-OUT ====== */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {dialogTipo === 'check-in' && 'Novo Check-in'}
              {dialogTipo === 'check-out' && 'Finalizar Check-out'}
            </DialogTitle>
            <DialogDescription>
              {dialogTipo === 'check-in' && 'Selecione o promotor e a loja para iniciar o atendimento'}
              {dialogTipo === 'check-out' && 'Confirme o encerramento do atendimento'}
            </DialogDescription>
          </DialogHeader>

          {dialogTipo === 'check-in' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Promotor *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar promotor..."
                    className="pl-9"
                    value={searchPromotor}
                    onChange={(e) => setSearchPromotor(e.target.value)}
                  />
                </div>
                <div className="max-h-40 overflow-y-auto border rounded-md">
                  {promotoresFiltrados.map((p) => (
                    <div
                      key={p.id}
                      className={`p-2 cursor-pointer hover:bg-muted flex items-center gap-2 ${
                        selectedPromotor?.id === p.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => setSelectedPromotor(p)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{getInitials(p.promotor_nome)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{p.promotor_nome}</p>
                        {p.telefone && (
                          <p className="text-xs text-muted-foreground">{p.telefone}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {promotoresFiltrados.length === 0 && (
                    <p className="p-2 text-center text-muted-foreground text-sm">
                      Nenhum promotor encontrado
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Loja *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar loja..."
                    className="pl-9"
                    value={searchLoja}
                    onChange={(e) => setSearchLoja(e.target.value)}
                  />
                </div>
                <div className="max-h-40 overflow-y-auto border rounded-md">
                  {lojasFiltradas.map((l) => (
                    <div
                      key={l.id}
                      className={`p-2 cursor-pointer hover:bg-muted flex items-center gap-2 ${
                        selectedLoja?.id === l.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => setSelectedLoja(l)}
                    >
                      <Store className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{l.nome_loja}</p>
                        <p className="text-xs text-muted-foreground">{l.cod_loja} - {l.cidade}</p>
                      </div>
                    </div>
                  ))}
                  {lojasFiltradas.length === 0 && (
                    <p className="p-2 text-center text-muted-foreground text-sm">
                      Nenhuma loja encontrada
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="obs-checkin">Observação do Check-in</Label>
                <Textarea
                  id="obs-checkin"
                  placeholder="Adicione uma observação para este check-in..."
                  value={observacaoCheckIn}
                  onChange={(e) => setObservacaoCheckIn(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          {dialogTipo === 'check-out' && visitaSelecionada && (
            <div className="space-y-4 py-4">
              <div className="bg-muted p-4 rounded-md space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Promotor:</span>
                  <span className="font-medium">
                    {promotoresMap.get(visitaSelecionada.promotor_id)?.promotor_nome || 'Desconhecido'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Loja:</span>
                  <span className="font-medium">
                    {lojasMap.get(visitaSelecionada.loja_id)?.nome_loja || 'Desconhecida'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Check-in:</span>
                  <span className="font-medium">{formatarData(visitaSelecionada.check_in)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duração:</span>
                  <span className="font-medium">{formatarDistancia(visitaSelecionada.check_in)}</span>
                </div>
                {visitaSelecionada.observacao_check_in && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Obs. Check-in:</span>
                    <span className="font-medium text-sm">{visitaSelecionada.observacao_check_in}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="obs-checkout">Observação do Check-out</Label>
                <Textarea
                  id="obs-checkout"
                  placeholder="Adicione uma observação para o encerramento..."
                  value={observacaoCheckOut}
                  onChange={(e) => setObservacaoCheckOut(e.target.value)}
                  rows={2}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                ⚠️ O horário de saída será registrado automaticamente pelo sistema.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            {dialogTipo === 'check-in' && (
              <Button onClick={handleCheckIn} disabled={!selectedPromotor || !selectedLoja || loadingAction}>
                {loadingAction ? 'Processando...' : 'Confirmar Check-in'}
              </Button>
            )}
            {dialogTipo === 'check-out' && visitaSelecionada && (
              <Button
                variant="destructive"
                onClick={handleCheckOut}
                disabled={loadingAction}
              >
                {loadingAction ? 'Processando...' : 'Confirmar Check-out'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
