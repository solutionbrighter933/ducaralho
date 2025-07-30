import React, { useState, useEffect } from 'react';
import { Facebook, CheckCircle, AlertCircle, User, Calendar, MessageSquare, RefreshCw, ExternalLink, Loader2, Send } from 'lucide-react';
import { useAuthContext } from './AuthProvider';
import { supabase } from '../lib/supabase';

interface InstagramDirectProps {
  setActiveSection?: (section: string) => void;
}

interface FacebookConnection {
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

const InstagramDirect: React.FC<InstagramDirectProps> = ({ setActiveSection }) => {
  const { user } = useAuthContext();
  const [isConnected, setIsConnected] = useState(false);
  const [connection, setConnection] = useState<FacebookConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [testRecipientId, setTestRecipientId] = useState('');
  const [testMessage, setTestMessage] = useState('Olá! Esta é uma mensagem de teste do Atendos IA 🤖');
  const [sendingMessage, setSendingMessage] = useState(false);

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
      setError(`Erro na autenticação do Facebook: ${error}`);
      setLoading(false);
      return;
    }

    if (code && state) {
      // Verificar se o state é válido
      const savedState = localStorage.getItem('facebook_oauth_state');
      if (savedState === state && state === 'teste_negocio_123') {
        handleFacebookCallback(code);
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
        console.log('✅ Conexão Facebook encontrada:', data);
      } else {
        setIsConnected(false);
        setConnection(null);
        console.log('ℹ️ Nenhuma conexão Facebook encontrada');
      }
    } catch (err) {
      console.error('❌ Erro ao verificar conexão Facebook:', err);
      setError(err instanceof Error ? err.message : 'Erro ao verificar conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookCallback = async (code: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Processando callback do Facebook via Edge Function...');

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
          state: 'teste_negocio_123'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha na comunicação com a Edge Function');
      }

      const result = await response.json();
      
      if (!result.success) {
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
      localStorage.removeItem('facebook_oauth_state');

      console.log('✅ Conexão Instagram estabelecida com sucesso');
    } catch (err) {
      console.error('❌ Erro no callback do Instagram:', err);
      setError(err instanceof Error ? err.message : 'Erro ao processar conexão com Instagram');
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookLogin = () => {
    // URL de autenticação do Instagram atualizada
    const instagramAuthUrl = `https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=673665962294863&redirect_uri=https://atendos.com.br/instagram/callback&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish%2Cinstagram_business_manage_insights`;
    
    // Salvar o state atualizado no localStorage para verificação posterior
    localStorage.setItem('facebook_oauth_state', 'teste_negocio_123');
    
    // Redirecionar para o Instagram
    window.location.href = instagramAuthUrl;
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
      
      console.log('✅ Desconectado do Facebook com sucesso');
    } catch (err) {
      console.error('❌ Erro ao desconectar Facebook:', err);
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Login com Facebook</h1>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Verificando conexão...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Login com Facebook</h1>
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
                <Facebook className="w-6 h-6 text-red-600 dark:text-red-400" />
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
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Facebook className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Conecte sua conta do Facebook
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Para acessar o Instagram Direct, você precisa fazer login com o Facebook e vincular sua conta do Instagram.
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Conecte sua conta do Facebook para acessar mensagens do Instagram Direct.
              </p>
            </div>
          </div>
          
          <button
            onClick={handleFacebookLogin}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Login com Facebook
          </button>
        </div>
      ) : (
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
                <h4 className="font-medium text-green-800 dark:text-green-300">Facebook Conectado</h4>
              </div>
              <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                Sua conta do Facebook está conectada e funcionando corretamente.
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

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">🎉 Próximos Passos</h4>
              <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                <li>• Acesse a aba "Conversas" para ver mensagens do Instagram</li>
                <li>• Configure prompts de IA em "Treinamento I.A"</li>
                <li>• Monitore atividades no "Dashboard"</li>
              </ul>
            </div>
          </div>

          {/* Test Message Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6">
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
          
          <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-800/30 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>💡 Como obter o ID do destinatário:</strong> O ID do usuário do Instagram é um número único. 
              Você pode obtê-lo através da API do Instagram ou usando ferramentas de desenvolvedor quando o usuário 
              interage com sua conta comercial.
            </p>
          </div>
        </div>
      )}

      {/* Information Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">📱 Como funciona a integração</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">Conecte com Facebook</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">Autorize o acesso à sua conta do Facebook</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">Vincule o Instagram</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">Conecte sua conta comercial do Instagram</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">Gerencie mensagens</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">Visualize e responda mensagens diretas do Instagram</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstagramDirect;