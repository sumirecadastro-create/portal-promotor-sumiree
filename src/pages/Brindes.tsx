import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase' // ⚠️ CONFIRME O CAMINHO DO SEU SUPABASE AQUI
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
import { toast } from 'sonner' // Se não usar sonner, pode usar o useToast do shadcn

export default function Brindes() {
  const { user, isAdmin, isGerente, userLojaId } = useAuth()
  const [estoques, setEstoques] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedBrinde, setSelectedBrinde] = useState<any>(null)
  const [qtdBaixa, setQtdBaixa] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Função para carregar os dados (adaptada para Admin ou Gerente)
  const loadBrindes = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('brindes_estoque_lojas')
        .select(`
          id,
          brinde_id,
          loja_id,
          quantidade,
          brindes ( cod_boni, marca, descricao, validade ),
          lojas ( nome_loja )
        `)
        .gt('quantidade', 0) // Só mostra o que tem saldo

      // Se NÃO for Admin, filtra apenas pela loja do usuário logado
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

  // Função que chama a RPC de baixa que criamos no banco
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
      setModalOpen(false)
      setQtdBaixa(1)
      loadBrindes() // Recarrega a lista
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || 'Erro ao registrar baixa.')
    } finally {
      setSubmitting(false)
    }
  }

  // Verifica se o brinde vence em menos de 6 meses
  const isProximoVencimento = (validade: string) => {
    if (!validade) return false
    const dataValidade = new Date(validade)
    const seisMeses = new Date()
    seisMeses.setMonth(seisMeses.getMonth() + 6)
    return dataValidade <= seisMeses
  }

  const formatarData = (dataStr: string) => {
    if (!dataStr) return '-'
    // Adiciona T00:00 para evitar problemas de fuso horário
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
                  <TableHead>Validade</TableHead>
                  <TableHead className="text-center">Saldo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estoques.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.brindes?.cod_boni}</TableCell>
                    <TableCell>
                      <span className="font-semibold">{item.brindes?.marca}</span> - {item.brindes?.descricao}
                    </TableCell>
                    {isAdmin && <TableCell>{item.lojas?.nome_loja}</TableCell>}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {formatarData(item.brindes?.validade)}
                        {isProximoVencimento(item.brindes?.validade) && (
                          <Badge variant="destructive" className="text-[10px] uppercase">Vencendo</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold text-lg">
                      {item.quantidade} <span className="text-xs font-normal text-muted-foreground">{item.brindes?.unidade || 'UN'}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedBrinde(item)
                          setModalOpen(true)
                        }}
                      >
                        Registrar Baixa
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {estoques.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-6 text-muted-foreground">
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
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Baixa</DialogTitle>
          </DialogHeader>
          {selectedBrinde && (
            <div className="grid gap-4 py-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">{selectedBrinde.brindes?.descricao}</p>
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
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleRegistrarBaixa} disabled={submitting}>
              {submitting ? 'Salvando...' : 'Confirmar Baixa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
