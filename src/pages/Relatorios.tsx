import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, TrendingUp, Clock, Store } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'

export default function Relatorios() {
  const { isAdmin, userLojaId } = useAuth()
  const { toast } = useToast()
  const [exportando, setExportando] = useState({
    ranking: false,
    gaps: false,
    frequencia: false
  })

  const reports = [
    {
      title: 'Ranking de Atuação',
      desc: 'Melhores promotores por volume de visitas e check-ins.',
      icon: TrendingUp,
      onExport: async () => {
        setExportando(prev => ({ ...prev, ranking: true }))
        try {
          let query = supabase
            .from('visitas')
            .select(`
              promotores (id, promotor_nome, loja_id),
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

          if (dados.length === 0) {
            toast({ title: 'Atencao', description: 'Nao ha dados para exportar' })
            return
          }

          // CABECALHOS SEM ACENTOS
          const csvRows = [['Posicao', 'Promotor', 'Total_Visitas']]
          dados.forEach(item => {
            csvRows.push([item.posicao, item.promotor, item.total_visitas])
          })

          const csvContent = csvRows.map(row => row.join(',')).join('\n')
          const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' })
          const link = document.createElement('a')
          link.href = URL.createObjectURL(blob)
          link.download = `ranking_promotores_${new Date().toISOString().split('T')[0]}.csv`
          link.click()
          URL.revokeObjectURL(link.href)

          toast({ title: 'Sucesso', description: 'Ranking exportado com sucesso!' })
        } catch (error) {
          toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao exportar' })
        } finally {
          setExportando(prev => ({ ...prev, ranking: false }))
        }
      }
    },
    {
      title: 'Gaps de Cobertura',
      desc: 'Lojas sem visitas nos últimos 15 dias para realocação de rotas.',
      icon: Store,
      onExport: async () => {
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
            let dias = null
            if (ultima) {
              const diff = hoje.getTime() - new Date(ultima).getTime()
              dias = Math.floor(diff / (1000 * 60 * 60 * 24))
            }
            return {
              codigo: loja.cod_loja,
              loja: loja.nome_loja,
              ultima_visita: ultima ? new Date(ultima).toLocaleDateString() : 'Nunca',
              dias_sem_visita: dias || 0
            }
          }).filter(l => l.dias_sem_visita >= 15 || l.ultima_visita === 'Nunca')

          if (dados.length === 0) {
            toast({ title: 'Atencao', description: 'Nao ha gaps de cobertura' })
            return
          }

          // CABECALHOS SEM ACENTOS
          const csvRows = [['Codigo', 'Loja', 'Ultima_Visita', 'Dias_Sem_Visita']]
          dados.forEach(item => {
            csvRows.push([item.codigo, item.loja, item.ultima_visita, item.dias_sem_visita])
          })

          const csvContent = csvRows.map(row => row.join(',')).join('\n')
          const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' })
          const link = document.createElement('a')
          link.href = URL.createObjectURL(blob)
          link.download = `gaps_cobertura_${new Date().toISOString().split('T')[0]}.csv`
          link.click()
          URL.revokeObjectURL(link.href)

          toast({ title: 'Sucesso', description: 'Gaps exportados com sucesso!' })
        } catch (error) {
          toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao exportar' })
        } finally {
          setExportando(prev => ({ ...prev, gaps: false }))
        }
      }
    },
    {
      title: 'Frequência de Visitas',
      desc: 'Tempo médio de permanência em loja por categoria.',
      icon: Clock,
      onExport: async () => {
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

          if (dados.length === 0) {
            toast({ title: 'Atencao', description: 'Nao ha dados de frequencia' })
            return
          }

          // CABECALHOS SEM ACENTOS
          const csvRows = [['Loja', 'Total_Visitas', 'Tempo_Medio_Minutos']]
          dados.forEach(item => {
            csvRows.push([item.loja, item.total_visitas, item.tempo_medio])
          })

          const csvContent = csvRows.map(row => row.join(',')).join('\n')
          const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' })
          const link = document.createElement('a')
          link.href = URL.createObjectURL(blob)
          link.download = `frequencia_visitas_${new Date().toISOString().split('T')[0]}.csv`
          link.click()
          URL.revokeObjectURL(link.href)

          toast({ title: 'Sucesso', description: 'Frequencia exportada com sucesso!' })
        } catch (error) {
          toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao exportar' })
        } finally {
          setExportando(prev => ({ ...prev, frequencia: false }))
        }
      }
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Relatórios Analíticos</h2>
        <p className="text-muted-foreground">Exporte dados para análise profunda da operação.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report, i) => (
          <Card key={i} className="hover:border-primary transition-colors">
            <CardHeader>
              <div className="h-10 w-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-4">
                <report.icon className="h-5 w-5" />
              </div>
              <CardTitle>{report.title}</CardTitle>
              <CardDescription>{report.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={report.onExport}
                disabled={
                  (report.title === 'Ranking de Atuação' && exportando.ranking) ||
                  (report.title === 'Gaps de Cobertura' && exportando.gaps) ||
                  (report.title === 'Frequência de Visitas' && exportando.frequencia)
                }
              >
                <Download className="mr-2 h-4 w-4" /> 
                {exportando.ranking || exportando.gaps || exportando.frequencia ? 'Exportando...' : 'Exportar CSV'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
