// api/admin/criar-usuario.js
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password, nome, role, lojaId } = req.body

    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Configuração do Supabase não encontrada' })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome, role }
    })

    if (authError) {
      return res.status(400).json({ error: authError.message })
    }

    // Preparar os dados para inserir
    const insertData = {
      id: authData.user.id,
      nome,
      email,
      role,
      created_at: new Date().toISOString()
    }

    // Se for gerente e tiver lojaId, adicionar o vínculo
    if (role === 'gerente' && lojaId) {
      insertData.loja_id = lojaId
    }

    const { error: dbError } = await supabaseAdmin
      .from('usuarios_internos')
      .insert(insertData)

    if (dbError) {
      // Se falhar no banco, deletar o usuário do auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return res.status(400).json({ error: dbError.message })
    }

    return res.status(200).json({ 
      success: true, 
      user: {
        id: authData.user.id,
        email: authData.user.email,
        nome,
        role,
        loja_id: role === 'gerente' ? lojaId : null
      }
    })

  } catch (error) {
    console.error('Erro:', error)
    return res.status(500).json({ error: error.message })
  }
}
