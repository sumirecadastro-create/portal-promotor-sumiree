import { useState } from 'react'
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Plus, 
  TrendingUp, 
  CheckCircle2, 
  Clock,
  AlertCircle,
  Eye,
  Store,    
  Users   
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// Dados mockados expandidos
const MOCK_LOJAS = [
  { id: '1', codigo: 'LJ 01', nome: 'AVARE 1', regiao: 'Norte' },
  { id: '3', codigo: 'LJ 03', nome: 'MARILIA 1', regiao: 'Sul' },
  { id: '4', codigo: 'LJ 04', nome: 'ARACATUBA', regiao: 'Leste' },
  { id: '5', codigo: 'LJ 05', nome: 'P. PRUDENTE', regiao: 'Oeste' },
  { id: '7', codigo: 'LJ 07', nome: 'MARILIA 2', regiao: 'Sul' },
  { id: '8', codigo: 'LJ 08', nome: 'BAURU 1', regiao: 'Centro' },
  { id: '9', codigo: 'LJ 09', nome: 'ASSIS', regiao: 'Sul' },
  { id: '10', codigo: 'LJ 10', nome: 'ANDRADINA', regiao: 'Norte' },
  { id: '11', codigo: 'LJ 11', nome: 'BIRIGUI', regiao: 'Norte' },
  { id: '12', codigo: 'LJ 12', nome: 'ITAPEVA', regiao: 'Leste' },
  { id: '13', codigo: 'LJ 13', nome: 'BAURU 2 SHOP', regiao: 'Centro' },
  { id: '14', codigo: 'LJ 14', nome: 'OURINHOS', regiao: 'Sul' },
]

const MOCK_CAMPANHAS = [
  {
    id: '1',
    nome: 'Promoção Haskell',
    loja_id: '1',
    data_inicio: '2026-04-01',
    data_fim: '2026-04-15',
    promotores: ['Haskell', 'Bauny', 'Vult'],
    status: 'ativa',
    tipo: 'promocao',
    meta: 85,
    atual: 72
  },
  {
    id: '2',
    nome: 'Campanha Verão',
    loja_id: '3',
    data_inicio: '2026-04-05',
    data_fim: '2026-04-20',
    promotores: ['Ana', 'Carlos'],
    status: 'ativa',
    tipo: 'sazonal',
    meta: 100,
    atual: 45
  },
  {
    id: '3',
    nome: 'Liquidação',
    loja_id: '4',
    data_inicio: '2026-04-10',
    data_fim: '2026-04-25',
    promotores: ['Mariana', 'José', 'Paulo'],
    status: 'pendente',
    tipo: 'liquidação',
    meta: 90,
    atual: 0
  }
]

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'ativa':
      return { color: 'bg-emerald-500', icon: TrendingUp, label: 'Ativa' }
    case 'pendente':
      return { color: 'bg-amber-500', icon: Clock, label: 'Pendente' }
    case 'concluida':
      return { color: 'bg-blue-500', icon: CheckCircle2, label: 'Concluída' }
    default:
      return { color: 'bg-gray-500', icon: AlertCircle, label: 'Desconhecida' }
  }
}

