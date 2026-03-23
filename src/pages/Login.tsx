import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md animate-fade-in-up">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto h-12 w-12 rounded-lg bg-primary flex items-center justify-center mb-4">
            <span className="text-primary-foreground font-bold text-2xl">S</span>
          </div>
          <CardTitle className="text-2xl">Portal Promotor Sumirê</CardTitle>
          <CardDescription>Acesse sua conta para continuar</CardDescription>
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
              />
            </div>
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 text-xs text-center text-muted-foreground bg-muted p-3 rounded-md">
            <p className="font-semibold mb-1">Contas de Teste:</p>
            <p>Admin: admin@sumire.com / admin123</p>
            <p>Gerente: gerente@sumire.com / gerente123</p>
            <p>Promotor: promotor@sumire.com / securepassword123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
