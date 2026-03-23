migrate(
  (app) => {
    // 1. Base API Access Rules
    const baseCollections = ['lojas', 'gerentes', 'produtos', 'promotores', 'visitas']
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

    // 2. Ensure Users collection has the "role" field
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
