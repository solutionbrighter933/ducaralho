import React, { useState, useEffect } from 'react';
import { Instagram, CheckCircle, AlertCircle, User, Calendar, MessageSquare, RefreshCw, ExternalLink, Loader2, Send, Users, Eye, MessageCircle, Hash } from 'lucide-react';
import { useAuthContext } from './AuthProvider';
import { supabase } from '../lib/supabase';

interface InstagramDirectProps {
  setActiveSection?: (section: string) => void;
}

interface InstagramConnection {
  id: string;
  user_id: string;
  instagram_account_id: string;
  instagram_username: string | null;
  page_id: string | null;
  access_token: string;
  status: string;
  created_at: string;
  updated_at: string | null;
  ai_prompt: string | null;
}

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: {
    id: string;
    username: string;
    name: string;
    profile_picture_url: string;
  };
}

interface InstagramMessage {
  id: string;
  sender_id: string;
  message: string;
  timestamp: string;
  direction: 'sent' | 'received';
}

interface InstagramComment {
  id: string;
  post_id: string;
  user_id: string;
  username: string;
  text: string;
  timestamp: string;
}

const InstagramDirect: React.FC<InstagramDirectProps> = ({ setActiveSection }) => {
  const { user } = useAuthContext();
  const [isConnected, setIsConnected] = useState(false);
  const [connection, setConnection] = useState<InstagramConnection | null>(null);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<FacebookPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [showPageSelection, setShowPageSelection] = useState(false);
  
  // Test messaging states
  const [testRecipientId, setTestRecipientId] = useState('');
  const [testMessage, setTestMessage] = useState('Olá! Esta é uma mensagem de teste do Atendos IA 🤖');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Messages and comments states
  const [messages, setMessages] = useState<InstagramMessage[]>([]);
  const [comments, setComments] = useState<InstagramComment[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  // Verificar status da conexão ao carregar
  useEffect(() => {
    if (user?.id) {
      checkConnectionStatus();
    }
  }, [user?.id]);

  // Verificar se há parâmetros de callback na URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      setError(`Erro na autorização do Instagram: ${error}`);
      setLoading(false);
      return;
    }

    if (code && state) {
      // Verificar se o state é válido
      const savedState = localStorage.getItem('instagram_oauth_state');
      if (savedState === state && state === 'atendos_instagram_oauth_2024') {
        handleInstagramCallback(code);
        // Limpar parâmetros da URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        setError('Estado de segurança inválido. Tente novamente.');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const checkConnectionStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('contas_conectadas')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'connected')
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (data) {
        setIsConnected(true);
        setConnection(data);
        console.log('✅ Conexão Instagram encontrada:', data);
        
        // Carregar mensagens e comentários
        loadMessagesAndComments();
      } else {
        setIsConnected(false);
        setConnection(null);
        console.log('ℹ️ Nenhuma conexão Instagram encontrada');
      }
    } catch (err) {
      console.error('❌ Erro ao verificar conexão Instagram:', err);
      setError(err instanceof Error ? err.message : 'Erro ao verificar conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleInstagramCallback = async (code: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Processando callback do Instagram via Edge Function...');

      // Obter token de autenticação do usuário
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      // Chamar Edge Function para trocar código por token e obter dados do Instagram
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-oauth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          code,
          redirect_uri: 'https://atendos.com.br/instagram/callback',
          state: 'atendos_instagram_oauth_2024'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha na comunicação com a Edge Function');
      }

      const result = await response.json();
      
      if (!result.success) {
        // Se retornou páginas para seleção
        if (result.pages && result.pages.length > 0) {
          setPages(result.pages);
          setShowPageSelection(true);
          setSuccess('Login realizado! Selecione a página com sua conta do Instagram.');
          return;
        }
        
        throw new Error(result.error || 'Falha na conexão com Instagram');
      }

      console.log('✅ Instagram conectado via Edge Function:', result.connection);

      // Buscar a conexão salva no banco para atualizar o estado local
      const { data: savedConnection, error: saveError } = await supabase
        .from('contas_conectadas')
        .select()
        .eq('user_id', user?.id)
        .eq('status', 'connected')
        .maybeSingle();

      if (saveError) {
        console.error('❌ Erro ao buscar conexão salva:', saveError);
        // Não falhar aqui, pois a conexão já foi salva pela Edge Function
      }

      setIsConnected(true);
      setConnection(savedConnection || {
        id: result.connection.instagram_account_id,
        user_id: user?.id,
        instagram_account_id: result.connection.instagram_account_id,
        instagram_username: result.connection.instagram_username,
        page_id: result.connection.page_id,
        access_token: 'stored_securely',
        status: 'connected',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ai_prompt: null
      });
      
      // Limpar state do localStorage
      localStorage.removeItem('instagram_oauth_state');

      setSuccess('✅ Instagram conectado com sucesso!');
      console.log('✅ Conexão Instagram estabelecida com sucesso');
      
      // Carregar mensagens e comentários
      loadMessagesAndComments();
    } catch (err) {
      console.error('❌ Erro no callback do Instagram:', err);
      setError(err instanceof Error ? err.message : 'Erro ao processar conexão com Instagram');
    } finally {
      setLoading(false);
    }
  };

  const handleInstagramLogin = () => {
    // URL de autenticação do Instagram atualizada
    const instagramAuthUrl = `https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=673665962294863&redirect_uri=https://atendos.com.br/instagram/callback&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish%2Cinstagram_business_manage_insights`;
    
    // Salvar o state no localStorage para verificação posterior
    localStorage.setItem('instagram_oauth_state', 'atendos_instagram_oauth_2024');
    
    // Redirecionar para o Instagram
    window.location.href = instagramAuthUrl;
  };

  const handlePageSelection = async (page: FacebookPage) => {
    try {
      setLoading(true);
      setError(null);

      if (!page.instagram_business_account) {
        throw new Error('Esta página não tem uma conta do Instagram Business vinculada');
      }

      console.log('📄 Selecionando página:', page.name);

      // Obter token de autenticação do usuário
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      // Salvar a conexão selecionada
      const { data: savedConnection, error: saveError } = await supabase
        .from('contas_conectadas')
        .upsert({
          user_id: user?.id,
          instagram_account_id: page.instagram_business_account.id,
          instagram_username: page.instagram_business_account.username,
          page_id: page.id,
          access_token: page.access_token,
          status: 'connected',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,instagram_account_id'
        })
        .select()
        .single();

      if (saveError) {
        throw new Error('Erro ao salvar conexão: ' + saveError.message);
      }

      setConnection(savedConnection);
      setIsConnected(true);
      setShowPageSelection(false);
      setPages([]);
      setSelectedPage(page);
      
      setSuccess(`✅ Página "${page.name}" conectada com sucesso!`);
      
      // Carregar mensagens e comentários
      loadMessagesAndComments();
    } catch (err) {
      console.error('❌ Erro ao selecionar página:', err);
      setError(err instanceof Error ? err.message : 'Erro ao selecionar página');
    } finally {
      setLoading(false);
    }
  };

  const loadMessagesAndComments = async () => {
    if (!connection) return;

    setLoadingMessages(true);
    setLoadingComments(true);

    try {
      // Simular carregamento de mensagens do Instagram
      setTimeout(() => {
        const mockMessages: InstagramMessage[] = [
          {
            id: '1',
            sender_id: 'user123',
            message: 'Olá! Gostaria de saber mais sobre seus produtos.',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            direction: 'received'
          },
          {
            id: '2',
            sender_id: 'user123',
            message: 'Olá! Temos vários produtos disponíveis. Em que posso ajudá-lo?',
            timestamp: new Date(Date.now() - 3000000).toISOString(),
            direction: 'sent'
          },
          {
            id: '3',
            sender_id: 'user456',
            message: 'Vocês fazem entrega?',
            timestamp: new Date(Date.now() - 1800000).toISOString(),
            direction: 'received'
          }
        ];
        setMessages(mockMessages);
        setLoadingMessages(false);
      }, 1000);

      // Simular carregamento de comentários do Instagram
      setTimeout(() => {
        const mockComments: InstagramComment[] = [
          {
            id: '1',
            post_id: 'post123',
            user_id: 'commenter1',
            username: '@maria_silva',
            text: 'Adorei este produto! Vocês entregam em todo o Brasil?',
            timestamp: new Date(Date.now() - 7200000).toISOString()
          },
          {
            id: '2',
            post_id: 'post123',
            user_id: 'commenter2',
            username: '@joao_santos',
            text: 'Qual o preço?',
            timestamp: new Date(Date.now() - 5400000).toISOString()
          }
        ];
        setComments(mockComments);
        setLoadingComments(false);
      }, 1500);
    } catch (err) {
      console.error('❌ Erro ao carregar mensagens e comentários:', err);
      setLoadingMessages(false);
      setLoadingComments(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setCheckingConnection(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('contas_conectadas')
        .update({ 
          status: 'disconnected',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id);

      if (deleteError) {
        throw deleteError;
      }

      setIsConnected(false);
      setConnection(null);
      setMessages([]);
      setComments([]);
      
      setSuccess('✅ Desconectado do Instagram com sucesso!');
      console.log('✅ Desconectado do Instagram com sucesso');
    } catch (err) {
      console.error('❌ Erro ao desconectar Instagram:', err);
      setError(err instanceof Error ? err.message : 'Erro ao desconectar');
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleRefreshConnection = async () => {
    setCheckingConnection(true);
    await checkConnectionStatus();
    setCheckingConnection(false);
  };

  const handleSendTestMessage = async () => {
    if (!testRecipientId.trim() || !testMessage.trim()) {
      setError('Por favor, preencha o ID do destinatário e a mensagem');
      return;
    }

    if (!isConnected || !connection) {
      setError('Conecte sua conta do Instagram primeiro');
      return;
    }

    setSendingMessage(true);
    setError(null);
    setSuccess(null);

    try {
      console.log(`📤 Enviando mensagem de teste para ${testRecipientId}...`);

      // Obter token de autenticação do usuário
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      // Chamar Edge Function para enviar mensagem
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/instagram-send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          recipient_id: testRecipientId.trim(),
          message_text: testMessage.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Falha ao enviar mensagem');
      }

      console.log('✅ Mensagem enviada com sucesso:', result);
      setSuccess(`✅ Mensagem enviada com sucesso para ${testRecipientId}!`);
      setTestRecipientId('');
      
      // Adicionar mensagem enviada à lista local
      const newMessage: InstagramMessage = {
        id: `sent-${Date.now()}`,
        sender_id: testRecipientId,
        message: testMessage,
        timestamp: new Date().toISOString(),
        direction: 'sent'
      };
      setMessages(prev => [...prev, newMessage]);
      
      // Limpar mensagem de sucesso após 5 segundos
      setTimeout(() => setSuccess(null), 5000);

    } catch (err) {
      console.error('❌ Erro ao enviar mensagem:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao enviar mensagem');
    } finally {
      setSendingMessage(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'agora';
    if (diffMinutes < 60) return `${diffMinutes} min atrás`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d atrás`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Login com Instagram</h1>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Verificando conexão...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Login com Instagram</h1>
        <div className="flex space-x-3">
          <button
            onClick={handleRefreshConnection}
            disabled={checkingConnection}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-5 h-5 ${checkingConnection ? 'animate-spin' : ''}`} />
            <span>Verificar Status</span>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-green-700 dark:text-green-300">{success}</p>
            <button 
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Page Selection Modal */}
      {showPageSelection && pages.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Selecione sua Página do Facebook
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Escolha a página que tem sua conta do Instagram Business vinculada:
            </p>
            
            <div className="space-y-4">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <Instagram className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{page.name}</h4>
                        {page.instagram_business_account ? (
                          <p className="text-sm text-green-600 dark:text-green-400">
                            ✅ Instagram: @{page.instagram_business_account.username}
                          </p>
                        ) : (
                          <p className="text-sm text-red-600 dark:text-red-400">
                            ❌ Sem conta do Instagram vinculada
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handlePageSelection(page)}
                      disabled={!page.instagram_business_account}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Selecionar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Connection Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Status da Conexão</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {isConnected ? 'Conectado' : 'Desconectado'}
              </p>
              {connection?.instagram_username && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  @{connection.instagram_username}
                </p>
              )}
            </div>
            <div className={`w-12 h-12 ${isConnected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'} rounded-lg flex items-center justify-center`}>
              {isConnected ? (
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              ) : (
                <Instagram className="w-6 h-6 text-red-600 dark:text-red-400" />
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Conta Instagram</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {connection?.instagram_account_id ? 'Vinculada' : 'Não Vinculada'}
              </p>
              {connection?.page_id && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Página: {connection.page_id}
                </p>
              )}
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Última Atualização</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {connection?.updated_at ? formatDate(connection.updated_at) : 'Nunca'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Veja mais em Conversas
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {!isConnected ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Instagram className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Conecte sua conta do Instagram
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Para acessar o Instagram Direct e gerenciar mensagens, você precisa conectar sua conta do Instagram Business.
          </p>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
              <p className="text-sm text-purple-700 dark:text-purple-300">
                Conecte sua conta do Instagram Business para gerenciar mensagens diretas e comentários.
              </p>
            </div>
          </div>
          
          <button
            onClick={handleInstagramLogin}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors font-medium"
          >
            Login com Instagram
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Connection Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Conexão Ativa</h3>
              <button
                onClick={handleDisconnect}
                disabled={checkingConnection}
                className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkingConnection ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span>Desconectar</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <h4 className="font-medium text-green-800 dark:text-green-300">Instagram Conectado</h4>
                </div>
                <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                  Sua conta do Instagram está conectada e funcionando corretamente.
                </p>
              </div>

              {connection && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">Informações da Conta</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Instagram ID:</span>
                        <span className="font-mono text-gray-900 dark:text-white">{connection.instagram_account_id}</span>
                      </div>
                      {connection.instagram_username && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Username:</span>
                          <span className="font-mono text-gray-900 dark:text-white">@{connection.instagram_username}</span>
                        </div>
                      )}
                      {connection.page_id && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Página ID:</span>
                          <span className="font-mono text-gray-900 dark:text-white">{connection.page_id}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">Status da Conexão</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Status:</span>
                        <span className="text-green-600 dark:text-green-400 font-medium">{connection.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Conectado em:</span>
                        <span className="text-gray-900 dark:text-white">{formatDate(connection.created_at)}</span>
                      </div>
                      {connection.updated_at && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Atualizado em:</span>
                          <span className="text-gray-900 dark:text-white">{formatDate(connection.updated_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Messages Management Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <MessageCircle className="w-5 h-5 text-purple-600" />
                <span>Gerenciamento de Mensagens</span>
              </h3>
              <button
                onClick={loadMessagesAndComments}
                disabled={loadingMessages}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loadingMessages ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingMessages ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">Carregando mensagens...</span>
              </div>
            ) : messages.length > 0 ? (
              <div className="space-y-3 mb-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.direction === 'sent' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                      message.direction === 'sent'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-sm'
                        : 'bg-gray-700 dark:bg-gray-600 text-white rounded-bl-sm'
                    }`}>
                      <p className="text-sm leading-relaxed">{message.message}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs opacity-75">
                          {formatTimeAgo(message.timestamp)}
                        </p>
                        <span className="text-xs font-medium">
                          {message.direction === 'sent' ? '📤' : '📥'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Nenhuma mensagem ainda
                </p>
              </div>
            )}
          </div>

          {/* Comments Management Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <Hash className="w-5 h-5 text-blue-600" />
                <span>Gerenciamento de Comentários</span>
              </h3>
              <button
                onClick={loadMessagesAndComments}
                disabled={loadingComments}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loadingComments ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingComments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">Carregando comentários...</span>
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-900 dark:text-white">{comment.username}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(comment.timestamp)}</span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 text-sm">{comment.text}</p>
                        <button className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mt-2">
                          Responder
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Hash className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Nenhum comentário ainda
                </p>
              </div>
            )}
          </div>

          {/* Test Message Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Teste de Envio de Mensagem</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ID do Destinatário (Instagram User ID)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 17841400008460056"
                    value={testRecipientId}
                    onChange={(e) => setTestRecipientId(e.target.value)}
                    disabled={!isConnected || sendingMessage}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    O ID numérico do usuário do Instagram (não o @username)
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mensagem de Teste
                  </label>
                  <textarea
                    rows={3}
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    disabled={!isConnected || sendingMessage}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
                    placeholder="Digite sua mensagem de teste..."
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {!isConnected ? (
                    <span className="text-red-600 dark:text-red-400">⚠️ Conecte sua conta do Instagram primeiro</span>
                  ) : (
                    <span className="text-green-600 dark:text-green-400">✅ Pronto para enviar mensagens</span>
                  )}
                </div>
                
                <button
                  onClick={handleSendTestMessage}
                  disabled={sendingMessage || !testRecipientId.trim() || !testMessage.trim() || !isConnected}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingMessage ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  <span>{sendingMessage ? 'Enviando...' : 'Enviar Teste'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Information Card */}
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-4">📱 Como funciona a integração</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
            <div>
              <p className="font-medium text-purple-900 dark:text-purple-100">Conecte com Instagram</p>
              <p className="text-sm text-purple-700 dark:text-purple-300">Autorize o acesso à sua conta do Instagram Business</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
            <div>
              <p className="font-medium text-purple-900 dark:text-purple-100">Gerencie Mensagens</p>
              <p className="text-sm text-purple-700 dark:text-purple-300">Visualize e responda mensagens diretas do Instagram</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
            <div>
              <p className="font-medium text-purple-900 dark:text-purple-100">Gerencie Comentários</p>
              <p className="text-sm text-purple-700 dark:text-purple-300">Responda comentários em posts diretamente da plataforma</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstagramDirect;