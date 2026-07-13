// hooks/use-auth.ts
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
  isGestor: boolean
  isRegional: boolean
  isSupervisor: boolean
  isPromotor: boolean
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
  const [isGestor, setIsGestor] = useState(false)
  const [isRegional, setIsRegional] = useState(false)
  const [isSupervisor, setIsSupervisor] = useState(false)
  const [isPromotor, setIsPromotor] = useState(false)
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
              .select('id, role, nome, loja_id')
              .eq('email', session.user.email)
              .maybeSingle()
            
            const customUser = session.user as CustomUser
            const role = userData?.role || 'promotor'
            
            // 🔥 SALVAR O ID INTERNO DO USUÁRIO
            const internalUserId = userData?.id
            
            // 🔥 SOBRESCREVER O ID DO USUÁRIO COM O ID INTERNO
            customUser.id = internalUserId
            customUser.app_role = role
            customUser.nome = userData?.nome || session.user.email?.split('@')[0]
            customUser.loja_id = userData?.loja_id || null
            
            // 🔥 SETAR PERMISSÕES
            setIsAdmin(role === 'admin')
            setIsGestor(role === 'gestor')
            setIsGerente(role === 'gerente')
            setIsRegional(role === 'regional' || role === 'gerente_regional')
            setIsSupervisor(role === 'supervisor')
            setIsPromotor(role === 'promotor')
            
            // 🔥 userLojaId DEVE SER O ID DO USUÁRIO PARA REGIONAL
            if (role === 'regional' || role === 'gerente_regional') {
              // Para regional, usar o ID do usuário (para buscar na tabela gerentes_regionais_lojas)
              setUserLojaId(internalUserId)
              console.log('🔑 Regional - userLojaId (ID do usuário):', internalUserId)
            } else {
              // Para outros perfis, usar a loja_id
              setUserLojaId(userData?.loja_id || null)
              console.log('🔑 userLojaId (loja_id):', userData?.loja_id)
            }
            
            console.log('✅ Usuário carregado:', customUser.email, 'Role:', role, 'Internal ID:', internalUserId)
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
      setIsGestor(false)
      setIsGerente(false)
      setIsRegional(false)
      setIsSupervisor(false)
      setIsPromotor(false)
      setUserLojaId(null)
      setLoading(false)
    }

    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event)
      
      if (session?.user) {
        const { data: userData } = await supabase
          .from('usuarios_internos')
          .select('id, role, nome, loja_id')
          .eq('email', session.user.email)
          .maybeSingle()
        
        const customUser = session.user as CustomUser
        const role = userData?.role || 'promotor'
        const internalUserId = userData?.id
        
        customUser.id = internalUserId
        customUser.app_role = role
        customUser.nome = userData?.nome || session.user.email?.split('@')[0]
        customUser.loja_id = userData?.loja_id || null
        
        setIsAdmin(role === 'admin')
        setIsGestor(role === 'gestor')
        setIsGerente(role === 'gerente')
        setIsRegional(role === 'regional' || role === 'gerente_regional')
        setIsSupervisor(role === 'supervisor')
        setIsPromotor(role === 'promotor')
        
        if (role === 'regional' || role === 'gerente_regional') {
          setUserLojaId(internalUserId)
          console.log('🔑 Regional - userLojaId (ID do usuário):', internalUserId)
        } else {
          setUserLojaId(userData?.loja_id || null)
          console.log('🔑 userLojaId (loja_id):', userData?.loja_id)
        }
        
        setUser(customUser)
      } else {
        setUser(null)
        setIsAdmin(false)
        setIsGestor(false)
        setIsGerente(false)
        setIsRegional(false)
        setIsSupervisor(false)
        setIsPromotor(false)
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
      setIsGestor(false)
      setIsGerente(false)
      setIsRegional(false)
      setIsSupervisor(false)
      setIsPromotor(false)
      setUserLojaId(null)
      
      console.log('✅ Logout realizado com sucesso')
      
      window.location.href = '/login'
    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error)
      window.location.href = '/login'
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAdmin, 
      isGerente,
      isGestor,
      isRegional,
      isSupervisor,
      isPromotor,
      userLojaId, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  )
}
