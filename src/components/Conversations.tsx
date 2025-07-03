import React, { useState } from 'react';
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
  MessageCircle
} from 'lucide-react';
import { useWhatsAppConversations } from '../hooks/useWhatsAppConversations';

type ConversationType = 'whatsapp' | 'instagram';

const Conversations: React.FC = () => {
  const [conversationType, setConversationType] = useState<ConversationType>('whatsapp');
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showChatActions, setShowChatActions] = useState(false);
  const [showChatInfo, setShowChatInfo] = useState(false);

  // Hook personalizado para conversas WhatsApp
  const {
    conversas,
    mensagens,
    conversaSelecionada,
    estatisticas,
    loading,
    error,
    carregarConversas,
    enviarMensagem,
    marcarComoLida,
    selecionarConversa,
    setError
  } = useWhatsAppConversations();

  // Enviar mensagem
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !conversaSelecionada || sendingMessage) return;

    setSendingMessage(true);
    try {
      await enviarMensagem(messageInput.trim());
      setMessageInput('');
    } catch (err) {
      console.error('❌ Erro ao enviar mensagem:', err);
      alert(`Erro ao enviar mensagem: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setSendingMessage(false);
    }
  };

  // Marcar como lida
  const handleMarkAsRead = async () => {
    if (!conversaSelecionada) return;

    try {
      await marcarComoLida();
    } catch (err) {
      console.error('❌ Erro ao marcar como lida:', err);
    }
  };

  // Selecionar conversa
  const handleSelectConversation = async (conversa: any) => {
    setShowChatActions(false);
    setShowChatInfo(false);
    await selecionarConversa(conversa);
  };

  // Atualizar tipo de conversa
  const handleConversationTypeChange = (type: ConversationType) => {
    setConversationType(type);
    setShowChatActions(false);
    setShowChatInfo(false);
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
    const nomeContato = (conversa.nome_contato || '').toLowerCase();
    const numeroContato = (conversa.numero_contato || '').toLowerCase();
    const ultimaMensagem = (conversa.ultima_mensagem || '').toLowerCase();
    
    return nomeContato.includes(searchLower) || 
           numeroContato.includes(searchLower) || 
           ultimaMensagem.includes(searchLower);
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
              onClick={carregarConversas}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
            >
              Tentar Novamente
            </button>
            <button
              onClick={() => setError(null)}
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
                onClick={carregarConversas}
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
                {conversasFiltradas.length}
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
          {conversationType === 'whatsapp' ? (
            conversasFiltradas.length > 0 ? (
              conversasFiltradas.map((conversa) => (
                <div
                  key={conversa.conversa_id}
                  onClick={() => handleSelectConversation(conversa)}
                  className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    conversaSelecionada?.conversa_id === conversa.conversa_id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold">
                        <User className="w-6 h-6" />
                      </div>
                      {conversa.status === 'ativa' && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {conversa.nome_contato || conversa.numero_contato}
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {conversa.ultima_atividade ? formatTime(conversa.ultima_atividade) : ''}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                        {conversa.numero_contato}
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
                          <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {conversa.nao_lidas}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa disponível'}
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                  {searchTerm ? 'Tente ajustar sua busca' : 'As conversas aparecerão aqui quando você receber mensagens'}
                </p>
              </div>
            )
          ) : (
            <div className="p-8 text-center">
              <Instagram className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Instagram Direct em desenvolvimento
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                Esta funcionalidade estará disponível em breve
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
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {conversaSelecionada.nome_contato || conversaSelecionada.numero_contato}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                      WhatsApp
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
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
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
                      // CORREÇÃO DEFINITIVA BASEADA NA IMAGEM:
                      // "sent" = mensagem que EU ENVIEI = lado DIREITO (bolha verde)
                      // "received" = mensagem que EU RECEBI = lado ESQUERDO (bolha escura)
                      mensagem.direcao === 'sent' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                      mensagem.direcao === 'sent'
                        ? 'bg-green-500 text-white rounded-br-sm' // SENT = DIREITA = BOLHA VERDE
                        : 'bg-gray-700 dark:bg-gray-600 text-white rounded-bl-sm' // RECEIVED = ESQUERDA = BOLHA ESCURA
                    }`}>
                      <p className="text-sm leading-relaxed">{mensagem.mensagem}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className={`text-xs ${
                          mensagem.direcao === 'sent' 
                            ? 'text-green-100' 
                            : 'text-gray-300'
                        }`}>
                          {formatTime(mensagem.data_hora)}
                        </p>
                        <div className="flex items-center space-x-1">
                          {/* Indicador de direção mais claro */}
                          <span className={`text-xs font-medium ${
                            mensagem.direcao === 'sent' 
                              ? 'text-green-100' 
                              : 'text-gray-300'
                          }`}>
                            {mensagem.direcao === 'sent' ? '📤' : '📥'}
                          </span>
                          
                          {/* Status de entrega para mensagens enviadas */}
                          {mensagem.direcao === 'sent' && (
                            <span className="text-xs text-green-100">
                              {mensagem.status_entrega === 'read' && '✓✓'}
                              {mensagem.status_entrega === 'delivered' && '✓'}
                              {mensagem.status_entrega === 'sent' && '→'}
                              {mensagem.status_entrega === 'pending' && '⏳'}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Nome do contato para mensagens recebidas */}
                      {mensagem.direcao === 'received' && mensagem.nome_contato && (
                        <p className="text-xs text-gray-300 mt-1 font-medium">
                          {mensagem.nome_contato}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      Nenhuma mensagem ainda
                    </p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                      Envie a primeira mensagem para iniciar a conversa
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Input de Mensagem */}
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Selecione uma conversa
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Escolha uma conversa da lista para começar a visualizar as mensagens
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Conversations;