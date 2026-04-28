protectedroute.tsx está assim:
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  console.log('ProtectedRoute - loading:', loading, 'user:', user)

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

  console.log('Renderizando outlet')
  return <Outlet />
}
