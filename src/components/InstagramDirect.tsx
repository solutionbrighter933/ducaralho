import React, { useState, useEffect } from 'react';
import { Facebook, CheckCircle, AlertCircle, User, Calendar, MessageSquare, RefreshCw, ExternalLink, Loader2 } from 'lucide-react';
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
  const [checkingConnection, setCheckingConnection] = useState(false);

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
      if (savedState === state && state === 'teste_simples_123') {
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

      console.log('🔄 Processando callback do Facebook...');

      // Simular processamento do código de autorização
      // Em produção, isso seria feito por uma Edge Function
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simular dados de resposta do Facebook
      const mockFacebookData = {
        instagram_account_id: `ig_${Date.now()}`,
        instagram_username: `user_${Math.random().toString(36).substr(2, 8)}`,
        page_id: `page_${Date.now()}`,
        access_token: `token_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`,
      };

      // Salvar conexão no banco
      const { data: savedConnection, error: saveError } = await supabase
        .from('contas_conectadas')
        .upsert({
          user_id: user?.id,
          instagram_account_id: mockFacebookData.instagram_account_id,
          instagram_username: mockFacebookData.instagram_username,
          page_id: mockFacebookData.page_id,
          access_token: mockFacebookData.access_token,
          status: 'connected',
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (saveError) {
        throw saveError;
      }

      setIsConnected(true);
      setConnection(savedConnection);
      
      // Limpar state do localStorage
      localStorage.removeItem('facebook_oauth_state');

      console.log('✅ Conexão Facebook salva com sucesso');
    } catch (err) {
      console.error('❌ Erro no callback do Facebook:', err);
      setError(err instanceof Error ? err.message : 'Erro ao processar login do Facebook');
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookLogin = () => {
    // URL de autenticação do Facebook conforme especificado
    const facebookAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=1964984554261839&redirect_uri=https://atendos.com.br/instagram/callback&state=teste_simples_123&scope=public_profile`;
    
    // Salvar o state no localStorage para verificação posterior
    localStorage.setItem('facebook_oauth_state', 'teste_simples_123');
    
    // Redirecionar para o Facebook
    window.location.href = facebookAuthUrl;
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