import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { STORES, CATEGORIES } from '@/lib/mock-data'
import { MapPin, Clock, CheckCircle2 } from 'lucide-react'

export default function CheckIn() {
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null)
  const [isVisitActive, setIsVisitActive] = useState(false)
  const [checkInTime, setCheckInTime] = useState<string | null>(null)
  const { toast } = useToast()

  const handleCheckIn = () => {
    if (!activeStoreId) {
      toast({
        title: 'Atenção',
        description: 'Selecione uma loja primeiro.',
        variant: 'destructive',
      })
      return
    }
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    setCheckInTime(now)
    setIsVisitActive(true)
    toast({
      title: 'Check-in realizado com sucesso!',
      description: `Visita iniciada às ${now}`,
      className: 'bg-emerald-500 text-white',
    })
  }

  const handleCheckOut = () => {
    setIsVisitActive(false)
    setActiveStoreId(null)
    setCheckInTime(null)
    toast({ title: 'Check-out realizado com sucesso!', description: 'Resumo da visita salvo.' })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Operação em Loja</h2>
        <p className="text-muted-foreground">
          Registre sua presença e atuação nos pontos de venda.
        </p>
      </div>

      <Card
        className={`border-2 transition-colors duration-500 ${isVisitActive ? 'border-primary shadow-md' : ''}`}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className={isVisitActive ? 'text-primary' : 'text-muted-foreground'} />
            Local da Visita
          </CardTitle>
          <CardDescription>
            {isVisitActive
              ? 'Você está atualmente em operação nesta loja.'
              : 'Selecione a loja em que você se encontra.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            value={activeStoreId || ''}
            onValueChange={setActiveStoreId}
            disabled={isVisitActive}
          >
            <SelectTrigger className="w-full h-12 text-lg">
              <SelectValue placeholder="Buscar loja..." />
            </SelectTrigger>
            <SelectContent>
              {STORES.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} - {s.region}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!isVisitActive ? (
            <Button
              className="w-full h-14 text-lg font-semibold mt-4 transition-transform active:scale-[0.98]"
              onClick={handleCheckIn}
              disabled={!activeStoreId}
            >
              Iniciar Visita (Check-in)
            </Button>
          ) : (
            <div className="flex items-center justify-center p-4 bg-muted rounded-lg gap-3 animate-fade-in">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-primary"></span>
              </span>
              <span className="font-medium text-lg">Check-in ativo desde {checkInTime}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {isVisitActive && (
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="text-primary" />
              Atuação na Loja
            </CardTitle>
            <CardDescription>Marque as categorias trabalhadas nesta visita.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {CATEGORIES.map((cat) => (
                <div key={cat.id} className="flex items-center space-x-2">
                  <Checkbox id={`cat-${cat.id}`} />
                  <label
                    htmlFor={`cat-${cat.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {cat.name}
                  </label>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Observações da Visita (Opcional)</label>
              <Textarea
                placeholder="Faltou estoque de produto X, gerente solicitou display novo..."
                className="resize-none"
                rows={3}
              />
            </div>

            <Button
              variant="default"
              className="w-full h-14 text-lg font-semibold bg-zinc-900 hover:bg-zinc-800 transition-transform active:scale-[0.98]"
              onClick={handleCheckOut}
            >
              Finalizar Visita (Check-out)
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
