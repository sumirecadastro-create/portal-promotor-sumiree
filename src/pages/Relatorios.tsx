// src/pages/Relatorios.tsx
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Megaphone
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'

const PRIMARY_COLOR = '#FF1686'

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

const STATUS_ACOES_CONFIG: Record<string, { label: string; color: string }> = {
  pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
  em_andamento: { label: 'Em Andamento', color: 'bg-green-100 text-green-700' },
  agendada: { label: 'Agendada', color: 'bg-blue-100 text-blue-700' },
  concluida: { label: 'Concluída', color: 'bg-gray-100 text-gray-700' },
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function Relatorios() {
  const { isAdmin, isRegional, userLojaId } = useAuth()
  const { toast } = useToast()
  
  // Estados
  const [exportando, setExportando] = useState({
    ranking: false,
    gaps: false,
    frequencia: false,
    acoes: false
  })
  
  const [mesSelecionado, setMesSelecionado] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  
  const [lojas, setLojas] = useState<any[]>([])
  const [lojaFiltro, setLojaFiltro] = useState<string>('todas')
  const [dialogAberto, setDialogAberto] = useState(false)
  const [dialogData, setDialogData] = useState<{ title: string; data: any[]; headers: string[] }>({
    title: '',
    data: [],
    headers: []
  })

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
  // FUNÇÕES AUXILIARES
  // ============================================

  const getFirstDay = (mesAno: string) => {
    const [ano, mes] = mesAno.split('-').map(Number)
    return `${ano}-${String(mes).padStart(2, '0')}-01`
  }

  const getLastDay = (mesAno: string) => {
    const [ano, mes] = mesAno.split('-').map(Number)
    const lastDay = new Date(ano, mes, 0).getDate()
    return `${ano}-${String(mes).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  }

  const downloadCSV = (data: any[], headers: string[], filename: string) => {
    if (data.length === 0) {
      toast({ title: 'Atenção', description: 'Não há dados para exportar' })
      return
    }

    const csvRows = [headers]
    data.forEach(item => {
      csvRows.push(headers.map(h => {
        const value = item[h] !== undefined && item[h] !== null ? item[h] : ''
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : String(value)
      }))
    })

    const csvContent = csvRows.map(row => row.join(',')).join('\n')
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)

    toast({ title: 'Sucesso', description: 'Relatório exportado com sucesso!' })
  }

  // ============================================
  // RELATÓRIOS
  // ============================================

  const exportRanking = async () => {
    setExportando(prev => ({ ...prev, ranking: true }))
    try {
      let query = supabase
        .from('visitas')
        .select(`
          promotores (id, promotor_nome),
          lojas (id, nome_loja)
        `)

      if (!isAdmin && userLojaId) {
        query = query.eq('loja_id', userLojaId)
      }

      const { data: visitas } = await query

      const promotorMap = new Map()
      visitas?.forEach((visita: any) => {
        const promotor = visita.promotores
        if (!promotor) return
        const id = promotor.id
        if (!promotorMap.has(id)) {
          promotorMap.set(id, {
            promotor: promotor.promotor_nome,
            total_visitas: 0
          })
        }
        promotorMap.get(id).total_visitas += 1
      })

      const dados = Array.from(promotorMap.values())
        .sort((a, b) => b.total_visitas - a.total_visitas)
        .map((item, idx) => ({ posicao: idx + 1, ...item }))

      downloadCSV(dados, ['posicao', 'promotor', 'total_visitas'], 'ranking_promotores')
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao exportar ranking' })
    } finally {
      setExportando(prev => ({ ...prev, ranking: false }))
    }
  }

  const exportGaps = async () => {
    setExportando(prev => ({ ...prev, gaps: true }))
    try {
      let lojasQuery = supabase.from('lojas').select('id, cod_loja, nome_loja')
      if (!isAdmin && userLojaId) {
        lojasQuery = lojasQuery.eq('id', userLojaId)
      }
      const { data: lojas } = await lojasQuery

      const { data: visitas } = await supabase
        .from('visitas')
        .select('loja_id, check_in')
        .order('check_in', { ascending: false })

      const ultimaVisita = new Map()
      visitas?.forEach((v: any) => {
        if (!ultimaVisita.has(v.loja_id)) {
          ultimaVisita.set(v.loja_id, v.check_in)
        }
      })

      const hoje = new Date()
      const dados = lojas?.map(loja => {
        const ultima = ultimaVisita.get(loja.id)
        let dias = 0
        if (ultima) {
          const diff = hoje.getTime() - new Date(ultima).getTime()
          dias = Math.floor(diff / (1000 * 60 * 60 * 24))
        }
        return {
          codigo: loja.cod_loja,
          loja: loja.nome_loja,
          ultima_visita: ultima ? new Date(ultima).toLocaleDateString() : 'Nunca',
          dias_sem_visita: dias
        }
      }).filter(l => l.dias_sem_visita >= 15 || l.ultima_visita === 'Nunca')

      downloadCSV(dados, ['codigo', 'loja', 'ultima_visita', 'dias_sem_visita'], 'gaps_cobertura')
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao exportar gaps' })
    } finally {
      setExportando(prev => ({ ...prev, gaps: false }))
    }
  }

  const exportFrequencia = async () => {
    setExportando(prev => ({ ...prev, frequencia: true }))
    try {
      let query = supabase.from('visitas').select('loja_id, check_in, check_out, lojas(nome_loja)')
      if (!isAdmin && userLojaId) {
        query = query.eq('loja_id', userLojaId)
      }
      const { data: visitas } = await query

      const lojaMap = new Map()
      visitas?.forEach((v: any) => {
        const lojaNome = v.lojas?.nome_loja
        if (!lojaNome) return
        if (!lojaMap.has(v.loja_id)) {
          lojaMap.set(v.loja_id, { loja: lojaNome, total: 0, tempoTotal: 0, contagem: 0 })
        }
        const item = lojaMap.get(v.loja_id)
        item.total += 1
        if (v.check_out) {
          const minutos = (new Date(v.check_out).getTime() - new Date(v.check_in).getTime()) / (1000 * 60)
          item.tempoTotal += minutos
          item.contagem += 1
        }
      })

      const dados = Array.from(lojaMap.values()).map(item => ({
        loja: item.loja,
        total_visitas: item.total,
        tempo_medio: item.contagem > 0 ? Math.round(item.tempoTotal / item.contagem) : 0
      }))

      downloadCSV(dados, ['loja', 'total_visitas', 'tempo_medio'], 'frequencia_visitas')
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao exportar frequência' })
    } finally {
      setExportando(prev => ({ ...prev, frequencia: false }))
    }
  }

  const exportAcoesMensais = async () => {
    setExportando(prev => ({ ...prev, acoes: true }))
    try {
      const startDate = getFirstDay(mesSelecionado)
      const endDate = getLastDay(mesSelecionado)

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

      // Filtrar por loja se selecionada
      if (lojaFiltro !== 'todas' && lojaFiltro !== '') {
        const { data: acoesLojas } = await supabase
          .from('acoes_lojas')
          .select('acao_id')
          .eq('loja_id', lojaFiltro)
        
        const acaoIds = acoesLojas?.map(a => a.acao_id) || []
        if (acaoIds.length === 0) {
          toast({ title: 'Atenção', description: 'Nenhuma ação encontrada para esta loja neste mês' })
          setExportando(prev => ({ ...prev, acoes: false }))
          return
        }
        query = query.in('id', acaoIds)
      }

      const { data: acoes, error } = await query

      if (error) throw error
      if (!acoes || acoes.length === 0) {
        toast({ title: 'Atenção', description: 'Nenhuma ação encontrada para o período selecionado' })
        setExportando(prev => ({ ...prev, acoes: false }))
        return
      }

      // Processar dados para CSV
      const dados = acoes.map((acao: any) => {
        const lojasNomes = acao.acoes_lojas?.map((al: any) => al.lojas?.nome_loja).filter(Boolean).join('; ') || 'Nenhuma'
        const tipoConfig = TIPO_ACOES_CONFIG[acao.tipo] || { label: acao.tipo || 'Outra' }
        const statusConfig = STATUS_ACOES_CONFIG[acao.status] || { label: acao.status || 'Desconhecido' }
        
        return {
          nome: acao.nome || 'Sem nome',
          tipo: tipoConfig.label,
          status: statusConfig.label,
          data_inicio: new Date(acao.data_inicio).toLocaleDateString('pt-BR'),
          data_fim: new Date(acao.data_fim).toLocaleDateString('pt-BR'),
          lojas: lojasNomes,
          descricao: acao.descricao || ''
        }
      })

      setDialogData({
        title: `Ações Mensais - ${new Date(startDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
        data: dados,
        headers: ['nome', 'tipo', 'status', 'data_inicio', 'data_fim', 'lojas', 'descricao']
      })
      setDialogAberto(true)

    } catch (error) {
      console.error('Erro ao exportar ações:', error)
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao exportar ações mensais' })
    } finally {
      setExportando(prev => ({ ...prev, acoes: false }))
    }
  }

  const downloadAcoesCSV = () => {
    downloadCSV(dialogData.data, dialogData.headers, 'acoes_mensais')
    setDialogAberto(false)
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Relatórios Analíticos</h2>
        <p className="text-muted-foreground">Exporte dados para análise profunda da operação.</p>
      </div>

      {/* Cards de Relatórios */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Ranking */}
        <Card className="hover:border-primary transition-colors">
          <CardHeader>
            <div className="h-10 w-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="h-5 w-5" />
            </div>
            <CardTitle>Ranking de Atuação</CardTitle>
            <CardDescription>Melhores promotores por volume de visitas</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={exportRanking}
              disabled={exportando.ranking}
            >
              <Download className="mr-2 h-4 w-4" /> 
              {exportando.ranking ? 'Exportando...' : 'Exportar CSV'}
            </Button>
          </CardContent>
        </Card>

        {/* Gaps */}
        <Card className="hover:border-primary transition-colors">
          <CardHeader>
            <div className="h-10 w-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-4">
              <Store className="h-5 w-5" />
            </div>
            <CardTitle>Gaps de Cobertura</CardTitle>
            <CardDescription>Lojas sem visitas nos últimos 15 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={exportGaps}
              disabled={exportando.gaps}
            >
              <Download className="mr-2 h-4 w-4" /> 
              {exportando.gaps ? 'Exportando...' : 'Exportar CSV'}
            </Button>
          </CardContent>
        </Card>

        {/* Frequência */}
        <Card className="hover:border-primary transition-colors">
          <CardHeader>
            <div className="h-10 w-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-4">
              <Clock className="h-5 w-5" />
            </div>
            <CardTitle>Frequência de Visitas</CardTitle>
            <CardDescription>Tempo médio de permanência por loja</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={exportFrequencia}
              disabled={exportando.frequencia}
            >
              <Download className="mr-2 h-4 w-4" /> 
              {exportando.frequencia ? 'Exportando...' : 'Exportar CSV'}
            </Button>
          </CardContent>
        </Card>

        {/* Ações Mensais - NOVO */}
        <Card className="hover:border-primary transition-colors" style={{ borderColor: PRIMARY_COLOR }}>
          <CardHeader>
            <div className="h-10 w-10 rounded-lg flex items-center justify-center mb-4" style={{ background: `${PRIMARY_COLOR}20`, color: PRIMARY_COLOR }}>
              <Calendar className="h-5 w-5" />
            </div>
            <CardTitle>Ações Mensais</CardTitle>
            <CardDescription>Exportar todas as ações do mês selecionado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Seletor de Mês */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Mês/Ano</Label>
              <Input
                type="month"
                value={mesSelecionado}
                onChange={(e) => setMesSelecionado(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            {/* Seletor de Loja (apenas Admin/Regional) */}
            {(isAdmin || isRegional) && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Loja</Label>
                <Select value={lojaFiltro} onValueChange={setLojaFiltro}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Todas as lojas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as lojas</SelectItem>
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
              className="w-full"
              style={{ background: PRIMARY_COLOR }}
              onClick={exportAcoesMensais}
              disabled={exportando.acoes}
            >
              {exportando.acoes ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {exportando.acoes ? 'Exportando...' : 'Exportar CSV'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ============================================
          DIALOG DE PREVIEW DO RELATÓRIO DE AÇÕES
          ============================================ */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" style={{ color: PRIMARY_COLOR }} />
              {dialogData.title}
            </DialogTitle>
            <DialogDescription>
              Visualize os dados antes de exportar. {dialogData.data.length} registro(s) encontrado(s).
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[50vh] overflow-y-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  {dialogData.headers.map((header, idx) => (
                    <th key={idx} className="text-left p-2 font-medium border-b">
                      {header.replace('_', ' ').toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dialogData.data.length > 0 ? (
                  dialogData.data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/50">
                      {dialogData.headers.map((header, hIdx) => (
                        <td key={hIdx} className="p-2 border-b text-sm">
                          {row[header] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={dialogData.headers.length} className="text-center p-4 text-muted-foreground">
                      Nenhum dado encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              Total: {dialogData.data.length} registros
            </Badge>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogAberto(false)}>
                Fechar
              </Button>
              <Button onClick={downloadAcoesCSV} style={{ background: PRIMARY_COLOR }}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground border-t pt-4 mt-4">
        Todos os relatórios são exportados em formato CSV (.csv)
      </div>
    </div>
  )
}
