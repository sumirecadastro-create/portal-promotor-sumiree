import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  User, 
  Lock, 
  Mail, 
  Shield, 
  Save, 
  Loader2, 
  Eye,
  EyeOff,
  Building2,
  Calendar,
  CheckCircle2
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'

export default function Configuracoes() {
  const { user, perfil, isAdmin, userLojaId } = useAuth()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [success, setSuccess] = useState(false)
  
  // Estados do formulário de senha
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  
  // Estados para dados do usuário
  const [userEmail, setUserEmail] = useState('')
  const [userRole, setUserRole] = useState('')
  const [userLoja, setUserLoja] = useState<{ cod_loja: string; nome_loja: string } | null>(null)

  useEffect(() => {
    if (user?.email) {
      setUserEmail(user.email)
    }
    if (perfil?.role) {
      setUserRole(perfil.role === 'admin' ? 'Administrador' : 'Gerente')
    }
    
    if (!isAdmin && userLojaId) {
      const fetchLoja = async () => {
        const { data } = await supabase
          .from('lojas')
          .select('cod_loja, nome_loja')
          .eq('id', userLojaId)
          .single()
        if (data) {
          setUserLoja(data)
        }
      }
      fetchLoja()
    }
  }, [user, perfil, isAdmin, userLojaId])

  // Resetar o estado de sucesso após 5 segundos
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [success])

  const handlePasswordChange = async () => {
    // Validações
    if (!passwordForm.currentPassword) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Digite sua senha atual',
      })
      return
    }
    
    if (!passwordForm.newPassword) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Digite a nova senha',
      })
      return
    }
    
    if (passwordForm.newPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'A nova senha deve ter pelo menos 6 caracteres',
      })
      return
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'As senhas não coincidem',
      })
      return
    }

    setLoading(true)
    
    try {
      // Verificar a senha atual
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: passwordForm.currentPassword,
      })
      
      if (signInError) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Senha atual incorreta',
        })
        setLoading(false)
        return
      }
      
      // Atualizar a senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      })
      
      if (updateError) {
        throw updateError
      }
      
      // Sucesso
      setSuccess(true)
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      
      toast({
        title: 'Senha alterada!',
        description: 'Sua senha foi alterada com sucesso.',
      })
      
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Erro ao alterar senha',
      })
    } finally {
      setLoading(false)
    }
  }

  const getInitials = () => {
    if (!userEmail) return 'U'
    return userEmail.substring(0, 2).toUpperCase()
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="rounded-lg p-6 text-white" style={{ background: `linear-gradient(135deg, #FF1686 0%, #cc1168 100%)` }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <User className="h-7 w-7" />
              Configurações
            </h1>
            <p className="text-pink-100 text-sm mt-1">
              Gerencie suas informações e segurança
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Card de Perfil */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-pink-500" />
              Meu Perfil
            </CardTitle>
            <CardDescription>
              Suas informações de acesso e permissões
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center mb-4">
              <Avatar className="h-24 w-24 border-2 border-pink-200">
                <AvatarFallback className="text-2xl font-medium bg-pink-100 text-pink-600">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">E-mail</span>
                </div>
                <span className="text-sm font-medium">{userEmail}</span>
              </div>
              
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Perfil</span>
                </div>
                <Badge className={isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}>
                  {userRole}
                </Badge>
              </div>
              
              {!isAdmin && userLoja && (
                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Loja Vinculada</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium">{userLoja.cod_loja}</span>
                    <p className="text-xs text-gray-400">{userLoja.nome_loja}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Login via</span>
                </div>
                <span className="text-sm font-medium">Supabase Auth</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card de Alterar Senha */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-pink-500" />
              Alterar Senha
            </CardTitle>
            <CardDescription>
              Mantenha sua conta segura com uma senha forte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mensagem de sucesso */}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <p className="text-sm text-green-700">
                  Senha alterada com sucesso!
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha Atual</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Digite sua senha atual"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Digite a nova senha (mínimo 6 caracteres)"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirme a nova senha"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div className="pt-2">
              <Button 
                onClick={handlePasswordChange} 
                disabled={loading}
                className="w-full gap-2"
                style={{ background: '#FF1686' }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Alterar Senha
              </Button>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>Dica de segurança:</strong> Use uma senha com pelo menos 6 caracteres, 
                incluindo letras, números e símbolos para maior segurança.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
