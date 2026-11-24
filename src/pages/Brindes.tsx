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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Gift, Plus, CalendarDays } from 'lucide-react'

export default function Brindes() {
  const { isAdmin, userLojaId } = useAuth()
  const [estoques, setEstoques] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modais
  const [modalBaixaOpen, setModalBaixaOpen] = useState(false)
  const [modalNovoOpen, setModalNovoOpen] = useState(false)
  const [selectedBrinde, setSelectedBrinde] = useState<any>(null)
  const [qtdBaixa, setQtdBaixa] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Dropdowns de Ações e Campanhas
  const [acoes, setAcoes] = useState<any[]>([])
  const [campanhas, setCampanhas] = useState<any[]>([])
  
  // Formulário de Novo Brinde
  const [formBrinde, setFormBrinde] = useState({
    cod_boni: '', marca: '', descricao: '', validade: '', unidade: 'UN', 
    acao_id: '', campanha_id: '', quantidade_central: 0
  })

  const loadBrindes = async () => {
    setLoading(true)
    try {
      let query = supabase.from('vw_estoque_brindes_detalhado').select('*').gt('quantidade', 0)
      if (!isAdmin && userLojaId) query = query.eq('loja_id', userLojaId)
      
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
    const [resAcoes, resCampanhas] = await Promise.all([
      supabase.from('acoes').select('id, nome').order('nome'),
      supabase.from('campanhas').select('id, nome').order('nome')
    ])
    if (resAcoes.data) setAcoes(resAcoes.data)
    if (resCampanhas.data) setCampanhas(resCampanhas.data)
  }

  useEffect(() => {
    if (userLojaId || isAdmin) {
      loadBrindes()
      loadOpcoes()
    }
  }, [userLojaId, isAdmin])

  const handleRegistrarBaixa = async () => {
    if (!selectedBrinde) return
    if (qtdBaixa <= 0 || qtdBaixa > selectedBrinde.quantidade) {
      toast.error('Quantidade inválida.')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.rpc('registrar_baixa_brinde', {
        p_brinde_id: selectedBrinde.brinde_id,
        p_loja_id: selectedBrinde.loja_id,
        p_quantidade: qtdBaixa,
        p_observacao: 'Baixa manual via portal',
      })
      if (error) throw error

      toast.success('Baixa registrada com sucesso!')
      setModalBaixaOpen(false)
      setQtdBaixa(1)
      loadBrindes()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao registrar baixa.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSalvarNovoBrinde = async () => {
    if (!formBrinde.cod_boni || !formBrinde.descricao) {
      toast.error('Preencha os campos obrigatórios (Cód. Boni e Descrição).')
      return
    }

    setSubmitting(true)
    try {
      // 1. Insere o Brinde
      const { data: brindeData, error: brindeError } = await supabase
        .from('brindes')
        .insert([{
          cod_boni: formBrinde.cod_boni,
          marca: formBrinde.marca,
          descricao: formBrinde.descricao,
          validade: formBrinde.validade || null,
          unidade: formBrinde.unidade,
          acao_id: formBrinde.acao_id === 'none' ? null : formBrinde.acao_id || null,
          campanha_id: formBrinde.campanha_id === 'none' ? null : formBrinde.campanha_id || null,
        }])
        .select()
        .single()

      if (brindeError) throw brindeError

      // 2. Se informou quantidade, dá entrada no estoque central
      if (formBrinde.quantidade_central > 0) {
        const { error: estoqueError } = await supabase
          .from('brindes_estoque_central')
          .insert([{ brinde_id: brindeData.id, quantidade: formBrinde.quantidade_central }])
        
        if (estoqueError) throw estoqueError
      }

      toast.success('Brinde cadastrado com sucesso!')
      setModalNovoOpen(false)
      setFormBrinde({ cod_boni: '', marca: '', descricao: '', validade: '', unidade: 'UN', acao_id: '', campanha_id: '', quantidade_central: 0 })
      loadBrindes()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cadastrar brinde.')
    } finally {
      setSubmitting(false)
    }
  }

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
          <h1 className="text-2xl font-bold tracking-tight">Controle de Brindes</h1>
          <p className="text-muted-foreground text-sm">
            {isAdmin ? 'Visão geral de todos os estoques.' : 'Saldo de brindes da sua loja.'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setModalNovoOpen(true)} className="bg-pink-600 hover:bg-pink-700">
            <Plus className="mr-2 h-4 w-4" /> Novo Brinde
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saldo Atual</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cód. Boni</TableHead>
                  <TableHead>Descrição</TableHead>
                  {isAdmin && <TableHead>Loja</TableHead>}
                  <TableHead>Ação / Campanha</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead className="text-center">Saldo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estoques.map((item) => (
                  <TableRow key={item.estoque_id}>
                    <TableCell className="font-medium">{item.cod_boni}</TableCell>
                    <TableCell>
                      <span className="font-semibold">{item.marca}</span> - {item.descricao}
                    </TableCell>
                    {isAdmin && <TableCell>{item.nome_loja}</TableCell>}
                    
                    <TableCell className="text-sm">
                      {item.acao_nome ? (
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200 w-fit">
                            Ação: {item.acao_nome}
                          </Badge>
                          {item.acao_tipo && <span className="text-[10px] uppercase text-muted-foreground ml-1">Tipo: {item.acao_tipo}</span>}
                        </div>
                      ) : item.campanha_nome ? (
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 w-fit">
                            Campanha: {item.campanha_nome}
                          </Badge>
                          {item.campanha_tipo && <span className="text-[10px] uppercase text-muted-foreground ml-1">Tipo: {item.campanha_tipo}</span>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Avulso</span>
                      )}
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {item.acao_inicio ? `${formatarData(item.acao_inicio)} a ${formatarData(item.acao_fim)}` : 
                       item.campanha_inicio ? `${formatarData(item.campanha_inicio)} a ${formatarData(item.campanha_fim)}` : '-'}
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
                      {item.quantidade} <span className="text-xs font-normal text-muted-foreground">{item.unidade || 'UN'}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedBrinde(item)
                          setModalBaixaOpen(true)
                        }}
                      >
                        Registrar Baixa
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {estoques.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-6 text-muted-foreground">
                      Nenhum brinde com saldo encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Baixa */}
      <Dialog open={modalBaixaOpen} onOpenChange={setModalBaixaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Baixa</DialogTitle>
          </DialogHeader>
          {selectedBrinde && (
            <div className="grid gap-4 py-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">{selectedBrinde.descricao}</p>
                <p className="text-sm text-muted-foreground">Saldo disponível: {selectedBrinde.quantidade} un.</p>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="qtd" className="text-right">Qtd. Utilizada</Label>
                <Input
                  id="qtd"
                  type="number"
                  min="1"
                  max={selectedBrinde.quantidade}
                  value={qtdBaixa}
                  onChange={(e) => setQtdBaixa(Number(e.target.value))}
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

      {/* Modal de Novo Brinde */}
      <Dialog open={modalNovoOpen} onOpenChange={setModalNovoOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Brinde</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Cód. Boni *</Label>
              <Input value={formBrinde.cod_boni} onChange={e => setFormBrinde({...formBrinde, cod_boni: e.target.value})} placeholder="Ex: 280177BONI" />
            </div>
            <div className="space-y-2">
              <Label>Marca</Label>
              <Input value={formBrinde.marca} onChange={e => setFormBrinde({...formBrinde, marca: e.target.value})} placeholder="Ex: Avon" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Descrição do Produto *</Label>
              <Input value={formBrinde.descricao} onChange={e => setFormBrinde({...formBrinde, descricao: e.target.value})} placeholder="Ex: Necessaire Rosa" />
            </div>
            
            <div className="space-y-2">
              <Label>Vincular a uma Ação (Opcional)</Label>
              <Select value={formBrinde.acao_id} onValueChange={v => setFormBrinde({...formBrinde, acao_id: v, campanha_id: ''})}>
                <SelectTrigger><SelectValue placeholder="Selecione a Ação" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (Avulso)</SelectItem>
                  {acoes.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vincular a uma Campanha (Opcional)</Label>
              <Select value={formBrinde.campanha_id} onValueChange={v => setFormBrinde({...formBrinde, campanha_id: v, acao_id: ''})}>
                <SelectTrigger><SelectValue placeholder="Selecione a Campanha" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (Avulso)</SelectItem>
                  {campanhas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Validade</Label>
              <Input type="date" value={formBrinde.validade} onChange={e => setFormBrinde({...formBrinde, validade: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Qtd. Inicial no Estoque Central</Label>
              <Input type="number" min="0" value={formBrinde.quantidade_central} onChange={e => setFormBrinde({...formBrinde, quantidade_central: Number(e.target.value)})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalNovoOpen(false)}>Cancelar</Button>
            <Button onClick={handleSalvarNovoBrinde} disabled={submitting} className="bg-pink-600 hover:bg-pink-700">
              {submitting ? 'Salvando...' : 'Cadastrar Brinde'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
