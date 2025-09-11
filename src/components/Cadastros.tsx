import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  RefreshCw, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  X, 
  Mail, 
  Phone, 
  User, 
  FileText, 
  Calendar,
  MapPin,
  Edit,
  Trash2,
  Eye,
  MessageSquare,
  Filter,
  Download,
  UserCheck,
  Clock
} from 'lucide-react';
import { useAuthContext } from './AuthProvider';
import { supabase } from '../lib/supabase';

interface CadastroExtraido {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  cpf?: string;
  endereco?: string;
  dados_extras: Record<string, any>;
  primeira_conversa: string;
  ultima_conversa: string;
  total_mensagens: number;
  plataforma: 'whatsapp' | 'instagram';
  status: 'ativo' | 'inativo';
  created_at: string;
  updated_at: string;
}

interface DadoExtraido {
  tipo: 'email' | 'cpf' | 'telefone' | 'endereco' | 'nome' | 'outro';
  valor: string;
  confianca: number;
  fonte_mensagem: string;
  data_extracao: string;
}

const Cadastros: React.FC = () => {
  const { user, profile } = useAuthContext();
  const [cadastros, setCadastros] = useState<CadastroExtraido[]>([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCadastro, setSelectedCadastro] = useState<CadastroExtraido | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState<'all' | 'whatsapp' | 'instagram'>('all');

  // Carregar cadastros existentes
  useEffect(() => {
    if (user?.id && profile?.organization_id) {
      loadCadastros();
    }
  }, [user?.id, profile?.organization_id]);

  // Função para extrair dados das conversas
  const extractDataFromConversations = async () => {
    try {
      setExtracting(true);
      setError(null);
      setSuccess(null);

      if (!user?.id || !profile?.organization_id) {
        throw new Error('Usuário ou organização não encontrados');
      }

      console.log('🔍 Iniciando extração de dados das conversas...');

      // Buscar mensagens do WhatsApp
      const { data: mensagensWhatsApp, error: whatsappError } = await supabase
        .from('mensagens_whatsapp')
        .select('conversa_id, numero, mensagem, nome_contato, data_hora, user_id')
        .eq('user_id', user.id)
        .order('data_hora', { ascending: false });

      if (whatsappError) {
        console.error('❌ Erro ao buscar mensagens WhatsApp:', whatsappError);
      }

      // Buscar mensagens do Instagram
      const { data: mensagensInstagram, error: instagramError } = await supabase
        .from('conversas_instagram')
        .select('sender_id, mensagem, data_hora, user_id')
        .eq('user_id', user.id)
        .order('data_hora', { ascending: false });

      if (instagramError) {
        console.error('❌ Erro ao buscar mensagens Instagram:', instagramError);
      }

      const cadastrosExtraidos: CadastroExtraido[] = [];

      // Processar mensagens WhatsApp
      if (mensagensWhatsApp && mensagensWhatsApp.length > 0) {
        const conversasWhatsApp = agruparPorConversa(mensagensWhatsApp, 'whatsapp');
        
        for (const conversa of conversasWhatsApp) {
          const dadosExtraidos = extrairDadosDasMensagens(conversa.mensagens);
          
          // Usar o nome_contato da conversa como nome principal
          const nomeContato = conversa.nome_contato && conversa.nome_contato.trim() !== conversa.telefone 
            ? conversa.nome_contato.trim() 
            : null;
          
          // Só criar cadastro se tiver dados relevantes (nome do contato OU email OU cpf)
          if (nomeContato || dadosExtraidos.email || dadosExtraidos.cpf) {
            cadastrosExtraidos.push({
              id: `whatsapp-${conversa.identificador}`,
              nome: nomeContato || 'Nome e outros dados não foram informados pelo usuário',
              telefone: conversa.telefone,
              email: dadosExtraidos.email,
              cpf: dadosExtraidos.cpf,
              endereco: dadosExtraidos.endereco,
              dados_extras: dadosExtraidos.outros,
              primeira_conversa: conversa.primeira_mensagem,
              ultima_conversa: conversa.ultima_mensagem,
              total_mensagens: conversa.total_mensagens,
              plataforma: 'whatsapp',
              status: 'ativo',
              created_at: conversa.primeira_mensagem,
              updated_at: conversa.ultima_mensagem
            });
          }
        }
      }

      // Processar mensagens Instagram
      if (mensagensInstagram && mensagensInstagram.length > 0) {
        const conversasInstagram = agruparPorConversa(mensagensInstagram, 'instagram');
        
        for (const conversa of conversasInstagram) {
          const dadosExtraidos = extrairDadosDasMensagens(conversa.mensagens);
          
          // Para Instagram, usar o sender_id como identificação
          const nomeContato = conversa.identificador && conversa.identificador !== conversa.telefone 
            ? `@${conversa.identificador}` 
            : null;
          
          // Só criar cadastro se tiver dados relevantes
          if (nomeContato || dadosExtraidos.email || dadosExtraidos.cpf) {
            cadastrosExtraidos.push({
              id: `instagram-${conversa.identificador}`,
              nome: nomeContato || 'Nome e outros dados não foram informados pelo usuário',
              telefone: conversa.telefone || 'Instagram',
              email: dadosExtraidos.email,
              cpf: dadosExtraidos.cpf,
              endereco: dadosExtraidos.endereco,
              dados_extras: dadosExtraidos.outros,
              primeira_conversa: conversa.primeira_mensagem,
              ultima_conversa: conversa.ultima_mensagem,
              total_mensagens: conversa.total_mensagens,
              plataforma: 'instagram',
              status: 'ativo',
              created_at: conversa.primeira_mensagem,
              updated_at: conversa.ultima_mensagem
            });
          }
        }
      }

      setCadastros(cadastrosExtraidos);
      setSuccess(`✅ ${cadastrosExtraidos.length} cadastros extraídos das conversas!`);
      setTimeout(() => setSuccess(null), 3000);

      console.log('✅ Extração concluída:', cadastrosExtraidos.length, 'cadastros encontrados');

    } catch (err) {
      console.error('❌ Erro na extração de dados:', err);
      setError(err instanceof Error ? err.message : 'Erro na extração de dados');
    } finally {
      setExtracting(false);
    }
  };

  // Função para agrupar mensagens por conversa
  const agruparPorConversa = (mensagens: any[], plataforma: 'whatsapp' | 'instagram') => {
    const conversasMap = new Map();

    mensagens.forEach(mensagem => {
      const identificador = plataforma === 'whatsapp' ? mensagem.conversa_id : mensagem.sender_id;
      
      if (!conversasMap.has(identificador)) {
        conversasMap.set(identificador, {
          identificador,
          telefone: plataforma === 'whatsapp' ? mensagem.numero : `@${mensagem.sender_id}`,
          nome_contato: plataforma === 'whatsapp' ? mensagem.nome_contato : `@${mensagem.sender_id}`,
          mensagens: [],
          primeira_mensagem: mensagem.data_hora,
          ultima_mensagem: mensagem.data_hora,
          total_mensagens: 0
        });
      }

      const conversa = conversasMap.get(identificador);
      conversa.mensagens.push(mensagem.mensagem);
      conversa.total_mensagens++;
      
      // Atualizar datas
      if (new Date(mensagem.data_hora) < new Date(conversa.primeira_mensagem)) {
        conversa.primeira_mensagem = mensagem.data_hora;
      }
      if (new Date(mensagem.data_hora) > new Date(conversa.ultima_mensagem)) {
        conversa.ultima_mensagem = mensagem.data_hora;
      }
    });

    return Array.from(conversasMap.values());
  };

  // Função para extrair dados importantes das mensagens usando regex
  const extrairDadosDasMensagens = (mensagens: string[]) => {
    const dados = {
      nome: '', // Será preenchido com o nome do contato da conversa
      email: '',
      cpf: '',
      endereco: '',
      outros: {} as Record<string, any>
    };

    const textoCompleto = mensagens.join(' ').toLowerCase();

    // Extrair email
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi;
    const emails = textoCompleto.match(emailRegex);
    if (emails && emails.length > 0) {
      dados.email = emails[0];
    }

    // Extrair CPF (formato 000.000.000-00 ou 00000000000)
    const cpfRegex = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
    const cpfs = textoCompleto.match(cpfRegex);
    if (cpfs && cpfs.length > 0) {
      dados.cpf = cpfs[0].replace(/\D/g, ''); // Remove formatação
    }

    // O nome será obtido do nome_contato da conversa, não das mensagens

    // Extrair endereço (procurar por padrões de endereço)
    const enderecoRegexes = [
      /(?:moro em|endereço|rua|avenida|av\.?)\s+([a-záàâãéèêíïóôõöúçñ0-9\s,.-]+)/gi,
      /(?:cep:?\s*)?(\d{5}-?\d{3})/gi
    ];

    for (const regex of enderecoRegexes) {
      const matches = textoCompleto.match(regex);
      if (matches && matches.length > 0) {
        dados.endereco = matches[0].trim();
        break;
      }
    }

    // Extrair outros dados importantes
    const telefoneRegex = /\b(?:\+55\s?)?\(?(\d{2})\)?\s?9?\d{4}-?\d{4}\b/g;
    const telefones = textoCompleto.match(telefoneRegex);
    if (telefones && telefones.length > 0) {
      dados.outros.telefones_adicionais = telefones;
    }

    // Extrair RG
    const rgRegex = /\b\d{1,2}\.?\d{3}\.?\d{3}-?[0-9xX]\b/g;
    const rgs = textoCompleto.match(rgRegex);
    if (rgs && rgs.length > 0) {
      dados.outros.rg = rgs[0];
    }

    // Extrair data de nascimento
    const dataRegex = /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g;
    const datas = textoCompleto.match(dataRegex);
    if (datas && datas.length > 0) {
      dados.outros.data_nascimento = datas[0];
    }

    return dados;
  };

  // Carregar cadastros salvos
  const loadCadastros = async () => {
    try {
      setLoading(true);
      setError(null);

      // Por enquanto, vamos simular dados salvos
      // Em uma implementação real, você criaria uma tabela 'cadastros_extraidos' no Supabase
      setCadastros([]);
      
    } catch (err) {
      console.error('❌ Erro ao carregar cadastros:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar cadastros
  const cadastrosFiltrados = cadastros.filter(cadastro => {
    const matchesSearch = !searchTerm.trim() || 
      cadastro.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cadastro.telefone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cadastro.email && cadastro.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (cadastro.cpf && cadastro.cpf.includes(searchTerm));

    const matchesPlatform = filterPlatform === 'all' || cadastro.plataforma === filterPlatform;

    return matchesSearch && matchesPlatform;
  });

  // Abrir modal de detalhes
  const openDetailsModal = (cadastro: CadastroExtraido) => {
    setSelectedCadastro(cadastro);
    setShowDetailsModal(true);
  };

  // Formatar telefone
  const formatPhoneNumber = (phone: string): string => {
    if (!phone || phone === 'Instagram') return phone;
    
    const clean = phone.replace(/\D/g, '');
    if (clean.length >= 10) {
      const countryCode = clean.substring(0, 2);
      const areaCode = clean.substring(2, 4);
      const firstPart = clean.substring(4, clean.length - 4);
      const lastPart = clean.substring(clean.length - 4);
      return `+${countryCode} (${areaCode}) ${firstPart}-${lastPart}`;
    }
    return phone;
  };

  // Formatar CPF
  const formatCPF = (cpf: string): string => {
    if (!cpf) return '';
    const clean = cpf.replace(/\D/g, '');
    if (clean.length === 11) {
      return `${clean.substring(0, 3)}.${clean.substring(3, 6)}.${clean.substring(6, 9)}-${clean.substring(9)}`;
    }
    return cpf;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Carregando cadastros...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cadastros</h1>
        <div className="flex space-x-3">
          <button 
            onClick={loadCadastros}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
          <button 
            onClick={extractDataFromConversations}
            disabled={extracting}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {extracting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <UserCheck className="w-5 h-5" />
            )}
            <span>{extracting ? 'Extraindo...' : 'Extrair das Conversas'}</span>
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-green-700 dark:text-green-300">{success}</p>
            </div>
            <button 
              onClick={() => setSuccess(null)}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Filtros e Busca */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone, email ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
          
          <div className="flex space-x-2">
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value as 'all' | 'whatsapp' | 'instagram')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Todas as Plataformas</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
            </select>
            
            <button className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Cadastros */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Cadastros Extraídos ({cadastrosFiltrados.length})
            </h2>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <UserCheck className="w-4 h-4" />
              <span>Dados extraídos automaticamente das conversas</span>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {cadastrosFiltrados.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Telefone/Usuário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      CPF
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Plataforma
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Mensagens
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {cadastrosFiltrados.map((cadastro) => (
                    <tr key={cadastro.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                            cadastro.plataforma === 'whatsapp' ? 'bg-green-500' : 'bg-purple-500'
                          }`}>
                            {cadastro.nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {cadastro.nome}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Primeira conversa: {new Date(cadastro.primeira_conversa).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatPhoneNumber(cadastro.telefone)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {cadastro.email ? (
                          <div className="flex items-center space-x-1">
                            <Mail className="w-4 h-4 text-blue-500" />
                            <span>{cadastro.email}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {cadastro.cpf ? (
                          <div className="flex items-center space-x-1">
                            <FileText className="w-4 h-4 text-green-500" />
                            <span>{formatCPF(cadastro.cpf)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          cadastro.plataforma === 'whatsapp' 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                        }`}>
                          {cadastro.plataforma === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center space-x-1">
                          <MessageSquare className="w-4 h-4 text-blue-500" />
                          <span>{cadastro.total_mensagens}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openDetailsModal(cadastro)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchTerm ? 'Nenhum cadastro encontrado' : 'Nenhum cadastro extraído ainda'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm 
                  ? 'Tente ajustar sua busca ou extrair dados das conversas'
                  : 'Clique em "Extrair das Conversas" para analisar automaticamente as mensagens e extrair dados dos clientes'
                }
              </p>
              {!searchTerm && (
                <button 
                  onClick={extractDataFromConversations}
                  disabled={extracting}
                  className="flex items-center space-x-2 px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
                >
                  {extracting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <UserCheck className="w-5 h-5" />
                  )}
                  <span>Extrair Dados das Conversas</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalhes */}
      {showDetailsModal && selectedCadastro && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Detalhes do Cadastro
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Informações Básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Informações Pessoais</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Nome:</strong> {selectedCadastro.nome}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Telefone:</strong> {formatPhoneNumber(selectedCadastro.telefone)}
                      </span>
                    </div>
                    {selectedCadastro.email && (
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Email:</strong> {selectedCadastro.email}
                        </span>
                      </div>
                    )}
                    {selectedCadastro.cpf && (
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-purple-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>CPF:</strong> {formatCPF(selectedCadastro.cpf)}
                        </span>
                      </div>
                    )}
                    {selectedCadastro.endereco && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Endereço:</strong> {selectedCadastro.endereco}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Estatísticas</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="w-4 h-4 text-indigo-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Total de mensagens:</strong> {selectedCadastro.total_mensagens}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-orange-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Primeira conversa:</strong> {new Date(selectedCadastro.primeira_conversa).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Última conversa:</strong> {new Date(selectedCadastro.ultima_conversa).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`w-4 h-4 rounded-full ${
                        selectedCadastro.plataforma === 'whatsapp' ? 'bg-green-500' : 'bg-purple-500'
                      }`}></span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Plataforma:</strong> {selectedCadastro.plataforma === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dados Extras */}
              {Object.keys(selectedCadastro.dados_extras).length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">Dados Adicionais Extraídos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(selectedCadastro.dados_extras).map(([key, value]) => (
                      <div key={key} className="bg-white dark:bg-gray-800 rounded-lg p-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                          {key.replace('_', ' ')}:
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {Array.isArray(value) ? value.join(', ') : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Cadastros;