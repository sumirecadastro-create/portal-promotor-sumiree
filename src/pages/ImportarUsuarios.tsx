import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle2, Loader2, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

interface UsuarioImport {
  nome: string
  email: string
  password: string
  cargo: 'admin' | 'regional' | 'gestor' | 'apoio'
  loja_codigo?: string
}

export default function ImportarUsuarios() {
  const [dados, setDados] = useState('')
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState<{ sucesso: number; erro: number; detalhes: string[] }>({ sucesso: 0, erro: 0, detalhes: [] })
  const { toast } = useToast()

  // Função para parsear os dados
  const parsearDados = (texto: string): UsuarioImport[] => {
    const linhas = texto.split('\n').filter(l => l.trim())
    const usuarios: UsuarioImport[] = []
    let senhaIndex = 1

    for (const linha of linhas) {
      // Ignorar linhas de cabeçalho ou vazias
      if (linha.startsWith('--') || linha.startsWith('L') === false) continue
      
      // Formato esperado: L01|Angélica Claro|angelica.claro@sumireonline.com.br|gestor
      const partes = linha.split('|').map(p => p.trim())
      
      if (partes.length >= 4) {
        const lojaCodigo = partes[0]
        const nome = partes[1]
        const email = partes[2]
        const cargo = partes[3] as 'admin' | 'regional' | 'gestor' | 'apoio'
        const senha = `Sumire@${String(senhaIndex++).padStart(2, '0')}`
        
        usuarios.push({
          nome,
          email,
          password: senha,
          cargo,
          loja_codigo: lojaCodigo !== 'REGIONAL' ? lojaCodigo : undefined
        })
      }
    }
    
    return usuarios
  }

  // Dados pré-formatados para você copiar e colar
  const dadosExemplo = `L01|Angélica Claro|angelica.claro@sumireonline.com.br|gestor
L03|Fernanda Costa|fernanda.costa@sumireonline.com.br|gestor
L04|Natália Neves|natalia.neves@sumireonline.com.br|gestor
L05|Simone Rezende|simone.rezende@sumireonline.com.br|gestor
REGIONAL|Simone Rezende|simone.rezende@sumireonline.com.br|regional
REGIONAL|Angélica Claro|angelica.claro@sumireonline.com.br|regional
REGIONAL|Henrique Bittencourt|henrique.bittencourt@sumireonline.com.br|regional
REGIONAL|Jailson Cavalcante|jailson.cavalcante@sumireonline.com.br|regional
REGIONAL|Thomas Munoz|thomas.munoz@sumireonline.com.br|regional
REGIONAL|William Frate|william.frate@sumireonline.com.br|regional
REGIONAL|Monalisa Santos|monalisa.santos@sumireonline.com.br|regional
REGIONAL|Claudia Honda|claudia.honda@sumireonline.com.br|regional`

  const importarUsuarios = async () => {
    if (!dados.trim()) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Cole os dados dos usuários primeiro' })
      return
    }

    setImportando(true)
    setResultado({ sucesso: 0, erro: 0, detalhes: [] })
    
    const usuarios = parsearDados(dados)
    let sucesso = 0
    let erro = 0
    const detalhes: string[] = []

    for (const usuario of usuarios) {
      try {
        // 1. Buscar loja_id se for gestor
        let lojaId = null
        if (usuario.loja_codigo) {
          const { data: loja } = await supabase
            .from('lojas')
            .select('id')
            .eq('cod_loja', usuario.loja_codigo)
            .single()
          
          if (loja) {
            lojaId = loja.id
          } else {
            detalhes.push(`❌ Loja ${usuario.loja_codigo} não encontrada para ${usuario.email}`)
            erro++
            continue
          }
        }

        // 2. Verificar se usuário já existe no Auth
        const { data: existingUser } = await supabase.auth.admin.getUserByEmail(usuario.email)
        
        let userId = existingUser?.user?.id
        
        // 3. Se não existe, criar no Auth
        if (!userId) {
          const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
            email: usuario.email,
            password: usuario.password,
            email_confirm: true,
            user_metadata: { nome: usuario.nome, cargo: usuario.cargo }
          })
          
          if (signUpError) throw signUpError
          userId = newUser.user.id
        }
        
        // 4. Inserir/Atualizar na tabela usuarios_internos
        const { error: upsertError } = await supabase
          .from('usuarios_internos')
          .upsert({
            id: userId,
            nome: usuario.nome,
            email: usuario.email,
            cargo: usuario.cargo,
            loja_id: lojaId,
            status: 'ativo',
            updated_at: new Date().toISOString()
          })
        
        if (upsertError) throw upsertError
        
        sucesso++
        detalhes.push(`✅ ${usuario.nome} (${usuario.email}) - ${usuario.cargo}${usuario.loja_codigo ? ` - Loja ${usuario.loja_codigo}` : ''} - Senha: ${usuario.password}`)
        
      } catch (error: any) {
        erro++
        detalhes.push(`❌ Erro ao criar ${usuario.email}: ${error.message}`)
      }
    }
    
    setResultado({ sucesso, erro, detalhes })
    toast({
      title: 'Importação concluída',
      description: `${sucesso} usuários criados, ${erro} erros`
    })
    setImportando(false)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg p-6 text-white" style={{ background: `linear-gradient(135deg, #FF1686 0%, #cc1168 100%)` }}>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Upload className="h-7 w-7" />
          Importar Usuários
        </h1>
        <p className="text-pink-100 text-sm mt-1">
          Cole os dados dos usuários no formato abaixo e clique em importar
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Instruções</CardTitle>
          <CardDescription>
            Formato: <code className="bg-gray-100 px-1 rounded">código_loja|nome|email|cargo</code>
            <br />
            Cargos: <strong>admin, regional, gestor, apoio</strong>
            <br />
            Para regionais, use <code>REGIONAL</code> no lugar do código da loja
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Dados dos usuários</Label>
              <Textarea
                rows={15}
                className="font-mono text-sm"
                placeholder="Cole os dados aqui..."
                value={dados}
                onChange={(e) => setDados(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Exemplo: <code>L01|Angélica Claro|angelica.claro@sumireonline.com.br|gestor</code>
              </p>
            </div>
            
            <Button
              onClick={() => setDados(dadosExemplo)}
              variant="outline"
              size="sm"
            >
              Carregar exemplo
            </Button>
            
            <Button
              onClick={importarUsuarios}
              disabled={importando}
              className="w-full gap-2"
              style={{ background: '#FF1686' }}
            >
              {importando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {importando ? 'Importando...' : 'Importar Usuários'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {resultado.detalhes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {resultado.erro === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              Resultado da Importação
            </CardTitle>
            <CardDescription>
              {resultado.sucesso} usuários criados • {resultado.erro} erros
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto space-y-1 font-mono text-xs">
              {resultado.detalhes.map((det, i) => (
                <div key={i} className="border-b pb-1">
                  {det}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
