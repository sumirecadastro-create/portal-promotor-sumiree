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

  // Função para parsear os dados - CORRIGIDA
  const parsearDados = (texto: string): UsuarioImport[] => {
    const linhas = texto.split('\n').filter(l => l.trim() && !l.startsWith('--'))
    const usuarios: UsuarioImport[] = []
    let senhaIndex = 1

    for (const linha of linhas) {
      // Remover espaços extras e caracteres especiais
      const linhaLimpa = linha.replace(/^[-*]\s*/, '').trim()
      const partes = linhaLimpa.split('|').map(p => p.trim())
      
      if (partes.length >= 4) {
        const lojaCodigo = partes[0]
        const nome = partes[1]
        const email = partes[2]
        const cargo = partes[3] as 'admin' | 'regional' | 'gestor' | 'apoio'
        
        // Validar email
        if (!email.includes('@')) {
          console.error(`Email inválido: ${email}`)
          continue
        }
        
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

  // Dados corrigidos (com @ nos emails)
  const dadosCorrigidos = `L01|Angélica Claro|angelica.claro@sumireonline.com.br|gestor
L03|Fernanda Costa|fernanda.costa@sumireonline.com.br|gestor
L04|Natália Neves|natalia.neves@sumireonline.com.br|gestor
L05|Simone Rezende|simone.rezende@sumireonline.com.br|gestor
L07|Adriana Martins|adriana.martins@sumireonline.com.br|gestor
L08|Michelli Lima|michelli.lima@sumireonline.com.br|gestor
L09|Amanda Silva|amanda.silva@sumireonline.com.br|gestor
L10|Michele Castilho|michele.castilho@sumireonline.com.br|gestor
L11|Vanessa Carini|vanessa.carini@sumireonline.com.br|gestor
L12|Daimon Camargo|daimon.camargo@sumireonline.com.br|gestor
L13|Juliete Cordeiro|juliete.cordeiro@sumireonline.com.br|gestor
L14|Dalila Oliveira|dalila.oliveira@sumireonline.com.br|gestor
L25|Rafaela Nascimento|rafaela.nascimento@sumireonline.com.br|gestor
L26|Tiffany Jesus|tiffany.jesus@sumireonline.com.br|gestor
L29|Ana Paula Ferecini|anapaula.ferecini@sumireonline.com.br|gestor
L30|Stefani Souza|stefani.souza@sumireonline.com.br|gestor
L32|Gisele Alves|gisele.alves@sumireonline.com.br|gestor
L33|João Lizardo|joao.lizardo@sumireonline.com.br|gestor
L34|Valdilene Barros|valdilene.barros@sumireonline.com.br|gestor
L35|Juliana Silva|juliana.silva@sumireonline.com.br|gestor
L42|Maria Sousa|maria.sousa@sumireonline.com.br|gestor
L43|Erika Takamine|erika.takamine@sumireonline.com.br|gestor
L44|Karen Giosa|karen.giosa@sumireonline.com.br|gestor
L45|Luana Louzada|luana.louzada@sumireonline.com.br|gestor
L46|Alessandra Vieira|alessandra.vieira@sumireonline.com.br|gestor
L47|Solange Sales|solange.sales@sumireonline.com.br|gestor
L48|Sheile Pereira|sheile.pereira@sumireonline.com.br|gestor
L49|Elisangela Ferreira|elisangela.ferreira@sumireonline.com.br|gestor
L50|Marcos Gonçalves|marcos.goncalves@sumireonline.com.br|gestor
L51|Nicole Benedicto|nicole.benedicto@sumireonline.com.br|gestor
L52|Carolini Quaresma|carolini.quaresma@sumireonline.com.br|gestor
L54|Joice Marques|joice.marques@sumireonline.com.br|gestor
L55|Iza Taiane|iza.taiane@sumireonline.com.br|gestor
L56|Luciana Colombo|luciana.colombo@sumireonline.com.br|gestor
L57|Gláucia Franchi|glaucia.franchi@sumireonline.com.br|gestor
L58|Claudia Maeda|claudia.maeda@sumireonline.com.br|gestor
L60|Letícia Rodrigues|leticia.rodrigues@sumireonline.com.br|gestor
L61|Márcia Strozzi|marcia.strozzi@sumireonline.com.br|gestor
L62|Sandra Malerva|sandra.malerva@sumireonline.com.br|gestor
L63|Ivanete Gimenez|ivanete.gimenez@sumireonline.com.br|gestor
L64|Graciele Cunha|graciele.cunha@sumireonline.com.br|gestor
L66|Inara Felix|inara.felix@sumireonline.com.br|gestor
L67|Franciele Souza|franciele.souza@sumireonline.com.br|gestor
L70|Edneia Degoes|edneia.degoes@sumireonline.com.br|gestor
L71|Anna Lucia|anna.lucia@sumireonline.com.br|gestor
L72|Natália Jesus|natalia.jesus@sumireonline.com.br|gestor
L77|Jeane Cruz|jeane.cruz@sumireonline.com.br|gestor
L78|Silviane Pessoa|silviane.pessoa@sumireonline.com.br|gestor
L79|Sonia Ferreira|sonia.ferreira@sumireonline.com.br|gestor
L80|Ellen Santos|ellen.santos@sumireonline.com.br|gestor
L81|Beatriz Rodrigues|beatriz.rodrigues@sumireonline.com.br|gestor
L83|Thais Ribeiro|thais.ribeiro@sumireonline.com.br|gestor
L84|Fran Cassia|fran.cassia@sumireonline.com.br|gestor
L85|Eliana Pinheiro|eliana.pinheiro@sumireonline.com.br|gestor
L86|Marcilene Oliveira|marcilene.oliveira@sumireonline.com.br|gestor
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
    
    if (usuarios.length === 0) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Nenhum usuário válido encontrado. Verifique o formato dos dados.' })
      setImportando(false)
      return
    }
    
    let sucesso = 0
    let erro = 0
    const detalhes: string[] = []

    for (const usuario of usuarios) {
      try {
        // 1. Buscar loja_id se for gestor
        let lojaId = null
        if (usuario.loja_codigo) {
          const { data: loja, error: lojaError } = await supabase
            .from('lojas')
            .select('id')
            .eq('cod_loja', usuario.loja_codigo)
            .single()
          
          if (lojaError) {
            detalhes.push(`❌ Loja ${usuario.loja_codigo} não encontrada para ${usuario.email}`)
            erro++
            continue
          }
          
          if (loja) {
            lojaId = loja.id
          }
        }

        // 2. Verificar se usuário já existe
        const { data: existingUser, error: searchError } = await supabase
          .from('usuarios_internos')
          .select('id')
          .eq('email', usuario.email)
          .single()
        
        let userId = existingUser?.id
        
        // 3. Se não existe, criar na tabela usuarios_internos
        if (!userId) {
          const { data: newUser, error: insertError } = await supabase
            .from('usuarios_internos')
            .insert({
              nome: usuario.nome,
              email: usuario.email,
              cargo: usuario.cargo,
              loja_id: lojaId,
              status: 'ativo',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()
          
          if (insertError) throw insertError
          userId = newUser.id
        }
        
        sucesso++
        detalhes.push(`✅ ${usuario.nome} (${usuario.email}) - ${usuario.cargo}${usuario.loja_codigo ? ` - Loja ${usuario.loja_codigo}` : ''} - Senha: ${usuario.password}`)
        
      } catch (error: any) {
        erro++
        detalhes.push(`❌ Erro ao criar ${usuario.email}: ${error.message}`)
        console.error('Erro detalhado:', error)
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
            <br />
            <span className="text-red-500">Importante: O email deve conter @</span>
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
              onClick={() => setDados(dadosCorrigidos)}
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
