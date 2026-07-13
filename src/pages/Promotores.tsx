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
import { supabase } from '@/lib/supabase'  // 🔥 ADICIONAR
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

export default function Promotores() {
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

  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🚀 Carregando dados...')
      
      // 🔥 BUSCAR LOJAS DO REGIONAL
      let lojaIdsPermitidas: string[] = []
      if (isRegional && userLojaId) {
        lojaIdsPermitidas = await getLojasRegional()
        console.log('🏪 Lojas do regional (promotores):', lojaIdsPermitidas.length)
      }

      // 🔥 BUSCAR PROMOTORES FILTRADOS
      let promotoresData = []
      
      if (isRegional && lojaIdsPermitidas.length > 0) {
        // Buscar promotores das lojas permitidas
        const { data: promotoresLojas } = await supabase
          .from('promotores_lojas')
          .select('promotor_id')
          .in('loja_id', lojaIdsPermitidas)
        
        const promotorIds = promotoresLojas?.map(p => p.promotor_id) || []
        
        if (promotorIds.length > 0) {
          const { data: promotores, error } = await supabase
            .from('promotores')
            .select('*')
            .eq('status', 'ativo')
            .in('id', promotorIds)
            .order('promotor_nome')
          
          if (error) throw error
          promotoresData = promotores || []
        } else {
          promotoresData = []
        }
      } else {
        // Admin ou Gerente: usar o serviço normal
        promotoresData = await getPromotores()
      }

      // 🔥 BUSCAR LOJAS (filtradas para regional)
      let lojasData = []
      if (isRegional && userLojaId) {
        const lojaIds = await getLojasRegional()
        if (lojaIds.length > 0) {
          const { data, error } = await supabase
            .from('lojas')
            .select('*')
            .in('id', lojaIds)
            .order('nome_loja')
          
          if (error) throw error
          lojasData = data || []
        } else {
          lojasData = []
        }
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
  }, [userLojaId, isRegional])

  // ... TODO O RESTO DO CÓDIGO PERMANECE IGUAL ...
  // (todos os componentes e funções abaixo permanecem os mesmos)
