import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()

  console.log('ProtectedRoute - loading:', loading, 'user:', user?.email)

  // Aguardar o loading terminar
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Depois que o loading terminou, verificar se tem usuário
  if (!user) {
    console.log('Redirecionando para /login - usuário não encontrado')
    return <Navigate to="/login" replace />
  }

  console.log('Renderizando outlet - usuário autenticado:', user.email)
  return <Outlet />
}
