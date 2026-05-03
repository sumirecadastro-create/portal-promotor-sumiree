import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UserPlus, CheckCircle, XCircle } from 'lucide-react'

export default function CadastroUsuarios() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('gerente')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    // Validar senhas
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem' })
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres' })
      setIsLoading(false)
      return
    }

    try {
      // Chamar a API route do Vercel em vez de usar supabase.auth.admin diretamente
      const response = await fetch('/api/admin/criar-usuario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          nome,
          role
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar usuário')
      }

      // Sucesso
      setMessage({ type: 'success', text: `✅ Usuário ${nome} criado com sucesso!` })
      
      // Limpar formulário
      setNome('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setRole('gerente')

    } catch (error: any) {
      console.error('Erro ao criar usuário:', error)
      
      let errorMessage = error.message
      if (error.message.includes('duplicate key') || error.message.includes('already registered')) {
        errorMessage = 'Este email já está em uso'
      } else if (error.message.includes('password')) {
        errorMessage = 'Senha inválida. Use pelo menos 6 caracteres'
      }
      
      setMessage({ type: 'error', text: `❌ Erro: ${errorMessage}` })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            <CardTitle>Cadastro de Usuários</CardTitle>
          </div>
          <CardDescription>
            Crie novos usuários para o sistema. Apenas administradores têm acesso a esta área.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo *</Label>
              <Input
                id="nome"
                type="text"
                placeholder="Ex: João Silva"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@empresa.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {/* Confirmar Senha */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Digite a senha novamente"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {/* Perfil */}
            <div className="space-y-2">
              <Label htmlFor="role">Perfil de Acesso *</Label>
              <Select value={role} onValueChange={setRole} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador (acesso total)</SelectItem>
                  <SelectItem value="gestor">Gestor (acesso parcial)</SelectItem>
                  <SelectItem value="gerente">Gerente de Loja (acesso limitado)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botão */}
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                'Criando usuário...'
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Criar Usuário
                </>
              )}
            </Button>

            {/* Mensagem */}
            {message && (
              <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
                {message.type === 'success' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
