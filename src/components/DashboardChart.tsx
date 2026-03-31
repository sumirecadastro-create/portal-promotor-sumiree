import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { getPromotores } from '@/services/promotores'

export function DashboardChart() {
  const [chartData, setChartData] = useState<{ name: string; activePromoters: number }[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const promotores = await getPromotores()
      const categoryMap: Record<string, number> = {}

      promotores.forEach((p) => {
        // Usar marca_produto diretamente (texto) para agrupar
        const cat = p.marca_produto || 'Sem Marca'
        categoryMap[cat] = (categoryMap[cat] || 0) + 1
      })

      const data = Object.keys(categoryMap).map((key) => ({
        name: key,
        activePromoters: categoryMap[key],
      }))

      setChartData(data)
    } catch (error) {
      console.error('Erro ao carregar dados do gráfico:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const chartConfig = {
    activePromoters: {
      label: 'Promotores Ativos',
      color: 'hsl(var(--primary))',
    },
  }

  return (
    <Card className="animate-slide-up delay-100 flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-base">Cobertura por Marca</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Carregando gráfico...
          </div>
        ) : chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="w-full h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  fontSize={12}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  fontSize={12}
                  allowDecimals={false}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar
                  dataKey="activePromoters"
                  fill="var(--color-activePromoters)"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Nenhum dado disponível.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
