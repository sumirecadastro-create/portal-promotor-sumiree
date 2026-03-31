import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Index() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const testConnection = async () => {
      const { data, error } = await supabase.from('lojas').select('*')
      console.log('Lojas:', data, error)
      setLoading(false)
    }
    testConnection()
  }, [])

  if (loading) return <div className="p-8">Carregando dashboard...</div>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Dashboard Executivo</h1>
      <p className="mt-4">Conectado ao Supabase com sucesso!</p>
    </div>
  )
}
