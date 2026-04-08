import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { createVisit, updateVisit, getActiveVisitsByDay, Visita } from '@/services/visitas'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { MapPin, User, Store, Clock, Calendar, XCircle, Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Promotor {
  id: string
  promotor_nome: string
  marca_produto: string
  fabricante_produto: string
  status: string
}

interface Loja {
  id: string
  cod_loja: string
  nome_loja: string
  endereco: string
}

interface VisitaAtiva extends Visita {
  promotor_nome?: string
  promotor_marca?: string
  loja_nome?: string
  loja_cod?: string
}

export default function CheckIn() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [promotores, setPromotores] = useState<Promotor[]>([])
  const [lojas, setLojas] = useState<Loja[]>([])
  const [visitasAtivas, setVisitasAtivas] = useState<VisitaAtiva[]>([])
  
  const [selectedPromotorId, setSelectedPromotorId] = useState<string>('')
  const [selectedLojaId, setSelectedLojaId] = useState<string>('')
  const [observacoes, setObservacoes] = useState('')
  
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Carregar dados iniciais
  const loadData = async () => {
    try {
      const hoje = new Date().toISOString().split('T')[0]
      
      // Buscar promotores ativos
      const { data: promotoresData, error: promotoresError } = await supabase
        .from('promotores')
        .select('id, promotor_nome, marca_produto, fabricante_produto, status')
        .order('promotor_nome')
      
      if (promotoresError) throw promotoresError
      setPromotores(promotoresData || [])

      // Buscar lojas
      const { data: lojasData, error: lojasError } = await supabase
        .from('lojas')
        .select('id, cod_loja, nome_loja, endereco')
        .order('nome_loja')
      
      if (lojasError) throw lojasError
      setLojas(lojasData || [])

      // Buscar visitas ativas de hoje
      const visitasData = await getActiveVisitsByDay(hoje)
      
      // Buscar nomes dos promotores e lojas para as visitas ativas
      const visitasComNomes = await Promise.all(
        (visitasData || []).map(async (visita) => {
          const { data: promotor } = await supabase
            .from('promotores')
            .select('promotor_nome, marca_produto')
            .eq('id', visita.promotor_id)
            .single()
          
          const { data: loja } = await supabase
            .from('lojas')
            .select('nome_loja, cod_loja')
            .eq('id', visita.loja_id)
            .single()
          
          return {
            ...visita,
            promotor_nome: promotor?.promotor_nome || 'Desconhecido',
            promotor_marca: promotor?.marca_produto || '',
            loja_nome: loja?.nome_loja || 'Desconhecida',
            loja_cod: loja?.cod_loja || ''
          }
        })
      )
      
      setVisitasAtivas(visitasComNomes)
      
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

  useEffect(() => {
    loadData()
  }, [])

  // ✅ APENAS esta validação: promotor não pode estar em duas lojas
  const promotorTemVisitaAtiva = (promotorId: string) => {
    return visitasAtivas.some(v => v.promotor_id === promotorId)
  }

  // ❌ NÃO tem validação de loja ocupada - pode ter múltiplos promotores!

  const handleCheckIn = async () => {
    if (!selectedPromotorId || !selectedLojaId) {
      toast({ 
        title: 'Atenção', 
        description: 'Selecione um promotor e uma loja.', 
        variant: 'destructive' 
      })
      return
    }

    // Verificar se promotor já está em visita ativa
    if (promotorTemVisitaAtiva(selectedPromotorId)) {
      toast({ 
        title: 'Promotor já está em visita', 
        description: 'Este promotor já possui uma visita ativa hoje. Finalize a visita atual primeiro.', 
        variant: 'destructive' 
      })
      return
    }

    setActionLoading(true)
    try {
      const now = new Date().toISOString()
      await createVisit({
        promotor_id: selectedPromotorId,
        loja_id: selectedLojaId,
        check_in: now,
        observacoes: observacoes || null,
      })
      
      await loadData()
      
      setSelectedPromotorId('')
      setSelectedLojaId('')
      setObservacoes('')
      
      toast({
        title: 'Check-in realizado!',
        description: `Visita iniciada com sucesso.`,
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

  const handleCheckOut = async (visitaId: string, promotorNome: string, lojaNome: string) => {
    if (!confirm(`Finalizar visita de ${promotorNome} na loja ${lojaNome}?`)) return

    setActionLoading(true)
    try {
      const now = new Date().toISOString()
      await updateVisit(visitaId, { check_out: now })
      
      toast({ 
        title: 'Check-out realizado!', 
        description: `Visita de ${promotorNome} finalizada.`,
        className: 'bg-blue-500 text-white'
      })
      
      await loadData()
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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // Agrupar visitas por loja
  const visitasPorLoja = visitasAtivas.reduce((acc, visita) => {
    const lojaId = visita.loja_id
    if (!acc[lojaId]) {
      acc[lojaId] = {
        loja_nome: visita.loja_nome,
        loja_cod: visita.loja_cod,
        promotores: []
      }
    }
    acc[lojaId].promotores.push(visita)
    return acc
  }, {} as Record<string, { loja_nome: string; loja_cod: string; promotores: VisitaAtiva[] }>)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-2">
          <Calendar className="h-3 w-3" />
          <span>{hoje}</span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight">Operação Check-in</h2>
        <p className="text-muted-foreground">
          Gerencie as visitas dos promotores nas lojas.
        </p>
      </div>

      {/* Card de Check-in */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="text-primary" />
            Iniciar Nova Visita
          </CardTitle>
          <CardDescription>
            Selecione o promotor e a loja para iniciar uma visita.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Promotor
              </label>
              <Select value={selectedPromotorId} onValueChange={setSelectedPromotorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um promotor" />
                </SelectTrigger>
                <SelectContent>
                  {promotores.map((promotor) => (
                    <SelectItem 
                      key={promotor.id} 
                      value={promotor.id}
                      disabled={promotorTemVisitaAtiva(promotor.id)}
                    >
                      <div className="flex items-center justify-between w-full gap-2">
                        <span>{promotor.promotor_nome}</span>
                        {promotor.marca_produto && (
                          <Badge variant="outline" className="text-xs">
                            <Package className="h-3 w-3 mr-1" />
                            {promotor.marca_produto}
                          </Badge>
                        )}
                        {promotorTemVisitaAtiva(promotor.id) && (
                          <Badge variant="secondary" className="text-xs bg-yellow-500">
                            Em visita
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Store className="h-4 w-4" />
                Loja
              </label>
              <Select value={selectedLojaId} onValueChange={setSelectedLojaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma loja" />
                </SelectTrigger>
                <SelectContent>
                  {lojas.map((loja) => (
                    <SelectItem key={loja.id} value={loja.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{loja.nome_loja} - {loja.cod_loja}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Uma loja pode receber múltiplos promotores de marcas diferentes.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Observações (opcional)</label>
            <Textarea
              placeholder="Informações adicionais sobre a visita..."
              className="resize-none"
              rows={3}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          <Button
            className="w-full h-12 text-base font-semibold"
            onClick={handleCheckIn}
            disabled={!selectedPromotorId || !selectedLojaId || actionLoading || promotorTemVisitaAtiva(selectedPromotorId)}
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
        </CardContent>
      </Card>

      {/* Lista de Visitas Ativas - Agrupada por Loja */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Visitas em Andamento Hoje
          </CardTitle>
          <CardDescription>
            {visitasAtivas.length} promotor(es) em visita no momento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {visitasAtivas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma visita ativa no momento.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(visitasPorLoja).map(([lojaId, lojaData]) => (
                <div key={lojaId} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                    <Store className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{lojaData.loja_nome}</span>
                    <Badge variant="outline" className="text-xs">
                      {lojaData.loja_cod}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {lojaData.promotores.length} promotor(es)
                    </span>
                  </div>
                  <div className="space-y-2">
                    {lojaData.promotores.map((visita) => (
                      <div
                        key={visita.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/30 rounded-lg gap-2"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{visita.promotor_nome}</span>
                            {visita.promotor_marca && (
                              <Badge variant="secondary" className="text-xs">
                                <Package className="h-3 w-3 mr-1" />
                                {visita.promotor_marca}
                              </Badge>
                            )}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>Início: {formatTime(visita.check_in)}</span>
                            </div>
                          </div>
                          {visita.observacoes && (
                            <div className="text-xs text-muted-foreground mt-1 ml-5">
                              📝 {visita.observacoes}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCheckOut(visita.id, visita.promotor_nome || '', visita.loja_nome || '')}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200"
                          disabled={actionLoading}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Finalizar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo rápido */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Promotores em Visita</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {visitasAtivas.length}
                </p>
              </div>
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Promotores Disponíveis</p>
                <p className="text-2xl font-bold text-green-600">
                  {promotores.filter(p => !promotorTemVisitaAtiva(p.id)).length}
                </p>
              </div>
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lojas com Visita</p>
                <p className="text-2xl font-bold text-blue-600">
                  {Object.keys(visitasPorLoja).length}
                </p>
              </div>
              <Store className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
