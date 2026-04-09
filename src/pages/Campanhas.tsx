import { useState, useEffect } from 'react'
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Plus, 
  TrendingUp, 
  CheckCircle2, 
  Clock,
  Store,
  Users,
  Loader2
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

// Interface para Loja (igual à tabela do Supabase)
interface Loja {
  id: string
  nome_loja: string
  codigo?: string
  created_at?: string
}

// Interface para Campanha
interface Campanha {
  id: string
  nome: string
  loja_id: string
  data_inicio: string
  data_fim: string
  promotores: string[]
  status: string
  tipo?: string
}

const PRIMARY_COLOR = '#FF1686'

export default function Campanhas() {
  const [mesAtual, setMesAtual] = useState(new Date())
  const [lojaFiltro, setLojaFiltro] = useState('')
  const [lojas, setLojas] = useState<Loja[]>([])
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const ano = mesAtual.getFullYear()
  const mes = mesAtual.getMonth()
  
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const dias = Array.from({ length: diasNoMes }, (_, i) => i + 1)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  // Buscar lojas do Supabase
  async function carregarLojas() {
    try {
      const { data, error } = await supabase
        .from('lojas')
        .select('*')
        .order('nome_loja', { ascending: true })
      
      if (error) throw error
      
      // Formatar os dados das lojas
      const lojasFormatadas = (data || []).map((loja: any) => ({
        id: loja.id,
        nome_loja: loja.nome_loja,
        codigo: loja.codigo || loja.nome_loja.substring(0, 8) // fallback
      }))
      
      setLojas(lojasFormatadas)
    } catch (err) {
      console.error('Erro ao carregar lojas:', err)
      setError('Não foi possível carregar as lojas')
    }
  }

  // Buscar campanhas do Supabase
  async function carregarCampanhas() {
    try {
      // Buscar campanhas do mês atual
      const startDate = new Date(ano, mes, 1).toISOString()
      const endDate = new Date(ano, mes + 1, 0).toISOString()
      
      const { data, error } = await supabase
        .from('campanhas')
        .select('*')
        .gte('data_inicio', startDate)
        .lte('data_fim', endDate)
      
      if (error) throw error
      
      setCampanhas(data || [])
    } catch (err) {
      console.error('Erro ao carregar campanhas:', err)
      // Não mostra erro para campanhas, apenas deixa vazio
    }
  }

  // Carregar todos os dados
  async function carregarDados() {
    setLoading(true)
    setError(null)
    await Promise.all([carregarLojas(), carregarCampanhas()])
    setLoading(false)
  }

  useEffect(() => {
    carregarDados()
  }, [mesAtual])

  // Filtrar lojas pelo nome ou código
  const lojasFiltradas = lojas.filter(loja =>
    loja.nome_loja.toLowerCase().includes(lojaFiltro.toLowerCase()) ||
    (loja.codigo && loja.codigo.toLowerCase().includes(lojaFiltro.toLowerCase()))
  )

  // Verificar se uma loja tem campanha em um dia específico
  function getCampanhasDoDia(lojaId: string, dia: number) {
    const dataAtual = new Date(ano, mes, dia)
    dataAtual.setHours(0, 0, 0, 0)
    
    return campanhas.filter(campanha => {
      const inicio = new Date(campanha.data_inicio)
      const fim = new Date(campanha.data_fim)
      inicio.setHours(0, 0, 0, 0)
      fim.setHours(23, 59, 59, 999)
      return campanha.loja_id === lojaId && dataAtual >= inicio && dataAtual <= fim
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

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: PRIMARY_COLOR }} />
          <p className="text-gray-500">Carregando calendário...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️ {error}</div>
          <Button onClick={() => carregarDados()}>Tentar novamente</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho - igual ao anterior */}
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
            <Button variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white">
              <Filter className="h-4 w-4 mr-2" />
              Filtrar
            </Button>
            <Button variant="default" size="sm" style={{ background: 'white', color: PRIMARY_COLOR }} className="hover:bg-gray-100">
              <Plus className="h-4 w-4 mr-2" />
              Nova Campanha
            </Button>
          </div>
        </div>
      </div>

      {/* Controles do mês */}
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
            placeholder="🔍 Filtrar loja..."
            value={lojaFiltro}
            onChange={(e) => setLojaFiltro(e.target.value)}
            className="border-gray-300 focus:border-pink-500 focus:ring-pink-500"
            style={{ '--tw-ring-color': PRIMARY_COLOR } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Legenda */}
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
        <div className="flex items-center gap-2 ml-4 text-gray-500 text-xs">
          <span>Total: {lojasFiltradas.length} lojas exibidas</span>
        </div>
      </div>

      {/* Calendário */}
      <Card className="overflow-hidden shadow-lg border-0">
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-[1200px]">
            {/* Cabeçalho com dias */}
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

            {/* Linhas das lojas - AGORA VEM DO SUPABASE */}
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

                {/* Dias */}
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
                            <div 
                              key={campanha.id} 
                              className="p-1 rounded-md text-xs cursor-pointer transition-all hover:scale-105"
                              style={{ 
                                background: campanha.status === 'ativa' ? `${PRIMARY_COLOR}20` : 
                                           campanha.status === 'pendente' ? '#fef3c7' : '#dbeafe',
                                borderLeft: `2px solid ${campanha.status === 'ativa' ? PRIMARY_COLOR : 
                                                      campanha.status === 'pendente' ? '#f59e0b' : '#3b82f6'}`
                              }}
                            >
                              {campanha.promotores?.map((p, idx) => (
                                <div key={idx} className="truncate">
                                  {p}
                                </div>
                              ))}
                            </div>
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
                <p className="text-sm">Tente ajustar o filtro de busca</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-white" style={{ background: `linear-gradient(135deg, ${PRIMARY_COLOR} 0%, #cc1168 100%)` }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Campanhas Ativas</p>
                <p className="text-2xl font-bold">{campanhas.filter(c => c.status === 'ativa').length}</p>
              </div>
              <TrendingUp className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-amber-500 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Pendentes</p>
                <p className="text-2xl font-bold">{campanhas.filter(c => c.status === 'pendente').length}</p>
              </div>
              <Clock className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-blue-500 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Lojas no Sistema</p>
                <p className="text-2xl font-bold">{lojas.length}</p>
              </div>
              <Store className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-purple-500 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total de Campanhas</p>
                <p className="text-2xl font-bold">{campanhas.length}</p>
              </div>
              <Calendar className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
