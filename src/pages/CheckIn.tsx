import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { getActiveVisit, createVisit, updateVisit, Visita } from '@/services/visitas'
import { getLojaVinculada } from '@/services/vinculacoes'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { MapPin, CheckCircle2, AlertCircle, Store, User, Clock, Calendar } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

interface Loja {
  id: string
  cod_loja: string
  nome_loja: string
  endereco: string
}

interface Promotor {
  id: string
  promotor_nome: string
  email: string
  telefone: string
  marca_produto: string
  fabricante_produto: string
}

export default function CheckIn() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [lojaVinculada, setLojaVinculada] = useState<Loja | null>(null)
  const [promotor, setPromotor] = useState<Promotor | null>(null)
  const [observacoes, setObservacoes] = useState('')
  const [activeVisit, setActiveVisit] = useState<Visita | null>(null)
  const [promoterId, setPromoterId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [semVinculacao, setSemVinculacao] = useState(false)
  const [visitDuration, setVisitDuration] = useState<string>('')

  useEffect(() => {
    const initialize = async () => {
      try {
        // Buscar o promotor vinculado ao usuário atual
        let myPromoterId = null
        let myPromoterData = null

        if (user?.id) {
          const { data, error } = await supabase
            .from('promotores')
            .select('*')
            .eq('user_id', user.id)
            .single()
          
          if (!error && data) {
            myPromoterId = data.id
            myPromoterData = data
            setPromotor({
              id: data.id,
              promotor_nome: data.promotor_nome,
              email: data.email || '',
              telefone: data.contato_responsavel || '',
              marca_produto: data.marca_produto || '',
              fabricante_produto: data.fabricante_produto || ''
            })
          }
        }

        // Fallback: pegar o primeiro promotor se não encontrar
        if (!myPromoterId) {
          const { data, error } = await supabase
            .from('promotores')
            .select('*')
            .limit(1)
          
          if (!error && data && data.length > 0) {
            myPromoterId = data[0].id
            myPromoterData = data[0]
            setPromotor({
              id: data[0].id,
              promotor_nome: data[0].promotor_nome,
              email: data[0].email || '',
              telefone: data[0].contato_responsavel || '',
              marca_produto: data[0].marca_produto || '',
              fabricante_produto: data[0].fabricante_produto || ''
            })
          }
        }

        setPromoterId(myPromoterId)

        if (myPromoterId) {
          // Buscar loja vinculada ao promotor
          const lojaIdVinculada = await getLojaVinculada(myPromoterId)
          
          if (lojaIdVinculada) {
            const { data: lojaData } = await supabase
              .from('lojas')
              .select('*')
              .eq('id', lojaIdVinculada)
              .single()
            
            if (lojaData) {
              setLojaVinculada(lojaData)
            }
          } else {
            setSemVinculacao(true)
          }

          // Buscar visita ativa
          const visit = await getActiveVisit(myPromoterId)
          if (visit) {
            setActiveVisit(visit)
            setObservacoes(visit.observacoes || '')
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
        toast({ 
          variant: 'destructive', 
          title: 'Erro ao carregar dados',
          description: 'Não foi possível carregar as informações necessárias.'
        })
      } finally {
        setLoading(false)
      }
    }
    
    initialize()
  }, [user, toast])

  // Calcular duração da visita a cada minuto
  useEffect(() => {
    if (!activeVisit) return

    const updateDuration = () => {
      const start = new Date(activeVisit.check_in)
      const now = new Date()
      const diffMs = now.getTime() - start.getTime()
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
      const diffMins = Math.floor((diffMs % (3600000)) / 60000)
      
      if (diffHrs > 0) {
        setVisitDuration(`${diffHrs}h ${diffMins}min`)
      } else {
        setVisitDuration(`${diffMins} minutos`)
      }
    }

    updateDuration()
    const interval = setInterval(updateDuration, 60000)
    return () => clearInterval(interval)
  }, [activeVisit])

  const handleCheckIn = async () => {
    if (!promoterId) {
      toast({ 
        title: 'Atenção', 
        description: 'Nenhum promotor identificado.', 
        variant: 'destructive' 
      })
      return
    }

    if (!lojaVinculada) {
      toast({ 
        title: 'Atenção', 
        description: 'Você não tem uma loja vinculada. Procure o gerente.', 
        variant: 'destructive' 
      })
      return
    }

    setActionLoading(true)
    try {
      const now = new Date().toISOString()
      const visit = await createVisit({
        promotor_id: promoterId,
        loja_id: lojaVinculada.id,
        check_in: now,
      })
      setActiveVisit(visit)
      toast({
        title: 'Check-in realizado!',
        description: `Você iniciou seu expediente na ${lojaVinculada.nome_loja}`,
        className: 'bg-emerald-500 text-white',
      })
    } catch (error: any) {
      console.error('Erro no check-in:', error)
      toast({ 
        variant: 'destructive', 
        title: 'Erro ao fazer check-in',
        description: error.message || 'Tente novamente mais tarde.'
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleCheckOut = async () => {
    if (!activeVisit) return

    setActionLoading(true)
    try {
      const now = new Date().toISOString()
      await updateVisit(activeVisit.id, {
        check_out: now,
        observacoes,
      })
      setActiveVisit(null)
      setObservacoes('')
      toast({ 
        title: 'Check-out realizado!', 
        description: 'Seu expediente foi finalizado com sucesso.',
        className: 'bg-blue-500 text-white'
      })
    } catch (error: any) {
      console.error('Erro no check-out:', error)
      toast({ 
        variant: 'destructive', 
        title: 'Erro ao fazer check-out',
        description: error.message || 'Tente novamente mais tarde.'
      })
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Carregando suas informações...</p>
      </div>
    )
  }

  const isVisitActive = !!activeVisit
  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-2">
          <Calendar className="h-3 w-3" />
          <span>{hoje}</span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight">Operação em Loja</h2>
        <p className="text-muted-foreground">
          Registre sua presença e atuação nos pontos de venda.
        </p>
      </div>

      {/* Alertas */}
      {semVinculacao && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Você não está vinculado a nenhuma loja. Entre em contato com o gerente para fazer a vinculação.
          </AlertDescription>
        </Alert>
      )}

      {!promoterId && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nenhum registro de promotor vinculado a esta conta.
          </AlertDescription>
        </Alert>
      )}

      {/* Informações do Promotor */}
      {promotor && !semVinculacao && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Bem-vindo,</p>
                <p className="font-medium">{promotor.promotor_nome}</p>
              </div>
              {(promotor.marca_produto || promotor.fabricante_produto) && (
                <Badge variant="outline" className="text-xs">
                  {promotor.marca_produto || promotor.fabricante_produto}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card principal de Check-in */}
      <Card
        className={`border-2 transition-all duration-500 ${
          isVisitActive 
            ? 'border-emerald-500 shadow-lg shadow-emerald-500/10' 
            : 'border-border'
        }`}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className={isVisitActive ? 'text-emerald-500' : 'text-muted-foreground'} />
            Local da Visita
          </CardTitle>
          <CardDescription>
            {isVisitActive
              ? 'Você está atualmente em operação nesta loja.'
              : semVinculacao
              ? 'Você não tem uma loja vinculada. Procure o gerente.'
              : 'Sua loja designada para hoje'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Loja vinculada */}
          {!semVinculacao && lojaVinculada && (
            <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-primary uppercase tracking-wider">
                      Loja Designada
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{lojaVinculada.nome_loja}</h3>
                    <p className="text-sm text-muted-foreground">Código: {lojaVinculada.cod_loja}</p>
                    {lojaVinculada.endereco && (
                      <p className="text-xs text-muted-foreground mt-1">{lojaVinculada.endereco}</p>
                    )}
                  </div>
                </div>
                {!isVisitActive && (
                  <Badge className="bg-green-500 text-white">
                    Disponível
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Status do Check-in */}
          {isVisitActive && (
            <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <div>
                  <p className="text-sm font-medium text-emerald-700">Check-in ativo</p>
                  <p className="text-xs text-emerald-600">
                    Iniciado às {new Date(activeVisit.check_in).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-emerald-700">
                <Clock className="h-3 w-3" />
                <span className="text-sm font-medium">{visitDuration}</span>
              </div>
            </div>
          )}

          {/* Botão de ação principal */}
          {!isVisitActive ? (
            <Button
              className="w-full h-14 text-lg font-semibold mt-4 transition-all transform active:scale-[0.98]"
              onClick={handleCheckIn}
              disabled={!lojaVinculada || actionLoading || !promoterId || semVinculacao}
              size="lg"
            >
              {actionLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Processando...</span>
                </div>
              ) : (
                'Iniciar Visita (Check-in)'
              )}
            </Button>
          ) : (
            <Button
              variant="destructive"
              className="w-full h-14 text-lg font-semibold mt-4 transition-all transform active:scale-[0.98]"
              onClick={handleCheckOut}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Processando...</span>
                </div>
              ) : (
                'Finalizar Visita (Check-out)'
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Card de observações (aparece apenas durante check-in ativo) */}
      {isVisitActive && (
        <Card className="animate-in slide-in-from-bottom-4 duration-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="text-primary" />
              Atuação na Loja
            </CardTitle>
            <CardDescription>
              Registre informações importantes sobre sua visita.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Observações da Visita</label>
              <Textarea
                placeholder="Ex: Faltou estoque de produto X, gerente solicitou display novo, cliente interessado em produto Y..."
                className="resize-none min-h-[120px]"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                disabled={actionLoading}
              />
              <p className="text-xs text-muted-foreground">
                Estas observações serão registradas no relatório da visita.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
