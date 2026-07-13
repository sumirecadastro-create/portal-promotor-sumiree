import { useState } from 'react'
import * as XLSX from 'xlsx'
import { 
  Upload, 
  X, 
  Check, 
  AlertCircle, 
  Loader2,
  FileSpreadsheet,
  Download
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

interface ImportResult {
  sucesso: number
  erros: number
  detalhes: string[]
}

interface Props {
  onImportComplete: () => void
}

export function ImportarPromotoresExcel({ onImportComplete }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const { toast } = useToast()

  // 🔥 MODELO ESPERADO DA PLANILHA
  const COLUNAS_ESPERADAS = [
    'nome',
    'lojas',  // códigos separados por vírgula
    'gerentes', // nomes dos gerentes
    'dias_semana',
    'contato_responsavel',
    'marcas' // opcional
  ]

  // 🔥 BAIXAR MODELO DE PLANILHA
  const baixarModelo = () => {
    const modelo = [
      {
        nome: 'Exemplo Promotor',
        lojas: 'L46, L49',
        gerentes: 'ELISANGELA, MARCOS',
        dias_semana: 'Segunda à Sábado',
        contato_responsavel: '(12) 322-8038',
        marcas: 'BIO EXTRATUS, HASKELL'
      }
    ]

    const ws = XLSX.utils.json_to_sheet(modelo)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Promotores')
    
    // Ajustar largura das colunas
    ws['!cols'] = [
      { wch: 25 },
      { wch: 20 },
      { wch: 25 },
      { wch: 25 },
      { wch: 20 },
      { wch: 25 }
    ]

    XLSX.writeFile(wb, 'modelo_importacao_promotores.xlsx')
    toast({
      title: 'Modelo baixado',
      description: 'Preencha a planilha com os dados dos promotores.',
    })
  }

  // 🔥 PROCESSAR ARQUIVO
  const processarArquivo = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(sheet)

        if (jsonData.length === 0) {
          toast({
            variant: 'destructive',
            title: 'Erro',
            description: 'A planilha está vazia.',
          })
          return
        }

        // Validar cabeçalhos
        const colunas = Object.keys(jsonData[0])
        const colunasEsperadas = COLUNAS_ESPERADAS.map(c => c.toLowerCase())
        const colunasEncontradas = colunas.map(c => c.toLowerCase())
        
        const colunasFaltando = colunasEsperadas.filter(c => !colunasEncontradas.includes(c))
        
        if (colunasFaltando.length > 0) {
          toast({
            variant: 'destructive',
            title: 'Erro no cabeçalho',
            description: `Colunas faltando: ${colunasFaltando.join(', ')}`,
          })
          return
        }

        setPreviewData(jsonData)
        setFile(file)
        toast({
          title: 'Arquivo carregado',
          description: `${jsonData.length} registros encontrados.`,
        })
      } catch (error) {
        console.error('Erro ao ler arquivo:', error)
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Não foi possível ler o arquivo. Verifique se é um Excel válido.',
        })
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // 🔥 IMPORTAR DADOS
  const importarDados = async () => {
    if (previewData.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Nenhum dado para importar.',
      })
      return
    }

    setLoading(true)
    setProgress(0)
    setResult(null)

    const erros: string[] = []
    let sucesso = 0

    try {
      // 🔥 Buscar todos os gerentes por nome
      const { data: gerentesData } = await supabase
        .from('gerentes')
        .select('id, nome_gerente')

      const gerentesMap = new Map()
      gerentesData?.forEach(g => {
        gerentesMap.set(g.nome_gerente.toLowerCase().trim(), g.id)
      })

      // 🔥 Buscar todas as lojas por código
      const { data: lojasData } = await supabase
        .from('lojas')
        .select('id, cod_loja, nome_loja')

      const lojasMap = new Map()
      lojasData?.forEach(l => {
        lojasMap.set(l.cod_loja.trim(), l.id)
      })

      // 🔥 Buscar todas as marcas por nome
      const { data: marcasData } = await supabase
        .from('marcas')
        .select('id, nome')

      const marcasMap = new Map()
      marcasData?.forEach(m => {
        marcasMap.set(m.nome.toLowerCase().trim(), m.id)
      })

      // Processar cada linha
      for (let i = 0; i < previewData.length; i++) {
        const row = previewData[i]
        const linha = i + 2 // +2 por causa do cabeçalho

        try {
          // Validar nome
          const nome = row['nome']?.trim()
          if (!nome) {
            erros.push(`Linha ${linha}: Nome do promotor é obrigatório`)
            continue
          }

          // Processar lojas
          const lojasCodigos = row['lojas']?.split(',').map((s: string) => s.trim()).filter(Boolean) || []
          const lojaIds = lojasCodigos
            .map((cod: string) => lojasMap.get(cod))
            .filter(Boolean)

          if (lojaIds.length === 0) {
            erros.push(`Linha ${linha}: Nenhuma loja válida encontrada para "${nome}"`)
            continue
          }

          // Processar gerentes
          const gerentesNomes = row['gerentes']?.split(',').map((s: string) => s.trim()).filter(Boolean) || []
          const gerenteIds = gerentesNomes
            .map((nome: string) => gerentesMap.get(nome.toLowerCase().trim()))
            .filter(Boolean)

          // Processar marcas (opcional)
          const marcasNomes = row['marcas']?.split(',').map((s: string) => s.trim()).filter(Boolean) || []
          const marcaIds = marcasNomes
            .map((nome: string) => marcasMap.get(nome.toLowerCase().trim()))
            .filter(Boolean)

          // 🔥 CRIAR PROMOTOR
          const { data: promotor, error: promotorError } = await supabase
            .from('promotores')
            .insert({
              promotor_nome: nome,
              gerente_ids: gerenteIds.length > 0 ? gerenteIds : null,
              dias_semana: row['dias_semana']?.trim() || null,
              contato_responsavel: row['contato_responsavel']?.trim() || null,
              status: 'ativo'
            })
            .select()
            .single()

          if (promotorError) {
            erros.push(`Linha ${linha}: Erro ao criar promotor "${nome}" - ${promotorError.message}`)
            continue
          }

          // Vincular lojas
          if (lojaIds.length > 0) {
            const relacoesLojas = lojaIds.map((lojaId: string) => ({
              promotor_id: promotor.id,
              loja_id: lojaId
            }))

            const { error: lojasError } = await supabase
              .from('promotores_lojas')
              .insert(relacoesLojas)

            if (lojasError) {
              erros.push(`Linha ${linha}: Erro ao vincular lojas - ${lojasError.message}`)
            }
          }

          // Vincular marcas
          if (marcaIds.length > 0) {
            const relacoesMarcas = marcaIds.map((marcaId: string) => ({
              promotor_id: promotor.id,
              marca_id: marcaId
            }))

            const { error: marcasError } = await supabase
              .from('promotores_marcas')
              .insert(relacoesMarcas)

            if (marcasError) {
              erros.push(`Linha ${linha}: Erro ao vincular marcas - ${marcasError.message}`)
            }
          }

          sucesso++

        } catch (error: any) {
          erros.push(`Linha ${linha}: ${error.message || 'Erro desconhecido'}`)
        }

        // Atualizar progresso
        setProgress(((i + 1) / previewData.length) * 100)
      }

      // 🔥 RESULTADO FINAL
      const resultFinal = {
        sucesso,
        erros: erros.length,
        detalhes: erros
      }

      setResult(resultFinal)

      if (erros.length === 0) {
        toast({
          title: '🎉 Importação concluída!',
          description: `${sucesso} promotor(es) importado(s) com sucesso.`,
        })
        onImportComplete()
        setTimeout(() => setOpen(false), 3000)
      } else {
        toast({
          variant: 'destructive',
          title: '⚠️ Importação com erros',
          description: `${sucesso} importados, ${erros.length} erros.`,
        })
      }

    } catch (error: any) {
      console.error('Erro na importação:', error)
      toast({
        variant: 'destructive',
        title: 'Erro na importação',
        description: error.message || 'Ocorreu um erro inesperado.',
      })
    } finally {
      setLoading(false)
    }
  }

  // 🔥 FECHAR MODAL E LIMPAR
  const handleClose = () => {
    if (loading) return
    setOpen(false)
    setFile(null)
    setPreviewData([])
    setResult(null)
    setProgress(0)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Importar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Promotores via Excel
          </DialogTitle>
          <DialogDescription>
            Importe múltiplos promotores de uma planilha Excel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Área de upload */}
          {!previewData.length ? (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Clique para selecionar ou arraste um arquivo Excel
              </p>
              <div className="flex justify-center gap-2">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      processarArquivo(e.target.files[0])
                    }
                  }}
                  className="hidden"
                  id="file-upload"
                />
                <Button asChild variant="outline">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Selecionar arquivo
                  </label>
                </Button>
                <Button variant="ghost" onClick={baixarModelo}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar modelo
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Formatos: .xlsx, .xls • Máx. 5MB
              </p>
            </div>
          ) : (
            <>
              {/* Resumo do arquivo */}
              <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  <span className="font-medium">{file?.name}</span>
                  <Badge variant="secondary">{previewData.length} registros</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null)
                    setPreviewData([])
                  }}
                  disabled={loading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Prévia dos dados */}
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[200px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        {COLUNAS_ESPERADAS.map((col) => (
                          <th key={col} className="px-3 py-2 text-left font-medium">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="border-t">
                          {COLUNAS_ESPERADAS.map((col) => (
                            <td key={col} className="px-3 py-2 truncate max-w-[150px]">
                              {row[col] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {previewData.length > 5 && (
                        <tr className="border-t">
                          <td colSpan={COLUNAS_ESPERADAS.length} className="px-3 py-2 text-center text-muted-foreground">
                            + {previewData.length - 5} registros
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Progresso */}
              {loading && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    Importando... {Math.round(progress)}%
                  </p>
                </div>
              )}

              {/* Resultado */}
              {result && (
                <div className={cn(
                  "p-3 rounded-lg",
                  result.erros === 0 ? "bg-green-50" : "bg-yellow-50"
                )}>
                  <div className="flex items-center gap-2">
                    {result.erros === 0 ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    )}
                    <span className="font-medium">
                      {result.sucesso} importado(s)
                      {result.erros > 0 && `, ${result.erros} erro(s)`}
                    </span>
                  </div>
                  {result.detalhes.length > 0 && (
                    <div className="mt-2 max-h-[100px] overflow-auto text-xs text-muted-foreground">
                      {result.detalhes.map((err, idx) => (
                        <div key={idx}>• {err}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          {previewData.length > 0 && !result && (
            <Button onClick={importarDados} disabled={loading} style={{ background: '#FF1686' }}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar {previewData.length} registros
                </>
              )}
            </Button>
          )}
          {result && (
            <Button onClick={handleClose}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
