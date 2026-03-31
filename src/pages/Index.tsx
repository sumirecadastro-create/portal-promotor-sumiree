import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DashboardCards } from '@/components/DashboardCards'
 import { DashboardChart } from '@/components/DashboardChart' 
import { getDashboardData, DashboardStats } from '@/services/dashboard'
import { RecentVisit } from '@/services/dashboard'

export default function Index() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | undefined>()
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    const data = await getDashboardData()
    setStats(data.stats)
    setRecentVisits(data.recentVisits)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const formatTime = (dateString: string) => {
    if (!dateString) return '--:--'
    return new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const goToLojas = () => navigate('/lojas')
  const goToCheckIn = () => navigate('/check-in')
  const goToPromotores = () => navigate('/promotores')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Visão geral da operação de promotores na rede Sumirê.
        </p>
      </div>

      <DashboardCards 
        stats={stats} 
        onLojasClick={goToLojas}
        onCheckInClick={goToCheckIn}
        onPromotoresClick={goToPromotores}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
<div className="lg:col-span-4">
  <Card>
    <CardHeader>
      <CardTitle>Gráfico (temporariamente removido)</CardTitle>
    </CardHeader>
    <CardContent>
      <p>Gráfico será restaurado depois</p>
    </CardContent>
  </Card>
</div>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Atividade Recente (Hoje)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Promotor</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentVisits.map((visit) => {
                    const isEmAndamento = !visit.check_out
                    return (
                      <TableRow key={visit.id}>
                        <TableCell className="font-medium text-xs truncate max-w-[120px]">
                          {visit.promotor_nome || 'Desconhecido'}
                        </TableCell>
                        <TableCell className="text-xs truncate max-w-[120px]">
                          {visit.loja_nome || 'Desconhecida'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isEmAndamento ? 'default' : 'secondary'}
                            className={isEmAndamento ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                          >
                            {isEmAndamento ? 'Em Andamento' : 'Concluída'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatTime(visit.check_in)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {recentVisits.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        Nenhuma visita recente
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
