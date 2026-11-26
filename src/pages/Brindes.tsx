import { useEffect, useState, useRef } from 'react'
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
import { toast } from 'sonner'
import { Plus, CalendarDays, Search, Settings2, Download, Upload, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'

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
  const [modalImportarOpen, setModalImportarOpen] = useState(false)
  
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
    acao_id: '', campanha_id: '', loja_id: '', quantidade: 0
  })

  // Form de Ajuste (Admin)
  const [formAjuste, setFormAjuste] = useState({
    tipo: 'entrada',
    quantidade: 1,
    observacao: ''
  })

  // Dados da Importação
  const [dadosImportacao, setDadosImportacao] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadBrindes = async () => {
    setLoading(true)
    try {
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

  // --- GERENTE: BAIXA ---
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
        p_observacao: 'Baixa via portal (Gerente)',
      })
      if (error) throw error
      toast.success('Baixa registrada!')
      setModalBaixaOpen(false)
      setQtdMovimentacao(1)
      loadBrindes()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao registrar baixa.')
    } finally {
      setSubmitting(false)
    }
  }

  // --- ADMIN: NOVO BRINDE ---
  const handleSalvarNovoBrinde = async () => {
    if (!formBrinde.cod_boni || !formBrinde.descricao || !formBrinde.loja_id) {
      toast.error('Preencha Cód. Boni, Descrição e Loja de Destino.')
      return
    }

    setSubmitting(true)
    try {
      const { data: novoBrinde, error: brindeError } = await supabase
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
        .select().single()

      if (brindeError) throw brindeError

      if (formBrinde.quantidade > 0) {
        const { error: erroEstoque } = await supabase.rpc('ajustar_estoque_loja', {
          p_brinde_id: novoBrinde.id,
          p_loja_id: formBrinde.loja_id,
          p_quantidade: formBrinde.quantidade,
          p_tipo: 'entrada',
          p_observacao: 'Carga inicial de cadastro'
        })
        if (erroEstoque) throw erroEstoque
      }

      toast.success('Brinde cadastrado com sucesso!')
      setModalNovoOpen(false)
      setFormBrinde({ cod_boni: '', marca: '', descricao: '', validade: '', unidade: 'UN', acao_id: '', campanha_id: '', loja_id: '', quantidade: 0 })
      loadBrindes()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cadastrar brinde.')
    } finally {
      setSubmitting(false)
    }
  }

  // --- ADMIN: AJUSTE MANUAL ---
  const handleAjustarEstoque = async () => {
    if (!selectedBrinde || formAjuste.quantidade <= 0) return

    setSubmitting(true)
    try {
      const { error } = await supabase.rpc('ajustar_estoque_loja', {
        p_brinde_id: selectedBrinde.brinde_id,
        p_loja_id: selectedBrinde.loja_id,
        p_quantidade: formAjuste.quantidade,
        p_tipo: formAjuste.tipo,
        p_observacao: formAjuste.observacao || 'Ajuste manual'
      })

      if (error) throw error
      toast.success('Estoque ajustado com sucesso!')
      setModalGerenciarOpen(false)
      loadBrindes()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao ajustar estoque.')
    } finally {
      setSubmitting(false)
    }
  }

  // --- IMPORTAR E EXPORTAR ---
  const handleExportar = () => {
    const dadosExportar = dadosFiltrados.map(item => ({
      'Cód. Boni': item.cod_boni,
      'Descrição': item.descricao,
      'Marca': item.marca,
      'Cód. Loja': item.cod_loja,
      'Loja': item.nome_loja,
      'Ação/Campanha': item.acao_nome || item.campanha_nome || 'Avulso',
      'Setor': item.setor || item.campanha_setor || 'Trade',
      'Validade': item.validade ? new Date(item.validade).toLocaleDateString('pt-BR') : '',
      'Saldo Loja': item.saldo_loja
    }))

    const ws = XLSX.utils.json_to_sheet(dadosExportar)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Brindes")
    XLSX.writeFile(wb, `brindes_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success('Planilha exportada com sucesso!')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const bstr = evt.target?.result
      const wb = XLSX.read(bstr, { type: 'binary' })
      const wsname = wb.SheetNames[0]
      const ws = wb.Sheets[wsname]
      const data = XLSX.utils.sheet_to_json(ws)
      
      setDadosImportacao(data)
      setModalImportarOpen(true)
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  const confirmarImportacao = async () => {
    setSubmitting(true)
    try {
      // 1. Filtra os dados válidos da planilha
      const brindesValidos = dadosImportacao.map((row: any) => {
        const loja = lojas.find(l => l.cod_loja === String(row['Cód. Loja']) || l.nome_loja === row['Loja'])
        return {
          cod_boni: String(row['Cód. Boni'] || ''),
          marca: row['Marca'] || '',
          descricao: row['Descrição'] || '',
          validade: row['Validade'] ? new Date(row['Validade']).toISOString() : null,
          unidade: 'UN',
          loja_id: loja?.id,
          quantidade: Number(row['Saldo Loja']) || 0
        }
      }).filter(b => b.cod_boni && b.descricao && b.loja_id) // Só pega quem tem os dados mínimos

      if (brindesValidos.length === 0) {
        toast.error('Nenhum dado válido encontrado. Verifique as colunas.')
        setSubmitting(false)
        return
      }

      // 2. Loop para inserir/atualizar cada brinde
      let sucessos = 0
      for (const item of brindesValidos) {
        // Verifica se o brinde já existe (pelo cod_boni)
        const { data: existente } = await supabase.from('brindes').select('id').eq('cod_boni', item.cod_boni).maybeSingle()
        
        let brindeId = existente?.id

        if (existente) {
          // Se existe, atualiza a marca/desc/validade
          await supabase.from('brindes').update({
            marca: item.marca, descricao: item.descricao, validade: item.validade
          }).eq('id', brindeId)
        } else {
          // Se não existe, cria
          const { data: novo } = await supabase.from('brindes').insert([{
            cod_boni: item.cod_boni, marca: item.marca, descricao: item.descricao, validade: item.validade, unidade: 'UN'
          }]).select().single()
          brindeId = novo?.id
        }

        // 3. Atualiza o estoque da loja
        if (brindeId && item.quantidade > 0) {
          await supabase.rpc('ajustar_estoque_loja', {
            p_brinde_id: brindeId,
            p_loja_id: item.loja_id,
            p_quantidade: item.quantidade,
            p_tipo: 'entrada',
            p_observacao: 'Importação via planilha'
          })
        }
        sucessos++
      }

      toast.success(`${sucessos} brindes importados/atualizados com sucesso!`)
      setModalImportarOpen(false)
      loadBrindes()
    } catch (error: any) {
      console.error(error)
      toast.error('Erro ao processar importação em lote.')
    } finally {
      setSubmitting(false)
    }
  }

  // --- FILTROS ---
  const dadosFiltrados = estoques.filter(item => {
    const termoBusca = busca.toLowerCase()
    const matchBusca = 
      item.descricao?.toLowerCase().includes(termoBusca) ||
      item.cod_boni?.toLowerCase().includes(termoBusca) ||
      item.marca?.toLowerCase().includes(termoBusca) ||
      item.nome_loja?.toLowerCase().includes(termoBusca) ||
      item.cod_loja?.toLowerCase().includes(termoBusca)
    
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
            {isAdmin ? 'Visão geral por loja.' : 'Saldo de brindes da sua loja.'}
          </p>
        </div>
      </div>

      {/* 🔥 BARRA DE FERRAMENTAS DO ADMIN (Agora com espaço garantido) */}
      {isAdmin && (
        <div className="flex flex-col sm:flex-row gap-2 items-center bg-white p-2 rounded-lg border shadow-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar brinde, marca ou loja..." 
              className="pl-8" 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          
          <Select value={filtroSetor} onValueChange={setFiltroSetor}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Setor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Setores</SelectItem>
              <SelectItem value="trade">Trade</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={handleExportar} className="flex-1 sm:flex-none">
              <Download className="h-4 w-4 mr-2" /> Exportar
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1 sm:flex-none">
              <Upload className="h-4 w-4 mr-2" /> Importar
            </Button>
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileChange} 
            />
            <Button onClick={() => setModalNovoOpen(true)} className="flex-1 sm:flex-none bg-pink-600 hover:bg-pink-700">
              <Plus className="mr-2 h-4 w-4" /> Novo Brinde
            </Button>
          </div>
        </div>
      )}

      {/* Para Gerente, apenas a busca */}
      {!isAdmin && (
        <div className="flex gap-2 items-center w-full sm:w-72">
          <div className="relative w-full">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar brinde..." 
              className="pl-8" 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>
      )}

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
                      <TableCell className="text-right">
                        {isAdmin ? (
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => {
                              setSelectedBrinde(item)
                              setFormAjuste({ tipo: 'entrada', quantidade: 1, observacao: '' })
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
                      <TableCell colSpan={10} className="text-center py-6 text-muted-foreground">
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
                <p className="text-sm text-muted-foreground">Saldo atual: {selectedBrinde.saldo_loja} un.</p>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Estoque: {selectedBrinde?.descricao}</DialogTitle>
            <DialogDescription>
              Adicione ou remova unidades do estoque desta loja.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-gray-50 p-3 rounded-md text-center">
              <p className="text-xs text-muted-foreground">Saldo Atual na Loja ({selectedBrinde?.cod_loja})</p>
              <p className="text-2xl font-bold text-pink-600">{selectedBrinde?.saldo_loja} un.</p>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Ajuste</Label>
              <Select value={formAjuste.tipo} onValueChange={(v) => setFormAjuste({...formAjuste, tipo: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Adicionar (Entrada de Brinde)</SelectItem>
                  <SelectItem value="baixa">Remover (Perda / Vencimento)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input 
                  type="number" 
                  min="1" 
                  value={formAjuste.quantidade} 
                  onChange={(e) => setFormAjuste({...formAjuste, quantidade: Number(e.target.value)})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Motivo (Opcional)</Label>
                <Input 
                  placeholder="Ex: Reposição, Avaria..." 
                  value={formAjuste.observacao}
                  onChange={(e) => setFormAjuste({...formAjuste, observacao: e.target.value})}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalGerenciarOpen(false)}>Cancelar</Button>
            <Button onClick={handleAjustarEstoque} disabled={submitting} className="bg-pink-600">
              {submitting ? 'Processando...' : 'Confirmar Ajuste'}
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
              <Label>Loja de Destino *</Label>
              <Select value={formBrinde.loja_id} onValueChange={v => setFormBrinde({...formBrinde, loja_id: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione a loja..." /></SelectTrigger>
                <SelectContent>
                  {lojas.map(l => <SelectItem key={l.id} value={l.id}>{l.cod_loja} - {l.nome_loja}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Qtd. Inicial na Loja</Label>
              <Input type="number" min="0" value={formBrinde.quantidade} onChange={e => setFormBrinde({...formBrinde, quantidade: Number(e.target.value)})} />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalNovoOpen(false)}>Cancelar</Button>
            <Button onClick={handleSalvarNovoBrinde} disabled={submitting} className="bg-pink-600">
              {submitting ? 'Salvando...' : 'Salvar Brinde'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE IMPORTAÇÃO */}
      <Dialog open={modalImportarOpen} onOpenChange={setModalImportarOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-600" /> 
              Pré-visualização da Importação
            </DialogTitle>
            <DialogDescription>
              Confira os dados lidos da planilha antes de salvar no sistema.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cód. Boni</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dadosImportacao.map((row: any, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row['Cód. Boni']}</TableCell>
                    <TableCell>{row['Descrição']}</TableCell>
                    <TableCell>{row['Marca']}</TableCell>
                    <TableCell>{row['Loja']}</TableCell>
                    <TableCell>{row['Saldo Loja']}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalImportarOpen(false)}>Cancelar</Button>
            <Button onClick={confirmarImportacao} disabled={submitting} className="bg-green-600 hover:bg-green-700">
              {submitting ? 'Processando...' : 'Confirmar e Salvar no Banco'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
