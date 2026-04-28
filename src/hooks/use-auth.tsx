import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

// 🔥 Estendendo o tipo User para incluir nossos campos customizados
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
      
      // 🔥 Configuração do Supabase
      const supabaseUrl = 'https://yfyxpgksrpnzndjtlobe.supabase.co'
      const storageKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`
      
      // Tentar pegar a sessão do localStorage (do login manual)
      const storedSession = localStorage.getItem(storageKey)
      
      if (storedSession) {
        try {
          const session = JSON.parse(storedSession)
          console.log('📦 Sessão encontrada no localStorage:', session?.user?.email)
          
          if (session?.user) {
            // Buscar dados adicionais na tabela usuarios_internos
            const { data: userData, error } = await supabase
              .from('usuarios_internos')
              .select('role, nome')
              .eq('email', session.user.email)
              .single()
            
            if (error) {
              console.error('Erro ao buscar role:', error)
            }
            
            const customUser = session.user as CustomUser
            customUser.app_role = userData?.role || 'admin'
            customUser.nome = userData?.nome || session.user.email?.split('@')[0]
            
            console.log('✅ Usuário carregado:', customUser.email, '→ Role:', customUser.app_role)
            setUser(customUser)
            setLoading(false)
            return
          }
        } catch (e) {
          console.error('Erro ao parsear sessão:', e)
        }
      }
      
      // Fallback: tentar sessão do Supabase
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        console.log('📦 Sessão encontrada no Supabase:', session.user.email)
        
        const { data: userData, error } = await supabase
          .from('usuarios_internos')
          .select('role, nome')
          .eq('email', session.user.email)
          .single()
        
        if (error) {
          console.error('Erro ao buscar role:', error)
        }
        
        const customUser = session.user as CustomUser
        customUser.app_role = userData?.role || 'admin'
        customUser.nome = userData?.nome || session.user.email?.split('@')[0]
        
        console.log('✅ Usuário carregado:', customUser.email, '→ Role:', customUser.app_role)
        setUser(customUser)
      } else {
        console.log('❌ Nenhuma sessão encontrada')
        setUser(null)
      }
      
      setLoading(false)
    }

    loadUser()

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('🔄 Auth state changed:', _event, session?.user?.email)
      
      if (session?.user) {
        const { data: userData } = await supabase
          .from('usuarios_internos')
          .select('role, nome')
          .eq('email', session.user.email)
          .single()
        
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
    // Limpar localStorage manualmente
    const supabaseUrl = 'https://yfyxpgksrpnzndjtlobe.supabase.co'
    const storageKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`
    localStorage.removeItem(storageKey)
    
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
