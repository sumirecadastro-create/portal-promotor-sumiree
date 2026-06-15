import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // 🔥 Usando fetch direto em vez do supabase.auth
      const supabaseUrl = 'https://yfyxpgksrpnzndjtlobe.supabase.co'
      const supabaseKey = 'sb_publishable_zc64H0edWIVvHxmdZG8Myg_aw-3tP78'
      
      const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey
        },
        body: JSON.stringify({ email, password })
      })
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error_description || 'Erro no login')
      }
      
      if (data.access_token) {
        // Salvar sessão manualmente no localStorage
        const storageKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`
        localStorage.setItem(storageKey, JSON.stringify({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          user: data.user
        }))
        
        console.log('✅ Login realizado com sucesso!')
        
        // Força recarregamento completo do navegador
        window.location.href = from
      } else {
        throw new Error('Resposta inválida do servidor')
      }
    } catch (error: any) {
      console.error('Erro detalhado:', error)
      alert(error.message || 'Erro ao fazer login. Verifique suas credenciais.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-white p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center mb-2">
            <img src="/logo_sumire.png" alt="Sumirê" className="h-16 w-auto" />
          </div>
          <CardTitle className="text-2xl" style={{ color: '#FF1686' }}>
            Portal Promotor Sumirê
          </CardTitle>
          <CardDescription>Acesse sua conta para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full"
              style={{ backgroundColor: '#FF1686' }}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
