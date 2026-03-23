migrate(
  (app) => {
    // ============================================
    // 1. SYSTEM USERS INTEGRITY
    // ============================================
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    const verifyOrSeedUser = (email, password, role, name) => {
      let record
      try {
        record = app.findAuthRecordByEmail('_pb_users_auth_', email)
      } catch (_) {
        record = new Record(users)
      }
      record.setEmail(email)
      record.setPassword(password)
      record.setVerified(true)
      record.set('role', role)
      record.set('name', name)
      app.save(record)
      console.log(`Usuário validado/criado: ${email} (${role})`)
      return record
    }

    // Seed standard accounts
    verifyOrSeedUser('admin@sumire.com', 'admin123', 'admin', 'Administrador Sumirê')
    verifyOrSeedUser('gerente@sumire.com', 'gerente123', 'gerente', 'Gerente de Loja')
    const promotor = verifyOrSeedUser(
      'promotor@sumire.com',
      'securepassword123',
      'promotor',
      'Promotor Teste',
    )

    // ============================================
    // 2. PROMOTOR RECORD LINKING
    // ============================================
    try {
      const promotores = app.findCollectionByNameOrId('promotores')
      const pRecords = app.findRecordsByFilter('promotores', `user = '${promotor.id}'`, '', 1, 0)

      // Se o promotor não estiver vinculado a nenhum registro de atuação, cria um vínculo
      if (pRecords.length === 0) {
        const lojas = app.findRecordsByFilter('lojas', '1=1', '', 1, 0)
        const gerentes = app.findRecordsByFilter('gerentes', '1=1', '', 1, 0)
        const produtos = app.findRecordsByFilter('produtos', '1=1', '', 1, 0)

        if (lojas.length > 0 && gerentes.length > 0 && produtos.length > 0) {
          const newPromotor = new Record(promotores)
          newPromotor.set('promotor_nome', 'Promotor Teste')
          newPromotor.set('cod_loja', lojas[0].id)
          newPromotor.set('nome_gerente', gerentes[0].id)
          newPromotor.set('marca_produto', produtos[0].id)
          newPromotor.set('fabricante_produto', produtos[0].id)
          newPromotor.set('user', promotor.id)
          app.save(newPromotor)
          console.log('Registro de atuação do promotor criado e vinculado com sucesso.')
        }
      }
    } catch (e) {
      console.log('Aviso ao vincular promotor:', e.message)
    }
  },
  (app) => {
    // Revert function left safely empty to preserve base system users
  },
)
