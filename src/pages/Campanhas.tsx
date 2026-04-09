import { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Filter, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

// Dados mockados
const MOCK_LOJAS = [
  { id: '1', codigo: 'LJ 01', nome: 'AVARE 1' },
  { id: '3', codigo: 'LJ 03', nome: 'MARILIA 1' },
  { id: '4', codigo: 'LJ 04', nome: 'ARACATUBA' },
  { id: '5', codigo: 'LJ 05', nome: 'P. PRUDENTE' },
  { id: '7', codigo: 'LJ 07', nome: 'MARILIA 2' },
  { id: '8', codigo: 'LJ 08', nome: 'BAURU 1' },
]

const MOCK_CAMPANHAS = [
  {
    id: '1',
    nome: 'Campanha Haskell',
    loja_id: '1',
    data_inicio: '2026-04-01',
    data_fim: '2026-04-15',
    promotores: ['Haskell', 'Bauny', 'Vult']
  }
]

export default function Campanhas() {
  const [mesAtual, setMesAtual] = useState(new Date(2026, 3, 1)) // Abril 2026
  const [lojaFiltro, setLojaFiltro] = useState('')
  const [campanhas] = useState(MOCK_CAMPANHAS)

  const ano = mesAtual.getFullYear()
  const mes = mesAtual.getMonth()
  
  // Apenas os dias do mês (sem dias vazios)
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const dias = Array.from({ length: diasNoMes }, (_, i) => i + 1)

  const lojasFiltradas = MOCK_LOJAS.filter(loja =>
    loja.codigo.toLowerCase().includes(lojaFiltro.toLowerCase()) ||
    loja.nome.toLowerCase().includes(lojaFiltro.toLowerCase())
  )

  function getCampanhaDoDia(lojaId: string, dia: number) {
    const dataAtual = new Date(ano, mes, dia)
    dataAtual.setHours(0, 0, 0, 0)
    
    return campanhas.find(c => {
      const inicio = new Date(c.data_inicio)
      const fim = new Date(c.data_fim)
      inicio.setHours(0, 0, 0, 0)
      fim.setHours(23, 59, 59, 999)
      return c.loja_id === lojaId && dataAtual >= inicio && dataAtual <= fim
    })
  }

  function mudarMes(delta: number) {
    setMesAtual(new Date(ano, mes + delta, 1))
  }

  // Nomes dos dias da semana
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Calendário de Campanhas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visualização por loja e período
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtrar
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nova Campanha
          </Button>
        </div>
      </div>

      {/* Controles do mês */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => mudarMes(-1)}>
            <ChevronLeft className="h-4 w-4" />
            Mês anterior
          </Button>
          <Button variant="outline" size="sm" onClick={() => mudarMes(1)}>
            Próximo mês
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="text-xl font-semibold">
          {mesAtual.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="w-48">
          <Input
            placeholder="Filtrar loja..."
            value={lojaFiltro}
            onChange={(e) => setLojaFiltro(e.target.value)}
          />
        </div>
      </div>

      {/* Calendário - Sem colunas vazias */}
      <Card className="overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Cabeçalho com dias da semana */}
            <div className="grid border-b" style={{ gridTemplateColumns: `200px repeat(${dias.length}, 80px)` }}>
              <div className="bg-muted p-3 font-semibold sticky left-0 bg-white z-10">
                Loja / Dia
              </div>
              {dias.map((dia) => {
                const data = new Date(ano, mes, dia)
                const nomeDia = diasSemana[data.getDay()]
                return (
                  <div key={dia} className="bg-muted p-3 text-center font-semibold">
                    <div className="text-sm">{dia}</div>
                    <div className="text-xs text-muted-foreground">{nomeDia}</div>
                  </div>
                )
              })}
            </div>

            {/* Linhas das lojas */}
            {lojasFiltradas.map((loja) => (
              <div key={loja.id} className="grid border-b" style={{ gridTemplateColumns: `200px repeat(${dias.length}, 80px)` }}>
                {/* Nome da loja */}
                <div className="p-3 font-medium sticky left-0 bg-white z-10">
                  <div className="text-sm font-semibold">{loja.codigo}</div>
                  <div className="text-xs text-muted-foreground">{loja.nome}</div>
                </div>

                {/* Dias do mês */}
                {dias.map((dia) => {
                  const campanha = getCampanhaDoDia(loja.id, dia)
                  
                  return (
                    <div key={dia} className="p-2 align-top min-h-[80px] hover:bg-muted/20">
                      {campanha && campanha.promotores.map((promotor, pIdx) => (
                        <Badge key={pIdx} variant="secondary" className="text-xs mb-1 w-full justify-start">
                          {promotor}
                        </Badge>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}

            {lojasFiltradas.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma loja encontrada
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
