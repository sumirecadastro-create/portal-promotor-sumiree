import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, AlertTriangle, Clock, FileDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface RankingPromotor {
  id: string
  promotor_nome: string
  loja_nome: string
  total_visitas: number
  total_checkins: number
  tempo_medio: number
}

interface GapCobertura {
  id: string
  cod_loja: string
  nome_loja: string
  ultima_visita: string | null
  dias_sem_visita: number
  promotor_responsavel: string | null
}

interface FrequenciaVisita {
  loja_id: string
  loja_nome: string
  total_visitas: number
  tempo_medio_permanencia: number
  ultima_visita: string
}

export default function Relatorios() {
  const { isAdmin, userLojaId } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState({
    ranking: false,
    gaps: false,
    frequencia: false
  })
  const [ranking, setRanking] = useState<RankingPromotor[]>([])
  const [gaps, setGaps] = useState<GapCobertura[]>([])
  const [frequencia, setFrequencia] = useState<FrequenciaVisita[]>([])
  const [activeTab, setActiveTab] = useState('ranking')

  // Buscar Ranking de Promotores
  const loadRanking = async () => {
    setLoading(prev => ({ ...prev, ranking: true }))
    try {
      let query = supabase
        .from('visitas')
        .select(`
          id,
          promotores (id, promotor_nome, loja_id),
          lojas (id, nome_loja)
        `)
      
      if (!isAdmin && userLojaId) {
        query = query.eq('loja_id', userLojaId)
      }

      const { data: visitas, error } = await query

      if (error) throw error

      const promotorMap = new Map<string, RankingPromotor>()

      visitas?.forEach((visita: any) => {
        const promotor = visita.promotores
        const loja = visita.lojas
        if (!promotor || !loja) return

        const id = promotor.id
        if (!promotorMap.has(id)) {
          promotorMap.set(id, {
            id: promotor.id,
            promotor_nome: promotor.promotor_nome,
            loja_nome: loja.nome_loja,
            total_visitas: 0,
            total_checkins: 0,
            tempo_medio: 0
          })
        }

        const item = promotorMap.get(id)!
        item.total_visitas += 1
      })

      const rankingArray = Array.from(promotorMap.values())
        .sort((a, b) => b.total_visitas - a.total_visitas)
        .slice(0, 20)

      setRanking(rankingArray)
    } catch (error) {
      console.error('Erro ao carregar ranking:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar o ranking de promotores',
      })
    } finally {
      setLoading(prev => ({ ...prev, ranking: false }))
    }
  }

  // Buscar Gaps de Cobertura
  const loadGaps = async () => {
    setLoading(prev => ({ ...prev, gaps: true }))
    try {
      let lojasQuery = supabase.from('lojas').select('id, cod_loja, nome_loja')
      
      if (!isAdmin && userLojaId) {
        lojasQuery = lojasQuery.eq('id', userLojaId)
      }

      const { data: lojas, error: lojasError } = await lojasQuery
      if (lojasError) throw lojasError

      const { data: ultimasVisitas, error: visitasError } = await supabase
        .from('visitas')
        .select('loja_id, check_in, promotores (promotor_nome)')
        .order('check_in', { ascending: false })

      if (visitasError) throw visitasError

      const ultimaVisitaPorLoja = new Map()
      ultimasVisitas?.forEach((visita: any) => {
        if (!ultimaVisitaPorLoja.has(visita.loja_id)) {
          ultimaVisitaPorLoja.set(visita.loja_id, {
            data: visita.check_in,
            promotor: visita.promotores?.promotor_nome
          })
        }
      })

      const hoje = new Date()

      const gapsArray: GapCobertura[] = lojas?.map(loja => {
        const ultima = ultimaVisitaPorLoja.get(loja.id)
        let diasSemVisita = null
        let ultimaVisita = null

        if (ultima) {
          ultimaVisita = new Date(ultima.data)
          const diffTime = hoje.getTime() - ultimaVisita.getTime()
          diasSemVisita = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        }

        return {
          id: loja.id,
          cod_loja: loja.cod_loja,
          nome_loja: loja.nome_loja,
          ultima_visita: ultima?.data || null,
          dias_sem_visita: diasSemVisita || 0,
          promotor_responsavel: ultima?.promotor || null
        }
      }).filter(loja => loja.dias_sem_visita >= 15 || !loja.ultima_visita)
      .sort((a, b) => b.dias_sem_visita - a.dias_sem_visita)

      setGaps(gapsArray)
    } catch (error) {
      console.error('Erro ao carregar gaps:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar os gaps de cobertura',
      })
    } finally {
      setLoading(prev => ({ ...prev, gaps: false }))
    }
  }

  // Buscar Frequência de Visitas
  const loadFrequencia = async () => {
    setLoading(prev => ({ ...prev, frequencia: true }))
    try {
      let query = supabase
        .from('visitas')
        .select(`
          loja_id,
          check_in,
          check_out,
          lojas (id, nome_loja)
        `)
      
      if (!isAdmin && userLojaId) {
        query = query.eq('loja_id', userLojaId)
      }

      const { data: visitas, error } = await query
      if (error) throw error

      const lojaMap = new Map<string, FrequenciaVisita>()

      visitas?.forEach((visita: any) => {
        const loja = visita.lojas
        if (!loja) return

        if (!lojaMap.has(visita.loja_id)) {
          lojaMap.set(visita.loja_id, {
            loja_id: visita.loja_id,
            loja_nome: loja.nome_loja,
            total_visitas: 0,
            tempo_medio_permanencia: 0,
            ultima_visita: visita.check_in
          })
        }

        const item = lojaMap.get(visita.loja_id)!
        item.total_visitas += 1
        
        if (visita.check_out) {
          const inicio = new Date(visita.check_in)
          const fim = new Date(visita.check_out)
          const tempoMinutos = (fim.getTime() - inicio.getTime()) / (1000 * 60)
          if (!item.tempo_medio_permanencia) {
            item.tempo_medio_permanencia = tempoMinutos
          } else {
            item.tempo_medio_permanencia = (item.tempo_medio_permanencia + tempoMinutos) / 2
          }
        }

        if (new Date(visita.check_in) > new Date(item.ultima_visita)) {
          item.ultima_visita = visita.check_in
        }
      })

      const frequenciaArray = Array.from(lojaMap.values())
        .sort((a, b) => b.total_visitas - a.total_visitas)

      setFrequencia(frequenciaArray)
    } catch (error) {
      console.error('Erro ao carregar frequência:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar a frequência de visitas',
      })
    } finally {
      setLoading(prev => ({ ...prev, frequencia: false }))
    }
  }

  useEffect(() => {
    loadRanking()
    loadGaps()
    loadFrequencia()
  }, [isAdmin, userLojaId])

  // Função para exportar CSV
  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    if (data.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Atenção',
        description: 'Não há dados para exportar',
      })
      return
    }

    const rows = data.map(item => 
      headers.map(header => {
        let value = item[header.toLowerCase()]
        if (typeof value === 'string' && value.includes(',')) {
          value = `"${value}"`
        }
        return value || ''
      }).join(',')
    )

    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast({
      title: 'Sucesso',
      description: `Arquivo ${filename} exportado com sucesso!`,
    })
  }

  const exportRanking = () => {
    const headers = ['Posição', 'Promotor', 'Loja', 'Total Visitas', 'Total Check-ins', 'Tempo Médio (min)']
    const data = ranking.map((item, index) => ({
      posicao: index + 1,
      promotor: item.promotor_nome,
      loja: item.loja_nome,
      total_visitas: item.total_visitas,
      total_checkins: item.total_checkins,
      tempo_medio: Math.round(item.tempo_medio)
    }))
    exportToCSV(data, 'ranking_promotores', headers)
  }

  const exportGaps = () => {
    const headers = ['Código', 'Loja', 'Última Visita', 'Dias sem Visita', 'Promotor Responsável']
    const data = gaps.map(item => ({
      codigo: item.cod_loja,
      loja: item.nome_loja,
      ultima_visita: item.ultima_visita ? new Date(item.ultima_visita).toLocaleDateString() : 'Nunca',
      dias_sem_visita: item.dias_sem_visita,
      promotor: item.promotor_responsavel || 'Sem promotor'
    }))
    exportToCSV(data, 'gaps_cobertura', headers)
  }

  const exportFrequencia = () => {
    const headers = ['Loja', 'Total Visitas', 'Tempo Médio (min)', 'Última Visita']
    const data = frequencia.map(item => ({
      loja: item.loja_nome,
      total_visitas: item.total_visitas,
      tempo_medio: Math.round(item.tempo_medio_permanencia),
      ultima_visita: new Date(item.ultima_visita).toLocaleDateString()
    }))
    exportToCSV(data, 'frequencia_visitas', headers)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          Relatórios Analíticos
        </h1>
        <p className="text-muted-foreground">
          Exporte dados para análise profunda da operação.
          {!isAdmin && (
            <span className="ml-2 text-primary">(Dados filtrados para sua loja)</span>
          )}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ranking" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Ranking de Atuação
          </TabsTrigger>
          <TabsTrigger value="gaps" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Gaps de Cobertura
          </TabsTrigger>
          <TabsTrigger value="frequencia" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Frequência de Visitas
          </TabsTrigger>
        </TabsList>

        {/* Ranking de Atuação */}
        <TabsContent value="ranking">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Ranking de Atuação</CardTitle>
                <CardDescription>
                  Melhores promotores por volume de visitas e check-ins.
                </CardDescription>
              </div>
              <Button onClick={exportRanking} className="gap-2">
                <FileDown className="h-4 w-4" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              {loading.ranking ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : ranking.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum dado disponível para o período.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>Promotor</TableHead>
                      <TableHead>Loja</TableHead>
                      <TableHead className="text-center">Visitas</TableHead>
                      <TableHead className="text-center">Check-ins</TableHead>
                      <TableHead className="text-center">Tempo Médio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ranking.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {index + 1}
                          {index === 0 && <span className="ml-1">🏆</span>}
                        </TableCell>
                        <TableCell>{item.promotor_nome}</TableCell>
                        <TableCell>{item.loja_nome}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{item.total_visitas}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{item.total_checkins}</TableCell>
                        <TableCell className="text-center">
                          {Math.round(item.tempo_medio)} min
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gaps de Cobertura */}
        <TabsContent value="gaps">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gaps de Cobertura</CardTitle>
                <CardDescription>
                  Lojas sem visitas nos últimos 15 dias para realização de rotas.
                </CardDescription>
              </div>
              <Button onClick={exportGaps} className="gap-2">
                <FileDown className="h-4 w-4" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              {loading.gaps ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : gaps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum gap de cobertura encontrado. Todas as lojas estão sendo visitadas!
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Loja</TableHead>
                      <TableHead>Última Visita</TableHead>
                      <TableHead>Dias sem Visita</TableHead>
                      <TableHead>Promotor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gaps.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.cod_loja}</TableCell>
                        <TableCell>{item.nome_loja}</TableCell>
                        <TableCell>
                          {item.ultima_visita 
                            ? new Date(item.ultima_visita).toLocaleDateString() 
                            : 'Nunca visitada'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            {item.dias_sem_visita} dias
                          </Badge>
                        </TableCell>
                        <TableCell>{item.promotor_responsavel || 'Sem promotor'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Frequência de Visitas */}
        <TabsContent value="frequencia">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Frequência de Visitas</CardTitle>
                <CardDescription>
                  Tempo médio de permanência em loja por categoria.
                </CardDescription>
              </div>
              <Button onClick={exportFrequencia} className="gap-2">
                <FileDown className="h-4 w-4" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              {loading.frequencia ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : frequencia.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum dado de frequência disponível.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Loja</TableHead>
                      <TableHead className="text-center">Total Visitas</TableHead>
                      <TableHead className="text-center">Tempo Médio</TableHead>
                      <TableHead>Última Visita</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {frequencia.map((item) => (
                      <TableRow key={item.loja_id}>
                        <TableCell>{item.loja_nome}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{item.total_visitas}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {Math.round(item.tempo_medio_permanencia)} minutos
                        </TableCell>
                        <TableCell>
                          {new Date(item.ultima_visita).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
