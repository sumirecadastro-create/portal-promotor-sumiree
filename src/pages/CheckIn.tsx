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
  FileText,
  AlertTriangle,
  CalendarIcon
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { format, formatDistanceToNow, isBefore, subHours } from 'date-fns'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

// ============================================
// SERVICES
// ============================================

import {
  getPromotoresCompletos,
  getLojasCompletas,
  type UserPermissions,
  type AppRole,
  type PromotorPermitido,
  type LojaPermitida
} from '@/services/permissoes'

import {
  getVisitasEmAndamento,
  getVisitasConcluidas,
  registrarCheckIn,
  registrarCheckOut,
  temCheckInAtivoNaLoja,
  getCheckInsAtivosDoPromotor,
  finalizarCheckInsAntigos,
  formatarDataHora,
  calcularDuracao,
  isVisitaAtrasada,
  type VisitaCompleta
} from '@/services/visitas'

// ============================================
// TIPOS LOCAIS
// ============================================

interface PromotorUI extends PromotorPermitido {}
interface LojaUI extends LojaPermitida {}
interface VisitaUI extends VisitaCompleta {}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function CheckIn() {
  const { toast } = useToast()
  const { user, userLojaId } = useAuth()

  const permissions: UserPermissions = useMemo(() => ({
    id: user?.id || '',
    app_role: (user?.app_role || 'promotor') as AppRole,
    loja_id: userLojaId || null
  }), [user, userLojaId])

  // Estados
  const [promotores, setPromotores] = useState<PromotorUI[]>([])
  const [lojas, setLojas] = useState<LojaUI[]>([])
  const [visitasEmAndamento, setVisitasEmAndamento] = useState<VisitaUI[]>([])
  const [visitasConcluidas, setVisitasConcluidas] = useState<VisitaUI[]>([])
  const [loading, setLoading] = useState(true)
  const [searchPromotor, setSearchPromotor] = useState('')
  const [searchLoja, setSearchLoja] = useState('')

  // Formulário
  const [selectedPromotor, setSelectedPromotor] = useState<PromotorUI | null>(null)
  const [selectedLoja, setSelectedLoja] = useState<LojaUI | null>(null)
  const [observacaoCheckIn, setObservacaoCheckIn] = useState('')
  const [observacaoCheckOut, setObservacaoCheckOut] = useState('')
  const [visitaSelecionada, setVisitaSelecionada] = useState<VisitaUI | null>(null)

