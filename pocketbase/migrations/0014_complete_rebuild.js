migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({ name: 'role', values: ['admin', 'gerente', 'promotor'], maxSelect: 1 }),
      )
    }
    if (!users.fields.getByName('name')) {
      users.fields.add(new TextField({ name: 'name' }))
    }
    if (!users.fields.getByName('phone')) {
      users.fields.add(new TextField({ name: 'phone' }))
    }
    app.save(users)

    const collectionsData = [
      {
        name: 'lojas',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role ?= 'admin' || @request.auth.role ?= 'gerente'",
        updateRule: "@request.auth.role ?= 'admin' || @request.auth.role ?= 'gerente'",
        deleteRule: "@request.auth.role ?= 'admin'",
        fields: [
          { name: 'nome', type: 'text', required: true },
          { name: 'endereco', type: 'text' },
          { name: 'cidade', type: 'text' },
          { name: 'estado', type: 'text' },
          { name: 'cep', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      },
      {
        name: 'produtos',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role ?= 'admin'",
        updateRule: "@request.auth.role ?= 'admin'",
        deleteRule: "@request.auth.role ?= 'admin'",
        fields: [
          { name: 'nome', type: 'text', required: true },
          { name: 'codigo', type: 'text' },
          { name: 'preco', type: 'number' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      },
      {
        name: 'visitas',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role ?= 'admin'",
        fields: [
          { name: 'promotor', type: 'relation', collectionId: users.id, maxSelect: 1 },
          { name: 'loja', type: 'relation', collectionId: 'lojas', maxSelect: 1 },
          { name: 'data', type: 'date' },
          {
            name: 'status',
            type: 'select',
            values: ['agendada', 'em_andamento', 'concluida', 'cancelada'],
          },
          { name: 'checkin', type: 'date' },
          { name: 'checkout', type: 'date' },
          { name: 'observacoes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      },
    ]

    for (const def of collectionsData) {
      try {
        const col = app.findCollectionByNameOrId(def.name)

        col.listRule = def.listRule
        col.viewRule = def.viewRule
        col.createRule = def.createRule
        col.updateRule = def.updateRule
        col.deleteRule = def.deleteRule

        for (const field of def.fields) {
          if (!col.fields.getByName(field.name)) {
            if (field.type === 'text') col.fields.add(new TextField(field))
            else if (field.type === 'number') col.fields.add(new NumberField(field))
            else if (field.type === 'date') col.fields.add(new DateField(field))
            else if (field.type === 'autodate') col.fields.add(new AutodateField(field))
            else if (field.type === 'select') col.fields.add(new SelectField(field))
            else if (field.type === 'relation') {
              let targetId = field.collectionId
              try {
                const targetCol = app.findCollectionByNameOrId(field.collectionId)
                targetId = targetCol.id
              } catch (e) {}
              col.fields.add(
                new RelationField({
                  name: field.name,
                  collectionId: targetId,
                  maxSelect: field.maxSelect,
                }),
              )
            }
          }
        }
        app.save(col)
      } catch {
        const mappedFields = def.fields.map((f) => {
          if (f.type === 'relation') {
            let targetId = f.collectionId
            try {
              const targetCol = app.findCollectionByNameOrId(f.collectionId)
              targetId = targetCol.id
            } catch (e) {}
            return { ...f, collectionId: targetId }
          }
          return f
        })

        const col = new Collection({
          name: def.name,
          type: def.type,
          listRule: def.listRule,
          viewRule: def.viewRule,
          createRule: def.createRule,
          updateRule: def.updateRule,
          deleteRule: def.deleteRule,
          fields: mappedFields,
        })
        app.save(col)
      }
    }

    const allCols = app.findAllCollections()
    for (const col of allCols) {
      if (col.type === 'base') {
        let changed = false
        if (!col.fields.getByName('created')) {
          col.fields.add(new AutodateField({ name: 'created', onCreate: true, onUpdate: false }))
          changed = true
        }
        if (!col.fields.getByName('updated')) {
          col.fields.add(new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }))
          changed = true
        }
        if (changed) {
          app.save(col)
        }
      }
    }
  },
  (app) => {
    // Revert empty
  },
)
