// src/components/ui/NotificationBell.tsx
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Bell, BellOff, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import {
  getNotificacoes,
  getNotificacoesNaoLidas,
  countNotificacoesNaoLidas,
  marcarNotificacaoComoLida,
  marcarTodasNotificacoesComoLidas,
  Notificacao
} from '@/services/notificacoes'
import { useToast } from '@/hooks/use-toast'

const PRIMARY_COLOR = '#FF1686'

export function NotificationBell() {
  const { toast } = useToast()
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [marcandoTodas, setMarcandoTodas] = useState(false)

  // ==========================================
  // CARREGAR NOTIFICAÇÕES
  // ==========================================

  const loadNotificacoes = async () => {
    setLoading(true)
    try {
      const [todas, naoLidasData, countData] = await Promise.all([
        getNotificacoes(),
        getNotificacoesNaoLidas(),
        countNotificacoesNaoLidas()
      ])

      setNotificacoes(todas)
      setCount(countData)
    } catch (error) {
      console.error('❌ Erro ao carregar notificações:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotificacoes()
  }, [])

  // ==========================================
  // MARCAR COMO LIDA
  // ==========================================

  const handleMarcarComoLida = async (id: string) => {
    const success = await marcarNotificacaoComoLida(id)
    if (success) {
      setNotificacoes(prev => 
        prev.map(n => n.id === id ? { ...n, lida: true } : n)
      )
      setCount(prev => Math.max(0, prev - 1))
    }
  }

  const handleMarcarTodasComoLidas = async () => {
    setMarcandoTodas(true)
    try {
      const success = await marcarTodasNotificacoesComoLidas()
      if (success) {
        setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })))
        setCount(0)
        toast({
          title: '✅ Todas as notificações marcadas como lidas',
          duration: 3000,
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível marcar todas como lidas',
      })
    } finally {
      setMarcandoTodas(false)
    }
  }

  // ==========================================
  // FORMATAR DATA
  // ==========================================

  const formatarData = (data: string) => {
    const agora = new Date()
    const notificacao = new Date(data)
    const diffMs = agora.getTime() - notificacao.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHoras = Math.floor(diffMs / 3600000)
    const diffDias = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return 'Agora mesmo'
    if (diffMin < 60) return `${diffMin} min`
    if (diffHoras < 24) return `${diffHoras} h`
    if (diffDias < 30) return `${diffDias} dias`
    return notificacao.toLocaleDateString('pt-BR')
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          onClick={() => setOpen(!open)}
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              style={{ background: PRIMARY_COLOR }}
            >
              {count > 9 ? '9+' : count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0 max-h-[500px] flex flex-col" align="end">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="font-semibold">Notificações</span>
            {count > 0 && (
              <Badge variant="secondary" className="text-xs">
                {count} nova(s)
              </Badge>
            )}
          </div>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleMarcarTodasComoLidas}
              disabled={marcandoTodas}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>

        {/* Lista de notificações */}
        <div className="flex-1 overflow-y-auto p-2 max-h-[380px]">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : notificacoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BellOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            notificacoes.map((notificacao) => (
              <div
                key={notificacao.id}
                className={cn(
                  "p-3 rounded-lg cursor-pointer transition-colors mb-1",
                  !notificacao.lida 
                    ? "bg-primary/5 hover:bg-primary/10" 
                    : "hover:bg-muted"
                )}
                onClick={() => {
                  if (!notificacao.lida) {
                    handleMarcarComoLida(notificacao.id)
                  }
                  if (notificacao.link) {
                    window.location.href = notificacao.link
                  }
                  setOpen(false)
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        !notificacao.lida && "text-primary"
                      )}>
                        {notificacao.titulo}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {formatarData(notificacao.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                      {notificacao.mensagem}
                    </p>
                  </div>
                  {!notificacao.lida && (
                    <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: PRIMARY_COLOR }} />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Rodapé */}
        <div className="p-2 border-t text-center">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={() => setOpen(false)}
          >
            Fechar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
