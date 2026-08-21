// src/components/ui/Header.tsx
import { Search } from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Input } from '@/components/ui/input'
import { NotificationBell } from '@/components/ui/NotificationBell'

export function Header({ title }: { title: string }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background px-4 md:px-6 z-10 sticky top-0">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <h1 className="text-lg font-semibold md:text-xl">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar..."
            className="w-full bg-muted/50 pl-8 rounded-full"
          />
        </div>

        {/* 🔥 SUBSTITUIR PELO NotificationBell */}
        <NotificationBell />
      </div>
    </header>
  )
}
