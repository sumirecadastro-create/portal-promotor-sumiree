import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

interface CustomUser extends User {
  app_role?: string
  nome?: string
}

interface AuthContextType {
  user: CustomUser | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

const fetchCustomUserData = async (authUser: User): Promise<CustomUser> => {
  try {
    const { data, error } = await supabase
      .from('usuarios_internos')
      .select('role, nome')
      .eq('email', authUser.email)
      .maybeSingle()

    const customUser = authUser as CustomUser
    customUser.app_role = data?.role || 'admin'  // Força admin se não encontrar
    customUser.nome = data?.nome || authUser.email?.split('@')[0]
    
    console.log('✅ Role carregada:', customUser.email, '→', customUser.app_role)
    return customUser
  } catch (error) {
    console.error('Erro ao buscar role:', error)
    const customUser = authUser as CustomUser
    customUser.app_role = 'admin'  // Força admin em caso de erro
    return customUser
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<CustomUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Função para carregar o usuário
    const loadUser = async () => {
      setLoading(true)
      
      // Pega a sessão atual
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        const customUser = await fetchCustomUserData(session.user)
        setUser(customUser)
      } else {
        setUser(null)
      }
      
      setLoading(false)
    }

    loadUser()

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event)
      
      if (session?.user) {
        const customUser = await fetchCustomUserData(session.user)
        setUser(customUser)
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
