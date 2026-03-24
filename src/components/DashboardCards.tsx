import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Store, MapPin, Percent, Users } from 'lucide-react'
import { DashboardStats } from '@/services/dashboard'

interface DashboardCardsProps {
  stats?: DashboardStats
  onLojasClick?: () => void
  onCheckInClick?: () => void
  onPromotoresClick?: () => void
}

export function DashboardCards({ stats, onLojasClick, onCheckInClick, onPromotoresClick }: DashboardCardsProps) {
  const data = stats || { totalLojas: 0, promotoresAtivos: 0, cobertura: 0, visitasHoje: 0 }

  const cards = [
    {
      title: 'Total Lojas',
      value: data.totalLojas,
      icon: Store,
      description: 'Unidades cadastradas',
      onClick: onLojasClick,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      delay: 'delay-0',
    },
    {
      title: 'Check-ins Hoje',
      value: data.visitasHoje,
      icon: MapPin,
      description: 'Visitas registradas hoje',
      onClick: onCheckInClick,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      delay: 'delay-100',
    },
    {
      title: 'Cobertura (Lojas c/ Promotor)',
      value: `${data.cobertura}%`,
      icon: Percent,
      description: 'Da rede coberta',
      onClick: onPromotoresClick,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      delay: 'delay-200',
    },
    {
      title: 'Promotores Ativos',
      value: data.promotoresAtivos,
      icon: Users,
      description: 'Em operação',
      onClick: onPromotoresClick,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10',
      delay: 'delay-300',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card 
          key={card.title}
          className={`animate-slide-up ${card.delay} cursor-pointer hover:shadow-lg transition-all hover:scale-105`}
          onClick={card.onClick}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <div className={`p-1 rounded-full ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
