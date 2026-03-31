import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: (User & { role?: string }) | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<(User & { role?: string }) | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUserWithRole = async (userId: string) => {
      const { data, error } = await supabase
        .from('perfis')
        .select('role')
        .eq('id', userId)
        .maybeSingle()
      return data?.role || 'promotor'
    }

    // Verificar sessão atual
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const role = await getUserWithRole(session.user.id)
        setUser({ ...session.user, role })
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    // Ouvir mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const role = await getUserWithRole(session.user.id)
        setUser({ ...session.user, role })
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
