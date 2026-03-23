migrate(
  (app) => {
    // 1. CORS Configuration
    const settings = app.settings()
    if (!settings.api) {
      settings.api = {}
    }
    const origins = new Set(settings.api.corsAllowedOrigins || [])
    origins.add('https://portal-promotor-sumire-f82ca.goskip.app')
    origins.add('https://portal-promotor-sumire-f82ca--preview.goskip.app')
    settings.api.corsAllowedOrigins = Array.from(origins)
    app.save(settings)

    // 2. Base API Access Rules
    const baseCollections = ['lojas', 'gerentes', 'produtos', 'promotores']
    for (const name of baseCollections) {
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

    // 3. Visitas specific access rules
    try {
      const visitas = app.findCollectionByNameOrId('visitas')
      visitas.listRule =
        "@request.auth.role = 'admin' || @request.auth.role = 'gerente' || (@request.auth.role = 'promotor' && promotor.user = @request.auth.id)"
      visitas.viewRule =
        "@request.auth.role = 'admin' || @request.auth.role = 'gerente' || (@request.auth.role = 'promotor' && promotor.user = @request.auth.id)"
      visitas.createRule = "@request.auth.role != ''"
      visitas.updateRule =
        "@request.auth.role = 'admin' || @request.auth.role = 'gerente' || (@request.auth.role = 'promotor' && promotor.user = @request.auth.id)"
      visitas.deleteRule = "@request.auth.role = 'admin' || @request.auth.role = 'gerente'"
      app.save(visitas)
    } catch (err) {
      console.error('Error updating rules for visitas:', err.message)
    }

    // 4. Ensure Users collection has the "role" field
    try {
      const users = app.findCollectionByNameOrId('users')
      let roleField = users.fields.getByName('role')
      if (!roleField) {
        users.fields.add(
          new SelectField({
            name: 'role',
            values: ['admin', 'gerente', 'promotor'],
            maxSelect: 1,
          }),
        )
        app.save(users)
      }
    } catch (err) {
      console.error('Error updating users collection:', err.message)
    }
  },
  (app) => {
    // Revert logic omitted for clarity
  },
)
