import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Search, MapPin, Store, Plus, Edit, Trash2, AlertCircle, Phone, Calendar, FileText, Upload, X, ChevronRight as ChevronRightIcon, User } from 'lucide-react'
import { getPromotores, Promotor, createPromotor, updatePromotor, deletePromotor, getMarcasDisponiveis, Marca, getGerentesDisponiveis } from '@/services/promotores'
import { uploadCartaPromotor, deleteCartaPromotor } from '@/services/uploadCarta'
import { getLojas } from '@/services/lojas'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'

interface Loja {
  id: string
  cod_loja: string
  nome_loja: string
}

interface Gerente {
  id: string
  nome_gerente: string
  telefone: string | null
  cod_loja: string | null
}

// Componente de erro
function ErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold mb-2">Erro ao carregar a página</h3>
      <p className="text-muted-foreground mb-4 max-w-md">
        {error.message || 'Ocorreu um erro inesperado'}
      </p>
      <div className="flex gap-2">
        <Button onClick={() => window.location.reload()} variant="outline">
          Recarregar página
        </Button>
        <Button onClick={resetError}>
          Tentar novamente
        </Button>
      </div>
    </div>
  )
}

function Promotores() {
  const [promotores, setPromotores] = useState<Promotor[]>([])
  const [lojas, setLojas] = useState<Loja[]>([])
  const [gerentes, setGerentes] = useState<Gerente[]>([])
  const [marcasDisponiveis, setMarcasDisponiveis] = useState<Marca[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingPromotor, setEditingPromotor] = useState<Promotor | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingCarta, setUploadingCarta] = useState(false)
  const { toast } = useToast()

  const { user, isAdmin, isGerente, isRegional, userLojaId } = useAuth() as any

  const [newPromotor, setNewPromotor] = useState({
    promotor_nome: '',
    loja_ids: [] as string[],
    gerente_ids: [] as string[],
    marca_ids: [] as string[],
    dias_semana: '',
    contato_responsavel: '',
    status: 'ativo'
  })

  const [lojasPopoverOpenNew, setLojasPopoverOpenNew] = useState(false)
  const [buscaLojasNew, setBuscaLojasNew] = useState('')
  const [lojasSelecionadasTempNew, setLojasSelecionadasTempNew] = useState<string[]>([])

  const [lojasPopoverOpenEdit, setLojasPopoverOpenEdit] = useState(false)
  const [buscaLojasEdit, setBuscaLojasEdit] = useState('')
  const [lojasSelecionadasTempEdit, setLojasSelecionadasTempEdit] = useState<string[]>([])

  const [gerentesPopoverOpenNew, setGerentesPopoverOpenNew] = useState(false)
  const [buscaGerentesNew, setBuscaGerentesNew] = useState('')
  const [gerentesSelecionadosTempNew, setGerentesSelecionadosTempNew] = useState<string[]>([])

  const [gerentesPopoverOpenEdit, setGerentesPopoverOpenEdit] = useState(false)
  const [buscaGerentesEdit, setBuscaGerentesEdit] = useState('')
  const [gerentesSelecionadosTempEdit, setGerentesSelecionadosTempEdit] = useState<string[]>([])

  // 🔥 FUNÇÃO PARA BUSCAR LOJAS DO REGIONAL
  const getLojasRegional = async () => {
    if (!isRegional || !userLojaId) return []
    const { data } = await supabase
      .from('gerentes_regionais_lojas')
      .select('loja_id')
      .eq('gerente_regional_id', userLojaId)
    return data?.map(l => l.loja_id) || []
  }

  // 🔥 FUNÇÃO CORRIGIDA - USANDO JOIN DO SUPABASE
  const carregarPromotoresComLojas = async (promotorIds: string[]) => {
    if (promotorIds.length === 0) return []

    const { data: promotoresData, error: promotoresError } = await supabase
      .from('promotores')
      .select(`
        *,
        promotores_lojas(
          lojas(
            id,
            cod_loja,
            nome_loja,
            gerente_id,
            gerentes(
              id,
              nome_gerente,
              telefone,
              cod_loja
            )
          )
        ),
        promotores_marcas(
          marcas(
            id,
            nome
          )
        )
      `)
      .eq('status', 'ativo')
      .in('id', promotorIds)
      .order('promotor_nome')

    if (promotoresError) throw promotoresError

    return promotoresData.map((promotor) => {
      // Extrair lojas com seus gerentes
      const lojasComGerentes = promotor.promotores_lojas
        ?.map((pl: any) => pl.lojas)
        .filter(Boolean) || []

      // Extrair gerentes únicos das lojas
      const gerentesMap = new Map()
      lojasComGerentes.forEach((loja: any) => {
        if (loja.gerentes) {
          gerentesMap.set(loja.gerentes.id, loja.gerentes)
        }
      })
      const gerentes = Array.from(gerentesMap.values())

      // Extrair marcas
      const marcas = promotor.promotores_marcas
        ?.map((pm: any) => pm.marcas)
        .filter(Boolean) || []

      // Extrair lojas (sem os gerentes aninhados)
      const lojas = lojasComGerentes.map((loja: any) => ({
        id: loja.id,
        cod_loja: loja.cod_loja,
        nome_loja: loja.nome_loja,
        gerente_id: loja.gerente_id
      }))

      return {
        ...promotor,
        lojas,
        gerentes,
        marcas,
        carta: null
      }
    })
  }

  // 🔥 FUNÇÃO LOAD DATA
  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🚀 Carregando dados...')
      
      // 🔥 BUSCAR LOJAS PERMITIDAS
      let lojaIdsPermitidas: string[] = []
      
      if (isAdmin) {
        const { data: lojas } = await supabase.from('lojas').select('id')
        lojaIdsPermitidas = lojas?.map(l => l.id) || []
        console.log('🏪 Admin - todas:', lojaIdsPermitidas.length)
      }
      else if (isRegional && userLojaId) {
        const lojaIds = await getLojasRegional()
        lojaIdsPermitidas = lojaIds
        console.log('🏪 Regional - lojas:', lojaIdsPermitidas.length)
      }
      else if (isGerente && userLojaId) {
        lojaIdsPermitidas = [userLojaId]
        console.log('🏪 Gerente - loja:', lojaIdsPermitidas.length)
      }
      else {
        const { data: lojas } = await supabase.from('lojas').select('id')
        lojaIdsPermitidas = lojas?.map(l => l.id) || []
        console.log('🏪 Fallback - todas:', lojaIdsPermitidas.length)
      }

      // 🔥 BUSCAR PROMOTORES FILTRADOS
      let promotoresData = []
      
      if (lojaIdsPermitidas.length > 0) {
        const { data: promotoresLojas } = await supabase
          .from('promotores_lojas')
          .select('promotor_id')
          .in('loja_id', lojaIdsPermitidas)
        
        const promotorIds = [...new Set(promotoresLojas?.map(p => p.promotor_id) || [])]
        console.log('👤 Promotores encontrados nas lojas:', promotorIds.length)
        
        if (promotorIds.length > 0) {
          promotoresData = await carregarPromotoresComLojas(promotorIds)
        } else {
          console.log('⚠️ Nenhum promotor encontrado nas lojas permitidas')
          promotoresData = []
        }
      } else {
        console.log('⚠️ Nenhuma loja permitida, buscando todos os promotores')
        promotoresData = await getPromotores()
      }

      // 🔥 BUSCAR LOJAS (filtradas)
      let lojasData = []
      if (lojaIdsPermitidas.length > 0) {
        const { data, error } = await supabase
          .from('lojas')
          .select('*')
          .in('id', lojaIdsPermitidas)
          .order('nome_loja')
        
        if (error) throw error
        lojasData = data || []
      } else {
        lojasData = await getLojas()
      }

      // 🔥 BUSCAR GERENTES E MARCAS
      const [gerentesData, marcasData] = await Promise.all([
        getGerentesDisponiveis(),
        getMarcasDisponiveis()
      ])
      
      console.log('📊 Dados recebidos:', {
        promotores: promotoresData?.length || 0,
        lojas: lojasData?.length || 0,
        gerentes: gerentesData?.length || 0,
        marcas: marcasData?.length || 0
      })
      
      setPromotores(Array.isArray(promotoresData) ? promotoresData : [])
      setLojas(Array.isArray(lojasData) ? lojasData : [])
      setGerentes(Array.isArray(gerentesData) ? gerentesData : [])
      setMarcasDisponiveis(Array.isArray(marcasData) ? marcasData : [])
      
    } catch (err: any) {
      console.error('❌ Erro ao carregar:', err)
      setError(err instanceof Error ? err : new Error(err?.message || 'Erro desconhecido'))
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar',
        description: err?.message || 'Não foi possível carregar os dados',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [userLojaId, isRegional, isGerente, isAdmin])

  // Funções para seleção de lojas e gerentes (mantidas iguais)
  const abrirSelecionarLojasNew = () => {
    setLojasSelecionadasTempNew([...newPromotor.loja_ids])
    setBuscaLojasNew('')
    setLojasPopoverOpenNew(true)
  }

  const aplicarSelecaoLojasNew = () => {
    setNewPromotor({ ...newPromotor, loja_ids: [...lojasSelecionadasTempNew] })
    setLojasPopoverOpenNew(false)
  }

  const cancelarSelecaoLojasNew = () => {
    setLojasPopoverOpenNew(false)
  }

  const abrirSelecionarLojasEdit = () => {
    setLojasSelecionadasTempEdit(editingPromotor?.loja_ids || [])
    setBuscaLojasEdit('')
    setLojasPopoverOpenEdit(true)
  }

  const aplicarSelecaoLojasEdit = () => {
    if (editingPromotor) {
      setEditingPromotor({ ...editingPromotor, loja_ids: [...lojasSelecionadasTempEdit] })
    }
    setLojasPopoverOpenEdit(false)
  }

  const cancelarSelecaoLojasEdit = () => {
    setLojasPopoverOpenEdit(false)
  }

  const abrirSelecionarGerentesNew = () => {
    setGerentesSelecionadosTempNew([...newPromotor.gerente_ids])
    setBuscaGerentesNew('')
    setGerentesPopoverOpenNew(true)
  }

  const aplicarSelecaoGerentesNew = () => {
    setNewPromotor({ ...newPromotor, gerente_ids: [...gerentesSelecionadosTempNew] })
    setGerentesPopoverOpenNew(false)
  }

  const cancelarSelecaoGerentesNew = () => {
    setGerentesPopoverOpenNew(false)
  }

  const limparGerentesNew = () => {
    setGerentesSelecionadosTempNew([])
    setNewPromotor({ ...newPromotor, gerente_ids: [] })
    setGerentesPopoverOpenNew(false)
  }

  const abrirSelecionarGerentesEdit = () => {
    setGerentesSelecionadosTempEdit(editingPromotor?.gerente_ids || [])
    setBuscaGerentesEdit('')
    setGerentesPopoverOpenEdit(true)
  }

  const aplicarSelecaoGerentesEdit = () => {
    if (editingPromotor) {
      setEditingPromotor({ ...editingPromotor, gerente_ids: [...gerentesSelecionadosTempEdit] })
    }
    setGerentesPopoverOpenEdit(false)
  }

  const cancelarSelecaoGerentesEdit = () => {
    setGerentesPopoverOpenEdit(false)
  }

  const limparGerentesEdit = () => {
    setGerentesSelecionadosTempEdit([])
    if (editingPromotor) {
      setEditingPromotor({ ...editingPromotor, gerente_ids: [] })
    }
    setGerentesPopoverOpenEdit(false)
  }

  const handleCreatePromotor = async () => {
    if (!newPromotor.promotor_nome?.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Nome do promotor é obrigatório',
      })
      return
    }

    setSaving(true)
    try {
      const result = await createPromotor({
        promotor_nome: newPromotor.promotor_nome.trim(),
        loja_ids: newPromotor.loja_ids,
        gerente_ids: newPromotor.gerente_ids,
        marca_ids: newPromotor.marca_ids,
        dias_semana: newPromotor.dias_semana || undefined,
        contato_responsavel: newPromotor.contato_responsavel || undefined,
        status: newPromotor.status
      })
      
      if (result) {
        toast({
          title: 'Sucesso',
          description: `Promotor criado com ${newPromotor.loja_ids.length} loja(s) e ${newPromotor.gerente_ids.length} gerente(s)!`,
        })
        setOpen(false)
        setNewPromotor({
          promotor_nome: '',
          loja_ids: [],
          gerente_ids: [],
          marca_ids: [],
          dias_semana: '',
          contato_responsavel: '',
          status: 'ativo'
        })
        await loadData()
      } else {
        throw new Error('Erro ao criar promotor')
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: err?.message || 'Erro ao criar promotor',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePromotor = async () => {
    if (!editingPromotor) return
    if (!editingPromotor.promotor_nome?.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Nome do promotor é obrigatório',
      })
      return
    }

    setSaving(true)
    try {
      const marcaIds = editingPromotor.marcas && Array.isArray(editingPromotor.marcas) 
        ? editingPromotor.marcas.map(m => m?.id).filter(Boolean)
        : []
      
      const result = await updatePromotor(editingPromotor.id, {
        promotor_nome: editingPromotor.promotor_nome.trim(),
        loja_ids: editingPromotor.loja_ids || [],
        gerente_ids: editingPromotor.gerente_ids || [],
        marca_ids: marcaIds,
        dias_semana: editingPromotor.dias_semana || undefined,
        contato_responsavel: editingPromotor.contato_responsavel || undefined,
        status: editingPromotor.status || 'ativo'
      })
      
      if (result) {
        toast({
          title: 'Sucesso',
          description: `Promotor atualizado com ${editingPromotor.loja_ids?.length || 0} loja(s) e ${editingPromotor.gerente_ids?.length || 0} gerente(s)!`,
        })
        setEditOpen(false)
        setEditingPromotor(null)
        await loadData()
      } else {
        throw new Error('Erro ao atualizar promotor')
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: err?.message || 'Erro ao atualizar promotor',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePromotor = async (promotor: Promotor) => {
    if (!promotor?.id) return
    
    if (!confirm(`Deseja realmente excluir o promotor "${promotor.promotor_nome || 'este promotor'}"?`)) return

    try {
      const result = await deletePromotor(promotor.id)
      if (result) {
        toast({
          title: 'Sucesso',
          description: 'Promotor excluído com sucesso!',
        })
        await loadData()
      } else {
        throw new Error('Erro ao excluir promotor')
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: err?.message || 'Erro ao excluir promotor',
      })
    }
  }

  const handleUploadCarta = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editingPromotor) return
    
    if (file.type !== 'application/pdf') {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Apenas arquivos PDF são permitidos',
      })
      return
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Arquivo muito grande. Máximo 5MB',
      })
      return
    }
    
    setUploadingCarta(true)
    try {
      const result = await uploadCartaPromotor(editingPromotor.id, file)
      if (result.success && result.data) {
        toast({
          title: 'Sucesso',
          description: 'Carta de apresentação enviada com sucesso!',
        })
        setEditingPromotor({ ...editingPromotor, carta: result.data })
        await loadData()
      } else {
        throw new Error(result.error || 'Erro ao fazer upload')
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Erro ao enviar a carta',
      })
    } finally {
      setUploadingCarta(false)
      e.target.value = ''
    }
  }

  const handleRemoverCarta = async () => {
    if (!editingPromotor?.carta) return
    
    if (!confirm('Deseja realmente remover a carta de apresentação?')) return
    
    try {
      const url = editingPromotor.carta.arquivo
      const filePath = url.split('/documentos/')[1]
      
      await deleteCartaPromotor(editingPromotor.carta.id, filePath)
      
      toast({
        title: 'Sucesso',
        description: 'Carta removida com sucesso!',
      })
      
      setEditingPromotor({ ...editingPromotor, carta: null })
      await loadData()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Erro ao remover a carta',
      })
    }
  }

  const openEditDialog = (promotor: Promotor) => {
    if (!promotor) return
    setEditingPromotor({ ...promotor })
    setEditOpen(true)
  }

  const filteredPromotores = Array.isArray(promotores) && promotores.length > 0
    ? promotores.filter((p) => {
        if (!p?.promotor_nome) return false
        const searchTerm = search?.toLowerCase() || ''
        return p.promotor_nome.toLowerCase().includes(searchTerm)
      })
    : []

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return 'PR'
    return name.substring(0, 2).toUpperCase()
  }

  const getMarcasBadges = (promoter: Promotor) => {
    if (!promoter || !promoter.marcas || promoter.marcas.length === 0) {
      return <span className="text-sm text-muted-foreground">Sem marcas</span>
    }
    
    return (
      <div className="flex flex-wrap gap-1 justify-center">
        {promoter.marcas.slice(0, 3).map((marca) => (
          <Badge key={marca.id} variant="secondary" className="text-xs">
            {marca.nome}
          </Badge>
        ))}
        {promoter.marcas.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{promoter.marcas.length - 3}
          </Badge>
        )}
      </div>
    )
  }

  // Componentes de seleção (mantidos iguais)
  const GerentesMultiSelect = ({
    selectedIds,
    onChange,
    label,
    open,
    onOpenChange,
    buscaTemp,
    setBuscaTemp,
    tempIds,
    setTempIds,
    onAplicar,
    onCancelar,
    onLimpar
  }: {
    selectedIds: string[],
    onChange: (ids: string[]) => void,
    label: string,
    open: boolean,
    onOpenChange: (open: boolean) => void,
    buscaTemp: string,
    setBuscaTemp: (busca: string) => void,
    tempIds: string[],
    setTempIds: (ids: string[]) => void,
    onAplicar: () => void,
    onCancelar: () => void,
    onLimpar: () => void
  }) => {
    const safeGerentes = Array.isArray(gerentes) ? gerentes : []
    
    const filteredGerentes = safeGerentes.filter(gerente => 
      gerente?.nome_gerente?.toLowerCase().includes(buscaTemp.toLowerCase()) ||
      (gerente?.telefone && gerente.telefone.toLowerCase().includes(buscaTemp.toLowerCase()))
    )

    const selectedGerentes = safeGerentes.filter(g => selectedIds.includes(g.id))

    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <Popover open={open} onOpenChange={onOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-between min-h-[40px] h-auto"
              onClick={() => onOpenChange(true)}
            >
              <div className="flex flex-wrap gap-1">
                {selectedIds.length === 0 ? (
                  <span className="text-muted-foreground">Selecione os gerentes...</span>
                ) : (
                  <>
                    <Badge variant="secondary" className="text-xs">
                      👤 {selectedIds.length} gerente(s)
                    </Badge>
                    {selectedGerentes.slice(0, 2).map(gerente => (
                      <Badge key={gerente.id} variant="outline" className="text-xs">
                        {gerente.nome_gerente}
                      </Badge>
                    ))}
                    {selectedIds.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{selectedIds.length - 2}
                      </Badge>
                    )}
                  </>
                )}
              </div>
              <ChevronRightIcon className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <div className="p-2 border-b">
              <Input
                placeholder="🔍 Buscar gerente por nome ou telefone..."
                value={buscaTemp}
                onChange={(e) => setBuscaTemp(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto p-2">
              <div 
                className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer border-b pb-2 mb-1"
                onClick={onLimpar}
              >
                <Checkbox checked={tempIds.length === 0} />
                <Label className="cursor-pointer font-semibold flex-1 text-red-500">
                  Nenhum gerente
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer border-b pb-2 mb-1">
                <Checkbox
                  checked={tempIds.length === safeGerentes.length && safeGerentes.length > 0}
                  onCheckedChange={() => {
                    if (tempIds.length === safeGerentes.length) {
                      setTempIds([])
                    } else {
                      setTempIds(safeGerentes.map(g => g.id))
                    }
                  }}
                />
                <Label className="cursor-pointer font-semibold flex-1">
                  Selecionar todos os gerentes ({safeGerentes.length})
                </Label>
              </div>
              {filteredGerentes.map((gerente) => (
                <div
                  key={gerente.id}
                  className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                  onClick={() => {
                    setTempIds(prev =>
                      prev.includes(gerente.id)
                        ? prev.filter(id => id !== gerente.id)
                        : [...prev, gerente.id]
                    )
                  }}
                >
                  <Checkbox checked={tempIds.includes(gerente.id)} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{gerente.nome_gerente}</div>
                    {gerente.telefone && (
                      <div className="text-xs text-muted-foreground">{gerente.telefone}</div>
                    )}
                    {gerente.cod_loja && (
                      <div className="text-xs text-muted-foreground">Loja: {gerente.cod_loja}</div>
                    )}
                  </div>
                </div>
              ))}
              {filteredGerentes.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Nenhum gerente encontrado
                </div>
              )}
            </div>
            <div className="p-2 border-t flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setTempIds([])}>
                Limpar tudo
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onCancelar}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={onAplicar} style={{ background: '#FF1686' }}>
                  Aplicar ({tempIds.length})
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-muted-foreground">
              {selectedIds.length} gerente(s) selecionado(s)
            </span>
          </div>
        )}
      </div>
    )
  }

  const LojasMultiSelect = ({ 
    selectedIds, 
    onChange, 
    label,
    open,
    onOpenChange,
    buscaTemp,
    setBuscaTemp,
    tempIds,
    setTempIds,
    onAplicar,
    onCancelar
  }: { 
    selectedIds: string[], 
    onChange: (ids: string[]) => void,
    label: string,
    open: boolean,
    onOpenChange: (open: boolean) => void,
    buscaTemp: string,
    setBuscaTemp: (busca: string) => void,
    tempIds: string[],
    setTempIds: (ids: string[]) => void,
    onAplicar: () => void,
    onCancelar: () => void
  }) => {
    const safeLojas = Array.isArray(lojas) ? lojas : []
    
    const filteredLojas = safeLojas.filter(loja => 
      loja?.nome_loja?.toLowerCase().includes(buscaTemp.toLowerCase()) ||
      loja?.cod_loja?.toLowerCase().includes(buscaTemp.toLowerCase())
    )

    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <Popover open={open} onOpenChange={onOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-between min-h-[40px] h-auto"
              onClick={() => onOpenChange(true)}
            >
              <div className="flex flex-wrap gap-1">
                {selectedIds.length === 0 ? (
                  <span className="text-muted-foreground">Selecione as lojas...</span>
                ) : (
                  <>
                    <Badge variant="secondary" className="text-xs">
                      📦 {selectedIds.length} loja(s) selecionada(s)
                    </Badge>
                    {selectedIds.slice(0, 3).map(lojaId => {
                      const loja = safeLojas.find(l => l.id === lojaId)
                      return loja ? (
                        <Badge key={lojaId} variant="outline" className="text-xs">
                          {loja.cod_loja}
                        </Badge>
                      ) : null
                    })}
                    {selectedIds.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{selectedIds.length - 3}
                      </Badge>
                    )}
                  </>
                )}
              </div>
              <ChevronRightIcon className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <div className="p-2 border-b">
              <Input
                placeholder="🔍 Buscar loja por nome ou código..."
                value={buscaTemp}
                onChange={(e) => setBuscaTemp(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto p-2">
              <div className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer border-b pb-2 mb-1">
                <Checkbox
                  checked={tempIds.length === safeLojas.length && safeLojas.length > 0}
                  onCheckedChange={() => {
                    if (tempIds.length === safeLojas.length) {
                      setTempIds([])
                    } else {
                      setTempIds(safeLojas.map(l => l.id))
                    }
                  }}
                />
                <Label className="cursor-pointer font-semibold flex-1">
                  Selecionar todas as lojas ({safeLojas.length})
                </Label>
              </div>
              {filteredLojas.map((loja) => (
                <div
                  key={loja.id}
                  className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                  onClick={() => {
                    setTempIds(prev =>
                      prev.includes(loja.id)
                        ? prev.filter(id => id !== loja.id)
                        : [...prev, loja.id]
                    )
                  }}
                >
                  <Checkbox checked={tempIds.includes(loja.id)} />
                  <Label className="cursor-pointer flex-1">
                    <span className="font-mono text-xs">{loja.cod_loja}</span> - {loja.nome_loja}
                  </Label>
                </div>
              ))}
              {filteredLojas.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Nenhuma loja encontrada
                </div>
              )}
            </div>
            <div className="p-2 border-t flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setTempIds([])}>
                Limpar tudo
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onCancelar}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={onAplicar} style={{ background: '#FF1686' }}>
                  Aplicar ({tempIds.length})
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    )
  }

  const MarcasMultiSelect = ({ 
    selectedIds, 
    onChange, 
    disabled = false 
  }: { 
    selectedIds: string[], 
    onChange: (ids: string[]) => void,
    disabled?: boolean
  }) => {
    const [popoverOpen, setPopoverOpen] = useState(false)
    const [marcaSearch, setMarcaSearch] = useState('')

    const safeSelectedIds = Array.isArray(selectedIds) ? selectedIds : []
    const safeMarcas = Array.isArray(marcasDisponiveis) ? marcasDisponiveis : []
    
    const filteredMarcas = safeMarcas.filter(marca => 
      marca?.nome?.toLowerCase().includes(marcaSearch.toLowerCase())
    )

    const selectedMarcas = safeMarcas.filter(m => safeSelectedIds.includes(m?.id))

    const handleToggleMarca = (marcaId: string) => {
      const newIds = safeSelectedIds.includes(marcaId)
        ? safeSelectedIds.filter(id => id !== marcaId)
        : [...safeSelectedIds, marcaId]
      onChange(newIds)
    }

    const handleSelectAll = () => {
      if (safeSelectedIds.length === safeMarcas.length) {
        onChange([])
      } else {
        onChange(safeMarcas.map(m => m.id))
      }
    }

    return (
      <div className="space-y-2">
        <Label>Marcas que Atende</Label>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              disabled={disabled}
              className="w-full justify-between min-h-[40px] h-auto"
            >
              <div className="flex flex-wrap gap-1">
                {selectedMarcas.length > 0 ? (
                  selectedMarcas.map(marca => (
                    <Badge key={marca.id} variant="secondary" className="text-xs">
                      {marca.nome}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">Selecione as marcas...</span>
                )}
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <div className="p-2 border-b">
              <Input
                placeholder="Buscar marca..."
                className="h-8"
                value={marcaSearch}
                onChange={(e) => setMarcaSearch(e.target.value)}
              />
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
              <div className="flex items-center justify-between p-2 border-b mb-2">
                <span className="text-sm font-medium">Marcas disponíveis</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSelectAll}
                  className="text-xs"
                >
                  {safeSelectedIds.length === safeMarcas.length ? 'Desmarcar todas' : 'Selecionar todas'}
                </Button>
              </div>
              {filteredMarcas.length > 0 ? (
                filteredMarcas.map((marca) => (
                  <div
                    key={marca.id}
                    className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                    onClick={() => handleToggleMarca(marca.id)}
                  >
                    <Checkbox
                      checked={safeSelectedIds.includes(marca.id)}
                      onCheckedChange={() => handleToggleMarca(marca.id)}
                    />
                    <Label className="cursor-pointer flex-1">{marca.nome}</Label>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  {marcaSearch ? 'Nenhuma marca encontrada' : 'Nenhuma marca cadastrada'}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
        {safeSelectedIds.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-muted-foreground">
              {safeSelectedIds.length} marca(s) selecionada(s)
            </span>
          </div>
        )}
      </div>
    )
  }

  if (error) {
    return <ErrorFallback error={error} resetError={loadData} />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar promotor..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Promotor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Promotor</DialogTitle>
                <DialogDescription>
                  Preencha os dados para cadastrar um novo promotor.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="promotor_nome">Nome do Promotor *</Label>
                  <Input
                    id="promotor_nome"
                    placeholder="Nome completo"
                    value={newPromotor.promotor_nome}
                    onChange={(e) => setNewPromotor({ ...newPromotor, promotor_nome: e.target.value })}
                  />
                </div>

                <LojasMultiSelect
                  selectedIds={newPromotor.loja_ids}
                  onChange={(ids) => setNewPromotor({ ...newPromotor, loja_ids: ids })}
                  label="Lojas Vinculadas"
                  open={lojasPopoverOpenNew}
                  onOpenChange={setLojasPopoverOpenNew}
                  buscaTemp={buscaLojasNew}
                  setBuscaTemp={setBuscaLojasNew}
                  tempIds={lojasSelecionadasTempNew}
                  setTempIds={setLojasSelecionadasTempNew}
                  onAplicar={aplicarSelecaoLojasNew}
                  onCancelar={cancelarSelecaoLojasNew}
                />

                <GerentesMultiSelect
                  selectedIds={newPromotor.gerente_ids}
                  onChange={(ids) => setNewPromotor({ ...newPromotor, gerente_ids: ids })}
                  label="Gerentes Responsáveis"
                  open={gerentesPopoverOpenNew}
                  onOpenChange={setGerentesPopoverOpenNew}
                  buscaTemp={buscaGerentesNew}
                  setBuscaTemp={setBuscaGerentesNew}
                  tempIds={gerentesSelecionadosTempNew}
                  setTempIds={setGerentesSelecionadosTempNew}
                  onAplicar={aplicarSelecaoGerentesNew}
                  onCancelar={cancelarSelecaoGerentesNew}
                  onLimpar={limparGerentesNew}
                />

                <MarcasMultiSelect
                  selectedIds={newPromotor.marca_ids}
                  onChange={(ids) => setNewPromotor({ ...newPromotor, marca_ids: ids })}
                />

                <div className="space-y-2">
                  <Label htmlFor="dias_semana">Dias de Atuação</Label>
                  <Input
                    id="dias_semana"
                    placeholder="Ex: Segunda, Terça, Quarta"
                    value={newPromotor.dias_semana}
                    onChange={(e) => setNewPromotor({ ...newPromotor, dias_semana: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contato_responsavel">Contato / Telefone</Label>
                  <Input
                    id="contato_responsavel"
                    placeholder="(11) 99999-9999"
                    value={newPromotor.contato_responsavel}
                    onChange={(e) => setNewPromotor({ ...newPromotor, contato_responsavel: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreatePromotor} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Promotor</DialogTitle>
              <DialogDescription>
                Altere os dados do promotor e gerencie a carta de apresentação.
              </DialogDescription>
            </DialogHeader>
            {editingPromotor && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_promotor_nome">Nome do Promotor *</Label>
                  <Input
                    id="edit_promotor_nome"
                    placeholder="Nome completo"
                    value={editingPromotor.promotor_nome || ''}
                    onChange={(e) => setEditingPromotor({ ...editingPromotor, promotor_nome: e.target.value })}
                  />
                </div>

                <LojasMultiSelect
                  selectedIds={editingPromotor.loja_ids || []}
                  onChange={(ids) => setEditingPromotor({ ...editingPromotor, loja_ids: ids })}
                  label="Lojas Vinculadas"
                  open={lojasPopoverOpenEdit}
                  onOpenChange={setLojasPopoverOpenEdit}
                  buscaTemp={buscaLojasEdit}
                  setBuscaTemp={setBuscaLojasEdit}
                  tempIds={lojasSelecionadasTempEdit}
                  setTempIds={setLojasSelecionadasTempEdit}
                  onAplicar={aplicarSelecaoLojasEdit}
                  onCancelar={cancelarSelecaoLojasEdit}
                />

                <GerentesMultiSelect
                  selectedIds={editingPromotor.gerente_ids || []}
                  onChange={(ids) => setEditingPromotor({ ...editingPromotor, gerente_ids: ids })}
                  label="Gerentes Responsáveis"
                  open={gerentesPopoverOpenEdit}
                  onOpenChange={setGerentesPopoverOpenEdit}
                  buscaTemp={buscaGerentesEdit}
                  setBuscaTemp={setBuscaGerentesEdit}
                  tempIds={gerentesSelecionadosTempEdit}
                  setTempIds={setGerentesSelecionadosTempEdit}
                  onAplicar={aplicarSelecaoGerentesEdit}
                  onCancelar={cancelarSelecaoGerentesEdit}
                  onLimpar={limparGerentesEdit}
                />

                <MarcasMultiSelect
                  selectedIds={editingPromotor.marcas?.map(m => m?.id).filter(Boolean) || []}
                  onChange={(ids) => {
                    const selectedMarcas = marcasDisponiveis.filter(m => ids.includes(m.id))
                    setEditingPromotor({ 
                      ...editingPromotor, 
                      marcas: selectedMarcas
                    })
                  }}
                />

                <div className="space-y-2">
                  <Label htmlFor="edit_dias_semana">Dias de Atuação</Label>
                  <Input
                    id="edit_dias_semana"
                    placeholder="Ex: Segunda, Terça, Quarta"
                    value={editingPromotor.dias_semana || ''}
                    onChange={(e) => setEditingPromotor({ ...editingPromotor, dias_semana: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_contato_responsavel">Contato / Telefone</Label>
                  <Input
                    id="edit_contato_responsavel"
                    placeholder="(11) 99999-9999"
                    value={editingPromotor.contato_responsavel || ''}
                    onChange={(e) => setEditingPromotor({ ...editingPromotor, contato_responsavel: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_status">Status</Label>
                  <Select
                    value={editingPromotor.status || 'ativo'}
                    onValueChange={(value) => setEditingPromotor({ ...editingPromotor, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <Label className="text-base font-semibold">Carta de Apresentação</Label>
                  
                  {editingPromotor.carta ? (
                    <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                      <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      <a 
                        href={editingPromotor.carta.arquivo} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex-1 truncate"
                      >
                        {editingPromotor.carta.nome_original}
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoverCarta}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        disabled={uploadingCarta}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept=".pdf"
                          onChange={handleUploadCarta}
                          disabled={uploadingCarta}
                          className="flex-1"
                        />
                        {uploadingCarta && (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <Upload className="h-3 w-3 inline mr-1" />
                        Envie a carta de apresentação em formato PDF (máx. 5MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdatePromotor} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPromotores.length > 0 ? (
            filteredPromotores.map((promoter) => (
              <Card key={promoter.id} className="hover:shadow-md transition-shadow group relative">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <Avatar className="h-20 w-20 border-2 border-background shadow-sm">
                      <AvatarFallback className="text-2xl font-medium bg-primary/10 text-primary">
                        {getInitials(promoter.promotor_nome)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="space-y-2 w-full">
                      <div className="flex items-center justify-center gap-2">
                        <h3 className="font-semibold text-lg">{promoter.promotor_nome}</h3>
                        {promoter.carta && (
                          <a 
                            href={promoter.carta.arquivo} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700 transition-colors"
                            title="Ver carta de apresentação"
                          >
                            <FileText className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      {getMarcasBadges(promoter)}
                    </div>

                    <div className="flex flex-col gap-2 w-full text-sm text-muted-foreground mt-4 text-left border-t pt-4">
                      <div className="flex items-start gap-2">
                        <Store className="h-4 w-4 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          {promoter.lojas && promoter.lojas.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {promoter.lojas.map(loja => (
                                <Badge key={loja.id} variant="outline" className="text-xs">
                                  {loja.cod_loja}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span>Nenhuma loja vinculada</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          {promoter.gerentes && promoter.gerentes.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {promoter.gerentes.map(gerente => (
                                <Badge key={gerente.id} variant="outline" className="text-xs">
                                  {gerente.nome_gerente}
                                  {gerente.telefone && ` (${gerente.telefone})`}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Sem gerente</span>
                          )}
                        </div>
                      </div>

                      {promoter.contato_responsavel && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 shrink-0" />
                          <span className="truncate">{promoter.contato_responsavel}</span>
                        </div>
                      )}
                      {promoter.dias_semana && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 shrink-0" />
                          <span className="truncate">{promoter.dias_semana}</span>
                        </div>
                      )}
                    </div>

                    <div className="w-full pt-4 border-t mt-4 flex justify-end gap-2">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => openEditDialog(promoter)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleDeletePromotor(promoter)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              {search ? 'Nenhum promotor encontrado para esta busca.' : 'Nenhum promotor cadastrado.'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Promotores
