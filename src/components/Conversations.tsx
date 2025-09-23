import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Bot, 
  MessageSquare, 
  Instagram, 
  Send, 
  Loader2, 
  RefreshCw, 
  Phone, 
  User, 
  Clock, 
  Archive, 
  Pin, 
  CheckCheck,
  Eye,
  EyeOff,
  Settings,
  Info,
  MessageCircle,
  ZapOff,
  Zap,
  Trash2,
  Edit,
  X
} from 'lucide-react';
import { useWhatsAppConversations } from '../hooks/useWhatsAppConversations';
import { useInstagramConversations } from '../hooks/useInstagramConversations';
import { useAIBlockedConversations } from '../hooks/useAIBlockedConversations';
import { useAuthContext } from '../components/AuthProvider';

type ConversationType = 'whatsapp' | 'instagram';

const Conversations: React.FC = () => {
  const [conversationType, setConversationType] = useState<ConversationType>('whatsapp');
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showChatActions, setShowChatActions] = useState(false);
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [toggleAILoading, setToggleAILoading] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [customName, setCustomName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Obter dados de autenticação e perfil
  const { user, profile, loading: authLoading } = useAuthContext();

  // Hook para conversas WhatsApp
  const {
    conversas: conversasWhatsApp,
    mensagens: mensagensWhatsApp,
    conversaSelecionada: conversaSelecionadaWhatsApp,
    estatisticas: estatisticasWhatsApp,
    loading: loadingWhatsApp,
    error: errorWhatsApp,
    carregarConversas: carregarConversasWhatsApp,
    enviarMensagem: enviarMensagemWhatsApp,
    marcarComoLida: marcarComoLidaWhatsApp,
    selecionarConversa: selecionarConversaWhatsApp,
    setError: setErrorWhatsApp,
    apagarMensagem: apagarMensagemWhatsApp
  } = useWhatsAppConversations();

  // Hook para conversas Instagram
  const {
    conversas: conversasInstagram,
    mensagens: mensagensInstagram,
    conversaSelecionada: conversaSelecionadaInstagram,
    estatisticas: estatisticasInstagram,
    loading: loadingInstagram,
    error: errorInstagram,
    carregarConversas: carregarConversasInstagram,
    marcarComoLida: marcarComoLidaInstagram,
    selecionarConversa: selecionarConversaInstagram,
    setError: setErrorInstagram,
    apagarMensagem: apagarMensagemInstagram,
    enviarMensagem: enviarMensagemInstagram,
    atualizarNomePersonalizado
  } = useInstagramConversations();

  // Hook para gerenciar conversas com IA bloqueada
  const {
    isConversationBlocked,
    toggleConversationBlock,
    loading: loadingAIBlock,
    error: aiBlockError,
    setError: setAIBlockError
  } = useAIBlockedConversations();

  // Determinar dados baseado no tipo de conversa selecionado
  const conversas = conversationType === 'whatsapp' ? conversasWhatsApp : conversasInstagram;
  const mensagens = conversationType === 'whatsapp' ? mensagensWhatsApp : mensagensInstagram;
  const conversaSelecionada = conversationType === 'whatsapp' ? conversaSelecionadaWhatsApp : conversaSelecionadaInstagram;
  const estatisticas = conversationType === 'whatsapp' ? estatisticasWhatsApp : estatisticasInstagram;
  const loading = conversationType === 'whatsapp' ? loadingWhatsApp : loadingInstagram;
  const error = conversationType === 'whatsapp' ? errorWhatsApp : errorInstagram || aiBlockError;

  // Limpar erro de bloqueio de IA quando mudar de conversa
  useEffect(() => {
    if (aiBlockError) {
      setAIBlockError(null);
    }
  }, [conversaSelecionada]);

  // Enviar mensagem (apenas WhatsApp por enquanto)
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !conversaSelecionada || sendingMessage) return;

    if (conversationType !== 'whatsapp') return;

    setSendingMessage(true);
    try {
      await enviarMensagemWhatsApp(messageInput.trim());
      setMessageInput('');
    } catch (err) {
      console.error('❌ Erro ao enviar mensagem:', err);
      alert(`Erro ao enviar mensagem: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setSendingMessage(false);
    }
  };

  // Enviar mensagem do Instagram
  const handleSendInstagramMessage = async () => {
    if (!messageInput.trim() || !conversaSelecionada || sendingMessage) return;

    if (conversationType !== 'instagram') return;

    setSendingMessage(true);
    try {
      await enviarMensagemInstagram(conversaSelecionada.sender_id, messageInput.trim());
      setMessageInput('');
    } catch (err) {
      console.error('❌ Erro ao enviar mensagem Instagram:', err);
      alert(`Erro ao enviar mensagem: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setSendingMessage(false);
    }
  };

  // Alternar bloqueio de IA para a conversa atual
  const handleToggleAI = async () => {
    if (!conversaSelecionada) return;
    
    // Verificar se o perfil e a organização estão carregados
    if (!profile?.id || !profile?.organization_id || authLoading) {
      alert('Aguarde o carregamento completo do perfil antes de alterar o status da IA');
      return;
    }
    
    setToggleAILoading(true);
    try {
      // Obter o identificador da conversa baseado no tipo
      const conversaId = conversationType === 'whatsapp' 
        ? conversaSelecionada.conversa_id // Para WhatsApp, usamos o conversa_id
        : conversaSelecionada.sender_id; // Para Instagram, usamos o sender_id
      
      // Verificar se o conversaId é válido
      if (!conversaId) {
        throw new Error('ID da conversa não encontrado');
      }
      
      console.log(`🔄 Alternando bloqueio de IA para ${conversationType}: ${conversaId}`);
      
      await toggleConversationBlock(conversaId);
    } catch (err) {
      console.error('❌ Erro ao alternar bloqueio de IA:', err);
      alert(`Erro ao ${isCurrentConversationBlocked() ? 'ativar' : 'desativar'} IA: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setToggleAILoading(false);
    }
  };

  // Verificar se a IA está bloqueada para a conversa atual
  const isCurrentConversationBlocked = (): boolean => {
    if (!conversaSelecionada) return false;
    
    const conversaId = conversationType === 'whatsapp' 
      ? conversaSelecionada.conversa_id // Para WhatsApp, usamos o conversa_id
      : conversaSelecionada.sender_id; // Para Instagram, usamos o sender_id
    
    return isConversationBlocked(conversaId);
  };

  // Marcar como lida
  const handleMarkAsRead = async () => {
    if (!conversaSelecionada) return;

    try {
      if (conversationType === 'whatsapp') {
        await marcarComoLidaWhatsApp();
      } else {
        await marcarComoLidaInstagram();
      }
    } catch (err) {
      console.error('❌ Erro ao marcar como lida:', err);
    }
  };

  // Selecionar conversa
  const handleSelectConversation = async (conversa: any) => {
    setShowChatActions(false);
    setShowChatInfo(false);
    setEditingName(false);
    
    if (conversationType === 'whatsapp') {
      await selecionarConversaWhatsApp(conversa);
    } else {
      await selecionarConversaInstagram(conversa);
      // Definir nome personalizado atual para Instagram
      setCustomName(conversa.nomepersonalizado || '');
    }
  };

  // Atualizar tipo de conversa
  const handleConversationTypeChange = (type: ConversationType) => {
    setConversationType(type);
    setShowChatActions(false);
    setShowChatInfo(false);
    setEditingName(false);
  };

  // Tecla Enter para enviar
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Filtrar conversas por termo de busca
  const conversasFiltradas = conversas.filter(conversa => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    if (conversationType === 'whatsapp') {
      const nomeContato = (conversa.nome_contato || '').toLowerCase();
      const numeroContato = (conversa.numero_contato || '').toLowerCase();
      const ultimaMensagem = (conversa.ultima_mensagem || '').toLowerCase();
      
      return nomeContato.includes(searchLower) || 
             numeroContato.includes(searchLower) || 
             ultimaMensagem.includes(searchLower);
    } else {
      // Instagram
      const nomeContato = (conversa.nome_contato || '').toLowerCase();
      const nomePersonalizado = (conversa.nomepersonalizado || '').toLowerCase();
      const senderId = (conversa.sender_id || '').toLowerCase();
      const ultimaMensagem = (conversa.ultima_mensagem || '').toLowerCase();
      
      return nomeContato.includes(searchLower) || 
             nomePersonalizado.includes(searchLower) ||
             senderId.includes(searchLower) || 
             ultimaMensagem.includes(searchLower);
    }
  });

  // Formatar tempo
  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Ordenar mensagens por data (mais antigas primeiro)
  const mensagensOrdenadas = [...mensagens].sort((a, b) => {
    return new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime();
  });

  // Função para recarregar conversas
  const handleRefresh = () => {
    if (conversationType === 'whatsapp') {
      carregarConversasWhatsApp();
    } else {
      carregarConversasInstagram();
    }
  };

  // Função para limpar erro
  const handleClearError = () => {
    if (conversationType === 'whatsapp') {
      setErrorWhatsApp(null);
    } else {
      setErrorInstagram(null);
    }
    
    if (aiBlockError) {
      setAIBlockError(null);
    }
  };

  // Apagar mensagem
  const handleDeleteMessage = async (mensagemId: string) => {
    if (!mensagemId || deletingMessageId) return;

    // Confirmar exclusão
    const confirmDelete = window.confirm(
      'Tem certeza que deseja apagar esta mensagem? Esta ação não pode ser desfeita.'
    );

    if (!confirmDelete) return;

    setDeletingMessageId(mensagemId);
    
    try {
      if (conversationType === 'whatsapp') {
        await apagarMensagemWhatsApp(mensagemId);
      } else {
        await apagarMensagemInstagram(mensagemId);
      }
      
      console.log('✅ Mensagem apagada com sucesso');
    } catch (err) {
      console.error('❌ Erro ao apagar mensagem:', err);
      alert(`Erro ao apagar mensagem: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setDeletingMessageId(null);
    }
  };

  // Salvar nome personalizado (apenas Instagram)
  const handleSaveCustomName = async () => {
    if (!conversaSelecionada || conversationType !== 'instagram') return;

    try {
      setSavingName(true);
      await atualizarNomePersonalizado(conversaSelecionada.sender_id, customName);
      setEditingName(false);
    } catch (err) {
      console.error('❌ Erro ao salvar nome personalizado:', err);
      alert(`Erro ao salvar nome: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setSavingName(false);
    }
  };

  // Cancelar edição do nome
  const handleCancelNameEdit = () => {
    setEditingName(false);
    setCustomName(conversaSelecionada?.nomepersonalizado || '');
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400">Carregando conversas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-2">Erro ao carregar conversas</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <div className="flex space-x-2 justify-center">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
            >
              Tentar Novamente
            </button>
            <button
              onClick={handleClearError}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Limpar Erro
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Lista de Conversas */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Conversas</h2>
            <div className="flex space-x-1">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Atualizar conversas"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          
          {/* Botões de Plataforma */}
          <div className="flex space-x-2 mb-3">
            <button
              onClick={() => handleConversationTypeChange('whatsapp')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                conversationType === 'whatsapp'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp</span>
              <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">
                {conversationType === 'whatsapp' ? conversasFiltradas.length : conversasWhatsApp.length}
              </span>
            </button>
            <button
              onClick={() => handleConversationTypeChange('instagram')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                conversationType === 'instagram'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Instagram className="w-4 h-4" />
              <span>Instagram</span>
              <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">
                {conversationType === 'instagram' ? conversasFiltradas.length : conversasInstagram.length}
              </span>
            </button>
          </div>

          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar conversas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
            <button className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400">
              <Filter className="w-4 h-4" />
            </button>
          </div>

          {/* Estatísticas */}
          {estatisticas && (
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 grid grid-cols-2 gap-2">
              <span>Total: {estatisticas.total_conversas}</span>
              <span>Ativas: {estatisticas.conversas_ativas}</span>
              <span>Não lidas: {estatisticas.mensagens_nao_lidas}</span>
              <span>Última: {estatisticas.ultima_atividade ? formatTime(estatisticas.ultima_atividade) : 'N/A'}</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversasFiltradas.length > 0 ? (
            conversasFiltradas.map((conversa) => {
              // Determinar o identificador da conversa baseado no tipo
              const conversaId = conversationType === 'whatsapp' 
                ? conversa.conversa_id // Para WhatsApp
                : conversa.sender_id; // Para Instagram
              
              // Verificar se a IA está bloqueada para esta conversa
              const isAIBlocked = isConversationBlocked(conversaId);
              
              // Determinar nome de exibição
              const displayName = conversationType === 'whatsapp' 
                ? (conversa.nome_contato || conversa.numero_contato)
                : (conversa.nomepersonalizado || conversa.nome_contato || `@${conversa.sender_id}`);
              
              return (
                <div
                  key={conversationType === 'whatsapp' ? conversa.conversa_id : conversa.sender_id}
                  onClick={() => handleSelectConversation(conversa)}
                  className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    conversaSelecionada && (
                      conversationType === 'whatsapp' 
                        ? conversaSelecionada.conversa_id === conversa.conversa_id
                        : conversaSelecionada.sender_id === conversa.sender_id
                    ) ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
                        conversationType === 'whatsapp' ? 'bg-green-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'
                      }`}>
                        {conversationType === 'whatsapp' ? <User className="w-6 h-6" /> : <Instagram className="w-6 h-6" />}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                      
                      {/* Indicador de IA bloqueada */}
                      {isAIBlocked && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-white dark:border-gray-800 rounded-full flex items-center justify-center">
                          <ZapOff className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {displayName}
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {conversa.ultima_atividade ? formatTime(conversa.ultima_atividade) : ''}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                        {conversationType === 'whatsapp' ? conversa.numero_contato : 
                         (conversa.nomepersonalizado ? `@${conversa.sender_id}` : `@${conversa.sender_id}`)}
                      </p>
                      {conversa.ultima_mensagem && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 truncate mt-1">
                          {conversa.ultima_mensagem}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {conversa.total_mensagens} mensagens
                        </span>
                        {conversa.nao_lidas > 0 && (
                          <span className={`text-white text-xs font-bold px-2 py-0.5 rounded-full ${
                            conversationType === 'whatsapp' ? 'bg-green-500' : 'bg-purple-500'
                          }`}>
                            {conversa.nao_lidas}
                          </span>
                        )}
                        {/* Indicador de nome personalizado */}
                        {conversationType === 'instagram' && conversa.nomepersonalizado && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full">
                            Nome personalizado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center">
              {conversationType === 'whatsapp' ? (
                <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              ) : (
                <Instagram className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              )}
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {searchTerm ? 'Nenhuma conversa encontrada' : `Nenhuma conversa de ${conversationType === 'whatsapp' ? 'WhatsApp' : 'Instagram'} disponível`}
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                {searchTerm ? 'Tente ajustar sua busca' : `As conversas de ${conversationType === 'whatsapp' ? 'WhatsApp' : 'Instagram'} aparecerão aqui quando você receber mensagens`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Área do Chat */}
      <div className="flex-1 flex flex-col">
        {conversaSelecionada ? (
          <>
            {/* Cabeçalho do Chat */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                  conversationType === 'whatsapp' ? 'bg-green-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'
                }`}>
                  {conversationType === 'whatsapp' ? <User className="w-5 h-5" /> : <Instagram className="w-5 h-5" />}
                </div>
                <div>
                  {/* Nome editável para Instagram */}
                  {conversationType === 'instagram' ? (
                    <div className="flex items-center space-x-2">
                      {editingName ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveCustomName();
                              } else if (e.key === 'Escape') {
                                handleCancelNameEdit();
                              }
                            }}
                            placeholder="Nome personalizado"
                            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveCustomName}
                            disabled={savingName}
                            className="p-1 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 disabled:opacity-50"
                            title="Salvar nome"
                          >
                            {savingName ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCheck className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={handleCancelNameEdit}
                            className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {conversaSelecionada.nomepersonalizado || conversaSelecionada.nome_contato || `@${conversaSelecionada.sender_id}`}
                          </h3>
                          <button
                            onClick={() => {
                              setEditingName(true);
                              setCustomName(conversaSelecionada.nomepersonalizado || '');
                            }}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                            title="Editar nome"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {conversaSelecionada.nome_contato || conversaSelecionada.numero_contato}
                    </h3>
                  )}
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      conversationType === 'whatsapp' 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                    }`}>
                      {conversationType === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
                    </span>
                    <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                      <MessageCircle className="w-3 h-3" />
                      <span>{conversaSelecionada.total_mensagens} mensagens</span>
                    </div>
                    {conversaSelecionada.nao_lidas > 0 && (
                      <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                        <Clock className="w-3 h-3" />
                        <span>{conversaSelecionada.nao_lidas} não lidas</span>
                      </div>
                    )}
                    
                    {/* Indicador de status da IA */}
                    {isCurrentConversationBlocked() ? (
                      <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                        <ZapOff className="w-3 h-3" />
                        <span>IA Desativada</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                        <Zap className="w-3 h-3" />
                        <span>IA Ativa</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Botão para alternar IA */}
                <button 
                  onClick={handleToggleAI}
                  disabled={toggleAILoading || authLoading || !profile?.id || !profile?.organization_id}
                  className={`p-2 ${
                    isCurrentConversationBlocked() 
                      ? 'text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30' 
                      : 'text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30'
                  } rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={isCurrentConversationBlocked() ? "Ativar IA" : "Desativar IA"}
                >
                  {toggleAILoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isCurrentConversationBlocked() ? (
                    <Zap className="w-5 h-5" />
                  ) : (
                    <ZapOff className="w-5 h-5" />
                  )}
                </button>
                
                <button 
                  onClick={handleMarkAsRead}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  title="Marcar como lida"
                >
                  <CheckCheck className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setShowChatActions(!showChatActions)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {mensagensOrdenadas.length > 0 ? (
                mensagensOrdenadas.map((mensagem) => (
                  <div
                    key={mensagem.id}
                    className={`flex ${
                      // LÓGICA CORRIGIDA PARA INSTAGRAM:
                      // sent = mensagem que EU ENVIEI = lado DIREITA (bolha azul/roxa)
                      // RECEIVED = mensagem que EU RECEBI = lado ESQUERDA (bolha escura)
                      mensagem.direcao.toLowerCase() === 'sent' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div className={`group relative max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                      mensagem.direcao.toLowerCase() === 'sent'
                        ? conversationType === 'whatsapp'
                          ? 'bg-green-500 text-white rounded-br-sm' // WhatsApp sent = verde
                          : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-sm' // Instagram sent = roxo/rosa
                        : 'bg-gray-700 dark:bg-gray-600 text-white rounded-bl-sm' // Received = escuro
                    }`}>
                      
                      {/* Botão de Apagar - Aparece no hover */}
                      <button
                        onClick={() => handleDeleteMessage(mensagem.id)}
                        disabled={deletingMessageId === mensagem.id}
                        className={`absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center text-xs shadow-lg hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${
                          deletingMessageId === mensagem.id ? 'opacity-100' : ''
                        }`}
                        title="Apagar mensagem"
                      >
                        {deletingMessageId === mensagem.id ? (
                          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </button>

                      <p className="text-sm leading-relaxed">{mensagem.mensagem}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className={`text-xs ${
                          mensagem.direcao.toLowerCase() === 'sent' 
                            ? conversationType === 'whatsapp' ? 'text-green-100' : 'text-purple-100'
                            : 'text-gray-300'
                        }`}>
                          {formatTime(mensagem.data_hora)}
                        </p>
                        <div className="flex items-center space-x-1">
                          {/* Indicador de direção */}
                          <span className={`text-xs font-medium ${
                            mensagem.direcao.toLowerCase() === 'sent' 
                              ? conversationType === 'whatsapp' ? 'text-green-100' : 'text-purple-100'
                              : 'text-gray-300'
                          }`}>
                            {mensagem.direcao.toLowerCase() === 'sent' ? '📤' : '📥'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Sender ID para mensagens recebidas do Instagram */}
                      {conversationType === 'instagram' && mensagem.direcao.toLowerCase() === 'received' && (
                        <p className="text-xs text-gray-300 mt-1 font-medium">
                          @{mensagem.sender_id}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    {conversationType === 'whatsapp' ? (
                      <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    ) : (
                      <Instagram className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    )}
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      Nenhuma mensagem ainda
                    </p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                      {conversationType === 'whatsapp' 
                        ? 'Envie a primeira mensagem para iniciar a conversa'
                        : 'As mensagens do Instagram aparecerão aqui'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Input de Mensagem - Apenas para WhatsApp */}
            {conversationType === 'whatsapp' && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem..."
                    disabled={sendingMessage}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || sendingMessage}
                    className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-2xl hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingMessage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>Enviar</span>
                  </button>
                </div>
              </div>
            )}

            {/* Aviso para Instagram */}
            {conversationType === 'instagram' && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem para o Instagram..."
                    disabled={sendingMessage}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
                  />
                  <button
                    onClick={handleSendInstagramMessage}
                    disabled={!messageInput.trim() || sendingMessage}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:from-purple-600 hover:to-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingMessage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>Enviar</span>
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              {conversationType === 'whatsapp' ? (
                <MessageSquare className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              ) : (
                <Instagram className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              )}
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Selecione uma conversa
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Escolha uma conversa de {conversationType === 'whatsapp' ? 'WhatsApp' : 'Instagram'} da lista para começar a visualizar as mensagens
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Conversations;