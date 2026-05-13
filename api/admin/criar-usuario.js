// api/admin/criar-usuario.js
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Apenas aceitar método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password, nome, role, lojaId } = req.body

    // Validar campos obrigatórios
    if (!email || !password || !nome || !role) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' })
    }

    // Validar senha
    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' })
    }

    // Buscar configurações do Supabase
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Variáveis de ambiente não configuradas:', { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseServiceKey 
      })
      return res.status(500).json({ error: 'Configuração do Supabase não encontrada' })
    }

    // Criar cliente admin do Supabase
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 1. Criar usuário no Auth do Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        nome, 
        role,
        loja_id: role === 'gerente' ? lojaId : null
      }
    })

    if (authError) {
      console.error('Erro ao criar usuário no Auth:', authError)
      return res.status(400).json({ error: authError.message })
    }

    if (!authData || !authData.user) {
      return res.status(500).json({ error: 'Erro ao criar usuário: resposta inválida' })
    }

    // 2. Preparar dados para inserir na tabela usuarios_internos
    const insertData = {
      id: authData.user.id,
      nome: nome,
      email: email,
      password_hash: 'auth_managed', // Placeholder, a senha é gerenciada pelo Auth
      role: role,
      created_at: new Date().toISOString()
    }

    // Se for gerente e tiver lojaId, adicionar o vínculo
    if (role === 'gerente' && lojaId) {
      insertData.loja_id = lojaId
    }

    // 3. Inserir na tabela usuarios_internos
    const { error: dbError } = await supabaseAdmin
      .from('usuarios_internos')
      .insert(insertData)

    if (dbError) {
      console.error('Erro ao inserir no banco:', dbError)
      // Se falhar no banco, deletar o usuário do auth para não ficar inconsistente
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(console.error)
      return res.status(400).json({ error: dbError.message })
    }

    // Sucesso
    return res.status(200).json({ 
      success: true, 
      user: {
        id: authData.user.id,
        email: authData.user.email,
        nome: nome,
        role: role,
        loja_id: role === 'gerente' ? lojaId : null
      }
    })

  } catch (error) {
    console.error('Erro inesperado:', error)
    return res.status(500).json({ error: error.message || 'Erro interno do servidor' })
  }
}
