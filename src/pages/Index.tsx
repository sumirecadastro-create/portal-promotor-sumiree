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
import { VISITS } from '@/lib/mock-data'

export default function Index() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Visão geral da operação de promotores na rede Sumirê.
        </p>
      </div>

      <DashboardCards />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <DashboardChart />
        </div>

        <Card className="lg:col-span-3 animate-slide-up delay-200">
          <CardHeader>
            <CardTitle className="text-base">Atividade Recente (Hoje)</CardTitle>
          </CardHeader>
          <CardContent>
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
                {VISITS.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell className="font-medium text-xs">{visit.promoterName}</TableCell>
                    <TableCell className="text-xs">{visit.storeName}</TableCell>
                    <TableCell>
                      <Badge
                        variant={visit.status === 'Em Andamento' ? 'default' : 'secondary'}
                        className={
                          visit.status === 'Em Andamento'
                            ? 'bg-emerald-500 hover:bg-emerald-600'
                            : ''
                        }
                      >
                        {visit.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {visit.time}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
