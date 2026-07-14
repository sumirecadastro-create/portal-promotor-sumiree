import { Link, useLocation, useNavigate } from 'react-router-dom'
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
  UserPlus,
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
  { title: 'Cadastro de Usuários', url: '/cadastro-usuarios', icon: Users },
  { title: 'Marcas', url: '/marcas', icon: Bookmark },
  { title: 'Ações', url: '/acoes', icon: Target },
  { title: 'Campanhas', url: '/campanhas', icon: Calendar },
  { title: 'Relatórios', url: '/relatorios', icon: BarChart3 },
  { title: 'Solicitações de Promotores', url: '/solicitacoes-promotores', icon: UserPlus },
]

// 🔥 PERMISSÕES POR PERFIL
const rolePermissions: Record<string, string[]> = {
  admin: [
    'Dashboard',
    'Lojas',
    'Promotores',
    'Check-in (Operação)',
    'Cadastro de Usuários',
    'Marcas',
    'Ações',
    'Campanhas',
    'Relatórios',
    'Solicitações de Promotores'
  ],
  gestor: [
    'Dashboard',
    'Lojas',
    'Promotores',
    'Ações',
    'Campanhas',
    'Relatórios'
  ],
  gerente: [
    'Dashboard',
    'Promotores',  // 🔥 ADICIONADO
    'Check-in (Operação)',
    'Ações',
    'Campanhas',
    'Solicitações de Promotores',
    'Relatórios'
  ],
  regional: [
    'Dashboard',
    'Lojas',
    'Promotores',
    'Ações',
    'Campanhas',
    'Solicitações de Promotores',
    'Relatórios'
  ],
  gerente_regional: [
    'Dashboard',
    'Lojas',
    'Promotores',
    'Ações',
    'Campanhas',
    'Solicitações de Promotores',
    'Relatórios'
  ],
  promotor: [
    'Dashboard',
    'Check-in (Operação)'
  ],
}

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut, loading } = useAuth()

  const role = user?.app_role || 'promotor'

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

  // 🔥 FILTRO DE MENU BASEADO NO PERFIL
  const items = allItems.filter((item) => {
    const allowedItems = rolePermissions[role] || []
    return allowedItems.includes(item.title)
  })

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleConfiguracoes = () => {
    navigate('/configuracoes')
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2">
          <img 
            src="/logo_sumire.png" 
            alt="Sumirê" 
            className="h-8 w-auto"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <span className="text-lg font-bold text-pink-600 hidden md:block">
            Portal Sumirê
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === item.url}
                    className="transition-all duration-200"
                  >
                    <Link to={item.url}>
                      <item.icon className="h-5 w-5" />
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
          <div className="h-8 w-8 rounded-full bg-pink-100 flex items-center justify-center">
            <User className="h-4 w-4 text-pink-600" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate">
              {user?.nome || user?.email || 'Usuário'}
            </span>
            <span className="text-xs text-muted-foreground capitalize">
              {role === 'admin' ? 'Administrador' :
               role === 'gestor' ? 'Gestor' :
               role === 'gerente' ? 'Gerente de Loja' :
               role === 'regional' ? 'Gerente Regional' :
               role === 'gerente_regional' ? 'Gerente Regional' :
               role === 'promotor' ? 'Promotor' : 
               role || 'Sem perfil'}
            </span>
          </div>
        </div>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleConfiguracoes}
              isActive={location.pathname === '/configuracoes'}
              className="cursor-pointer transition-all duration-200"
            >
              <Settings className="h-5 w-5" />
              <span>Configurações</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-all duration-200"
            >
              <LogOut className="h-5 w-5" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
