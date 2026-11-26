import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Gift, AlertTriangle, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function DashboardBrindesCards() {
  const { userLojaId, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ total: 0, vencendo: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      if (!userLojaId && !isAdmin) {
        setLoading(false)
        return
      }

      try {
        let query = supabase.from('vw_brindes_gestao').select('saldo_loja, validade')
        
        // Se for gerente (não admin), filtra apenas pela loja dele
        if (!isAdmin && userLojaId) {
          query = query.eq('loja_id', userLojaId)
        }

        const { data, error } = await query
        if (error) throw error

        let total = 0
        let vencendo = 0
        const seisMeses = new Date()
        seisMeses.setMonth(seisMeses.getMonth() + 6)

        data?.forEach(item => {
          total += item.saldo_loja || 0
          if (item.validade) {
            const dataValidade = new Date(item.validade)
            if (dataValidade <= seisMeses) {
              vencendo += item.saldo_loja || 0
            }
          }
        })

        setStats({ total, vencendo })
      } catch (err) {
        console.error('Erro ao carregar stats de brindes', err)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [userLojaId, isAdmin])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="animate-pulse h-32 bg-gray-100" />
        <Card className="animate-pulse h-32 bg-gray-100" />
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Card 1: Saldo Total */}
      <Card 
        className="shadow-sm border-l-4 border-l-pink-500 hover:shadow-md transition-shadow cursor-pointer" 
        onClick={() => navigate('/brindes')}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Total de Brindes</CardTitle>
          <Gift className="h-4 w-4 text-pink-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            Unidades disponíveis na loja <ArrowRight className="h-3 w-3" />
          </p>
        </CardContent>
      </Card>

      {/* Card 2: Vencimento */}
      <Card 
        className="shadow-sm border-l-4 border-l-red-500 hover:shadow-md transition-shadow cursor-pointer" 
        onClick={() => navigate('/brindes')}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Brindes a Vencer</CardTitle>
          <AlertTriangle className={`h-4 w-4 ${stats.vencendo > 0 ? 'text-red-500' : 'text-gray-400'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${stats.vencendo > 0 ? 'text-red-500' : 'text-gray-900'}`}>
            {stats.vencendo} un.
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.vencendo > 0 ? 'Atenção necessária (Próximos 6 meses)' : 'Nenhum brinde próximo ao vencimento'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
