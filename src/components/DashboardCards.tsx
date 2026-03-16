import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Store, MapPin, AlertCircle, Users } from 'lucide-react'

export function DashboardCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="animate-slide-up">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cobertura Total</CardTitle>
          <Store className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">78%</div>
          <p className="text-xs text-muted-foreground">+2.5% em relação ao mês passado</p>
        </CardContent>
      </Card>

      <Card className="animate-slide-up delay-100">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Check-ins Hoje</CardTitle>
          <MapPin className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">142</div>
          <p className="text-xs text-muted-foreground">34 visitas em andamento</p>
        </CardContent>
      </Card>

      <Card className="animate-slide-up delay-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-amber-600">
            Lojas Sem Visita (7d)
          </CardTitle>
          <AlertCircle className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">12</div>
          <p className="text-xs text-muted-foreground">Requerem atenção imediata</p>
        </CardContent>
      </Card>

      <Card className="animate-slide-up delay-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Promotores Ativos</CardTitle>
          <Users className="h-4 w-4 text-indigo-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">85</div>
          <p className="text-xs text-muted-foreground">De 92 totais da equipe</p>
        </CardContent>
      </Card>
    </div>
  )
}
