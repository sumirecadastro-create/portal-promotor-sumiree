migrate(
  (app) => {
    // 1. Update Collection API Rules
    const collections = ['lojas', 'gerentes', 'produtos', 'promotores']
    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        col.listRule = "@request.auth.id != ''"
        col.viewRule = "@request.auth.id != ''"
        col.createRule = "@request.auth.id != ''"
        col.updateRule = "@request.auth.id != ''"
        col.deleteRule = "@request.auth.id != ''"
        app.save(col)
      } catch (err) {
        console.error(`Error updating rules for ${name}:`, err.message)
      }
    }

    try {
      const visitas = app.findCollectionByNameOrId('visitas')
      visitas.listRule =
        "@request.auth.role = 'admin' || @request.auth.role = 'gerente' || (@request.auth.role = 'promotor' && promotor.user = @request.auth.id)"
      visitas.viewRule =
        "@request.auth.role = 'admin' || @request.auth.role = 'gerente' || (@request.auth.role = 'promotor' && promotor.user = @request.auth.id)"
      visitas.createRule =
        "@request.auth.role = 'admin' || @request.auth.role = 'gerente' || @request.auth.role = 'promotor'"
      visitas.updateRule =
        "@request.auth.role = 'admin' || @request.auth.role = 'gerente' || (@request.auth.role = 'promotor' && promotor.user = @request.auth.id)"
      visitas.deleteRule = "@request.auth.role = 'admin' || @request.auth.role = 'gerente'"
      app.save(visitas)
    } catch (err) {
      console.error('Error updating rules for visitas:', err.message)
    }

    // 2. Seed Users
    const usersCol = app.findCollectionByNameOrId('users')
    const seedUsers = [
      { email: 'amorimmichele@gmail.com', role: 'admin', name: 'Admin' },
      { email: 'gerente@sumire.com', role: 'gerente', name: 'Gerente' },
      { email: 'promotor@sumire.com', role: 'promotor', name: 'Promotor' },
    ]

    for (const u of seedUsers) {
      try {
        const record = new Record(usersCol)
        record.setEmail(u.email)
        record.setPassword('securepassword123')
        record.setVerified(true)
        record.set('role', u.role)
        record.set('name', u.name)
        app.save(record)
      } catch (e) {
        try {
          const existing = app.findAuthRecordByEmail('users', u.email)
          existing.setPassword('securepassword123')
          existing.set('role', u.role)
          existing.setVerified(true)
          app.save(existing)
        } catch (e2) {
          console.error(`Error seeding user ${u.email}:`, e2.message)
        }
      }
    }

    // 3. Seed Lojas
    try {
      const lojasCol = app.findCollectionByNameOrId('lojas')
      const existingLojas = app.countRecords('lojas')
      if (existingLojas === 0) {
        const l1 = new Record(lojasCol)
        l1.set('cod_loja', 'L001')
        l1.set('loja_nome', 'Sumirê Matriz')
        app.save(l1)

        const l2 = new Record(lojasCol)
        l2.set('cod_loja', 'L002')
        l2.set('loja_nome', 'Sumirê Filial Centro')
        app.save(l2)
      }
    } catch (e) {
      console.error('Error seeding lojas:', e.message)
    }

    // 4. Seed Produtos
    try {
      const produtosCol = app.findCollectionByNameOrId('produtos')
      const existingProdutos = app.countRecords('produtos')
      if (existingProdutos === 0) {
        const p1 = new Record(produtosCol)
        p1.set('cod_produto', 'P001')
        p1.set('descricao_produto', 'Shampoo Revitalizante')
        p1.set('marca_produto', 'Beleza Pura')
        p1.set('categoria_produto', 'Cabelos')
        app.save(p1)

        const p2 = new Record(produtosCol)
        p2.set('cod_produto', 'P002')
        p2.set('descricao_produto', 'Condicionador Hidratante')
        p2.set('marca_produto', 'Beleza Pura')
        p2.set('categoria_produto', 'Cabelos')
        app.save(p2)
      }
    } catch (e) {
      console.error('Error seeding produtos:', e.message)
    }

    // 5. Update CORS
    try {
      const settings = app.settings()
      if (!settings.api) {
        settings.api = {}
      }
      const origins = new Set(settings.api.corsAllowedOrigins || [])
      origins.add('https://portal-promotor-sumire-f82ca.goskip.app')
      origins.add('https://portal-promotor-sumire-f82ca--preview.goskip.app')
      settings.api.corsAllowedOrigins = Array.from(origins)
      app.save(settings)
    } catch (e) {
      console.error('Error updating CORS:', e.message)
    }
  },
  (app) => {
    // Revert logic (optional for seed migrations)
  },
)
