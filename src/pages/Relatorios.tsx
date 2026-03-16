import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, TrendingUp, Clock, Store } from 'lucide-react'

export default function Relatorios() {
  const reports = [
    {
      title: 'Ranking de Atuação',
      desc: 'Melhores promotores por volume de visitas e check-ins.',
      icon: TrendingUp,
    },
    {
      title: 'Gaps de Cobertura',
      desc: 'Lojas sem visitas nos últimos 15 dias para realocação de rotas.',
      icon: Store,
    },
    {
      title: 'Frequência de Visitas',
      desc: 'Tempo médio de permanência em loja por categoria.',
      icon: Clock,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Relatórios Analíticos</h2>
          <p className="text-muted-foreground">Exporte dados para análise profunda da operação.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report, i) => (
          <Card key={i} className="hover:border-primary transition-colors group cursor-pointer">
            <CardHeader>
              <div className="h-10 w-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <report.icon className="h-5 w-5" />
              </div>
              <CardTitle>{report.title}</CardTitle>
              <CardDescription>{report.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full group-hover:bg-primary group-hover:text-primary-foreground"
              >
                <Download className="mr-2 h-4 w-4" /> Exportar CSV
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
