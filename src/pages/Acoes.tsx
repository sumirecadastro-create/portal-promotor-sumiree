function DetalhesAcao({ 
  acao, 
  open, 
  onOpenChange,
  onEditar,
  isAdmin
}: { 
  acao: Acao | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onEditar: (acao: Acao) => void;
  isAdmin: boolean;
}) {
  // 🔥 ESTADO PARA OS BRINDES
  const [brindesVinculados, setBrindesVinculados] = useState<any[]>([]);
  const [loadingBrindes, setLoadingBrindes] = useState(false);

  // 🔥 BUSCA OS BRINDES QUANDO O MODAL ABRE
  useEffect(() => {
    if (open && acao?.id) {
      const fetchBrindes = async () => {
        setLoadingBrindes(true);
        const { data, error } = await supabase
          .from('brindes')
          .select('id, descricao, cod_boni, marca, unidade')
          .eq('acao_id', acao.id);
        
        if (!error && data) {
          setBrindesVinculados(data);
        }
        setLoadingBrindes(false);
      };
      fetchBrindes();
    }
  }, [open, acao?.id]);

  if (!acao) return null

  const statusConfig = getStatusConfig(acao.status)
  const tipoConfig = getTipoConfig(acao.tipo)
  const StatusIcon = statusConfig.icon
  const TipoIcon = tipoConfig.icon

  const calcularDias = () => {
    const inicio = new Date(acao.data_inicio + 'T00:00:00')
    const fim = new Date(acao.data_fim + 'T00:00:00')
    const diffTime = Math.abs(fim.getTime() - inicio.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  const getStatusBadgeColor = () => {
    switch (acao.status) {
      case 'em_andamento': return 'text-pink-600 bg-pink-100'
      case 'concluida': return 'text-green-600 bg-green-100'
      case 'pendente': return 'text-yellow-600 bg-yellow-100'
      case 'agendada': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const handleEditar = () => {
    onOpenChange(false)
    onEditar(acao)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TipoIcon className="h-5 w-5" style={{ color: tipoConfig.color }} />
            {acao.nome}
          </DialogTitle>
          <DialogDescription>
            Detalhes completos da ação
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flag className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-500">Status</span>
            </div>
            <Badge className={cn(getStatusBadgeColor(), "text-sm")}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Tag className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-500">Tipo</span>
            </div>
            <div className="flex items-center gap-2">
              <TipoIcon className="h-4 w-4" style={{ color: tipoConfig.color }} />
              <span className="text-sm font-medium">{tipoConfig.label}</span>
              <span className="text-xs text-gray-400">- {tipoConfig.description}</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <CalendarIcon className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-500">Período</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs text-gray-500">Data Início</div>
                  <div className="font-medium">
                    {new Date(acao.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <div className="text-gray-400">→</div>
                <div>
                  <div className="text-xs text-gray-500">Data Fim</div>
                  <div className="font-medium">
                    {new Date(acao.data_fim + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Duração</div>
                  <div className="font-medium text-right">{calcularDias()} dias</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Store className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-500">Lojas Participantes</span>
              <Badge variant="secondary" className="text-xs">
                {acao.lojas?.length || 0} loja(s)
              </Badge>
            </div>
            {acao.lojas && acao.lojas.length > 0 ? (
              <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                {acao.lojas.map(loja => (
                  <div key={loja.id} className="text-sm flex items-center gap-2 p-1 hover:bg-gray-50 rounded">
                    <MapPin className="h-3 w-3 text-gray-400" />
                    <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{loja.codigo}</span>
                    <span className="text-gray-600">-</span>
                    <span className="text-gray-600">{loja.nome_loja}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Nenhuma loja vinculada</p>
            )}
          </div>

          {/* 🔥 NOVA SEÇÃO: BRINDES VINCULADOS */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Gift className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-500">Brindes Vinculados</span>
              <Badge variant="secondary" className="text-xs">
                {brindesVinculados.length} item(ns)
              </Badge>
            </div>
            
            {loadingBrindes ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 p-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando brindes...
              </div>
            ) : brindesVinculados.length > 0 ? (
              <div className="border rounded-md p-2 space-y-2 bg-gray-50">
                {brindesVinculados.map(brinde => (
                  <div key={brinde.id} className="flex flex-col bg-white p-2 rounded border shadow-sm text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{brinde.marca} - {brinde.descricao}</span>
                      <Badge variant="outline" className="text-[10px]">{brinde.unidade || 'UN'}</Badge>
                    </div>
                    <span className="text-xs text-gray-500 font-mono mt-1">Cód: {brinde.cod_boni}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 p-2 border rounded-md bg-gray-50">
                Nenhum brinde cadastrado para esta ação.
              </p>
            )}
          </div>

          {acao.descricao && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-500">Descrição</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                {acao.descricao}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {isAdmin && (
            <Button onClick={handleEditar} style={{ background: PRIMARY_COLOR }}>
              <Edit className="h-4 w-4 mr-2" />
              Editar Ação
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
