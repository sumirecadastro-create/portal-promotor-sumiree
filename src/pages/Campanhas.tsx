import { useState } from 'react'
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Plus, 
  TrendingUp, 
  CheckCircle2, 
  Clock,
  Store,
  Users
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Lista completa de lojas
const MOCK_LOJAS = [
  { id: '1', codigo: 'L01', nome: 'Avaré 1' },
  { id: '3', codigo: 'L03', nome: 'Marília 1' },
  { id: '4', codigo: 'L04', nome: 'Araçatuba' },
  { id: '5', codigo: 'L05', nome: 'Pres. Prudente' },
  { id: '7', codigo: 'L07', nome: 'Marilia 2' },
  { id: '8', codigo: 'L08', nome: 'Bauru 1' },
  { id: '9', codigo: 'L09', nome: 'Assis' },
  { id: '10', codigo: 'L10', nome: 'Andradina' },
  { id: '11', codigo: 'L11', nome: 'Birigui' },
  { id: '12', codigo: 'L12', nome: 'Itapeva' },
  { id: '13', codigo: 'L13', nome: 'Bauru 2 (shopping)' },
  { id: '14', codigo: 'L14', nome: 'Ourinhos' },
  { id: '25', codigo: 'L25', nome: 'Santa Cruz' },
  { id: '26', codigo: 'L26', nome: 'Republica' },
  { id: '29', codigo: 'L29', nome: 'Avaré 2' },
  { id: '30', codigo: 'L30', nome: 'Aricanduva Shopping' },
  { id: '32', codigo: 'L32', nome: 'Teodoro' },
  { id: '33', codigo: 'L33', nome: 'Itaim' },
  { id: '34', codigo: 'L34', nome: 'Higienopolis' },
  { id: '35', codigo: 'L35', nome: 'Penha' },
  { id: '40', codigo: 'L40', nome: 'Bragança 1' },
  { id: '41', codigo: 'L41', nome: 'Bragança 2' },
  { id: '42', codigo: 'L42', nome: 'Barueri 2' },
  { id: '43', codigo: 'L43', nome: 'Barueri 1' },
  { id: '44', codigo: 'L44', nome: 'Perus' },
  { id: '45', codigo: 'L45', nome: 'Cruzeiro' },
  { id: '46', codigo: 'L46', nome: 'Guaratinguetá 1' },
  { id: '47', codigo: 'L47', nome: 'Guaratinguetá 2 (Shopping)' },
  { id: '48', codigo: 'L48', nome: 'Lorena' },
  { id: '49', codigo: 'L49', nome: 'Pindamonhangada' },
  { id: '50', codigo: 'L50', nome: 'Taubaté 1' },
  { id: '51', codigo: 'L51', nome: 'Taubaté 2' },
  { id: '52', codigo: 'L52', nome: 'Cotia' },
  { id: '54', codigo: 'L54', nome: 'São Roque' },
  { id: '55', codigo: 'L55', nome: 'Botucatu 1' },
  { id: '56', codigo: 'L56', nome: 'Botucatu 2' },
  { id: '57', codigo: 'L57', nome: 'Jau' },
  { id: '58', codigo: 'L58', nome: 'Sorocaba' },
  { id: '60', codigo: 'L60', nome: 'São Carlos 1 (Centro)' },
  { id: '61', codigo: 'L61', nome: 'São Carlos 2 (Sallum)' },
  { id: '62', codigo: 'L62', nome: 'São Carlos 3 (Shopping)' },
  { id: '63', codigo: 'L63', nome: 'Ribeirao Preto (Shopping)' },
  { id: '64', codigo: 'L64', nome: 'Ipiranga' },
  { id: '66', codigo: 'L66', nome: 'Piedade' },
  { id: '67', codigo: 'L67', nome: 'Francisco Morato' },
  { id: '68', codigo: 'L68', nome: 'Marília 3' },
  { id: '70', codigo: 'L70', nome: 'Votorantim' },
  { id: '71', codigo: 'L71', nome: 'Porto Ferreira' },
  { id: '72', codigo: 'L72', nome: 'Bragança Shopping' },
  { id: '77', codigo: 'L77', nome: 'São José Centro' },
  { id: '78', codigo: 'L78', nome: 'São José Satélite' },
  { id: '79', codigo: 'L79', nome: 'São José América (shopping)' },
  { id: '80', codigo: 'L80', nome: 'Caçapava' },
  { id: '81', codigo: 'L81', nome: 'Cruzeiro 2' },
  { id: '83', codigo: 'L83', nome: 'Jandira' },
  { id: '84', codigo: 'L84', nome: 'Prudente Shopping' },
]

