import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { FileSpreadsheet, Upload, CheckCircle2, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'

interface ImportarAcoesModalProps {
  isOpen: boolean
  onClose: () => void
  lojas: any[] // Lista de lojas para fazermos o de-para pelo código da loja
  onSuccess: () => void // Função para recarregar o calendário após importar
}

export function ImportarAcoesModal({ isOpen, onClose, lojas, onSuccess }: ImportarAcoesModalProps) {
  const [dadosPlanilha, setDadosPlanilha] = useState<any[]>([])
  const [processando, setProcessando] = useState(false)
  const [relatorio, setRelatorio] = useState<{ sucesso: number; erro: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      
      setDadosPlanilha(data)
      setRelatorio(null) // Reseta relatório anterior
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  const handleImportar = async () => {
    if (dadosPlanilha.length === 0) return
    setProcessando(true)
    
    let sucessos = 0
    let erros = 0

    try {
      for (const row of dadosPlanilha) {
        // Mapeamento flexível das colunas da planilha
        const nome = row['Nome da Ação'] || row['Nome'] || row['nome']
        const tipo = (row['Tipo'] || row['tipo'] || 'compre_ganhe').toLowerCase().replace(/ /g, '_')
        const dataInicio = row['Data Início'] || row['Início'] || row['data_inicio']
        const dataFim = row['Data Fim'] || row['Fim'] || row['data_fim']
        const descricao = row['Descrição'] || row['descricao'] || ''
        const setor = (row['Setor'] || row['setor'] || 'trade').toLowerCase()
        const codLojasStr = String(row['Lojas (Códigos)'] || row['Lojas'] || row['cod_lojas'] || '')
        
        // Validações básicas
        if (!nome || !dataInicio || !dataFim) {
          erros++
          continue
        }

        // De-para das lojas: Separa por vírgula e busca os IDs
        const codigosLojas = codLojasStr.split(',').map(c => c.trim())
        const lojasIds = codigosLojas.map(cod => {
          const lojaEncontrada = lojas.find(l => l.codigo === cod || l.nome_loja === cod)
          return lojaEncontrada?.id
        }).filter(id => id !== undefined)

        if (lojasIds.length === 0) {
          erros++
          continue
        }

        // Converter datas do Excel para formato ISO (YYYY-MM-DD)
        // O Excel às vezes manda número serial, às vezes string. O SheetJS tenta lidar, mas vamos garantir.
        const formatarData = (d: any) => {
          if (!d) return null;
          // Se for número (data serial do Excel)
          if (typeof d === 'number') {
            const date = new Date(Math.round((d - 25569) * 86400 * 1000));
            return date.toISOString().split('T')[0];
          }
          // Se for string
          const date = new Date(d);
          return !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : null;
        }

        const dtInicioFormatada = formatarData(dataInicio)
        const dtFimFormatada = formatarData(dataFim)

        if (!dtInicioFormatada || !dtFimFormatada) {
          erros++
          continue
        }

        // 1. Insere a Ação
        const { data: acaoInserida, error: erroAcao } = await supabase
          .from('acoes')
          .insert([{
            nome: nome,
            tipo: tipo,
            data_inicio: dtInicioFormatada,
            data_fim: dtFimFormatada,
            status: 'agendada',
            setor: setor,
            descricao: descricao
          }])
          .select('id')
          .single()

        if (erroAcao || !acaoInserida) {
          console.error(erroAcao)
          erros++
          continue
        }

        // 2. Insere as Lojas da Ação
        const relacoes = lojasIds.map(lojaId => ({
          acao_id: acaoInserida.id,
          loja_id: lojaId
        }))

        const { error: erroRelacao } = await supabase.from('acoes_lojas').insert(relacoes)
        if (erroRelacao) {
          console.error(erroRelacao)
          erros++
          continue
        }

        sucessos++
      }

      setRelatorio({ sucesso: sucessos, erro: erros })
      if (sucessos > 0) {
        toast.success(`${sucessos} ações importadas com sucesso!`)
        onSuccess()
      }
    } catch (error) {
      console.error(error)
      toast.error('Erro catastrófico ao importar ações.')
    } finally {
      setProcessando(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-pink-600" /> 
            Importar Ações em Massa
          </DialogTitle>
          <DialogDescription>
            Faça o upload de uma planilha (.xlsx ou .csv). As colunas devem ser: <strong>Nome da Ação, Tipo, Data Início, Data Fim, Setor, Lojas (Códigos)</strong>.
            <br/>* Para "Lojas", separe os códigos por vírgula (ex: L01, L02).
          </DialogDescription>
        </DialogHeader>

        {dadosPlanilha.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg bg-gray-50 mt-4">
            <Upload className="h-10 w-10 text-gray-400 mb-4" />
            <p className="text-sm text-gray-500 mb-4">Clique no botão abaixo para selecionar a planilha</p>
            <Button onClick={() => fileInputRef.current?.click()} variant="outline">
              Selecionar Arquivo
            </Button>
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileChange} 
            />
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between bg-blue-50 p-3 rounded-md text-blue-800">
              <span>Planilha carregada: {dadosPlanilha.length} linhas encontradas.</span>
              <Button variant="link" size="sm" onClick={() => setDadosPlanilha([])}>Trocar arquivo</Button>
            </div>

            <div className="max-h-[40vh] overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome da Ação</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Lojas (Cód.)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosPlanilha.map((row: any, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row['Nome da Ação'] || row['Nome']}</TableCell>
                      <TableCell>{row['Tipo'] || 'compre_ganhe'}</TableCell>
                      <TableCell>{row['Data Início'] || row['Início']}</TableCell>
                      <TableCell>{row['Data Fim'] || row['Fim']}</TableCell>
                      <TableCell>{row['Setor'] || 'trade'}</TableCell>
                      <TableCell>{row['Lojas (Códigos)'] || row['Lojas']}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {relatorio && (
              <div className="flex gap-4 mt-2">
                <div className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm">
                  <CheckCircle2 className="h-4 w-4 mr-1" /> {relatorio.sucesso} importadas
                </div>
                {relatorio.erro > 0 && (
                  <div className="flex items-center text-red-600 bg-red-50 px-3 py-1 rounded-full text-sm">
                    <AlertCircle className="h-4 w-4 mr-1" /> {relatorio.erro} com erro
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button 
            onClick={handleImportar} 
            disabled={dadosPlanilha.length === 0 || processando} 
            className="bg-pink-600 hover:bg-pink-700"
          >
            {processando ? 'Importando...' : 'Confirmar Importação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
