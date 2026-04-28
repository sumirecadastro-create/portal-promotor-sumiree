import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()

  console.log('ProtectedRoute - loading:', loading, 'user:', user?.email)

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

  console.log('Renderizando outlet - usuário:', user.email)
  return <Outlet />
}
