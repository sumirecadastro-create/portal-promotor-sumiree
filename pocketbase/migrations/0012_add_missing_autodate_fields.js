migrate(
  (app) => {
    const collectionsToUpdate = ['lojas', 'gerentes', 'produtos', 'promotores']

    for (const collectionName of collectionsToUpdate) {
      try {
        const col = app.findCollectionByNameOrId(collectionName)
        let hasChanges = false

        if (!col.fields.getByName('created')) {
          col.fields.add(new AutodateField({ name: 'created', onCreate: true, onUpdate: false }))
          hasChanges = true
        }

        if (!col.fields.getByName('updated')) {
          col.fields.add(new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }))
          hasChanges = true
        }

        if (hasChanges) {
          app.save(col)
        }
      } catch (err) {
        console.error(`Failed to update collection ${collectionName}:`, err.message)
      }
    }
  },
  (app) => {
    // Revert missing autodate fields
    const collectionsToUpdate = ['lojas', 'gerentes', 'produtos', 'promotores']

    for (const collectionName of collectionsToUpdate) {
      try {
        const col = app.findCollectionByNameOrId(collectionName)
        let hasChanges = false

        const createdField = col.fields.getByName('created')
        if (createdField) {
          col.fields.removeByName('created')
          hasChanges = true
        }

        const updatedField = col.fields.getByName('updated')
        if (updatedField) {
          col.fields.removeByName('updated')
          hasChanges = true
        }

        if (hasChanges) {
          app.save(col)
        }
      } catch (err) {
        // Silently ignore on revert if collection not found
      }
    }
  },
)
