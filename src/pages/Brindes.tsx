import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // Ajuste para o caminho do seu cliente Supabase
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner'; // Se usar sonner para notificações

type BrindeEstoque = {
  brinde_id: number;
  loja_id: string;
  quantidade: number;
  brindes: {
    cod_boni: string;
    descricao: string;
    validade: string;
  };
};

export default function Brindes() {
  const [estoques, setEstoques] = useState<BrindeEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrinde, setSelectedBrinde] = useState<BrindeEstoque | null>(null);
  const [qtdBaixa, setQtdBaixa] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    carregarBrindes();
  }, []);

  async function carregarBrindes() {
    setLoading(true);
    // Busca os brindes que estão no estoque da loja do usuário logado
    const { data, error } = await supabase
      .from('brindes_estoque_lojas')
      .select(`
        brinde_id,
        loja_id,
        quantidade,
        brindes (cod_boni, descricao, validade)
      `);

    if (error) {
      console.error(error);
      toast.error('Erro ao carregar brindes.');
    } else {
      setEstoques(data as any);
    }
    setLoading(false);
  }

  async function handleRegistrarBaixa() {
    if (!selectedBrinde) return;

    if (qtdBaixa <= 0 || qtdBaixa > selectedBrinde.quantidade) {
      toast.error('Quantidade inválida.');
      return;
    }

    // Chama a função RPC que criamos no banco
    const { error } = await supabase.rpc('registrar_baixa_brinde', {
      p_brinde_id: selectedBrinde.brinde_id,
      p_loja_id: selectedBrinde.loja_id,
      p_quantidade: qtdBaixa,
      p_observacao: 'Baixa manual pelo portal'
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Baixa registrada com sucesso!');
      setIsModalOpen(false);
      setQtdBaixa(1);
      carregarBrindes(); // Recarrega a lista para atualizar o saldo
    }
  }

  // Função para verificar se está próximo do vencimento (6 meses)
  const isProximoVencimento = (validade: string) => {
    if (!validade) return false;
    const dataValidade = new Date(validade);
    const seisMeses = new Date();
    seisMeses.setMonth(seisMeses.getMonth() + 6);
    return dataValidade <= seisMeses;
  };

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Meus Brindes</h1>
      </div>
      
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cód. Boni</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Saldo Atual</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {estoques.map((item) => (
              <TableRow key={`${item.brinde_id}-${item.loja_id}`}>
                <TableCell>{item.brindes.cod_boni}</TableCell>
                <TableCell>{item.brindes.descricao}</TableCell>
                <TableCell>
                  {item.brindes.validade ? new Date(item.brindes.validade).toLocaleDateString('pt-BR') : '-'}
                  {isProximoVencimento(item.brindes.validade) && (
                    <Badge variant="destructive" className="ml-2">Vencendo!</Badge>
                  )}
                </TableCell>
                <TableCell className="font-bold">{item.quantidade}</TableCell>
                <TableCell>
                  <Dialog open={isModalOpen && selectedBrinde?.brinde_id === item.brinde_id} onOpenChange={(open) => {
                    setIsModalOpen(open);
                    if(open) setSelectedBrinde(item);
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={item.quantidade <= 0}>
                        Registrar Baixa
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Registrar Baixa - {item.brindes.descricao}</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="qtd" className="text-right">Quantidade</Label>
                          <Input 
                            id="qtd" 
                            type="number" 
                            min="1" 
                            max={item.quantidade}
                            value={qtdBaixa}
                            onChange={(e) => setQtdBaixa(Number(e.target.value))}
                            className="col-span-3" 
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleRegistrarBaixa}>Confirmar Baixa</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
            {estoques.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                  Nenhum brinde encontrado no seu estoque.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
