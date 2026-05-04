import { useAuth } from '@/hooks/use-auth'
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'
import { 
  LayoutDashboard, 
  Store, 
  Users, 
  CheckSquare, 
  Target, 
  Megaphone, 
  BarChart3,
  UserPlus 
} from 'lucide-react'
import { Link } from 'react-router-dom'

export function SidebarMenuItems() {
  const { isAdmin } = useAuth()

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/lojas', label: 'Lojas', icon: Store },
    { href: '/promotores', label: 'Promotores', icon: Users },
    { href: '/check-in', label: 'Check-in (Operação)', icon: CheckSquare },
    { href: '/acoes', label: 'Ações', icon: Target },
    { href: '/campanhas', label: 'Campanhas', icon: Megaphone },
    { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  ]

  return (
    <SidebarMenu>
      {menuItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton asChild>
            <Link to={item.href}>
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
      
      {/* Só administradores e gestores podem ver Cadastro de Usuários */}
      {isAdmin && (
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link to="/cadastro-usuarios">
              <UserPlus className="h-4 w-4" />
              <span>Cadastro de Usuários</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
    </SidebarMenu>
  )
}
