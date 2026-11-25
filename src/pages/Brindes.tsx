import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Gift, Plus, CalendarDays, MapPin, Search, History, Settings2 } from 'lucide-react'

export default function Brindes() {
  const { isAdmin, userLojaId } = useAuth()
  const [estoques, setEstoques] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroSetor, setFiltroSetor] = useState('todos')
  const [busca, setBusca] = useState('')

  // Modais
  const [modalBaixaOpen, setModalBaixaOpen] = useState(false)
  const [modalNovoOpen, setModalNovoOpen] = useState(false)
  const [modalGerenciarOpen, setModalGerenciarOpen] = useState(false)
  
  const [selectedBrinde, setSelectedBrinde] = useState<any>(null)
  const [qtdMovimentacao, setQtdMovimentacao] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Dropdowns
  const [acoes, setAcoes] = useState<any[]>([])
  const [campanhas, setCampanhas] = useState<any[]>([])
  const [lojas, setLojas] = useState<any[]>([])
  
  // Form de Novo Brinde
  const [formBrinde, setFormBrinde] = useState({
    cod_boni: '', marca: '', descricao: '', validade: '', unidade: 'UN', 
    acao_id: '', campanha_id: '', quantidade_central: 0
  })

  // Form de Movimentação (Admin)
  const [formMov, setFormMov] = useState({
    tipo: 'transferencia', // transferencia ou baixa
    loja_id: '',
    quantidade: 1
  })

  const loadBrindes = async () => {
    setLoading(true)
    try {
      // 🔥 CONSULTA NA VIEW OTIMIZADA
      let query = supabase.from('vw_brindes_gestao').select('*')
      
      if (!isAdmin && userLojaId) {
        query = query.eq('loja_id', userLojaId)
      }

      const { data, error } = await query
      if (error) throw error
      setEstoques(data || [])
    } catch (error: any) {
      console.error(error)
      toast.error('Erro ao carregar lista de brindes.')
    } finally {
      setLoading(false)
    }
  }

  const loadOpcoes = async () => {
    const [resAcoes, resCampanhas, resLojas] = await Promise.all([
      supabase.from('acoes').select('id, nome, setor').order('nome'),
      supabase.from('campanhas').select('id, nome, setor').order('nome'),
      supabase.from('lojas').select('id, nome_loja, cod_loja').order('nome_loja')
    ])
    if (resAcoes.data) setAcoes(resAcoes.data)
    if (resCampanhas.data) setCampanhas(resCampanhas.data)
    if (resLojas.data) setLojas(resLojas.data)
  }

  useEffect(() => {
    if (userLojaId || isAdmin) {
      loadBrindes()
      if (isAdmin) loadOpcoes()
    }
  }, [userLojaId, isAdmin])

  // --- AÇÕES DO GERENTE ---
  const handleRegistrarBaixa = async () => {
    if (!selectedBrinde || qtdMovimentacao <= 0) return
    if (qtdMovimentacao > selectedBrinde.saldo_loja) {
      toast.error('Quantidade maior que o saldo da loja.')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.rpc('registrar_baixa_brinde', {
        p_brinde_id: selectedBrinde.brinde_id,
        p_loja_id: selectedBrinde.loja_id,
        p_quantidade: qtdMovimentacao,
        p_observacao: 'Baixa manual via portal (Gerente)',
      })
      if (error) throw error

      toast.success('Baixa registrada com sucesso!')
      setModalBaixaOpen(false)
      setQtdMovimentacao(1)
      loadBrindes()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao registrar baixa.')
    } finally {
      setSubmitting(false)
    }
  }

  // --- AÇÕES DO ADMIN (Gerenciamento) ---
  const handleSalvarMovimentacao = async () => {
    if (!selectedBrinde || formMov.quantidade <= 0 || !formMov.loja_id) {
      toast.error('Preencha todos os campos corretamente.')
      return
    }

    setSubmitting(true)
    try {
      if (formMov.tipo === 'transferencia') {
        // 1. Verifica saldo central
        if (formMov.quantidade > selectedBrinde.saldo_central) {
          toast.error(`Saldo central insuficiente (Disponível: ${selectedBrinde.saldo_central}).`)
          setSubmitting(false)
          return
        }

        // 2. Subtrai do central
        await supabase.from('brindes_estoque_central')
          .update({ quantidade: selectedBrinde.saldo_central - formMov.quantidade })
          .eq('brinde_id', selectedBrinde.brinde_id)

        // 3. Soma na loja (usando Upsert para garantir que a linha existe)
        const { error: erroLoja } = await supabase.rpc('adicionar_estoque_loja', {
          p_brinde_id: selectedBrinde.brinde_id,
          p_loja_id: formMov.loja_id,
          p_quantidade: formMov.quantidade
        })
        if (erroLoja) throw erroLoja

        // 4. Registra histórico
        await supabase.from('brindes_movimentacoes').insert([{
          brinde_id: selectedBrinde.brinde_id,
          tipo: 'transferencia_loja',
          quantidade: formMov.quantidade,
          loja_destino_id: formMov.loja_id,
          usuario_id: null // Admin
        }])

        toast.success('Transferência realizada!')
      } else {
        // Baixa manual do Admin (ex: perda, vencimento)
        if (formMov.quantidade > selectedBrinde.saldo_loja) {
          toast.error('Quantidade maior que o saldo da loja.')
          setSubmitting(false)
          return
        }
        
        await supabase.rpc('registrar_baixa_brinde', {
          p_brinde_id: selectedBrinde.brinde_id,
          p_loja_id: formMov.loja_id,
          p_quantidade: formMov.quantidade,
          p_observacao: 'Ajuste/Baixa manual (Admin)',
        })
        toast.success('Baixa manual registrada!')
      }

      setModalGerenciarOpen(false)
      loadBrindes()
    } catch (error: any) {
      toast.error(error.message || 'Erro na operação.')
    } finally {
      setSubmitting(false)
    }
  }

  // --- FILTROS ---
  const dadosFiltrados = estoques.filter(item => {
    const matchBusca = 
      item.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      item.cod_boni.toLowerCase().includes(busca.toLowerCase()) ||
      item.marca?.toLowerCase().includes(busca.toLowerCase())
    
    const setorItem = item.setor || item.campanha_setor || 'trade'
    const matchSetor = filtroSetor === 'todos' || setorItem === filtroSetor

    return matchBusca && matchSetor
  })

  const isProximoVencimento = (validade: string) => {
    if (!validade) return false
    const dataValidade = new Date(validade)
    const seisMeses = new Date()
    seisMeses.setMonth(seisMeses.getMonth() + 6)
    return dataValidade <= seisMeses
  }

  const formatarData = (dataStr: string) => {
    if (!dataStr) return '-'
    return new Date(`${dataStr}T00:00:00`).toLocaleDateString('pt-BR')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2 md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Brindes</h1>
          <p className="text-muted-foreground text-sm">
            {isAdmin ? 'Visão geral (Trade e Marketing).' : 'Saldo de brindes da sua loja.'}
          </p>
        </div>
        
        <div className="flex gap-2 items-center">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar brinde..." 
              className="pl-8" 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          {isAdmin && (
            <>
              <Select value={filtroSetor} onValueChange={setFiltroSetor}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Setores</SelectItem>
                  <SelectItem value="trade">Trade</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setModalNovoOpen(true)} className="bg-pink-600 hover:bg-pink-700">
                <Plus className="mr-2 h-4 w-4" /> Novo
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base">Saldo Atual</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cód. Boni</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Ação / Campanha</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead className="text-center">Saldo Loja</TableHead>
                    {isAdmin && <TableHead className="text-center">Central</TableHead>}
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosFiltrados.map((item) => (
                    <TableRow key={item.estoque_id}>
                      <TableCell className="font-medium">{item.cod_boni}</TableCell>
                      <TableCell>{item.descricao}</TableCell>
                      <TableCell>{item.marca}</TableCell>
                      <TableCell>
                        <span className="text-xs font-mono bg-gray-100 px-1 py-0.5 rounded mr-1">{item.cod_loja}</span>
                        <span className="text-sm">{item.nome_loja}</span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.acao_nome ? (
                          <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                            {item.acao_nome}
                          </Badge>
                        ) : item.campanha_nome ? (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            {item.campanha_nome}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">Avulso</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs uppercase font-bold text-muted-foreground">
                          {item.setor || item.campanha_setor || 'Trade'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {item.acao_inicio ? `${formatarData(item.acao_inicio)} a ${formatarData(item.acao_fim)}` : 
                           item.campanha_inicio ? `${formatarData(item.campanha_inicio)} a ${formatarData(item.campanha_fim)}` : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {formatarData(item.validade)}
                          {isProximoVencimento(item.validade) && (
                            <Badge variant="destructive" className="text-[10px] uppercase">Vencendo</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-lg">
                        {item.saldo_loja}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-center font-bold text-blue-600">
                          {item.saldo_central}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        {isAdmin ? (
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => {
                              setSelectedBrinde(item)
                              setFormMov({ tipo: 'transferencia', loja_id: item.loja_id, quantidade: 1 })
                              setModalGerenciarOpen(true)
                            }}
                          >
                            <Settings2 className="h-4 w-4 mr-1" /> Gerenciar
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedBrinde(item)
                              setQtdMovimentacao(1)
                              setModalBaixaOpen(true)
                            }}
                          >
                            Registrar Baixa
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {dadosFiltrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 11 : 9} className="text-center py-6 text-muted-foreground">
                        Nenhum brinde encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL: REGISTRAR BAIXA (Gerente) */}
      <Dialog open={modalBaixaOpen} onOpenChange={setModalBaixaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Baixa</DialogTitle>
          </DialogHeader>
          {selectedBrinde && (
            <div className="grid gap-4 py-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">{selectedBrinde.descricao}</p>
                <p className="text-sm text-muted-foreground">Saldo atual na loja: {selectedBrinde.saldo_loja} un.</p>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="qtd" className="text-right">Qtd. Utilizada</Label>
                <Input
                  id="qtd"
                  type="number"
                  min="1"
                  max={selectedBrinde.saldo_loja}
                  value={qtdMovimentacao}
                  onChange={(e) => setQtdMovimentacao(Number(e.target.value))}
                  className="col-span-3"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalBaixaOpen(false)}>Cancelar</Button>
            <Button onClick={handleRegistrarBaixa} disabled={submitting}>
              {submitting ? 'Salvando...' : 'Confirmar Baixa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: GERENCIAR (Admin) */}
      <Dialog open={modalGerenciarOpen} onOpenChange={setModalGerenciarOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gerenciar Estoque: {selectedBrinde?.descricao}</DialogTitle>
            <DialogDescription>
              Ações de controle para a equipe de Trade e Marketing.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="transferir" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="transferir">Transferir / Baixa</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>
            
            <TabsContent value="transferir" className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-md">
                <div>
                  <p className="text-xs text-muted-foreground">Estoque Central</p>
                  <p className="text-xl font-bold text-blue-600">{selectedBrinde?.saldo_central} un.</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estoque Loja ({selectedBrinde?.cod_loja})</p>
                  <p className="text-xl font-bold text-pink-600">{selectedBrinde?.saldo_loja} un.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Operação</Label>
                <Select value={formMov.tipo} onValueChange={(v) => setFormMov({...formMov, tipo: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transferencia">Transferir do Central para Loja</SelectItem>
                    <SelectItem value="baixa">Dar Baixa (Perda/Vencimento)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Loja de Destino</Label>
                  <Select value={formMov.loja_id} onValueChange={(v) => setFormMov({...formMov, loja_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {lojas.map(l => (
                        <SelectItem key={l.id} value={l.id}>{l.cod_loja} - {l.nome_loja}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input 
                    type="number" 
                    min="1" 
                    value={formMov.quantidade} 
                    onChange={(e) => setFormMov({...formMov, quantidade: Number(e.target.value)})} 
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="historico" className="py-4">
              <div className="text-center text-muted-foreground py-8">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>O histórico detalhado de movimentações será exibido aqui.</p>
                <p className="text-xs mt-2">(Funcionalidade em desenvolvimento)</p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalGerenciarOpen(false)}>Fechar</Button>
            <Button onClick={handleSalvarMovimentacao} disabled={submitting} className="bg-pink-600 hover:bg-pink-700">
              {submitting ? 'Processando...' : 'Confirmar Operação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: NOVO BRINDE (Admin) */}
      <Dialog open={modalNovoOpen} onOpenChange={setModalNovoOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Brinde</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Cód. Boni *</Label>
              <Input value={formBrinde.cod_boni} onChange={e => setFormBrinde({...formBrinde, cod_boni: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Marca</Label>
              <Input value={formBrinde.marca} onChange={e => setFormBrinde({...formBrinde, marca: e.target.value})} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Descrição *</Label>
              <Input value={formBrinde.descricao} onChange={e => setFormBrinde({...formBrinde, descricao: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Vincular a Ação (Trade)</Label>
              <Select value={formBrinde.acao_id} onValueChange={v => setFormBrinde({...formBrinde, acao_id: v, campanha_id: ''})}>
                <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {acoes.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vincular a Campanha (Marketing)</Label>
              <Select value={formBrinde.campanha_id} onValueChange={v => setFormBrinde({...formBrinde, campanha_id: v, acao_id: ''})}>
                <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {campanhas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Validade</Label>
              <Input type="date" value={formBrinde.validade} onChange={e => setFormBrinde({...formBrinde, validade: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Qtd. Entrada Central</Label>
              <Input type="number" min="0" value={formBrinde.quantidade_central} onChange={e => setFormBrinde({...formBrinde, quantidade_central: Number(e.target.value)})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalNovoOpen(false)}>Cancelar</Button>
            <Button onClick={() => toast.info("Em breve!")} className="bg-pink-600">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
