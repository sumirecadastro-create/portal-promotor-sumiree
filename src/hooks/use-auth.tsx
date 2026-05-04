import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

interface CustomUser extends User {
  app_role?: string
  nome?: string
  loja_id?: string | null
}

interface AuthContextType {
  user: CustomUser | null
  loading: boolean
  isAdmin: boolean
  isGerente: boolean
  userLojaId: string | null
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
  const [isAdmin, setIsAdmin] = useState(false)
  const [isGerente, setIsGerente] = useState(false)
  const [userLojaId, setUserLojaId] = useState<string | null>(null)

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
              .select('role, nome, loja_id')
              .eq('email', session.user.email)
              .maybeSingle()
            
            const customUser = session.user as CustomUser
            customUser.app_role = userData?.role || 'admin'
            customUser.nome = userData?.nome || session.user.email?.split('@')[0]
            customUser.loja_id = userData?.loja_id || null
            
            // Setar permissões
            const adminRole = userData?.role === 'admin' || userData?.role === 'gestor'
            const gerenteRole = userData?.role === 'gerente'
            
            setIsAdmin(adminRole)
            setIsGerente(gerenteRole)
            setUserLojaId(userData?.loja_id || null)
            
            console.log('✅ Usuário carregado:', customUser.email, 'Role:', userData?.role, 'Loja:', userData?.loja_id)
            setUser(customUser)
            setLoading(false)
            return
          }
        } catch (e) {
          console.error('Erro ao parsear sessão:', e)
        }
      }
      
      setUser(null)
      setIsAdmin(false)
      setIsGerente(false)
      setUserLojaId(null)
      setLoading(false)
    }

    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event)
      
      if (session?.user) {
        const { data: userData } = await supabase
          .from('usuarios_internos')
          .select('role, nome, loja_id')
          .eq('email', session.user.email)
          .maybeSingle()
        
        const customUser = session.user as CustomUser
        customUser.app_role = userData?.role || 'admin'
        customUser.nome = userData?.nome || session.user.email?.split('@')[0]
        customUser.loja_id = userData?.loja_id || null
        
        setIsAdmin(userData?.role === 'admin' || userData?.role === 'gestor')
        setIsGerente(userData?.role === 'gerente')
        setUserLojaId(userData?.loja_id || null)
        
        setUser(customUser)
      } else {
        setUser(null)
        setIsAdmin(false)
        setIsGerente(false)
        setUserLojaId(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    try {
      console.log('🔓 Iniciando logout...')
      
      const supabaseUrl = 'https://yfyxpgksrpnzndjtlobe.supabase.co'
      const storageKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`
      
      localStorage.removeItem(storageKey)
      localStorage.removeItem('sb-auth-token')
      localStorage.removeItem('supabase.auth.token')
      
      sessionStorage.clear()
      
      await supabase.auth.signOut()
      
      setUser(null)
      setIsAdmin(false)
      setIsGerente(false)
      setUserLojaId(null)
      
      console.log('✅ Logout realizado com sucesso')
      
      window.location.href = '/login'
    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error)
      window.location.href = '/login'
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isGerente, userLojaId, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
