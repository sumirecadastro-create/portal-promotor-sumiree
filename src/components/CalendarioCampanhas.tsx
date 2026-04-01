import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarDays, Plus } from 'lucide-react'
import { getCampanhasComLojas, CampanhaComLojas } from '@/services/campanhas'
import { getLojas } from '@/services/lojas'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Loja {
  id: string
  cod_loja: string
  nome_loja: string
}

export function CalendarioCampanhas() {
  const [campanhas, setCampanhas] = useState<CampanhaComLojas[]>([])
  const [lojas, setLojas] = useState<Loja[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // Formulário de nova campanha
  const [newCampanha, setNewCampanha] = useState({
    nome: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    cor: '#FF1686'
  })
  const [selectedLojas, setSelectedLojas] = useState<string[]>([])

  const loadData = async () => {
    try {
      const [campanhasData, lojasData] = await Promise.all([
        getCampanhasComLojas(),
        getLojas()
      ])
      setCampanhas(campanhasData)
      setLojas(lojasData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateCampanha = async () => {
    if (!newCampanha.nome || !newCampanha.data_inicio || !newCampanha.data_fim) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
      })
      return
    }

    setSaving(true)
    try {
      const result = await createCampanha(newCampanha, selectedLojas)
      if (result) {
        toast({
          title: 'Sucesso',
          description: 'Campanha criada com sucesso!',
        })
        setOpen(false)
        setNewCampanha({
          nome: '',
          descricao: '',
          data_inicio: '',
          data_fim: '',
          cor: '#FF1686'
        })
        setSelectedLojas([])
        await loadData()
      } else {
        throw new Error('Erro ao criar campanha')
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Erro ao criar campanha',
      })
    } finally {
      setSaving(false)
    }
  }

  // Agrupar campanhas por loja e data
  const campanhasPorLoja = () => {
    const mapa = new Map<string, Map<string, CampanhaComLojas[]>>()
    
    campanhas.forEach(campanha => {
      campanha.lojas?.forEach(loja => {
        if (!mapa.has(loja.id)) {
          mapa.set(loja.id, new Map())
        }
        const lojaMap = mapa.get(loja.id)!
        
        // Gerar todas as datas do período da campanha
        const start = new Date(campanha.data_inicio)
        const end = new Date(campanha.data_fim)
        const current = new Date(start)
        
        while (current <= end) {
          const dataStr = current.toISOString().split('T')[0]
          if (!lojaMap.has(dataStr)) {
            lojaMap.set(dataStr, [])
          }
          lojaMap.get(dataStr)!.push(campanha)
          current.setDate(current.getDate() + 1)
        }
      })
    })
    
    return mapa
  }

  // Obter datas únicas para o cabeçalho (próximos 30 dias)
  const getProximasDatas = () => {
    const datas = []
    const hoje = new Date()
    for (let i = 0; i < 30; i++) {
      const data = new Date(hoje)
      data.setDate(hoje.getDate() + i)
      datas.push(data.toISOString().split('T')[0])
    }
    return datas
  }

  const datas = getProximasDatas()
  const campanhasMap = campanhasPorLoja()

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-x-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Calendário de Campanhas
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Nova Campanha
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Campanha</DialogTitle>
              <DialogDescription>
                Cadastre uma nova campanha e selecione as lojas participantes.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Campanha *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Promoção de Verão"
                  value={newCampanha.nome}
                  onChange={(e) => setNewCampanha({ ...newCampanha, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  placeholder="Detalhes da campanha..."
                  value={newCampanha.descricao}
                  onChange={(e) => setNewCampanha({ ...newCampanha, descricao: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_inicio">Data Início *</Label>
                  <Input
                    id="data_inicio"
                    type="date"
                    value={newCampanha.data_inicio}
                    onChange={(e) => setNewCampanha({ ...newCampanha, data_inicio: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_fim">Data Fim *</Label>
                  <Input
                    id="data_fim"
                    type="date"
                    value={newCampanha.data_fim}
                    onChange={(e) => setNewCampanha({ ...newCampanha, data_fim: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cor">Cor da Campanha</Label>
                <Input
                  id="cor"
                  type="color"
                  value={newCampanha.cor}
                  onChange={(e) => setNewCampanha({ ...newCampanha, cor: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Lojas Participantes</Label>
                <Select
                  value={selectedLojas[0] || ''}
                  onValueChange={(value) => {
                    if (!selectedLojas.includes(value)) {
                      setSelectedLojas([...selectedLojas, value])
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma loja" />
                  </SelectTrigger>
                  <SelectContent>
                    {lojas.map((loja) => (
                      <SelectItem key={loja.id} value={loja.id}>
                        {loja.cod_loja} - {loja.nome_loja}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedLojas.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedLojas.map(lojaId => {
                      const loja = lojas.find(l => l.id === lojaId)
                      return (
                        <span key={lojaId} className="bg-muted px-2 py-1 rounded-md text-sm flex items-center gap-1">
                          {loja?.cod_loja}
                          <button
                            type="button"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => setSelectedLojas(selectedLojas.filter(id => id !== lojaId))}
                          >
                            ×
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateCampanha} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 bg-background border p-2 text-left min-w-[150px]">Loja</th>
                {datas.map((data, idx) => (
                  <th key={idx} className="border p-2 text-center min-w-[80px]">
                    {new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lojas.map(loja => {
                const lojaCampanhas = campanhasMap.get(loja.id) || new Map()
                return (
                  <tr key={loja.id}>
                    <td className="sticky left-0 bg-background border p-2 font-medium">
                      {loja.cod_loja} - {loja.nome_loja}
                    </td>
                    {datas.map((data, idx) => {
                      const campanhasData = lojaCampanhas.get(data) || []
                      return (
                        <td key={idx} className="border p-1 text-center">
                          {campanhasData.map(camp => (
                            <div
                              key={camp.id}
                              className="text-xs rounded px-1 py-0.5 mb-1 truncate"
                              style={{ backgroundColor: camp.cor || '#FF1686', color: '#fff' }}
                              title={camp.nome}
                            >
                              {camp.nome}
                            </div>
                          ))}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// Importar a função createCampanha
import { createCampanha } from '@/services/campanhas'
