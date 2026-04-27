import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

// 🔥 Estendendo o tipo User para incluir nossos campos customizados
interface CustomUser extends User {
  app_role?: string  // role da sua tabela usuarios_internos
  nome?: string      // nome da sua tabela usuarios_internos
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

// 🔥 Função para buscar dados adicionais na tabela usuarios_internos
const fetchCustomUserData = async (authUser: User): Promise<CustomUser> => {
  try {
    const { data, error } = await supabase
      .from('usuarios_internos')
      .select('role, nome')
      .eq('email', authUser.email)
      .single()

    if (error) {
      console.error('Erro ao buscar role do usuário:', error.message)
      return authUser as CustomUser
    }

    // Adiciona os campos customizados ao objeto do usuário
    const customUser = authUser as CustomUser
    customUser.app_role = data?.role || 'promotor'
    customUser.nome = data?.nome
    
    console.log('✅ Usuário com role carregada:', customUser.email, '→ Role:', customUser.app_role)
    
    return customUser
  } catch (error) {
    console.error('Erro ao carregar dados customizados:', error)
    return authUser as CustomUser
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<CustomUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar sessão atual e buscar dados customizados
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const customUser = await fetchCustomUserData(session.user)
        setUser(customUser)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
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
