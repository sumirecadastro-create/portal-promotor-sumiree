import { useState, useEffect } from 'react'
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
  Users,
  Loader2,
  X,
  Save,
  Calendar as CalendarIcon,
  MapPin,
  UserPlus
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

// Interfaces
interface Loja {
  id: string
  nome_loja: string
  codigo?: string
}

interface Campanha {
  id: string
  nome: string
  loja_id: string
  data_inicio: string
  data_fim: string
  promotores: string[]
  status: string
  tipo?: string
}

const PRIMARY_COLOR = '#FF1686'

export default function Campanhas() {
  // Estados principais
  const [mesAtual, setMesAtual] = useState(new Date())
  const [lojaFiltro, setLojaFiltro] = useState('')
  const [lojas, setLojas] = useState<Loja[]>([])
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Estados dos modais
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [showNovaCampanhaModal, setShowNovaCampanhaModal] = useState(false)
  
  // Estados dos filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroRegiao, setFiltroRegiao] = useState<string>('todas')
  
  // Estado da nova campanha
  const [novaCampanha, setNovaCampanha] = useState({
    nome: '',
    loja_id: '',
    data_inicio: '',
    data_fim: '',
    promotores: [''],
    status: 'pendente' as const,
    tipo: 'promocao'
  })
  const [salvando, setSalvando] = useState(false)

  const ano = mesAtual.getFullYear()
  const mes = mesAtual.getMonth()
  
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const dias = Array.from({ length: diasNoMes }, (_, i) => i + 1)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  // Buscar lojas do Supabase
  async function carregarLojas() {
    try {
      const { data, error } = await supabase
        .from('lojas')
        .select('*')
        .order('nome_loja', { ascending: true })
      
      if (error) throw error
      
      const lojasFormatadas = (data || []).map((loja: any) => ({
        id: loja.id,
        nome_loja: loja.nome_loja,
        codigo: loja.codigo || loja.nome_loja.substring(0, 8)
      }))
      
      setLojas(lojasFormatadas)
    } catch (err) {
      console.error('Erro ao carregar lojas:', err)
      setError('Não foi possível carregar as lojas')
    }
  }

  // Buscar campanhas do Supabase
  async function carregarCampanhas() {
    try {
      const startDate = new Date(ano, mes, 1).toISOString()
      const endDate = new Date(ano, mes + 1, 0).toISOString()
      
      let query = supabase
        .from('campanhas')
        .select('*')
        .gte('data_inicio', startDate)
        .lte('data_fim', endDate)
      
      // Aplicar filtro de status
      if (filtroStatus !== 'todos') {
        query = query.eq('status', filtroStatus)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      setCampanhas(data || [])
    } catch (err) {
      console.error('Erro ao carregar campanhas:', err)
    }
  }

  // Carregar todos os dados
  async function carregarDados() {
    setLoading(true)
    setError(null)
    await Promise.all([carregarLojas(), carregarCampanhas()])
    setLoading(false)
  }

  useEffect(() => {
    carregarDados()
  }, [mesAtual, filtroStatus])

  // Filtrar lojas
  const lojasFiltradas = lojas.filter(loja => {
    const matchTexto = loja.nome_loja.toLowerCase().includes(lojaFiltro.toLowerCase()) ||
      (loja.codigo && loja.codigo.toLowerCase().includes(lojaFiltro.toLowerCase()))
    
    // Filtro de região (mock - você pode adicionar campo região na tabela lojas)
    const matchRegiao = filtroRegiao === 'todas' || true
    // TODO: Implementar filtro de região quando tiver o campo na tabela
    
    return matchTexto && matchRegiao
  })

  function getCampanhasDoDia(lojaId: string, dia: number) {
    const dataAtual = new Date(ano, mes, dia)
    dataAtual.setHours(0, 0, 0, 0)
    
    return campanhas.filter(campanha => {
      const inicio = new Date(campanha.data_inicio)
      const fim = new Date(campanha.data_fim)
      inicio.setHours(0, 0, 0, 0)
      fim.setHours(23, 59, 59, 999)
      return campanha.loja_id === lojaId && dataAtual >= inicio && dataAtual <= fim
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

  // Função para criar nova campanha
  async function criarNovaCampanha() {
    if (!novaCampanha.nome || !novaCampanha.loja_id || !novaCampanha.data_inicio || !novaCampanha.data_fim) {
      alert('Preencha todos os campos obrigatórios')
      return
    }

    setSalvando(true)
    try {
      const { error } = await supabase
        .from('campanhas')
        .insert([{
          nome: novaCampanha.nome,
          loja_id: novaCampanha.loja_id,
          data_inicio: novaCampanha.data_inicio,
          data_fim: novaCampanha.data_fim,
          promotores: novaCampanha.promotores.filter(p => p.trim() !== ''),
          status: novaCampanha.status,
          tipo: novaCampanha.tipo
        }])

      if (error) throw error

      // Fechar modal e recarregar dados
      setShowNovaCampanhaModal(false)
      setNovaCampanha({
        nome: '',
        loja_id: '',
        data_inicio: '',
        data_fim: '',
        promotores: [''],
        status: 'pendente',
        tipo: 'promocao'
      })
      await carregarCampanhas()
      
      alert('Campanha criada com sucesso!')
    } catch (err) {
      console.error('Erro ao criar campanha:', err)
      alert('Erro ao criar campanha. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  // Adicionar campo de promotor
  function adicionarPromotor() {
    setNovaCampanha({
      ...novaCampanha,
      promotores: [...novaCampanha.promotores, '']
    })
  }

  function removerPromotor(index: number) {
    setNovaCampanha({
      ...novaCampanha,
      promotores: novaCampanha.promotores.filter((_, i) => i !== index)
    })
  }

  function atualizarPromotor(index: number, valor: string) {
    const novosPromotores = [...novaCampanha.promotores]
    novosPromotores[index] = valor
    setNovaCampanha({ ...novaCampanha, promotores: novosPromotores })
  }

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: PRIMARY_COLOR }} />
          <p className="text-gray-500">Carregando calendário...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="rounded-lg p-6 text-white" style={{ background: `linear-gradient(135deg, ${PRIMARY_COLOR} 0%, #cc1168 100%)` }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-7 w-7" />
              Calendário de Campanhas
            </h1>
            <p className="text-pink-100 text-sm mt-1">
              {lojas.length} lojas cadastradas • {campanhas.length} campanhas no período
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              size="sm" 
              className="bg-white/20 hover:bg-white/30 text-white"
              onClick={() => setShowFilterModal(true)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtrar
              {(filtroStatus !== 'todos' || filtroRegiao !== 'todas') && (
                <Badge className="ml-2 bg-white text-pink-600" variant="secondary">
                  Ativo
                </Badge>
              )}
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              style={{ background: 'white', color: PRIMARY_COLOR }} 
              className="hover:bg-gray-100"
              onClick={() => setShowNovaCampanhaModal(true)}
            >
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
            placeholder="🔍 Filtrar loja por nome..."
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
        <div className="flex items-center gap-2 ml-4 text-gray-500 text-xs">
          <span>Total: {lojasFiltradas.length} lojas exibidas</span>
        </div>
      </div>

      {/* Calendário - mantém o mesmo código anterior */}
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
                
                <div className="p-3 font-medium sticky left-0 bg-white z-10 border-r">
                  <div className="font-bold text-gray-800">
                    {loja.codigo || loja.id.substring(0, 6)}
                  </div>
                  <div className="text-xs text-gray-500 truncate" title={loja.nome_loja}>
                    {loja.nome_loja}
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
                              {campanha.promotores?.map((p, idx) => (
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

      {/* Modal de Filtro */}
      <Dialog open={showFilterModal} onOpenChange={setShowFilterModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Filtrar Campanhas</DialogTitle>
            <DialogDescription>
              Ajuste os filtros para visualizar as campanhas desejadas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione um status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Região</Label>
              <Select value={filtroRegiao} onValueChange={setFiltroRegiao}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione uma região" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="norte">Norte</SelectItem>
                  <SelectItem value="sul">Sul</SelectItem>
                  <SelectItem value="leste">Leste</SelectItem>
                  <SelectItem value="oeste">Oeste</SelectItem>
                  <SelectItem value="centro">Centro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setFiltroStatus('todos')
              setFiltroRegiao('todas')
            }}>
              Limpar filtros
            </Button>
            <Button onClick={() => setShowFilterModal(false)} style={{ background: PRIMARY_COLOR }}>
              Aplicar filtros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Nova Campanha */}
      <Dialog open={showNovaCampanhaModal} onOpenChange={setShowNovaCampanhaModal}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Nova Campanha</DialogTitle>
            <DialogDescription>
              Preencha os dados da campanha. Os campos com * são obrigatórios.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Nome da Campanha *</Label>
              <Input
                className="col-span-3"
                value={novaCampanha.nome}
                onChange={(e) => setNovaCampanha({ ...novaCampanha, nome: e.target.value })}
                placeholder="Ex: Promoção de Verão"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Loja *</Label>
              <Select value={novaCampanha.loja_id} onValueChange={(value) => setNovaCampanha({ ...novaCampanha, loja_id: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione uma loja" />
                </SelectTrigger>
                <SelectContent>
                  {lojas.map((loja) => (
                    <SelectItem key={loja.id} value={loja.id}>
                      {loja.codigo} - {loja.nome_loja}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Data Início *</Label>
              <Input
                type="date"
                className="col-span-3"
                value={novaCampanha.data_inicio}
                onChange={(e) => setNovaCampanha({ ...novaCampanha, data_inicio: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Data Fim *</Label>
              <Input
                type="date"
                className="col-span-3"
                value={novaCampanha.data_fim}
                onChange={(e) => setNovaCampanha({ ...novaCampanha, data_fim: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Status</Label>
              <Select value={novaCampanha.status} onValueChange={(value: any) => setNovaCampanha({ ...novaCampanha, status: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Promotores</Label>
              <div className="col-span-3 space-y-2">
                {novaCampanha.promotores.map((promotor, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={promotor}
                      onChange={(e) => atualizarPromotor(index, e.target.value)}
                      placeholder={`Promotor ${index + 1}`}
                      className="flex-1"
                    />
                    {novaCampanha.promotores.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removerPromotor(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={adicionarPromotor}
                  className="w-full"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Adicionar promotor
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovaCampanhaModal(false)}>
              Cancelar
            </Button>
            <Button onClick={criarNovaCampanha} disabled={salvando} style={{ background: PRIMARY_COLOR }}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar campanha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
