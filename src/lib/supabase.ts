// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

// 🔥 EXPORTANDO A URL PARA O ACÕES.TSX USAR
export const supabaseUrl = 'https://yfyxpgksrpnzdjtlobe.supabase.co'
export const supabaseAnonKey = 'sb_publishable_zc64H0edWIVvHxmdZG8Myg_aw-3tP78'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
// ... resto do código
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'sb-auth-token',
    storage: localStorage,
    flowType: 'pkce'
  }
})

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  if (error) throw error
  return data
}

export async function logout() {
  await supabase.auth.signOut()
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getLojas() {
  const { data, error } = await supabase
    .from('lojas')
    .select('*')
    .order('nome_loja')
  if (error) throw error
  return data
}

export async function getPromotores() {
  const { data, error } = await supabase
    .from('promotores')
    .select('*, lojas(nome_loja)')
    .order('promotor_nome')
  if (error) throw error
  return data
}
