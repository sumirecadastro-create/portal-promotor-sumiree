import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Upload, FileSpreadsheet } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Loja {
  id: string
  cod_loja: string
  loja_nome: string
}

export default function Lojas() {
  const [lojas, setLojas] = useState<Loja[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const result = await pb.collection('lojas').getList(1, 1000, {
        sort: 'cod_loja'
      })
      setLojas(result.items as Loja[])
    } catch (error) {
      console.error('Erro ao carregar lojas:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('lojas', () => loadData())

  const filteredLojas = lojas.filter(loja =>
    loja.cod_loja?.toLowerCase().includes(search.toLowerCase()) ||
    loja.loja_nome?.toLowerCase().includes(search.toLowerCase())
  )

  const handleViewDetails = (id: string) => {
    navigate(`/lojas/${id}`)
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    
    try {
      // Ler o arquivo CSV
      const text = await file.text()
      const lines = text.split('\n')
      const headers = lines[0].split(',').map(h => h.trim())
      
      // Verificar cabeçalhos esperados
      const codIndex = headers.findIndex(h => h.toLowerCase() === 'cod_loja')
      const nomeIndex = headers.findIndex(h => h.toLowerCase() === 'loja_nome')
      
      if (codIndex === -1 || nomeIndex === -1) {
        throw new Error('Arquivo deve conter as colunas: cod_loja, loja_nome')
      }
      
      let imported = 0
      let errors = 0
      
      // Processar cada linha (pular cabeçalho)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
        const cod_loja = values[codIndex]
        const loja_nome = values[nomeIndex]
        
        if (cod_loja && loja_nome) {
          try {
            // Verificar se já existe
            const existing = await pb.collection('lojas').getFirstListItem(`cod_loja="${cod_loja}"`)
            if (existing) {
              // Atualizar se já existe
              await pb.collection('lojas').update(existing.id, { cod_loja, loja_nome })
              imported++
            }
          } catch {
            // Criar novo se não existe
            await pb.collection('lojas').create({ cod_loja, loja_nome })
            imported++
          }
        } else {
          errors++
        }
      }
      
      toast({
        title: 'Importação concluída',
        description: `${imported} lojas importadas/atualizadas. ${errors} linhas ignoradas.`,
      })
      
      // Recarregar dados
      await loadData()
      
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na importação',
        description: error.message || 'Verifique o formato do arquivo',
      })
    } finally {
      setImporting(false)
      // Limpar o input para permitir novo upload
      event.target.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou nome..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Importar Lojas (CSV)
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Importar Lojas</DialogTitle>
              <DialogDescription>
                Faça upload de um arquivo CSV com as colunas: <strong>cod_loja</strong> e <strong>loja_nome</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Selecione um arquivo CSV para importar
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImport}
                  disabled={importing}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 cursor-pointer"
                >
                  {importing ? 'Importando...' : 'Selecionar arquivo CSV'}
                </label>
              </div>
              <div className="text-xs text-muted-foreground">
                <p>Formato esperado (CSV):</p>
                <code className="block bg-muted p-2 rounded mt-1">
                  cod_loja,loja_nome<br />
                  LJ001,Loja Centro<br />
                  LJ002,Loja Norte<br />
                  LJ003,Loja Sul
                </code>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Unidades Sumirê ({lojas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome da Loja</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLojas.map((loja) => (
                  <TableRow key={loja.id}>
                    <TableCell className="font-medium">{loja.cod_loja}</TableCell>
                    <TableCell>{loja.loja_nome}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(loja.id)}
                      >
                        Ver Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLojas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                      Nenhuma loja encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
