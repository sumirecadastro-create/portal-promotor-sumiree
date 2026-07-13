// src/pages/Lojas.tsx

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Plus, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'  // 🔥 ADICIONAR
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface Loja {
  id: string
  cod_loja: string
  nome_loja: string
}

export default function Lojas() {
  const { user, isAdmin, userLojaId, isRegional } = useAuth()  // 🔥 ADICIONAR
  const [lojas, setLojas] = useState<Loja[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [newCodLoja, setNewCodLoja] = useState('')
  const [newNomeLoja, setNewNomeLoja] = useState('')
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  const loadData = async () => {
    setLoading(true)
    try {
      // 🔥 BUSCAR LOJAS COM FILTRO POR REGIONAL
      let query = supabase
        .from('lojas')
        .select('*')
        .order('nome_loja')

      // 🔥 Se for regional, filtrar apenas as lojas que ele gerencia
      if (isRegional && userLojaId) {
        const { data: lojasData } = await supabase
          .from('gerentes_regionais_lojas')
          .select('loja_id')
          .eq('gerente_regional_id', userLojaId)
        
        const lojaIds = lojasData?.map(l => l.loja_id) || []
        if (lojaIds.length > 0) {
          query = query.in('id', lojaIds)
        } else {
          setLojas([])
          setLoading(false)
          return
        }
      }
      // 🔥 Se for gerente, filtrar apenas a loja dele
      else if (!isAdmin && userLojaId) {
        query = query.eq('id', userLojaId)
      }

      const { data, error } = await query
      
      if (error) throw error
      setLojas(data || [])
    } catch (error) {
      console.error('Erro ao carregar lojas:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar as lojas',
      })
    } finally {
      setLoading(false)
    }
  }

  // ... resto do código
}
