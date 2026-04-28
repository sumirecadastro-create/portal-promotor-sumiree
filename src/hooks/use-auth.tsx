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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<CustomUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true)
      
      const supabaseUrl = 'https://yfyxpgksrpnzndjtlobe.supabase.co'
      const storageKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`
      const storedSession = localStorage.getItem(storageKey)
      
      if (storedSession) {
        try {
          const session = JSON.parse(storedSession)
          console.log('📦 Sessão encontrada no localStorage:', session?.user?.email)
          
          if (session?.user) {
            const { data: userData } = await supabase
              .from('usuarios_internos')
              .select('role, nome')
              .eq('email', session.user.email)
              .maybeSingle()
            
            const customUser = session.user as CustomUser
            customUser.app_role = userData?.role || 'admin'
            customUser.nome = userData?.nome || session.user.email?.split('@')[0]
            
            console.log('✅ Usuário carregado:', customUser.email)
            setUser(customUser)
            setLoading(false)
            return
          }
        } catch (e) {
          console.error('Erro ao parsear sessão:', e)
        }
      }
      
      setUser(null)
      setLoading(false)
    }

    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event)
      
      if (session?.user) {
        const { data: userData } = await supabase
          .from('usuarios_internos')
          .select('role, nome')
          .eq('email', session.user.email)
          .maybeSingle()
        
        const customUser = session.user as CustomUser
        customUser.app_role = userData?.role || 'admin'
        customUser.nome = userData?.nome || session.user.email?.split('@')[0]
        
        setUser(customUser)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    try {
      console.log('🔓 Iniciando logout...')
      
      // Limpar localStorage (todas as chaves possíveis)
      const supabaseUrl = 'https://yfyxpgksrpnzndjtlobe.supabase.co'
      const storageKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`
      
      localStorage.removeItem(storageKey)
      localStorage.removeItem('sb-auth-token')
      localStorage.removeItem('supabase.auth.token')
      
      // Limpar sessionStorage
      sessionStorage.clear()
      
      // Fazer logout no Supabase
      await supabase.auth.signOut()
      
      // Limpar o estado do usuário
      setUser(null)
      
      console.log('✅ Logout realizado com sucesso')
      
      // Redirecionar para o login e recarregar a página
      window.location.href = '/login'
    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error)
      // Mesmo com erro, tentar redirecionar
      window.location.href = '/login'
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
