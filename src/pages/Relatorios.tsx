// src/pages/Relatorios.tsx
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Download, 
  TrendingUp, 
  Clock, 
  Store, 
  Calendar,
  Loader2,
  Gift,
  ShoppingBag,
  Ticket,
  Balloon,
  Sparkles,
  Microscope,
  Megaphone,
  RefreshCw,
  FileText,
  Users,
  MapPin
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const PRIMARY_COLOR = '#FF1686'

// ============================================
// TIPOS
// ============================================

type TabRelatorio = 'acoes' | 'frequencia' | 'campanhas'

// ============================================
// CONFIGURAÇÕES
// ============================================

const TIPO_ACOES_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  compre_ganhe: { icon: Gift, label: 'Compre e Ganhe', color: '#FF1686' },
  compre_aplique: { icon: ShoppingBag, label: 'Compre e Aplique', color: '#FF1686' },
  compre_concorra: { icon: Ticket, label: 'Compre e Concorra', color: '#FF1686' },
  estouro_balao: { icon: Balloon, label: 'Estouro de Balão', color: '#FF1686' },
  roleta_premiada: { icon: Sparkles, label: 'Roleta Premiada', color: '#FF1686' },
  analise_capilar: { icon: Microscope, label: 'Análise Capilar', color: '#FF1686' },
  abordagem: { icon: Megaphone, label: 'Abordagem', color: '#FF1686' },
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendente: { label: 'Pendente', variant: 'outline' },
  em_andamento: { label: 'Em Andamento', variant: 'default' },
  agendada: { label: 'Agendada', variant: 'secondary' },
  concluida: { label: 'Concluída', variant: 'outline' },
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function Relatorios() {
  const { isAdmin, isRegional, userLojaId } = useAuth()
  const { toast } = useToast()
  
  // Estados
  const [tabAtiva, setTabAtiva] = useState<TabRelatorio>('acoes')
  const [loading, setLoading] = useState(false)
  const [exportando, setExportando] = useState(false)
  
  // Filtros
  const [mesSelecionado, setMesSelecionado] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [lojaFiltro, setLojaFiltro] = useState<string>('todas')
  
  // Dados
  const [dados, setDados] = useState<any[]>([])
  const [lojas, setLojas] = useState<any[]>([])
  const [totalRegistros, setTotalRegistros] = useState(0)

  // ============================================
  // CARREGAR LOJAS
  // ============================================

  useEffect(() => {
    const loadLojas = async () => {
      if (!isAdmin && !isRegional) return
      
      try {
        let query = supabase.from('lojas').select('id, cod_loja, nome_loja').order('cod_loja')
        
        if (isRegional && userLojaId) {
          const { data: lojasData } = await supabase
            .from('gerentes_regionais_lojas')
            .select('loja_id')
            .eq('gerente_regional_id', userLojaId)
          
          const lojaIds = lojasData?.map(l => l.loja_id) || []
          if (lojaIds.length > 0) {
            query = query.in('id', lojaIds)
          } else {
            setLojas([])
            return
          }
        }
        
        const { data } = await query
        setLojas(data || [])
      } catch (error) {
        console.error('Erro ao carregar lojas:', error)
      }
    }
    
    loadLojas()
  }, [isAdmin, isRegional, userLojaId])

  // ============================================
  // CARREGAR DADOS POR ABA
  // ============================================

  const loadData = async () => {
    setLoading(true)
    try {
      if (tabAtiva === 'acoes') {
        await loadAcoes()
      } else if (tabAtiva === 'frequencia') {
        await loadFrequencia()
      } else if (tabAtiva === 'campanhas') {
        await loadCampanhas()
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar os dados',
      })
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // CARREGAR AÇÕES
  // ============================================

  const loadAcoes = async () => {
    const [ano, mes] = mesSelecionado.split('-').map(Number)
    const startDate = `${ano}-${String(mes).padStart(2, '0')}-01`
    const lastDay = new Date(ano, mes, 0).getDate()
    const endDate = `${ano}-${String(mes).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    let query = supabase
      .from('acoes')
      .select(`
        *,
        acoes_lojas (
          lojas (id, cod_loja, nome_loja)
        )
      `)
      .gte('data_inicio', startDate)
      .lte('data_fim', endDate)
      .order('data_inicio')

    if (lojaFiltro !== 'todas' && lojaFiltro !== '') {
      const { data: acoesLojas } = await supabase
        .from('acoes_lojas')
        .select('acao_id')
        .eq('loja_id', lojaFiltro)
      
      const acaoIds = acoesLojas?.map(a => a.acao_id) || []
      if (acaoIds.length > 0) {
        query = query.in('id', acaoIds)
      } else {
        setDados([])
        setTotalRegistros(0)
        return
      }
    }

    const { data: acoes, error } = await query

    if (error) throw error

    const dadosFormatados = (acoes || []).map((acao: any) => {
      const lojasNomes = acao.acoes_lojas?.map((al: any) => al.lojas?.nome_loja).filter(Boolean).join(', ') || 'Nenhuma'
      const tipoConfig = TIPO_ACOES_CONFIG[acao.tipo] || { label: acao.tipo || 'Outra', icon: FileText }
      const statusConfig = STATUS_CONFIG[acao.status] || { label: acao.status || 'Desconhecido', variant: 'outline' }
      const Icon = tipoConfig.icon
      
      return {
        id: acao.id,
        nome: acao.nome || 'Sem nome',
        tipo: tipoConfig.label,
        tipoIcon: Icon,
        status: statusConfig.label,
        statusVariant: statusConfig.variant,
        data_inicio: new Date(acao.data_inicio).toLocaleDateString('pt-BR'),
        data_fim: new Date(acao.data_fim).toLocaleDateString('pt-BR'),
        lojas: lojasNomes,
        descricao: acao.descricao || '-'
      }
    })

    setDados(dadosFormatados)
    setTotalRegistros(dadosFormatados.length)
  }

  // ============================================
  // CARREGAR FREQUÊNCIA DE VISITAS
  // ============================================

  const loadFrequencia = async () => {
    let query = supabase
      .from('visitas')
      .select('loja_id, check_in, check_out, lojas(nome_loja, cod_loja)')
      .not('check_out', 'is', null)

    if (lojaFiltro !== 'todas' && lojaFiltro !== '') {
      query = query.eq('loja_id', lojaFiltro)
    }

    if (!isAdmin && userLojaId) {
      query = query.eq('loja_id', userLojaId)
    }

    const { data: visitas, error } = await query

    if (error) throw error

    const lojaMap = new Map()
    visitas?.forEach((v: any) => {
      const lojaNome = v.lojas?.nome_loja
      const lojaCod = v.lojas?.cod_loja
      if (!lojaNome) return
      if (!lojaMap.has(v.loja_id)) {
        lojaMap.set(v.loja_id, { 
          loja: lojaNome, 
          codigo: lojaCod,
          total: 0, 
          tempoTotal: 0, 
          contagem: 0 
        })
      }
      const item = lojaMap.get(v.loja_id)
      item.total += 1
      if (v.check_out) {
        const minutos = (new Date(v.check_out).getTime() - new Date(v.check_in).getTime()) / (1000 * 60)
        if (minutos > 0) {
          item.tempoTotal += minutos
          item.contagem += 1
        }
      }
    })

    const dadosFormatados = Array.from(lojaMap.values()).map(item => ({
      codigo: item.codigo || '-',
      loja: item.loja,
      total_visitas: item.total,
      tempo_medio: item.contagem > 0 ? Math.round(item.tempoTotal / item.contagem) : 0,
      tempo_formatado: item.contagem > 0 
        ? `${Math.floor(item.tempoTotal / item.contagem / 60)}h ${Math.round(item.tempoTotal / item.contagem % 60)}min`
        : '-'
    }))

    setDados(dadosFormatados)
    setTotalRegistros(dadosFormatados.length)
  }

  // ============================================
  // CARREGAR CAMPANHAS
  // ============================================

  const loadCampanhas = async () => {
    const [ano, mes] = mesSelecionado.split('-').map(Number)
    const startDate = `${ano}-${String(mes).padStart(2, '0')}-01`
    const lastDay = new Date(ano, mes, 0).getDate()
    const endDate = `${ano}-${String(mes).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    let query = supabase
      .from('campanhas')
      .select(`
        *,
        lojas_campanhas (
          lojas (id, cod_loja, nome_loja)
        )
      `)
      .gte('data_inicio', startDate)
      .lte('data_fim', endDate)
      .order('data_inicio')

    if (lojaFiltro !== 'todas' && lojaFiltro !== '') {
      const { data: campanhasLojas } = await supabase
        .from('lojas_campanhas')
        .select('campanha_id')
        .eq('loja_id', lojaFiltro)
      
      const campanhaIds = campanhasLojas?.map(c => c.campanha_id) || []
      if (campanhaIds.length > 0) {
        query = query.in('id', campanhaIds)
      } else {
        setDados([])
        setTotalRegistros(0)
        return
      }
    }

    const { data: campanhas, error } = await query

    if (error) throw error

    const dadosFormatados = (campanhas || []).map((campanha: any) => {
      const lojasNomes = campanha.lojas_campanhas?.map((lc: any) => lc.lojas?.nome_loja).filter(Boolean).join(', ') || 'Nenhuma'
      const status = new Date(campanha.data_fim) < new Date() ? 'Concluída' : 'Ativa'
      
      return {
        id: campanha.id,
        nome: campanha.nome || 'Sem nome',
        descricao: campanha.descricao || '-',
        data_inicio: new Date(campanha.data_inicio).toLocaleDateString('pt-BR'),
        data_fim: new Date(campanha.data_fim).toLocaleDateString('pt-BR'),
        status: status,
        lojas: lojasNomes
      }
    })

    setDados(dadosFormatados)
    setTotalRegistros(dadosFormatados.length)
  }

  // ============================================
  // EXPORTAR CSV
  // ============================================

  const exportCSV = async () => {
    if (dados.length === 0) {
      toast({ title: 'Atenção', description: 'Não há dados para exportar' })
      return
    }

    setExportando(true)
    try {
      const headers = Object.keys(dados[0]).filter(h => h !== 'id' && h !== 'tipoIcon' && h !== 'statusVariant')
      const csvRows = [headers]
      
      dados.forEach(item => {
        csvRows.push(headers.map(h => {
          const value = item[h] !== undefined && item[h] !== null ? item[h] : ''
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : String(value)
        }))
      })

      const csvContent = csvRows.map(row => row.join(',')).join('\n')
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${tabAtiva}_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(link.href)

      toast({ title: 'Sucesso', description: 'Relatório exportado com sucesso!' })
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao exportar' })
    } finally {
      setExportando(false)
    }
  }

  // ============================================
  // EFFECT - CARREGAR DADOS AO MUDAR TAB/FILTROS
  // ============================================

  useEffect(() => {
    loadData()
  }, [tabAtiva, mesSelecionado, lojaFiltro])

  // ============================================
  // RENDER
  // ============================================

  const tabs: { id: TabRelatorio; label: string; icon: any }[] = [
    { id: 'acoes', label: 'Ações', icon: Gift },
    { id: 'frequencia', label: 'Frequência de Visitas', icon: Clock },
    { id: 'campanhas', label: 'Campanhas', icon: TrendingUp },
  ]

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">📊 Relatórios e Análises</h2>
        <p className="text-muted-foreground">Exporte dados para análise profunda da operação.</p>
      </div>

      {/* TABS */}
      <div className="border-b">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = tabAtiva === tab.id
            return (
              <button
                key={tab.id}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-[1px]",
                  isActive 
                    ? "border-primary text-primary" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setTabAtiva(tab.id)}
              >
                <Icon className="h-4 w-4 inline mr-2" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex flex-wrap items-end gap-4 bg-muted/30 p-4 rounded-lg">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Filtro de Período</Label>
          <Input
            type="month"
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(e.target.value)}
            className="h-9 w-[180px]"
          />
        </div>

        {(isAdmin || isRegional) && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Loja</Label>
            <Select value={lojaFiltro} onValueChange={setLojaFiltro}>
              <SelectTrigger className="h-9 w-[200px]">
                <SelectValue placeholder="Todas as lojas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">🌎 Todas as lojas</SelectItem>
                {lojas.map(loja => (
                  <SelectItem key={loja.id} value={loja.id}>
                    {loja.cod_loja} - {loja.nome_loja}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button 
          variant="outline" 
          size="sm" 
          className="h-9"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Atualizar
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {totalRegistros} registro(s)
          </Badge>
          <Button 
            size="sm"
            className="h-9"
            style={{ background: PRIMARY_COLOR }}
            onClick={exportCSV}
            disabled={exportando || dados.length === 0}
          >
            {exportando ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* TABELA DE DADOS */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: PRIMARY_COLOR }} />
            </div>
          ) : dados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum dado encontrado para o período selecionado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(dados[0])
                      .filter(h => h !== 'id' && h !== 'tipoIcon' && h !== 'statusVariant')
                      .map((header) => (
                        <TableHead key={header} className="whitespace-nowrap">
                          {header.replace(/_/g, ' ').toUpperCase()}
                        </TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dados.map((row, idx) => (
                    <TableRow key={idx}>
                      {Object.entries(row)
                        .filter(([key]) => key !== 'id' && key !== 'tipoIcon' && key !== 'statusVariant')
                        .map(([key, value]) => {
                          // Renderizar badge para status
                          if (key === 'status' && row.statusVariant) {
                            const variant = row.statusVariant
                            return (
                              <TableCell key={key}>
                                <Badge variant={variant as any} className="text-xs">
                                  {value as string}
                                </Badge>
                              </TableCell>
                            )
                          }
                          // Renderizar ícone para tipo
                          if (key === 'tipo' && row.tipoIcon) {
                            const Icon = row.tipoIcon
                            return (
                              <TableCell key={key} className="whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" style={{ color: PRIMARY_COLOR }} />
                                  <span>{value as string}</span>
                                </div>
                              </TableCell>
                            )
                          }
                          return (
                            <TableCell key={key} className="whitespace-nowrap">
                              {value as string}
                            </TableCell>
                          )
                        })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground border-t pt-4 mt-4">
        Dados exportados em formato CSV (.csv) • {new Date().toLocaleDateString('pt-BR')}
      </div>
    </div>
  )
}
