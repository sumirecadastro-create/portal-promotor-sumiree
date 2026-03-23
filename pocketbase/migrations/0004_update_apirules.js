migrate((db) => {
  // Configuração de CORS - permite requisições do frontend
  const settings = db.collection('_settings').getOne('_settings')

  if (settings) {
    const corsOrigins = [
      'https://portal-promotor-sumire-f82ca--preview.goskip.app',
      'http://localhost:8080',
      'http://localhost:5173',
    ]

    // Atualiza as configurações de CORS
    db.collection('_settings').update('_settings', {
      cors: {
        enabled: true,
        origins: corsOrigins,
        allowHeaders: ['Content-Type', 'Authorization'],
        exposeHeaders: ['Content-Type'],
      },
    })
  }

  // Regras de API existentes (mantenha o que já tinha)
  // ... (seu código existente aqui)
})
