import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { getLojas } from '@/services/lojas'
import { getActiveVisit, createVisit, updateVisit, Visita } from '@/services/visitas'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { MapPin, CheckCircle2 } from 'lucide-react'

interface Loja {
  id: string
  cod_loja: string
  nome_loja: string
}

export default function CheckIn() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [lojas, setLojas] = useState<Loja[]>([])
  const [activeStoreId, setActiveStoreId] = useState<string>('')
  const [observacoes, setObservacoes] = useState('')
  const [activeVisit, setActiveVisit] = useState<Visita | null>(null)
  const [promoterId, setPromoterId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const initialize = async () => {
      try {
        const lojasData = await getLojas()
        setLojas(lojasData)

        // Buscar o promotor vinculado ao usuário atual
        let myPromoterId = null
        if (user?.id) {
          const { data, error } = await supabase
            .from('promotores')
            .select('id')
            .eq('user_id', user.id)
            .single()
          
          if (!error && data) {
            myPromoterId = data.id
          }
        }

        // Fallback: pegar o primeiro promotor se não encontrar
        if (!myPromoterId) {
          const { data, error } = await supabase
            .from('promotores')
            .select('id')
            .limit(1)
          
          if (!error && data && data.length > 0) {
            myPromoterId = data[0].id
          }
        }

        setPromoterId(myPromoterId)

        if (myPromoterId) {
          const visit = await getActiveVisit(myPromoterId)
          if (visit) {
            setActiveVisit(visit)
            setActiveStoreId(visit.loja_id)
            setObservacoes(visit.observacoes || '')
          }
        }
      } catch (error) {
        toast({ variant: 'destructive', title: 'Erro ao carregar dados' })
      } finally {
        setLoading(false)
      }
    }
    initialize()
  }, [user, toast])

  const handleCheckIn = async () => {
    if (!activeStoreId || !promoterId) {
      toast({ title: 'Atenção', description: 'Selecione uma loja.', variant: 'destructive' })
      return
    }

    setActionLoading(true)
    try {
      const now = new Date().toISOString()
      const visit = await createVisit({
        promotor_id: promoterId,
        loja_id: activeStoreId,
        check_in: now,
      })
      setActiveVisit(visit)
      toast({
        title: 'Check-in realizado com sucesso!',
        className: 'bg-emerald-500 text-white',
      })
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao fazer check-in' })
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
      setActiveStoreId('')
      setObservacoes('')
      toast({ title: 'Check-out realizado com sucesso!' })
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao fazer check-out' })
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const isVisitActive = !!activeVisit

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Operação em Loja</h2>
        <p className="text-muted-foreground">
          Registre sua presença e atuação nos pontos de venda.
        </p>
      </div>

      {!promoterId && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-4 text-destructive font-medium text-center">
            Nenhum registro de promotor vinculado a esta conta.
          </CardContent>
        </Card>
      )}

      <Card
        className={`border-2 transition-colors duration-500 ${isVisitActive ? 'border-primary shadow-md' : ''}`}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className={isVisitActive ? 'text-primary' : 'text-muted-foreground'} />
            Local da Visita
          </CardTitle>
          <CardDescription>
            {isVisitActive
              ? 'Você está atualmente em operação nesta loja.'
              : 'Selecione a loja em que você se encontra.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            value={activeStoreId}
            onValueChange={setActiveStoreId}
            disabled={isVisitActive || !promoterId}
          >
            <SelectTrigger className="w-full h-12 text-lg">
              <SelectValue placeholder="Buscar loja..." />
            </SelectTrigger>
            <SelectContent>
              {lojas.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nome_loja} - {s.cod_loja}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!isVisitActive ? (
            <Button
              className="w-full h-14 text-lg font-semibold mt-4 transition-transform active:scale-[0.98]"
              onClick={handleCheckIn}
              disabled={!activeStoreId || actionLoading || !promoterId}
            >
              {actionLoading ? 'Processando...' : 'Iniciar Visita (Check-in)'}
            </Button>
          ) : (
            <div className="flex items-center justify-center p-4 bg-muted rounded-lg gap-3 animate-fade-in">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-primary"></span>
              </span>
              <span className="font-medium text-lg">
                Check-in ativo desde{' '}
                {new Date(activeVisit.check_in).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {isVisitActive && (
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="text-primary" />
              Atuação na Loja
            </CardTitle>
            <CardDescription>Resumo e observações da visita.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Observações da Visita (Opcional)</label>
              <Textarea
                placeholder="Faltou estoque de produto X, gerente solicitou display novo..."
                className="resize-none"
                rows={4}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                disabled={actionLoading}
              />
            </div>

            <Button
              variant="default"
              className="w-full h-14 text-lg font-semibold bg-zinc-900 hover:bg-zinc-800 transition-transform active:scale-[0.98]"
              onClick={handleCheckOut}
              disabled={actionLoading}
            >
              {actionLoading ? 'Processando...' : 'Finalizar Visita (Check-out)'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