// Dados mockados de campanhas (exemplo)
const MOCK_CAMPANHAS = [
  {
    id: '1',
    nome: 'Promoção Haskell',
    loja_id: '1',
    data_inicio: '2026-04-01',
    data_fim: '2026-04-15',
    promotores: ['Haskell', 'Bauny', 'Vult'],
    status: 'ativa',
  },
  {
    id: '2',
    nome: 'Campanha Verão',
    loja_id: '3',
    data_inicio: '2026-04-05',
    data_fim: '2026-04-20',
    promotores: ['Ana', 'Carlos'],
    status: 'ativa',
  },
  {
    id: '3',
    nome: 'Liquidação',
    loja_id: '4',
    data_inicio: '2026-04-10',
    data_fim: '2026-04-25',
    promotores: ['Mariana', 'José', 'Paulo'],
    status: 'pendente',
  },
]

const PRIMARY_COLOR = '#FF1686'

export default function Campanhas() {
  const [mesAtual, setMesAtual] = useState(new Date(2026, 3, 1))
  const [lojaFiltro, setLojaFiltro] = useState('')
  const [campanhas] = useState(MOCK_CAMPANHAS)

  const ano = mesAtual.getFullYear()
  const mes = mesAtual.getMonth()
  
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const dias = Array.from({ length: diasNoMes }, (_, i) => i + 1)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const lojasFiltradas = MOCK_LOJAS.filter(loja =>
    loja.codigo.toLowerCase().includes(lojaFiltro.toLowerCase()) ||
    loja.nome.toLowerCase().includes(lojaFiltro.toLowerCase())
  )

  function getCampanhasDoDia(lojaId: string, dia: number) {
    const dataAtual = new Date(ano, mes, dia)
    dataAtual.setHours(0, 0, 0, 0)
    
    return campanhas.filter(c => {
      const inicio = new Date(c.data_inicio)
      const fim = new Date(c.data_fim)
      inicio.setHours(0, 0, 0, 0)
      fim.setHours(23, 59, 59, 999)
      return c.loja_id === lojaId && dataAtual >= inicio && dataAtual <= fim
    })
  }

  function isHoje(dia: number) {
    return hoje.getDate() === dia && 
           hoje.getMonth() === mes && 
           hoje.getFullYear() === ano
  }

  function mudarMes(delta: number) {
    setMesAtual(new Date(ano, mes + delta, 1))
  }

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div className="space-y-6">
      {/* Cabeçalho com cor principal */}
      <div className="rounded-lg p-6 text-white" style={{ background: `linear-gradient(135deg, ${PRIMARY_COLOR} 0%, #cc1168 100%)` }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-7 w-7" />
              Calendário de Campanhas
            </h1>
            <p className="text-pink-100 text-sm mt-1">
              Visualização rápida de todas as campanhas por loja
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white">
              <Filter className="h-4 w-4 mr-2" />
              Filtrar
            </Button>
            <Button variant="default" size="sm" style={{ background: 'white', color: PRIMARY_COLOR }} className="hover:bg-gray-100">
              <Plus className="h-4 w-4 mr-2" />
              Nova Campanha
            </Button>
          </div>
        </div>
      </div>

      {/* Controles do mês */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
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
        <h2 className="text-xl font-bold text-gray-800">
          {mesAtual.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="w-64">
          <Input
            placeholder="🔍 Filtrar loja..."
            value={lojaFiltro}
            onChange={(e) => setLojaFiltro(e.target.value)}
            className="border-gray-300 focus:border-pink-500 focus:ring-pink-500"
            style={{ '--tw-ring-color': PRIMARY_COLOR } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 text-sm bg-gray-50 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: PRIMARY_COLOR }}></div>
          <span>Campanha Ativa</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
          <span>Pendente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span>Concluída</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
          <span>Hoje</span>
        </div>
      </div>

      {/* Calendário */}
      <Card className="overflow-hidden shadow-lg border-0">
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-[1200px]">
            {/* Cabeçalho com dias */}
            <div className="grid border-b sticky top-0 z-20" 
              style={{ gridTemplateColumns: `250px repeat(${dias.length}, 70px)` }}>
              <div className="p-3 font-bold text-gray-700 sticky left-0 z-10 border-r" style={{ background: '#f9fafb' }}>
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4" style={{ color: PRIMARY_COLOR }} />
                  Loja / Dia
                </div>
              </div>
              {dias.map((dia) => {
                const data = new Date(ano, mes, dia)
                const nomeDia = diasSemana[data.getDay()]
                const isDiaHoje = isHoje(dia)
                return (
                  <div key={dia} className={cn(
                    "p-2 text-center font-semibold border-r",
                    isDiaHoje && "bg-yellow-50"
                  )}>
                    <div className="text-lg font-bold">{dia}</div>
                    <div className="text-xs text-gray-500">{nomeDia}</div>
                  </div>
                )
              })}
            </div>

            {/* Linhas das lojas */}
            {lojasFiltradas.map((loja) => (
              <div key={loja.id} className="grid border-b hover:bg-gray-50 transition-colors"
                style={{ gridTemplateColumns: `250px repeat(${dias.length}, 70px)` }}>
                
                {/* Info da loja */}
                <div className="p-3 font-medium sticky left-0 bg-white z-10 border-r">
                  <div className="font-bold text-gray-800">{loja.codigo}</div>
                  <div className="text-xs text-gray-500 truncate" title={loja.nome}>
                    {loja.nome}
                  </div>
                </div>

                {/* Dias */}
                {dias.map((dia) => {
                  const campanhasDoDia = getCampanhasDoDia(loja.id, dia)
                  const isDiaHoje = isHoje(dia)
                  
                  return (
                    <div key={dia} className={cn(
                      "p-1 border-r min-h-[80px] align-top",
                      isDiaHoje && "bg-yellow-50"
                    )}>
                      {campanhasDoDia.length > 0 ? (
                        <div className="space-y-1">
                          {campanhasDoDia.map((campanha) => (
                            <div 
                              key={campanha.id} 
                              className="p-1 rounded-md text-xs cursor-pointer transition-all hover:scale-105"
                              style={{ 
                                background: campanha.status === 'ativa' ? `${PRIMARY_COLOR}20` : 
                                           campanha.status === 'pendente' ? '#fef3c7' : '#dbeafe',
                                borderLeft: `2px solid ${campanha.status === 'ativa' ? PRIMARY_COLOR : 
                                                      campanha.status === 'pendente' ? '#f59e0b' : '#3b82f6'}`
                              }}
                            >
                              {campanha.promotores.map((p, idx) => (
                                <div key={idx} className="truncate">
                                  {p}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-gray-300 text-xs h-full flex items-center justify-center">
                          —
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}

            {lojasFiltradas.length === 0 && (
              <div className="text-center py-20 text-gray-500">
                <Store className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Nenhuma loja encontrada</p>
                <p className="text-sm">Tente ajustar o filtro de busca</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumo rápido com cor principal */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-white" style={{ background: `linear-gradient(135deg, ${PRIMARY_COLOR} 0%, #cc1168 100%)` }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Campanhas Ativas</p>
                <p className="text-2xl font-bold">{campanhas.filter(c => c.status === 'ativa').length}</p>
              </div>
              <TrendingUp className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-amber-500 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Pendentes</p>
                <p className="text-2xl font-bold">{campanhas.filter(c => c.status === 'pendente').length}</p>
              </div>
              <Clock className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-blue-500 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Lojas com Campanha</p>
                <p className="text-2xl font-bold">{new Set(campanhas.map(c => c.loja_id)).size}</p>
              </div>
              <Store className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-purple-500 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Promotores Alocados</p>
                <p className="text-2xl font-bold">{campanhas.reduce((acc, c) => acc + c.promotores.length, 0)}</p>
              </div>
              <Users className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
