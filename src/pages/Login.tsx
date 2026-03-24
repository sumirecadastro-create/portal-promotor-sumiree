import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Cor principal da Sumirê
const PRIMARY_COLOR = '#FF1686'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  const from = location.state?.from?.pathname || '/'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const authData = await pb.collection('users').authWithPassword(email, password)
      toast({
        title: 'Login realizado com sucesso',
        description: 'Bem-vindo ao Portal Sumirê.',
      })

      let redirectPath = from
      if (from === '/') {
        if (authData.record.role === 'promotor') {
          redirectPath = '/check-in'
        } else if (authData.record.role === 'gerente') {
          redirectPath = '/lojas'
        } else {
          redirectPath = '/' // admin
        }
      }

      navigate(redirectPath, { replace: true })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao fazer login',
        description: getErrorMessage(error) || 'Verifique suas credenciais e tente novamente.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-white p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="space-y-4 text-center">
          {/* Logo da Sumirê */}
          <div className="flex justify-center mb-2">
            <img 
              src="/logo-sumire.png" 
              alt="Sumirê" 
              className="h-16 w-auto"
              onError={(e) => {
                // Fallback se a imagem não existir
                e.currentTarget.style.display = 'none'
                // Mostra o texto "S" como fallback
                const fallback = document.getElementById('logo-fallback')
                if (fallback) fallback.style.display = 'flex'
              }}
            />
            <div 
              id="logo-fallback"
              className="hidden h-16 w-16 rounded-full items-center justify-center"
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              <span className="text-white font-bold text-2xl">S</span>
            </div>
          </div>
          <CardTitle className="text-2xl" style={{ color: PRIMARY_COLOR }}>
            Portal Promotor Sumirê
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Acesse sua conta para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
            <Button 
              className="w-full font-medium transition-all hover:opacity-90" 
              type="submit" 
              disabled={isLoading}
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
