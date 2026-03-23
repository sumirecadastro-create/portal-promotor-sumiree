migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    const seedUser = (email, password, role, name) => {
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
      return record
    }

    seedUser('admin@sumire.com', 'admin123', 'admin', 'Admin Teste')
    seedUser('gerente@sumire.com', 'gerente123', 'gerente', 'Gerente Teste')
    const promotorUser = seedUser(
      'promotor@sumire.com',
      'securepassword123',
      'promotor',
      'Promotor Teste',
    )

    // Ensure there is a linked promotores record for the test promotor
    try {
      const promotores = app.findCollectionByNameOrId('promotores')
      const pRecords = app.findRecordsByFilter(
        'promotores',
        `user = '${promotorUser.id}'`,
        '',
        1,
        0,
      )

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
          newPromotor.set('user', promotorUser.id)
          app.save(newPromotor)
        }
      }
    } catch (e) {}
  },
  (app) => {},
)
