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
  const { user, isAdmin, isGerente, isRegional, isGestor } = useAuth()

  // 🔥 DEFINIÇÃO DOS ITENS DO MENU COM PERMISSÕES
  const menuItems = [
    { 
      href: '/', 
      label: 'Dashboard', 
      icon: LayoutDashboard,
      permissions: ['admin', 'gestor', 'gerente', 'regional', 'gerente_regional', 'promotor']
    },
    { 
      href: '/lojas', 
      label: 'Lojas', 
      icon: Store,
      permissions: ['admin', 'gestor', 'regional', 'gerente_regional']
    },
    { 
      href: '/promotores', 
      label: 'Promotores', 
      icon: Users,
      // 🔥 ADICIONADO 'gerente' AQUI
      permissions: ['admin', 'gestor', 'gerente', 'regional', 'gerente_regional']
    },
    { 
      href: '/check-in', 
      label: 'Check-in (Operação)', 
      icon: CheckSquare,
      permissions: ['admin', 'gerente', 'promotor']
    },
    { 
      href: '/acoes', 
      label: 'Ações', 
      icon: Target,
      permissions: ['admin', 'gestor', 'gerente', 'regional', 'gerente_regional']
    },
    { 
      href: '/campanhas', 
      label: 'Campanhas', 
      icon: Megaphone,
      permissions: ['admin', 'gestor', 'gerente', 'regional', 'gerente_regional']
    },
    { 
      href: '/relatorios', 
      label: 'Relatórios', 
      icon: BarChart3,
      permissions: ['admin', 'gestor', 'gerente', 'regional', 'gerente_regional']
    },
    // 🔥 OPÇÃO "Solicitações de Promotores" REMOVIDA TEMPORARIAMENTE
    // { 
    //   href: '/solicitacoes-promotores', 
    //   label: 'Solicitações de Promotores', 
    //   icon: UserPlus,
    //   permissions: ['admin', 'gerente', 'regional', 'gerente_regional']
    // },
  ]

  // 🔥 FUNÇÃO PARA VERIFICAR SE O USUÁRIO TEM PERMISSÃO
  const hasPermission = (permissions: string[]) => {
    const role = user?.app_role || ''
    return permissions.includes(role)
  }

  // 🔥 FILTRA OS ITENS DO MENU
  const filteredMenu = menuItems.filter(item => hasPermission(item.permissions))

  return (
    <SidebarMenu>
      {filteredMenu.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton asChild>
            <Link to={item.href}>
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
      
      {/* Só administradores podem ver Cadastro de Usuários */}
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
