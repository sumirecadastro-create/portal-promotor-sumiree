import { Outlet, useLocation } from 'react-router-dom'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { Header } from './Header'

const getTitleFromPath = (path: string) => {
  if (path === '/') return 'Dashboard Executivo'
  if (path.startsWith('/lojas')) return 'Gestão de Lojas'
  if (path.startsWith('/promotores')) return 'Equipe de Promotores'
  if (path.startsWith('/check-in')) return 'Operação Check-in'
  if (path.startsWith('/cadastro-promotores')) return 'Cadastro de Promotores'  // ← ALTERADO
  if (path.startsWith('/marcas')) return 'Marcas'
  if (path.startsWith('/relatorios')) return 'Relatórios e Análises'
  return 'Portal Sumirê'
}

export default function Layout() {
  const location = useLocation()
  const title = getTitleFromPath(location.pathname)

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/20">
        <AppSidebar />
        <main className="flex w-full flex-col flex-1 overflow-hidden">
          <Header title={title} />
          <div className="flex-1 p-4 md:p-6 overflow-y-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
