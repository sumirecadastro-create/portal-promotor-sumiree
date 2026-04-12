import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, PieChart, TrendingUp, Loader2 } from 'lucide-react'
import { getCoberturaPorMarcaComLojas, MarcaCobertura } from '@/services/dashboard'

// Componente de gráfico de barras
function BarChartComponent({ data }: { data: MarcaCobertura[] }) {
  const maxValue = Math.max(...data.map(d => d.total_promotores), 1)

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="group">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium truncate max-w-[180px]" title={item.nome_marca}>
              {item.nome_marca}
            </span>
            <span className="text-muted-foreground text-xs">
              {item.total_promotores} loja(s) • {item.cobertura_percentual}%
            </span>
          </div>
          <div className="relative w-full h-8 bg-secondary rounded-md overflow-hidden">
            <div 
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-md transition-all duration-500 flex items-center justify-end px-2"
              style={{ width: `${(item.total_promotores / maxValue) * 100}%` }}
            >
              <span className="text-xs text-white font-medium">
                {item.cobertura_percentual > 0 && `${item.cobertura_percentual}%`}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Componente de gráfico de pizza
function PieChartComponent({ data }: { data: MarcaCobertura[] }) {
  const total = data.reduce((sum, item) => sum + item.total_promotores, 0)
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500',
    'bg-teal-500', 'bg-cyan-500', 'bg-amber-500', 'bg-lime-500',
    'bg-emerald-500', 'bg-fuchsia-500', 'bg-rose-500', 'bg-sky-500'
  ]

  const top10 = data.slice(0, 10)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-center">
        {top10.map((item, index) => {
          const percentage = total > 0 ? Math.round((item.total_promotores / total) * 100) : 0
          return (
            <div key={index} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
              <span className="text-sm">
                {item.nome_marca}: {percentage}%
              </span>
            </div>
          )
        })}
      </div>
      {top10.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          Nenhum dado disponível
        </div>
      )}
    </div>
  )
}

export function DashboardChart() {
  const [data, setData] = useState<MarcaCobertura[]>([])
  const [loading, setLoading] = useState(true)
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar')

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await getCoberturaPorMarcaComLojas()
      setData(result)
    } catch (error) {
      console.error('Erro ao carregar dados do gráfico:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <Card className="animate-slide-up delay-100">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Cobertura por Marca</CardTitle>
        <div className="flex gap-1">
          <Button
            variant={chartType === 'bar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setChartType('bar')}
            className="h-8 px-2"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button
            variant={chartType === 'pie' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setChartType('pie')}
            className="h-8 px-2"
          >
            <PieChart className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data.length > 0 ? (
          chartType === 'bar' ? (
            <BarChartComponent data={data} />
          ) : (
            <PieChartComponent data={data} />
          )
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum dado disponível</p>
            <p className="text-sm">Cadastre marcas e vincule aos promotores</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
