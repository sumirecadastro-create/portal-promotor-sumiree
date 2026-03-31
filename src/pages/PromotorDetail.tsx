import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Phone, Mail, Calendar, MapPin } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase'

interface Promotor {
  id: string
  promotor_nome: string
  loja_id?: string
  marca_produto?: string
  contato_responsavel?: string
  dias_semana?: string
  status?: string
  created_at?: string
  lojas?: { nome_loja: string }
}

interface Visita {
  id: string
  check_in: string
  check_out?: string
  status: string
  lojas?: { nome_loja: string }
}

export default function PromotorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [promotor, setPromotor] = useState<Promotor | null>(null)
  const [visitas, setVisitas] = useState<Visita[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      if (!id) return
      try {
        // Buscar promotor
        const { data: promotorData, error: promotorError } = await supabase
          .from('promotores')
          .select('*, lojas(nome_loja)')
          .eq('id', id)
          .single()

        if (promotorError) throw promotorError
        setPromotor(promotorData)

        // Buscar visitas do promotor
        const { data: visitasData, error: visitasError } = await supabase
          .from('visitas')
          .select('*, lojas(nome_loja)')
          .eq('promotor_id', id)
          .order('check_in', { ascending: false })
          .limit(10)

        if (visitasError) throw visitasError
        setVisitas(visitasData || [])
      } catch (error) {
        console.error('Erro ao carregar dados do promotor:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getInitials = (name: string) => {
    return name ? name.substring(0, 2).toUpperCase() : 'PR'
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!promotor) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Promotor não encontrado</p>
        <Button onClick={() => navigate('/promotores')} className="mt-4">
          Voltar para promotores
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/promotores">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">Perfil do Promotor</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={`https://img.usecurling.com/ppl/thumbnail?seed=${promotor.id}`} />
              <AvatarFallback>{getInitials(promotor.promotor_nome)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-bold">{promotor.promotor_nome}</h3>
              <p className="text-primary font-medium">{promotor.marca_produto || 'Sem marca'}</p>
            </div>
            <Badge variant="outline" className="text-sm px-3 py-1">
              Status: {promotor.status === 'ativo' ? 'Ativo' : 'Inativo'}
            </Badge>

            <div className="w-full space-y-3 pt-6 border-t text-left">
              {promotor.contato_responsavel && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{promotor.contato_responsavel}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>promotor@email.com</span>
              </div>
              {promotor.dias_semana && (
                <div className="flex items-start gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>Dias de atuação: {promotor.dias_semana}</span>
                </div>
              )}
              {promotor.lojas?.nome_loja && (
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>Loja vinculada: {promotor.lojas.nome_loja}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Histórico de Visitas Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {visitas.length > 0 ? (
              <div className="space-y-4">
                {visitas.map((visita) => (
                  <div
                    key={visita.id}
                    className="flex items-center justify-between p-4 rounded-xl border bg-card shadow-sm"
                  >
                    <div>
                      <p className="font-semibold">{visita.lojas?.nome_loja || 'Loja desconhecida'}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(visita.check_in)}
                      </p>
                    </div>
                    <Badge
                      variant={visita.status === 'realizada' ? 'secondary' : 'default'}
                      className={visita.status === 'pendente' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                    >
                      {visita.status === 'pendente' ? 'Em andamento' : 'Concluída'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma visita registrada.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
