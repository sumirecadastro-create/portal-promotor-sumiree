migrate(
  (app) => {
    // 1. Configure CORS policies
    try {
      const settings = app.settings()
      if (!settings.api) settings.api = {}
      const origins = new Set(settings.api.corsAllowedOrigins || [])
      origins.add('https://portal-promotor-sumire-f82ca.goskip.app')
      origins.add('https://portal-promotor-sumire-f82ca--preview.goskip.app')
      settings.api.corsAllowedOrigins = Array.from(origins)
      app.save(settings)
    } catch (err) {
      console.error('Error updating CORS:', err.message)
    }

    // 2. Update Users Access Rules
    try {
      const users = app.findCollectionByNameOrId('users')
      users.listRule = 'id = @request.auth.id'
      users.viewRule = 'id = @request.auth.id'
      users.updateRule = 'id = @request.auth.id'
      users.deleteRule = 'id = @request.auth.id'
      app.save(users)
    } catch (err) {
      console.error('Error updating users rules:', err.message)
    }

    // 3. Update Visitas Access Rules
    try {
      const visitas = app.findCollectionByNameOrId('visitas')
      const visitasRule =
        "@request.auth.role = 'admin' || @request.auth.role = 'gerente' || (@request.auth.role = 'promotor' && promotor.user = @request.auth.id)"
      visitas.listRule = visitasRule
      visitas.viewRule = visitasRule
      visitas.createRule =
        "@request.auth.role = 'admin' || @request.auth.role = 'gerente' || @request.auth.role = 'promotor'"
      visitas.updateRule = visitasRule
      visitas.deleteRule = "@request.auth.role = 'admin' || @request.auth.role = 'gerente'"
      app.save(visitas)
    } catch (err) {
      console.error('Error updating visitas rules:', err.message)
    }

    // 4. Seed Users
    const seedUsers = [
      { email: 'amorimmichele@gmail.com', role: 'admin', name: 'Admin Sumirê' },
      { email: 'gerente@sumire.com', role: 'gerente', name: 'Gerente Teste' },
      { email: 'promotor@sumire.com', role: 'promotor', name: 'Promotor Principal' },
      { email: 'promotor2@sumire.com', role: 'promotor', name: 'Promotor Auxiliar' },
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
      userIds[u.email] = record.id
    }

    // 5. Seed Lojas
    const lojasCol = app.findCollectionByNameOrId('lojas')
    const lojasData = [
      { cod: 'L001', nome: 'Sumirê Matriz' },
      { cod: 'L002', nome: 'Sumirê Filial Sul' },
    ]
    const lojaIds = []
    for (const l of lojasData) {
      let records = app.findRecordsByFilter('lojas', `cod_loja = '${l.cod}'`, '-created', 1, 0)
      let r
      if (records.length > 0) {
        r = records[0]
      } else {
        r = new Record(lojasCol)
        r.set('cod_loja', l.cod)
        r.set('loja_nome', l.nome)
        app.save(r)
      }
      lojaIds.push(r.id)
    }

    // 6. Seed Gerentes
    const gerentesCol = app.findCollectionByNameOrId('gerentes')
    const gerentesData = [
      { nome: 'Carlos Oliveira', loja: lojaIds[0] },
      { nome: 'Ana Costa', loja: lojaIds[1] },
    ]
    const gerenteIds = []
    for (const g of gerentesData) {
      let records = app.findRecordsByFilter(
        'gerentes',
        `nome_gerente = '${g.nome}'`,
        '-created',
        1,
        0,
      )
      let r
      if (records.length > 0) {
        r = records[0]
      } else {
        r = new Record(gerentesCol)
        r.set('nome_gerente', g.nome)
        r.set('cod_loja', g.loja)
        app.save(r)
      }
      gerenteIds.push(r.id)
    }

    // 7. Seed Produtos
    const produtosCol = app.findCollectionByNameOrId('produtos')
    const produtosData = [
      { cod: 'P001', desc: 'Shampoo Revitalizante 500ml', marca: 'Beleza Pura', cat: 'Cabelos' },
      { cod: 'P002', desc: 'Creme Hidratante Facial Dia', marca: 'Pele Soft', cat: 'Skincare' },
    ]
    const produtoIds = []
    for (const p of produtosData) {
      let records = app.findRecordsByFilter(
        'produtos',
        `cod_produto = '${p.cod}'`,
        '-created',
        1,
        0,
      )
      let r
      if (records.length > 0) {
        r = records[0]
      } else {
        r = new Record(produtosCol)
        r.set('cod_produto', p.cod)
        r.set('descricao_produto', p.desc)
        r.set('marca_produto', p.marca)
        r.set('categoria_produto', p.cat)
        app.save(r)
      }
      produtoIds.push(r.id)
    }

    // 8. Seed Promotores
    const promotoresCol = app.findCollectionByNameOrId('promotores')
    const promotoresData = [
      {
        nome: 'Promotor Principal',
        loja: lojaIds[0],
        gerente: gerenteIds[0],
        produto: produtoIds[0],
        user: userIds['promotor@sumire.com'],
      },
      {
        nome: 'Promotor Auxiliar',
        loja: lojaIds[1],
        gerente: gerenteIds[1],
        produto: produtoIds[1],
        user: userIds['promotor2@sumire.com'],
      },
    ]
    for (const p of promotoresData) {
      let records = app.findRecordsByFilter('promotores', `user = '${p.user}'`, '-created', 1, 0)
      if (records.length === 0) {
        let r = new Record(promotoresCol)
        r.set('promotor_nome', p.nome)
        r.set('cod_loja', p.loja)
        r.set('nome_gerente', p.gerente)
        r.set('marca_produto', p.produto)
        r.set('fabricante_produto', p.produto)
        r.set('dias_semana', 'Seg-Sex')
        r.set('contato_responsavel', 11999999999)
        r.set('user', p.user)
        app.save(r)
      }
    }
  },
  (app) => {
    // Revert logic empty as this is a seed/rebuild script
  },
)
