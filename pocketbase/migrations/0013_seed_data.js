migrate(
  (app) => {
    // 1. Seed Users (RBAC)
    const seedUsers = [
      { email: 'amorimmichele@gmail.com', role: 'admin', name: 'Admin' },
      { email: 'gerente@sumire.com', role: 'gerente', name: 'Gerente' },
      { email: 'promotor@sumire.com', role: 'promotor', name: 'Promotor' },
    ]

    const userIds = {}
    const usersCol = app.findCollectionByNameOrId('users')
    for (const u of seedUsers) {
      let record
      try {
        record = app.findAuthRecordByEmail('users', u.email)
      } catch {
        record = new Record(usersCol)
        record.setEmail(u.email)
      }
      record.setPassword('securepassword123')
      record.setVerified(true)
      record.set('role', u.role)
      record.set('name', u.name)
      app.save(record)
      userIds[u.role] = record.id
    }

    // 2. Seed Lojas
    const lojasCol = app.findCollectionByNameOrId('lojas')
    let lojaId
    try {
      const lojas = app.findRecordsByFilter('lojas', "cod_loja = 'L001'", '-created', 1, 0)
      if (lojas.length > 0) {
        lojaId = lojas[0].id
      } else {
        const l1 = new Record(lojasCol)
        l1.set('cod_loja', 'L001')
        l1.set('loja_nome', 'Loja 01 - Centro')
        app.save(l1)
        lojaId = l1.id
      }
    } catch (err) {
      console.error('Error seeding lojas:', err.message)
    }

    // 3. Seed Gerentes
    const gerentesCol = app.findCollectionByNameOrId('gerentes')
    let gerenteId
    try {
      const gerentes = app.findRecordsByFilter(
        'gerentes',
        "nome_gerente = 'Carlos Gerente'",
        '-created',
        1,
        0,
      )
      if (gerentes.length > 0) {
        gerenteId = gerentes[0].id
      } else {
        const g1 = new Record(gerentesCol)
        g1.set('nome_gerente', 'Carlos Gerente')
        g1.set('cod_loja', lojaId)
        app.save(g1)
        gerenteId = g1.id
      }
    } catch (err) {
      console.error('Error seeding gerentes:', err.message)
    }

    // 4. Seed Produtos
    const produtosCol = app.findCollectionByNameOrId('produtos')
    let produtoId
    try {
      const produtos = app.findRecordsByFilter('produtos', "cod_produto = 'P001'", '-created', 1, 0)
      if (produtos.length > 0) {
        produtoId = produtos[0].id
      } else {
        const p1 = new Record(produtosCol)
        p1.set('cod_produto', 'P001')
        p1.set('descricao_produto', 'Shampoo Revitalizante')
        p1.set('marca_produto', 'Beleza Pura')
        p1.set('categoria_produto', 'Cabelos')
        app.save(p1)
        produtoId = p1.id
      }
    } catch (err) {
      console.error('Error seeding produtos:', err.message)
    }

    // 5. Seed Promotores & Link to User
    if (userIds['promotor'] && lojaId && gerenteId && produtoId) {
      try {
        const promotoresCol = app.findCollectionByNameOrId('promotores')
        const promotores = app.findRecordsByFilter(
          'promotores',
          `user = '${userIds['promotor']}'`,
          '-created',
          1,
          0,
        )
        if (promotores.length === 0) {
          const pr = new Record(promotoresCol)
          pr.set('promotor_nome', 'João Promotor')
          pr.set('cod_loja', lojaId)
          pr.set('nome_gerente', gerenteId)
          pr.set('marca_produto', produtoId)
          pr.set('fabricante_produto', produtoId)
          pr.set('dias_semana', 'Seg-Sex')
          pr.set('contato_responsavel', 11999999999)
          pr.set('user', userIds['promotor'])
          app.save(pr)
        }
      } catch (err) {
        console.error('Error seeding promotores:', err.message)
      }
    }
  },
  (app) => {
    // Revert logic omitted for clarity
  },
)
