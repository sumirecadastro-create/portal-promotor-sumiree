import { useState } from 'react';
import { supabase } from '../lib/supabase'; // ajuste o caminho conforme seu projeto

export default function CadastroPromotores() {
  const [formData, setFormData] = useState({
    promotor_nome: '',
    loja_id: '',
    gerente_id: '',
    dias_semana: '',
    contato_responsavel: '',
    status: 'ativo'
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { data, error } = await supabase
      .from('promotores')
      .insert([{
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);

    if (error) {
      setMessage(`Erro: ${error.message}`);
    } else {
      setMessage('✅ Promotor cadastrado com sucesso!');
      setFormData({
        promotor_nome: '',
        loja_id: '',
        gerente_id: '',
        dias_semana: '',
        contato_responsavel: '',
        status: 'ativo'
      });
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Cadastro de Promotores</h1>
      
      {message && (
        <div className={`p-3 mb-4 rounded ${message.includes('Erro') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome do Promotor */}
        <div>
          <label className="block text-sm font-medium mb-1">Nome do Promotor *</label>
          <input
            type="text"
            name="promotor_nome"
            value={formData.promotor_nome}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded"
          />
        </div>

        {/* Loja */}
        <div>
          <label className="block text-sm font-medium mb-1">Loja *</label>
          <select
            name="loja_id"
            value={formData.loja_id}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded"
          >
            <option value="">Selecione uma loja...</option>
            {/* Aqui você vai adicionar as opções do banco */}
          </select>
        </div>

        {/* Gerente */}
        <div>
          <label className="block text-sm font-medium mb-1">Gerente Responsável *</label>
          <select
            name="gerente_id"
            value={formData.gerente_id}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded"
          >
            <option value="">Selecione um gerente...</option>
            {/* Aqui você vai adicionar as opções do banco */}
          </select>
        </div>

        {/* Dias de Trabalho */}
        <div>
          <label className="block text-sm font-medium mb-1">Dias de Trabalho *</label>
          <input
            type="text"
            name="dias_semana"
            value={formData.dias_semana}
            onChange={handleChange}
            placeholder="Ex: Segunda a sábado"
            required
            className="w-full p-2 border rounded"
          />
        </div>

        {/* Contato */}
        <div>
          <label className="block text-sm font-medium mb-1">Contato do Responsável</label>
          <input
            type="text"
            name="contato_responsavel"
            value={formData.contato_responsavel}
            onChange={handleChange}
            placeholder="Ex: Thiago - (11) 99999-9999"
            className="w-full p-2 border rounded"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          >
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Salvando...' : 'Cadastrar Promotor'}
        </button>
      </form>
    </div>
  );
}
