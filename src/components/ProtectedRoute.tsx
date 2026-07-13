import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import MainLayout from '@/layouts/MainLayout'

// 🔥 PERFIS PERMITIDOS NO SISTEMA
const ALLOWED_ROLES = ['admin', 'gestor', 'gerente', 'regional', 'gerente_regional', 'supervisor', 'promotor']

export default function ProtectedRoute() {
  const { user, loading, isAdmin, isGerente, isRegional, isGestor } = useAuth()

  console.log('ProtectedRoute - loading:', loading, 'user:', user?.email, 'role:', user?.app_role)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    console.log('Redirecionando para /login')
    return <Navigate to="/login" replace />
  }

  // 🔥 VERIFICA SE O USUÁRIO TEM PERMISSÃO
  const hasAccess = isAdmin || isGerente || isRegional || isGestor
  
  // Alternativa: usar a lista de roles
  // const hasAccess = ALLOWED_ROLES.includes(user?.app_role)

  if (!hasAccess) {
    console.log('Usuário sem permissão - role:', user?.app_role)
    return <Navigate to="/acesso-negado" replace />
  }

  console.log('✅ Renderizando layout - usuário:', user.email, 'role:', user?.app_role)
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  )
}