export default function Campanhas() {
  const [mesAtual, setMesAtual] = useState(new Date(2026, 3, 1))
  const [lojaFiltro, setLojaFiltro] = useState('')
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('compact')
  const [campanhas] = useState(MOCK_CAMPANHAS)

  const ano = mesAtual.getFullYear()
  const mes = mesAtual.getMonth()
  
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const dias = Array.from({ length: diasNoMes }, (_, i) => i + 1)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const lojasFiltradas = MOCK_LOJAS.filter(loja =>
    loja.codigo.toLowerCase().includes(lojaFiltro.toLowerCase()) ||
    loja.nome.toLowerCase().includes(lojaFiltro.toLowerCase())
  )

  function getCampanhasDoDia(lojaId: string, dia: number) {
    const dataAtual = new Date(ano, mes, dia)
    dataAtual.setHours(0, 0, 0, 0)
    
    return campanhas.filter(c => {
      const inicio = new Date(c.data_inicio)
      const fim = new Date(c.data_fim)
      inicio.setHours(0, 0, 0, 0)
      fim.setHours(23, 59, 59, 999)
      return c.loja_id === lojaId && dataAtual >= inicio && dataAtual <= fim
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

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Cabeçalho com gradiente */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Calendar className="h-7 w-7" />
                Calendário de Campanhas
              </h1>
              <p className="text-blue-100 text-sm mt-1">
                Visualização rápida de todas as campanhas por loja
              </p>
            </div>
            
            <div className="flex gap-2">
              <div className="bg-white/10 rounded-lg p-1 flex">
                <Button 
                  size="sm" 
                  variant={viewMode === 'compact' ? 'secondary' : 'ghost'}
                  onClick={() => setViewMode('compact')}
                  className="text-white hover:text-white"
                >
                  📊 Compacto
                </Button>
                <Button 
                  size="sm" 
                  variant={viewMode === 'detailed' ? 'secondary' : 'ghost'}
                  onClick={() => setViewMode('detailed')}
                  className="text-white hover:text-white"
                >
                  📋 Detalhado
                </Button>
              </div>
              <Button variant="secondary" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filtrar
              </Button>
              <Button variant="default" size="sm" className="bg-white text-blue-600 hover:bg-blue-50">
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
              className="bg-white"
            />
          </div>
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap gap-4 text-sm bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
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
        </div>

        {/* Calendário Principal */}
        <Card className="overflow-hidden shadow-lg">
          <CardContent className="p-0 overflow-x-auto">
            <div className={cn(
              "min-w-[1000px]",
              viewMode === 'compact' ? 'text-sm' : 'text-base'
            )}>
              {/* Cabeçalho com dias */}
              <div className="grid border-b bg-gray-50 sticky top-0 z-20" 
                style={{ gridTemplateColumns: `220px repeat(${dias.length}, ${viewMode === 'compact' ? '70px' : '90px'})` }}>
                <div className="p-3 font-bold text-gray-700 sticky left-0 bg-gray-50 z-10 border-r">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4" />
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
                      isDiaHoje && "bg-yellow-100"
                    )}>
                      <div className="text-lg font-bold">{dia}</div>
                      <div className="text-xs text-gray-500">{nomeDia}</div>
                    </div>
                  )
                })}
              </div>

              {/* Linhas das lojas */}
              {lojasFiltradas.map((loja) => (
                <div key={loja.id} className="grid border-b hover:bg-gray-50 transition-colors"
                  style={{ gridTemplateColumns: `220px repeat(${dias.length}, ${viewMode === 'compact' ? '70px' : '90px'})` }}>
                  
                  {/* Info da loja */}
                  <div className="p-3 font-medium sticky left-0 bg-white z-10 border-r">
                    <div className="font-bold text-gray-800">{loja.codigo}</div>
                    <div className="text-xs text-gray-500">{loja.nome}</div>
                    <Badge variant="outline" className="text-xs mt-1">
                      {loja.regiao}
                    </Badge>
                  </div>

                  {/* Dias */}
                  {dias.map((dia) => {
                    const campanhasDoDia = getCampanhasDoDia(loja.id, dia)
                    const isDiaHoje = isHoje(dia)
                    
                    return (
                      <div key={dia} className={cn(
                        "p-2 align-top border-r min-h-[100px]",
                        isDiaHoje && "bg-yellow-50"
                      )}>
                        {campanhasDoDia.length > 0 ? (
                          <div className="space-y-2">
                            {campanhasDoDia.map((campanha) => {
                              const statusConfig = getStatusConfig(campanha.status)
                              const StatusIcon = statusConfig.icon
                              const diasTotal = campanhasDoDia.length > 1 ? 'multiple' : null
                              
                              return viewMode === 'compact' ? (
                                <Tooltip key={campanha.id}>
                                  <TooltipTrigger asChild>
                                    <div className={cn(
                                      "p-1 rounded-md cursor-pointer transition-all hover:scale-105",
                                      statusConfig.color,
                                      "bg-opacity-20"
                                    )}>
                                      <div className="flex items-center gap-1">
                                        <StatusIcon className={cn("h-3 w-3", `text-${statusConfig.color.replace('bg-', '')}`)} />
                                        <span className="text-xs font-medium truncate">
                                          {campanha.promotores[0]}
                                          {campanha.promotores.length > 1 && ` +${campanha.promotores.length - 1}`}
                                        </span>
                                      </div>
                                      {campanha.meta && (
                                        <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                                          <div 
                                            className={cn("h-1 rounded-full", statusConfig.color)}
                                            style={{ width: `${(campanha.atual / campanha.meta) * 100}%` }}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="space-y-1">
                                      <p className="font-bold">{campanha.nome}</p>
                                      <p className="text-xs">Promotores: {campanha.promotores.join(', ')}</p>
                                      <p className="text-xs">Status: {statusConfig.label}</p>
                                      {campanha.meta && (
                                        <p className="text-xs">Meta: {campanha.atual}/{campanha.meta}</p>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <div key={campanha.id} className={cn(
                                  "p-2 rounded-md border-l-4 shadow-sm",
                                  statusConfig.color === 'bg-emerald-500' && "border-emerald-500 bg-emerald-50",
                                  statusConfig.color === 'bg-amber-500' && "border-amber-500 bg-amber-50",
                                  statusConfig.color === 'bg-blue-500' && "border-blue-500 bg-blue-50"
                                )}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold">{campanha.nome}</span>
                                    <StatusIcon className="h-3 w-3" />
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {campanha.promotores.slice(0, 2).join(', ')}
                                    {campanha.promotores.length > 2 && ` +${campanha.promotores.length - 2}`}
                                  </div>
                                  {campanha.meta && (
                                    <div className="mt-2">
                                      <div className="flex justify-between text-xs mb-1">
                                        <span>Progresso</span>
                                        <span>{Math.round((campanha.atual / campanha.meta) * 100)}%</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                                        <div 
                                          className={cn("h-1.5 rounded-full", statusConfig.color)}
                                          style={{ width: `${(campanha.atual / campanha.meta) * 100}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="text-center text-gray-300 text-xs">
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
                  <Eye className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhuma loja encontrada</p>
                  <p className="text-sm">Tente ajustar o filtro de busca</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resumo rápido */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Campanhas Ativas</p>
                  <p className="text-2xl font-bold">
                    {campanhas.filter(c => c.status === 'ativa').length}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Pendentes</p>
                  <p className="text-2xl font-bold">
                    {campanhas.filter(c => c.status === 'pendente').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Lojas com Campanha</p>
                  <p className="text-2xl font-bold">
                    {new Set(campanhas.map(c => c.loja_id)).size}
                  </p>
                </div>
                                <Store className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Promotores Alocados</p>
                  <p className="text-2xl font-bold">
                    {campanhas.reduce((acc, c) => acc + c.promotores.length, 0)}
                  </p>
                </div>
                <Users className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  )
}
