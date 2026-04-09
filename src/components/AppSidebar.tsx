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
  { title: 'Categorias', url: '/categorias', icon: Tags },
  { title: 'Marcas', url: '/marcas', icon: Bookmark },
  { title: 'Campanhas', url: '/campanhas', icon: Calendar },
  { title: 'Relatórios', url: '/relatorios', icon: BarChart3 },
]

export function AppSidebar() {
  const location = useLocation()
  const { user, signOut } = useAuth()

  // Forçar admin para mostrar todos os itens enquanto debug
  const role = 'admin'

  const items = allItems.filter((item) => {
    if (role === 'admin') return true
    if (role === 'gerente')
      return ['Dashboard', 'Lojas', 'Promotores', 'Relatórios'].includes(item.title)
    if (role === 'promotor') return ['Dashboard', 'Check-in (Operação)'].includes(item.title)
    return false
  })

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
            <span className="text-sm font-medium truncate">{user?.name || user?.email || 'Usuário'}</span>
            <span className="text-xs text-muted-foreground capitalize">{user?.role || 'admin'}</span>
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
