import { useState, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Filter, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

// Dados mockados para exemplo (depois substituir pelo Supabase)
const MOCK_LOJAS = [
  { id: '1', codigo: 'LJ 01', nome: 'AVARE 1' },
  { id: '3', codigo: 'LJ 03', nome: 'MARILIA 1' },
  { id: '4', codigo: 'LJ 04', nome: 'ARACATUBA' },
  { id: '5', codigo: 'LJ 05', nome: 'P. PRUDENTE' },
  { id: '7', codigo: 'LJ 07', nome: 'MARILIA 2' },
  { id: '8', codigo: 'LJ 08', nome: 'BAURU 1' },
  { id: '9', codigo: 'LJ 09', nome: 'ASSIS' },
  { id: '10', codigo: 'LJ 10', nome: 'ANDRADINA' },
  { id: '11', codigo: 'LJ 11', nome: 'BIRIGUI' },
  { id: '12', codigo: 'LJ 12', nome: 'ITAPEVA' },
  { id: '13', codigo: 'LJ 13', nome: 'BAURU 2 SHOP' },
  { id: '14', codigo: 'LJ 14', nome: 'OURINHOS' },
  { id: '25', codigo: 'LJ 25', nome: 'SANTA CRUZ' },
  { id: '26', codigo: 'LJ 26', nome: 'BARAO' },
  { id: '29', codigo: 'LJ 29', nome: 'AVARE 2' },
  { id: '30', codigo: 'LJ 30', nome: 'ARICANDUVA' },
  { id: '32', codigo: 'LJ 32', nome: 'TEODORO' },
  { id: '33', codigo: 'LJ 33', nome: 'ITAIM' },
  { id: '34', codigo: 'LJ 34', nome: 'HIGIENOPOLIS' },
  { id: '35', codigo: 'LJ 35', nome: 'PENHA' },
  { id: '42', codigo: 'LJ 42', nome: 'BARUERI 2 OUT' },
  { id: '43', codigo: 'LJ 43', nome: 'BARUERI 1' },
  { id: '44', codigo: 'LJ 44', nome: 'PERUS' },
  { id: '45', codigo: 'LJ 45', nome: 'CRUZEIRO 1' },
  { id: '46', codigo: 'LJ 46', nome: 'GUARA 1 CENTRO' },
  { id: '47', codigo: 'LJ 47', nome: 'GUARA SHOP' },
  { id: '48', codigo: 'LJ 48', nome: 'LORENA' },
  { id: '49', codigo: 'LJ 49', nome: 'PINDA' },
  { id: '50', codigo: 'LJ 50', nome: 'TAUBATE 1' },
  { id: '51', codigo: 'LJ 51', nome: 'TAUBATE 2' },
  { id: '52', codigo: 'LJ 52', nome: 'COTIA' },
  { id: '54', codigo: 'LJ 54', nome: 'SAO ROQUE' },
  { id: '55', codigo: 'LJ 55', nome: 'BOTUCATU 1' },
  { id: '56', codigo: 'LJ 56', nome: 'BOTUCATU 2' },
  { id: '57', codigo: 'LJ 57', nome: 'JAU' },
  { id: '58', codigo: 'LJ 58', nome: 'SOROCABA 1' },
  { id: '60', codigo: 'LJ 60', nome: 'S.C 1 CENTRO' },
  { id: '61', codigo: 'LJ 61', nome: 'S.C 2 V. PRADO' },
  { id: '62', codigo: 'LJ 62', nome: 'S.C SHOP' },
  { id: '63', codigo: 'LJ 63', nome: 'RIBEIRAO SHOP' },
  { id: '64', codigo: 'LJ 64', nome: 'IPIRANGA' },
  { id: '66', codigo: 'LJ 66', nome: 'PIEDADE' },
  { id: '67', codigo: 'LJ 67', nome: 'FRAN. MORATO' },
  { id: '71', codigo: 'LJ 71', nome: 'PORTO FERREIRA' },
  { id: '72', codigo: 'LJ 72', nome: 'BRAGANCA SHOP' },
  { id: '77', codigo: 'LJ 77', nome: 'SJC 1 CENTRO' },
  { id: '79', codigo: 'LJ 79', nome: 'SJC SHOP' },
  { id: '80', codigo: 'LJ 80', nome: 'CACAPAVA' },
  { id: '81', codigo: 'LJ 81', nome: 'CRUZEIRO 2' },
  { id: '83', codigo: 'LJ 83', nome: 'JANDIRA' },
  { id: '84', codigo: 'LJ 84', nome: 'PRUDENSHOP' },
  { id: '85', codigo: 'LJ 85', nome: 'BRAGANCA I' },
  { id: '86', codigo: 'LJ 86', nome: 'BRAGANCA II' },
]

// Dados mockados de campanhas
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

export default function CampanhasPage() {
  const [mesAtual, setMesAtual] = useState(new Date(2026, 3, 1)) // Abril 2026
  const [lojaFiltro, setLojaFiltro] = useState('')
  const [campanhas, setCampanhas] = useState(MOCK_CAMPANHAS)
  const [loading, setLoading] = useState(false)

  const ano = mesAtual.getFullYear()
  const mes = mesAtual.getMonth()
  
  // Obter dias do mês
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const dias = Array.from({ length: diasNoMes }, (_, i) => i + 1)
  
  // Primeiro dia da semana (0 = Domingo)
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay()
  const diasCompletos = [...Array(primeiroDiaSemana).fill(null), ...dias]

  // Filtrar lojas
  const lojasFiltradas = MOCK_LOJAS.filter(loja =>
    loja.codigo.toLowerCase().includes(lojaFiltro.toLowerCase()) ||
    loja.nome.toLowerCase().includes(lojaFiltro.toLowerCase())
  )

  // Função para verificar se uma loja tem campanha em um dia específico
  function getCampanhaDoDia(lojaId: string, dia: number) {
    const dataAtual = new Date(ano, mes, dia)
    dataAtual.setHours(0, 0, 0, 0)
    
    const campanha = campanhas.find(c => {
      const inicio = new Date(c.data_inicio)
      const fim = new Date(c.data_fim)
      inicio.setHours(0, 0, 0, 0)
      fim.setHours(23, 59, 59, 999)
      
      return c.loja_id === lojaId && dataAtual >= inicio && dataAtual <= fim
    })
    
    return campanha
  }

  function mudarMes(delta: number) {
    setMesAtual(new Date(ano, mes + delta, 1))
  }

  return (
    <div className="p-6 space-y-6">
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
        <div className="w-32">
          <Input
            placeholder="Filtrar loja..."
            value={lojaFiltro}
            onChange={(e) => setLojaFiltro(e.target.value)}
            className="text-sm"
          />
        </div>
      </div>

      {/* Calendário Matricial */}
      <Card className="overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Cabeçalho com dias */}
            <div className="grid" style={{ gridTemplateColumns: `200px repeat(${diasCompletos.length}, 80px)` }}>
              <div className="bg-muted/50 p-3 font-semibold border-b border-r sticky left-0 bg-white z-10">
                Loja / Dia
              </div>
              {diasCompletos.map((dia, idx) => (
                <div key={idx} className="bg-muted/50 p-3 text-center font-semibold border-b border-r">
                  {dia ? (
                    <div>
                      <div className="text-sm">{dia}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(ano, mes, dia).toLocaleString('pt-BR', { weekday: 'short' })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">-</div>
                  )}
                </div>
              ))}
            </div>

            {/* Linhas das lojas */}
            {lojasFiltradas.map((loja) => (
              <div key={loja.id} className="grid" style={{ gridTemplateColumns: `200px repeat(${diasCompletos.length}, 80px)` }}>
                {/* Nome da loja */}
                <div className="p-3 border-b border-r font-medium bg-white sticky left-0 bg-white z-10">
                  <div className="text-sm font-semibold">{loja.codigo}</div>
                  <div className="text-xs text-muted-foreground">{loja.nome}</div>
                </div>

                {/* Dias */}
                {diasCompletos.map((dia, idx) => {
                  if (!dia) return <div key={idx} className="p-2 border-b border-r bg-gray-50"></div>
                  
                  const campanha = getCampanhaDoDia(loja.id, dia)
                  
                  return (
                    <div key={idx} className="p-2 border-b border-r align-top min-h-[80px] hover:bg-muted/20 transition-colors">
                      {campanha && (
                        <div className="space-y-1">
                          {campanha.promotores.map((promotor, pIdx) => (
                            <Badge key={pIdx} variant="secondary" className="text-xs w-full justify-start">
                              {promotor}
                            </Badge>
                          ))}
                        </div>
                      )}
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

      {/* Legenda */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-100 rounded"></div>
          <span>Campanha ativa</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-100 rounded"></div>
          <span>Sem campanha</span>
        </div>
      </div>
    </div>
  )
}
