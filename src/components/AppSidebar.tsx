import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Store,
  Users,
  MapPin,
  Tags,
  Bookmark,
  BarChart3,
  Settings,
  LogOut,
  User,
  Calendar,
  Target,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar'
import { useAuth } from '@/hooks/use-auth'

const allItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Lojas', url: '/lojas', icon: Store },
  { title: 'Promotores', url: '/promotores', icon: Users },
  { title: 'Check-in (Operação)', url: '/check-in', icon: MapPin },
  { title: 'Cadastro de Promotores', url: '/cadastro-promotores', icon: Tags },
  { title: 'Marcas', url: '/marcas', icon: Bookmark },
  { title: 'Ações', url: '/acoes', icon: Target },
  { title: 'Campanhas', url: '/campanhas', icon: Calendar },
  { title: 'Relatórios', url: '/relatorios', icon: BarChart3 },
]

export function AppSidebar() {
  const location = useLocation()
  const { user, signOut, loading } = useAuth()

  // 🔥 FORÇA ADMIN PARA SEMPRE MOSTRAR O MENU
  // Isso vai funcionar independente do user ou loading
  const role = 'admin'

  // Se ainda estiver carregando, mostra um placeholder
  if (loading) {
    return (
      <Sidebar>
        <SidebarHeader className="p-4 border-b">
          <div className="h-8 w-auto bg-gray-200 animate-pulse rounded"></div>
        </SidebarHeader>
        <SidebarContent>
          <div className="p-4 text-center text-muted-foreground">Carregando...</div>
        </SidebarContent>
      </Sidebar>
    )
  }

  const items = allItems

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2">
          <img 
            src="/logo_sumire.png" 
            alt="Sumirê" 
            className="h-8 w-auto"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 px-2 mb-4">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate">{user?.email || 'admin@sumire.com'}</span>
            <span className="text-xs text-muted-foreground capitalize">admin</span>
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="text-muted-foreground">
              <Settings />
              <span>Configurações</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              className="text-red-500 hover:text-red-600 cursor-pointer"
            >
              <LogOut />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
