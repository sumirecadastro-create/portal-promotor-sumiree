import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase'

interface ChartDados {
  name: string
  totalPromotores: number
}

export function DashboardChart() {
  const [chartData, setChartData] = useState<ChartDados[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      // Buscar marcas e contar promotores vinculados
      const { data, error } = await supabase
        .from('marcas')
        .select(`
          id,
          nome,
          promotores_marcas (
            promotor_id
          )
        `)
        .order('nome')

      if (error) throw error

      // Transformar os dados para o gráfico
      const dados = (data || []).map(marca => ({
        name: marca.nome,
        totalPromotores: marca.promotores_marcas?.length || 0
      }))

      // Filtrar marcas com pelo menos 1 promotor
      const dadosFiltrados = dados.filter(item => item.totalPromotores > 0)

      setChartData(dadosFiltrados)
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
    totalPromotores: {
      label: 'Promotores',
      color: 'hsl(var(--primary))',
    },
  }

  if (loading) {
    return (
      <Card className="animate-slide-up delay-100 flex flex-col h-full">
        <CardHeader>
          <CardTitle className="text-base">Cobertura por Marca</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-[300px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="animate-slide-up delay-100 flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-base">Cobertura por Marca</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-[300px]">
        {chartData.length > 0 ? (
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
                  angle={-45}
                  textAnchor="end"
                  height={60}
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
                  dataKey="totalPromotores"
                  fill="var(--color-totalPromotores)"
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
