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
import { toast } from 'sonner'
import { Gift, Plus, CalendarDays } from 'lucide-react'

export default function Brindes() {
  const { isAdmin, userLojaId } = useAuth()
  const [estoques, setEstoques] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalBaixaOpen, setModalBaixaOpen] = useState(false)
  const [modalNovoOpen, setModalNovoOpen] = useState(false)
  const [selectedBrinde, setSelectedBrinde] = useState<any>(null)
  const [qtdBaixa, setQtdBaixa] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const loadBrindes = async () => {
    setLoading(true)
    try {
      // Agora consultamos a View que criamos no banco. Muito mais rápido e limpo!
      let query = supabase.from('vw_estoque_brindes_detalhado').select('*').gt('quantidade', 0)

      if (!isAdmin && userLojaId) {
        query = query.eq('loja_id', userLojaId)
      }

      const { data, error } = await query

      if (error) throw error
      setEstoques(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar brindes:', error)
      toast.error('Erro ao carregar lista de brindes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userLojaId || isAdmin) {
      loadBrindes()
    }
  }, [userLojaId, isAdmin])

  const handleRegistrarBaixa = async () => {
    if (!selectedBrinde) return
    if (qtdBaixa <= 0 || qtdBaixa > selectedBrinde.quantidade) {
      toast.error('Quantidade inválida para baixa.')
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
      console.error(error)
      toast.error(error.message || 'Erro ao registrar baixa.')
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
                    
                    {/* Coluna de Ação / Campanha */}
                    <TableCell className="text-sm">
                      {item.acao_nome ? (
                        <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                          Ação: {item.acao_nome}
                        </Badge>
                      ) : item.campanha_nome ? (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          Campanha: {item.campanha_nome}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Avulso</span>
                      )}
                    </TableCell>

                    {/* Coluna de Período */}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Brinde</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center text-muted-foreground">
            <Gift className="h-12 w-12 mx-auto mb-2 opacity-50" />
            Formulário de cadastro será implementado aqui.
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
