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
import { useConversations } from '../hooks/useConversations';
import { useWhatsAppConnection } from '../hooks/useWhatsAppConnection';

type ConversationType = 'whatsapp' | 'instagram';

const Conversations: React.FC = () => {
  const [conversationType, setConversationType] = useState<ConversationType>('whatsapp');
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showChatActions, setShowChatActions] = useState(false);
  const [showChatInfo, setShowChatInfo] = useState(false);
  
  const {
    conversations,
    messages,
    selectedConversation,
    loading,
    error,
    zapiChats,
    zapiContacts,
    chatMetadata,
    autoReadEnabled,
    setSelectedConversation,
    sendMessage,
    markAsRead,
    modifyChat,
    getContactMetadata,
    updateAutoRead,
    syncData,
    fetchChatMetadata,
    fetchChatMessages,
  } = useConversations();

  const { whatsappNumber, updateAIStatus } = useWhatsAppConnection();

  const handleConversationTypeChange = (type: ConversationType) => {
    setConversationType(type);
    setSelectedConversation(null);
    setShowChatActions(false);
    setShowChatInfo(false);
  };

  // Enviar mensagem
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || sendingMessage) return;

    setSendingMessage(true);
    try {
      const messageContent = messageInput.trim();
      const phoneNumber = selectedConversation.contact?.phone_number || selectedConversation.numero_contato_cliente;

      if (!phoneNumber) {
        throw new Error('Número de telefone não encontrado');
      }

      console.log(`📤 Sending message to ${phoneNumber}...`);

      await sendMessage(phoneNumber, messageContent);

      // Desativar IA temporariamente quando humano responde
      if (whatsappNumber?.is_ai_active) {
        try {
          await updateAIStatus(false);
          console.log('🤖 AI temporarily disabled after human response');
        } catch (aiError) {
          console.warn('⚠️ Failed to disable AI:', aiError);
        }
      }

      setMessageInput('');
    } catch (err) {
      console.error('❌ Error sending message:', err);
      alert(`Erro ao enviar mensagem: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleAI = async () => {
    try {
      if (whatsappNumber) {
        await updateAIStatus(!whatsappNumber.is_ai_active);
      }
    } catch (err) {
      console.error('Error toggling AI:', err);
      alert('Erro ao alterar status da IA');
    }
  };

  // Marcar como lida
  const handleMarkAsRead = async () => {
    if (!selectedConversation?.contact?.phone_number && !selectedConversation?.numero_contato_cliente) return;

    try {
      const phoneNumber = selectedConversation.contact?.phone_number || selectedConversation.numero_contato_cliente!;
      await markAsRead(phoneNumber);
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  // Modificar chat (arquivar, fixar, etc.)
  const handleModifyChat = async (action: 'read' | 'unread' | 'archive' | 'unarchive' | 'pin' | 'unpin') => {
    if (!selectedConversation?.contact?.phone_number && !selectedConversation?.numero_contato_cliente) return;

    try {
      const phoneNumber = selectedConversation.contact?.phone_number || selectedConversation.numero_contato_cliente!;
      await modifyChat(phoneNumber, action);
      setShowChatActions(false);
    } catch (err) {
      console.error('Error modifying chat:', err);
      alert(`Erro ao ${action} conversa`);
    }
  };

  // Buscar informações do contato
  const handleGetContactInfo = async () => {
    if (!selectedConversation?.contact?.phone_number && !selectedConversation?.numero_contato_cliente) return;

    try {
      const phoneNumber = selectedConversation.contact?.phone_number || selectedConversation.numero_contato_cliente!;
      const result = await getContactMetadata(phoneNumber);
      if (result.success) {
        alert(`Informações do contato:\n${JSON.stringify(result.data, null, 2)}`);
      }
    } catch (err) {
      console.error('Error getting contact info:', err);
    }
  };

  // Buscar metadata do chat
  const handleGetChatInfo = async () => {
    if (!selectedConversation?.contact?.phone_number && !selectedConversation?.numero_contato_cliente) return;

    try {
      const phoneNumber = selectedConversation.contact?.phone_number || selectedConversation.numero_contato_cliente!;
      await fetchChatMetadata(phoneNumber);
      setShowChatInfo(true);
    } catch (err) {
      console.error('Error getting chat info:', err);
    }
  };

  // Buscar mensagens do chat via Z-API
  const handleGetChatMessages = async () => {
    if (!selectedConversation?.contact?.phone_number && !selectedConversation?.numero_contato_cliente) return;

    try {
      const phoneNumber = selectedConversation.contact?.phone_number || selectedConversation.numero_contato_cliente!;
      const messages = await fetchChatMessages(phoneNumber, 100);
      console.log('📨 Chat messages from Z-API:', messages);
      alert(`Mensagens do chat carregadas: ${messages.length} mensagens`);
    } catch (err) {
      console.error('Error getting chat messages:', err);
    }
  };

  // Alternar leitura automática
  const handleToggleAutoRead = async () => {
    try {
      await updateAutoRead(!autoReadEnabled);
    } catch (err) {
      console.error('Error toggling auto-read:', err);
      alert('Erro ao alterar leitura automática');
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Filtrar conversas por termo de busca
  const filteredConversations = conversations.filter(conversation => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const contactName = (conversation.contact?.name || conversation.nome_contato_cliente || '').toLowerCase();
    const phoneNumber = (conversation.contact?.phone_number || conversation.numero_contato_cliente || '').toLowerCase();
    const lastMessageContent = (conversation.last_message?.content || '').toLowerCase();
    
    return contactName.includes(searchLower) || 
           phoneNumber.includes(searchLower) || 
           lastMessageContent.includes(searchLower);
  });

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400">Carregando conversas...</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Sincronizando com Z-API</p>
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
          <button
            onClick={syncData}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Conversations List */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Conversas</h2>
            <button
              onClick={syncData}
              disabled={loading}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Sincronizar com Z-API"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {/* Platform Toggle Buttons */}
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
                {filteredConversations.length}
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

          {/* Z-API Status */}
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <span>Z-API: {zapiChats.length} chats</span>
            <span>Supabase: {conversations.length} conversas</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversationType === 'whatsapp' ? (
            filteredConversations.length > 0 ? (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => {
                    setSelectedConversation(conversation);
                    setShowChatActions(false);
                    setShowChatInfo(false);
                  }}
                  className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedConversation?.id === conversation.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      {conversation.contact?.avatar_url ? (
                        <img
                          src={conversation.contact.avatar_url}
                          alt={conversation.contact?.name || conversation.nome_contato_cliente || 'Contato'}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold">
                          <User className="w-6 h-6" />
                        </div>
                      )}
                      {conversation.status === 'open' && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {conversation.contact?.name || conversation.nome_contato_cliente || conversation.contact?.phone_number || conversation.numero_contato_cliente || 'Contato Desconhecido'}
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {conversation.last_message_at ? formatTime(conversation.last_message_at) : ''}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                        {conversation.contact?.phone_number || conversation.numero_contato_cliente}
                      </p>
                      {conversation.last_message && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 truncate mt-1">
                          {conversation.last_message.sender_type === 'customer' || conversation.last_message.sender_type === 'cliente' ? '' : 
                           conversation.last_message.sender_type === 'ai' || conversation.last_message.sender_type === 'ia' ? '🤖 ' : '👤 '}
                          {conversation.last_message.content}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* AI Toggle Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAI();
                        }}
                        className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                          whatsappNumber?.is_ai_active 
                            ? 'bg-indigo-600' 
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                        title={whatsappNumber?.is_ai_active ? 'IA Ativada' : 'IA Desativada'}
                      >
                        <span
                          className={`inline-block w-4 h-4 rounded-full bg-white transform transition-transform duration-200 ${
                            whatsappNumber?.is_ai_active ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                        <Bot className={`absolute w-3 h-3 transition-opacity duration-200 ${
                          whatsappNumber?.is_ai_active 
                            ? 'left-1 text-white opacity-100' 
                            : 'right-1 text-gray-500 opacity-60'
                        }`} />
                      </button>
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
                {!searchTerm && (
                  <button
                    onClick={syncData}
                    className="mt-3 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm"
                  >
                    Sincronizar com Z-API
                  </button>
                )}
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

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {selectedConversation.contact?.avatar_url ? (
                  <img
                    src={selectedConversation.contact.avatar_url}
                    alt={selectedConversation.contact.name || 'Contato'}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold">
                    <User className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {selectedConversation.contact?.name || selectedConversation.nome_contato_cliente || selectedConversation.contact?.phone_number || selectedConversation.numero_contato_cliente || 'Contato Desconhecido'}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                      WhatsApp
                    </span>
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                      whatsappNumber?.is_ai_active 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      <Bot className="w-3 h-3" />
                      <span>{whatsappNumber?.is_ai_active ? 'IA Ativa' : 'IA Inativa'}</span>
                    </div>
                    {selectedConversation.contact?.last_contact && (
                      <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        <Clock className="w-3 h-3" />
                        <span>Último: {formatDate(selectedConversation.contact.last_contact)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handleGetContactInfo}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  title="Informações do contato"
                >
                  <Phone className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleMarkAsRead}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  title="Marcar como lida"
                >
                  <CheckCheck className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleGetChatInfo}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  title="Informações do chat"
                >
                  <Info className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setShowChatActions(!showChatActions)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat Actions Dropdown */}
            {showChatActions && (
              <div className="absolute right-8 top-24 bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 rounded-lg z-10 w-56">
                <div className="p-2">
                  <button 
                    onClick={() => handleModifyChat('read')}
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  >
                    <CheckCheck className="w-4 h-4 mr-2" />
                    Marcar como lida
                  </button>
                  <button 
                    onClick={() => handleModifyChat('unread')}
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Marcar como não lida
                  </button>
                  <button 
                    onClick={() => handleModifyChat('archive')}
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    Arquivar conversa
                  </button>
                  <button 
                    onClick={() => handleModifyChat('pin')}
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  >
                    <Pin className="w-4 h-4 mr-2" />
                    Fixar conversa
                  </button>
                  <button 
                    onClick={handleToggleAutoRead}
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  >
                    {autoReadEnabled ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-2" />
                        Desativar leitura automática
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Ativar leitura automática
                      </>
                    )}
                  </button>
                  <button 
                    onClick={handleGetChatMessages}
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Carregar mensagens Z-API
                  </button>
                </div>
              </div>
            )}

            {/* Chat Info Panel */}
            {showChatInfo && chatMetadata && (
              <div className="absolute right-8 top-24 bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 rounded-lg z-10 w-80">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Informações do Chat</h3>
                    <button 
                      onClick={() => setShowChatInfo(false)}
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      {chatMetadata.image ? (
                        <img 
                          src={chatMetadata.image} 
                          alt={chatMetadata.name} 
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white">
                          <User className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{chatMetadata.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{chatMetadata.id.replace('@c.us', '')}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Tipo</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {chatMetadata.isGroup ? 'Grupo' : 'Individual'}
                        </p>
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Não lidas</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {chatMetadata.unreadCount}
                        </p>
                      </div>
                    </div>
                    
                    {chatMetadata.messages && (
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Últimas mensagens:</p>
                        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-2 max-h-40 overflow-y-auto">
                          {chatMetadata.messages.slice(0, 5).map((msg, index) => (
                            <div key={index} className="mb-2 text-sm">
                              <p className={`${msg.fromMe ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-300'}`}>
                                {msg.fromMe ? 'Você: ' : 'Contato: '}
                                {msg.content}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(msg.timestamp * 1000).toLocaleString('pt-BR')}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-end">
                      <button
                        onClick={() => setShowChatInfo(false)}
                        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-md text-sm"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender_type === 'customer' || message.remetente === 'cliente' 
                      ? 'justify-start' 
                      : 'justify-end'
                  }`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender_type === 'customer' || message.remetente === 'cliente'
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                      : message.sender_type === 'ai' || message.remetente === 'ia'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-300 border-l-4 border-green-500'
                      : 'bg-green-500 text-white'
                  }`}>
                    <p className="text-sm">{message.content || message.conteudo}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender_type === 'customer' || message.remetente === 'cliente' 
                        ? 'text-gray-500 dark:text-gray-400' 
                        : message.sender_type === 'ai' || message.remetente === 'ia' 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-green-200'
                    }`}>
                      {formatTime(message.created_at)}
                      {(message.sender_type === 'ai' || message.remetente === 'ia') && <span className="ml-2 font-medium">IA</span>}
                      {(message.sender_type === 'agent' || message.remetente === 'humano') && <span className="ml-2 font-medium">Você</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite sua mensagem..."
                  disabled={sendingMessage}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sendingMessage}
                  className="flex items-center space-x-2 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingMessage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Enviar</span>
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  💡 Mensagens enviadas via Z-API e salvas no Supabase
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleToggleAutoRead}
                    className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full ${
                      autoReadEnabled 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                    title="Leitura automática"
                  >
                    {autoReadEnabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    <span>{autoReadEnabled ? 'Auto-leitura ON' : 'Auto-leitura OFF'}</span>
                  </button>
                </div>
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
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-md">
                <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">📚 Funcionalidades Z-API:</h4>
                <div className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  <p>• Ler mensagens (/read-message)</p>
                  <p>• Pegar metadata do chat (/chat/{'{phone}'})</p>
                  <p>• Pegar chats (/chats)</p>
                  <p>• Modificar chats (/modify-chat)</p>
                  <p>• Envio de mensagens em tempo real</p>
                  <p>• Integração completa com Supabase</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Conversations;