  // 🔥 DATA/HORA MANUAL - CHECK-IN
  const [checkinData, setCheckinData] = useState<Date>(new Date())
  const [checkinHora, setCheckinHora] = useState<string>(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })

  // 🔥 DATA/HORA MANUAL - CHECK-OUT
  const [checkoutData, setCheckoutData] = useState<Date>(new Date())
  const [checkoutHora, setCheckoutHora] = useState<string>(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })

  // Dialog
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
  // CARREGAMENTO DE DADOS
  // ============================================

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // 🔥 Finalizar check-ins antigos automaticamente ao carregar
      const finalizados = await finalizarCheckInsAntigos()
      if (finalizados > 0) {
        console.log(`🔄 ${finalizados} check-ins antigos foram finalizados automaticamente`)
      }

      const [promotoresData, lojasData, emAndamentoResult, concluidasResult] = await Promise.all([
        getPromotoresCompletos(permissions),
        getLojasCompletas(permissions),
        getVisitasEmAndamento(permissions),
        getVisitasConcluidas(permissions, 20)
      ])

      setPromotores(promotoresData)
      setLojas(lojasData)
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
  }, [permissions, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ============================================
  // CHECK-IN / CHECK-OUT
  // ============================================

  const getDataHoraCheckin = useCallback(() => {
    const dataHora = new Date(checkinData)
    const [horas, minutos] = checkinHora.split(':').map(Number)
    dataHora.setHours(horas, minutos, 0, 0)
    return dataHora
  }, [checkinData, checkinHora])

  const getDataHoraCheckout = useCallback(() => {
    const dataHora = new Date(checkoutData)
    const [horas, minutos] = checkoutHora.split(':').map(Number)
    dataHora.setHours(horas, minutos, 0, 0)
    return dataHora
  }, [checkoutData, checkoutHora])

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
      // 🔥 Finalizar check-ins antigos automaticamente
      const finalizados = await finalizarCheckInsAntigos()
      if (finalizados > 0) {
        console.log(`🔄 ${finalizados} check-ins antigos foram finalizados automaticamente`)
      }

      // 🔥 VERIFICAR APENAS se já tem check-in na MESMA loja
      // (não bloqueia outras lojas)
      const temAtivoNaLoja = await temCheckInAtivoNaLoja(
        selectedPromotor.id,
        selectedLoja.id
      )

      if (temAtivoNaLoja) {
        toast({
          variant: 'destructive',
          title: 'Check-in já realizado',
          description: `Este promotor já está em atendimento nesta loja.`,
        })
        setLoadingAction(false)
        return
      }

      const dataHoraCheckin = getDataHoraCheckin()

      await registrarCheckIn({
        promotor_id: selectedPromotor.id,
        loja_id: selectedLoja.id,
        observacao_check_in: observacaoCheckIn || undefined,
        check_in_manual: dataHoraCheckin.toISOString()
      })

      // 🔥 VERIFICAR se o promotor tem outros check-ins ativos (apenas para aviso)
      const outrosCheckIns = await getCheckInsAtivosDoPromotor(selectedPromotor.id)
      
      let mensagemAdicional = ''
      if (outrosCheckIns.length > 0) {
        const lojasNomes = outrosCheckIns
          .map(v => lojasMap.get(v.loja_id)?.cod_loja || 'Desconhecida')
          .join(', ')
        mensagemAdicional = ` ⚠️ Atenção: Este promotor também está em atendimento nas lojas: ${lojasNomes}`
      }

      toast({
        title: '✅ Check-in realizado!',
        description: `${selectedPromotor.promotor_nome} iniciou atendimento em ${selectedLoja.nome_loja} às ${format(dataHoraCheckin, 'HH:mm')}${mensagemAdicional}`,
      })

      // Resetar formulário
      setDialogAberto(false)
      setObservacaoCheckIn('')
      setSelectedPromotor(null)
      setSelectedLoja(null)

      const now = new Date()
      setCheckinData(now)
      setCheckinHora(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)

      await loadData()

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
      const dataHoraCheckout = getDataHoraCheckout()

      // Validar se o checkout não é antes do check-in
      const checkInDate = new Date(visitaSelecionada.check_in)
      if (isBefore(dataHoraCheckout, checkInDate)) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'O horário de saída não pode ser anterior ao horário de entrada',
        })
        setLoadingAction(false)
        return
      }

      await registrarCheckOut(visitaSelecionada.id, {
        observacao_check_out: observacaoCheckOut || undefined,
        check_out_manual: dataHoraCheckout.toISOString()
      })

      toast({
        title: '✅ Check-out realizado!',
        description: `Atendimento finalizado às ${format(dataHoraCheckout, 'HH:mm')}`,
      })

      setDialogAberto(false)
      setObservacaoCheckOut('')
      setVisitaSelecionada(null)

      const now = new Date()
      setCheckoutData(now)
      setCheckoutHora(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)

      await loadData()

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
  // UTILITÁRIOS
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
  // RENDER
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
              // Resetar para horário atual
              const now = new Date()
              setCheckinData(now)
              setCheckinHora(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
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
              const atrasada = isVisitaAtrasada(visita.check_in)
              return (
                <Card 
                  key={visita.id} 
                  className={`border ${atrasada ? 'border-red-200 dark:border-red-800' : 'border-green-200 dark:border-green-800'}`}
                >
                  <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className={`${atrasada ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
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
                          <Badge variant="outline" className={`text-xs ${atrasada ? 'text-red-600 border-red-600' : 'text-green-600 border-green-600'}`}>
                            {atrasada ? (
                              <span className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Atrasado
                              </span>
                            ) : (
                              formatarDistancia(visita.check_in)
                            )}
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
                        // 🔥 Pré-preencher checkout com data/hora atual
                        const now = new Date()
                        setCheckoutData(now)
                        setCheckoutHora(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
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
              const duracao = calcularDuracao(visita.check_in, visita.check_out)
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
                              <Badge variant="outline" className="text-xs">
                                ⏱️ {duracao}
                              </Badge>
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

      {/* ====== DIALOG CHECK-IN ====== */}
      <Dialog open={dialogAberto && dialogTipo === 'check-in'} onOpenChange={(open) => {
        if (!open) setDialogAberto(false)
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Check-in</DialogTitle>
            <DialogDescription>
              Selecione o promotor, a loja e a data/hora para iniciar o atendimento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Seleção de Promotor */}
            <div className="space-y-2">
              <Label>Promotor *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar promotor por nome ou marca..."
                  className="pl-9"
                  value={searchPromotor}
                  onChange={(e) => setSearchPromotor(e.target.value)}
                />
              </div>
              <div className="max-h-40 overflow-y-auto border rounded-md">
                {promotoresFiltrados.length > 0 ? (
                  promotoresFiltrados.map((p) => (
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
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="p-2 text-center text-muted-foreground text-sm">
                    Nenhum promotor encontrado
                  </p>
                )}
              </div>
            </div>

            {/* Seleção de Loja */}
            <div className="space-y-2">
              <Label>Loja *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar loja por nome ou código..."
                  className="pl-9"
                  value={searchLoja}
                  onChange={(e) => setSearchLoja(e.target.value)}
                />
              </div>
              <div className="max-h-40 overflow-y-auto border rounded-md">
                {lojasFiltradas.length > 0 ? (
                  lojasFiltradas.map((l) => (
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
                  ))
                ) : (
                  <p className="p-2 text-center text-muted-foreground text-sm">
                    Nenhuma loja encontrada
                  </p>
                )}
              </div>
            </div>

            {/* 🔥 DATA E HORA MANUAL - CHECK-IN */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">📅 Data e Hora do Check-in *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type="datetime-local"
                    value={(() => {
                      const d = new Date(checkinData)
                      d.setHours(parseInt(checkinHora.split(':')[0]), parseInt(checkinHora.split(':')[1]), 0, 0)
                      d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
                      return d.toISOString().slice(0, 16)
                    })()}
                    onChange={(e) => {
                      if (e.target.value) {
                        const date = new Date(e.target.value)
                        setCheckinData(date)
                        setCheckinHora(
                          `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
                        )
                      }
                    }}
                    className="w-full"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const now = new Date()
                    setCheckinData(now)
                    setCheckinHora(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
                  }}
                  className="shrink-0"
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Agora
                </Button>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <span>💡</span>
                <span>Clique no campo para selecionar ou use o botão "Agora" para preencher com a data/hora atual.</span>
              </p>
            </div>

            {/* Observação */}
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

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogAberto(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCheckIn}
                disabled={!selectedPromotor || !selectedLoja || loadingAction}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {loadingAction ? 'Processando...' : 'Confirmar Check-in'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ====== DIALOG CHECK-OUT ====== */}
      <Dialog open={dialogAberto && dialogTipo === 'check-out'} onOpenChange={(open) => {
        if (!open) setDialogAberto(false)
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Finalizar Check-out</DialogTitle>
            <DialogDescription>
              Selecione a data/hora de saída e confirme o encerramento do atendimento
            </DialogDescription>
          </DialogHeader>

          {visitaSelecionada && (
            <div className="space-y-4 py-4">
              {/* Resumo da visita */}
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
                {visitaSelecionada.observacao_check_in && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Obs. Check-in:</span>
                    <span className="font-medium text-sm">{visitaSelecionada.observacao_check_in}</span>
                  </div>
                )}
              </div>

              {/* 🔥 DATA E HORA MANUAL - CHECK-OUT */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">📅 Data e Hora do Check-out *</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="datetime-local"
                      value={(() => {
                        const d = new Date(checkoutData)
                        d.setHours(parseInt(checkoutHora.split(':')[0]), parseInt(checkoutHora.split(':')[1]), 0, 0)
                        d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
                        return d.toISOString().slice(0, 16)
                      })()}
                      onChange={(e) => {
                        if (e.target.value) {
                          const date = new Date(e.target.value)
                          setCheckoutData(date)
                          setCheckoutHora(
                            `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
                          )
                        }
                      }}
                      className="w-full"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date()
                      setCheckoutData(now)
                      setCheckoutHora(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
                    }}
                    className="shrink-0"
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Agora
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>💡</span>
                  <span>Clique no campo para selecionar ou use o botão "Agora" para preencher com a data/hora atual.</span>
                </p>
              </div>

              {/* Observação de saída */}
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

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogAberto(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCheckOut}
                  disabled={loadingAction}
                >
                  {loadingAction ? 'Processando...' : 'Confirmar Check-out'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
