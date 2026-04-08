import { CalendarioCampanhas } from '@/components/CalendarioCampanhas'

export default function CampanhasPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center justify-between">
        <h1 className="text-2xl font-bold">🎯 Calendário de Campanhas</h1>
      </div>
      
      <CalendarioCampanhas />
    </div>
  )
}
