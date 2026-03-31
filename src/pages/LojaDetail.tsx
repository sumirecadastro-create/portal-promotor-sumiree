import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Store, MapPin, Phone, Building, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Loja {
  id: string
  cod_loja: string
  nome_loja: string
  cidade?: string
  endereco?: string
  telefone?: string
  gerente_nome?: string
  status?: string
  created_at?: string
}

export default function LojaDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loja, setLoja] = useState<Loja | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadLoja = async () => {
      if (!id) return
      try {
        const { data, error } = await supabase
          .from('lojas')
          .select('*')
          .eq('id', id)
          .single()
        
        if (error) throw error
        setLoja(data)
      } catch (error) {
        console.error('Erro ao carregar loja:', error)
      } finally {
        setLoading(false)
      }
    }
    loadLoja()
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!loja) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loja não encontrada</p>
        <Button onClick={() => navigate('/lojas')} className="mt-4">
          Voltar para lojas
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/lojas')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            {loja.nome_loja}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Código:</span>
                <span>{loja.cod_loja}</span>
              </div>
              {loja.cidade && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Cidade:</span>
                  <span>{loja.cidade}</span>
                </div>
              )}
              {loja.endereco && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Endereço:</span>
                  <span>{loja.endereco}</span>
                </div>
              )}
              {loja.telefone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Telefone:</span>
                  <span>{loja.telefone}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {loja.gerente_nome && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Gerente:</span>
                  <span>{loja.gerente_nome}</span>
                </div>
              )}
              {loja.status && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Status:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    loja.status === 'ativo' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {loja.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              )}
              {loja.created_at && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Cadastrado em:</span>
                  <span>{new Date(loja.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
