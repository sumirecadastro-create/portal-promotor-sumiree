import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { UserPlus, CheckCircle, XCircle, Search, Edit, Trash2, Loader2 } from 'lucide-react'

interface Usuario {
  id: string
  nome: string
  email: string
  role: string
  loja_id: string | null
  cod_loja: string | null
  nome_loja: string | null
  created_at: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  gestor: 'Gestor',
  gerente: 'Gerente de Loja',
  regional: 'Gerente Regional',
  promotor: 'Promotor',
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  gestor: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  gerente: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  regional: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  promotor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
}

export default function CadastroUsuarios() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('gerente')
  const [lojaId, setLojaId] = useState('')
  const [lojas, setLojas] = useState<{ id: string; nome_loja: string; cod_loja: string }[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingLojas, setIsLoadingLojas] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ============================================
  // TABELA DE USUÁRIOS
  // ============================================

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState(false)

  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const { data, error } = await supabase
        .from('usuarios_internos')
        .select(`
          id,
          nome,
          email,
          role,
          loja_id,
          lojas (
            cod_loja,
            nome_loja
          ),
          created_at
        `)
        .order('role', { ascending: true })
        .order('nome', { ascending: true })

      if (error) throw error

      const processedUsers = (data || []).map((u: any) => ({
        ...u,
        cod_loja: u.lojas?.cod_loja || null,
        nome_loja: u.lojas?.nome_loja || null,
      }))

      setUsuarios(processedUsers)
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  // ============================================
  // BUSCAR LOJAS PARA O FORMULÁRIO
  // ============================================

  useEffect(() => {
    async function carregarLojas() {
      setIsLoadingLojas(true)
      const { data, error } = await supabase
        .from('lojas')
        .select('id, nome_loja, cod_loja')
        .order('nome_loja')
      
      if (error) {
        console.error('Erro ao carregar lojas:', error)
      } else if (data) {
        setLojas(data)
      }
      setIsLoadingLojas(false)
    }
    carregarLojas()
  }, [])

  // ============================================
  // FILTRO DE USUÁRIOS
  // ============================================

  const filteredUsers = usuarios.filter((u) => {
    const searchLower = search.toLowerCase()
    return (
      u.nome?.toLowerCase().includes(searchLower) ||
      u.email?.toLowerCase().includes(searchLower) ||
      u.role?.toLowerCase().includes(searchLower)
    )
  })

  const getRoleLabel = (role: string) => ROLE_LABELS[role] || role
  const getRoleColor = (role: string) => ROLE_COLORS[role] || 'bg-gray-100 text-gray-800'

  // ============================================
  // EXCLUIR USUÁRIO
  // ============================================

  const handleDelete = async (usuario: Usuario) => {
    if (!confirm(`Deseja realmente excluir o usuário "${usuario.nome}"?`)) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('usuarios_internos')
        .delete()
        .eq('id', usuario.id)

      if (error) throw error

      setMessage({ type: 'success', text: `✅ Usuário ${usuario.nome} excluído com sucesso!` })
      await loadUsers()
    } catch (error: any) {
      setMessage({ type: 'error', text: `❌ Erro ao excluir: ${error.message}` })
    } finally {
      setDeleting(false)
    }
  }

  // ============================================
  // CRIAR USUÁRIO
  // ============================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

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

    if (role === 'gerente' && !lojaId) {
      setMessage({ type: 'error', text: 'Selecione uma loja para o gerente' })
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/admin/criar-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          nome,
          role,
          lojaId: role === 'gerente' ? lojaId : null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar usuário')
      }

      setMessage({ type: 'success', text: `✅ Usuário ${nome} criado com sucesso!` })
      
      setNome('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setRole('gerente')
      setLojaId('')

      await loadUsers()

    } catch (error: any) {
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

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* ==========================================
      FORMULÁRIO DE CRIAÇÃO (PRIMEIRO)
      ========================================== */}
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

            {role === 'gerente' && (
              <div className="space-y-2">
                <Label htmlFor="loja">Loja *</Label>
                <Select value={lojaId} onValueChange={setLojaId} disabled={isLoading || isLoadingLojas} required>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingLojas ? "Carregando lojas..." : "Selecione a loja que este gerente vai gerenciar"} />
                  </SelectTrigger>
                  <SelectContent>
                    {lojas.map(loja => (
                      <SelectItem key={loja.id} value={loja.id}>
                        {loja.cod_loja} - {loja.nome_loja}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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

      {/* ==========================================
      TABELA DE USUÁRIOS (ABAIXO DO FORMULÁRIO)
      ========================================== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Usuários do Sistema</CardTitle>
              <CardDescription>
                Total de {usuarios.length} usuários cadastrados
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuário..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {search ? 'Nenhum usuário encontrado para esta busca.' : 'Nenhum usuário cadastrado.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((usuario) => (
                      <TableRow key={usuario.id}>
                        <TableCell className="font-medium">{usuario.nome}</TableCell>
                        <TableCell>{usuario.email}</TableCell>
                        <TableCell>
                          <Badge className={getRoleColor(usuario.role)}>
                            {getRoleLabel(usuario.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {usuario.role === 'admin' || usuario.role === 'gestor'
                            ? 'Todas'
                            : usuario.cod_loja || usuario.nome_loja || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deleting}
                            onClick={() => {
                              setMessage({ type: 'success', text: '📝 Edição em desenvolvimento' })
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            disabled={deleting}
                            onClick={() => handleDelete(usuario)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
