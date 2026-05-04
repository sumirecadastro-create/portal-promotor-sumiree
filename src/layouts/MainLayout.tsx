import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar'
import { SidebarMenuItems } from '@/components/SidebarMenuItems'
import { useAuth } from '@/hooks/use-auth'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth()

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b px-4 py-2">
            <h2 className="font-bold text-lg">Portal Sumirê</h2>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenuItems />
          </SidebarContent>
          <SidebarFooter className="border-t p-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">{user?.nome || user?.email}</p>
              <button
                onClick={signOut}
                className="text-sm text-red-500 hover:text-red-700 text-left"
              >
                Sair
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-12 items-center border-b px-4">
            <SidebarTrigger />
          </header>
          <main className="flex-1 overflow-auto p-4">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
