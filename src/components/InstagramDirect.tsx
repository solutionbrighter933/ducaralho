import React, { useState, useEffect } from 'react';
import { Instagram, CheckCircle, AlertCircle, Settings, Plus, MoreVertical, QrCode, Loader2, RefreshCw, Send, ExternalLink } from 'lucide-react';

const InstagramDirect: React.FC = () => {
  const [instagramStatus, setInstagramStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testUsername, setTestUsername] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [connectionStep, setConnectionStep] = useState(0);
  const [showSetupModal, setShowSetupModal] = useState(false);

  // Mock data para demonstração
  const mockInstagramAccounts = [
    {
      id: 1,
      username: '@minhaempresa',
      name: 'Minha Empresa',
      status: 'connected',
      messages: 847,
      lastActivity: '5 min atrás',
      followers: '12.5k',
      webhook: 'https://api.empresa.com/webhook/instagram'
    },
    {
      id: 2,
      username: '@suporte_empresa',
      name: 'Suporte Empresa',
      status: 'connected',
      messages: 234,
      lastActivity: '1 hora atrás',
      followers: '3.2k',
      webhook: 'https://api.empresa.com/webhook/instagram/suporte'
    },
    {
      id: 3,
      username: '@vendas_empresa',
      name: 'Vendas Empresa',
      status: 'disconnected',
      messages: 89,
      lastActivity: '3 horas atrás',
      followers: '8.7k',
      webhook: 'https://api.empresa.com/webhook/instagram/vendas'
    }
  ];

  // Simular carregamento inicial
  useEffect(() => {
    setInstagramStatus({
      status: 'disconnected',
      username: null,
      lastActivity: null
    });
  }, []);

  const handleConnectAccount = async () => {
    setLoading(true);
    setError(null);
    setConnectionStep(0);
    
    try {
      // Passo 1: Iniciando conexão
      setConnectionStep(1);
      setInstagramStatus({ status: 'connecting' });
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Passo 2: Redirecionando para Instagram
      setConnectionStep(2);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Passo 3: Aguardando autorização
      setConnectionStep(3);
      setShowSetupModal(true);
      
      // Simular conexão após autorização
      setTimeout(() => {
        setInstagramStatus({ 
          status: 'connected', 
          username: '@minhaempresa',
          lastActivity: new Date().toISOString()
        });
        setShowSetupModal(false);
        setConnectionStep(4);
      }, 8000);
      
    } catch (error) {
      setError('Erro ao conectar Instagram. Verifique suas configurações.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowSetupModal(false);
      setInstagramStatus({ status: 'disconnected' });
      setConnectionStep(0);
    } catch (error) {
      setError('Erro ao desconectar Instagram');
    } finally {
      setLoading(false);
    }
  };

  const handleTestMessage = async () => {
    if (!testUsername.trim()) {
      setError('Digite um username para teste');
      return;
    }

    setTestLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert(`✅ Mensagem de teste enviada para ${testUsername}!\n\n"Olá! Este é um teste do Atendos IA para Instagram 📸"`);
      setTestUsername('');
    } catch (error) {
      setError('Erro ao enviar mensagem de teste');
    } finally {
      setTestLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'auth_required': return 'text-blue-600';
      default: return 'text-red-600';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100';
      case 'connecting': return 'bg-yellow-100';
      case 'auth_required': return 'bg-blue-100';
      default: return 'bg-red-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return 'Conectado';
      case 'connecting': return 'Conectando';
      case 'auth_required': return 'Autorização Necessária';
      case 'disconnected': return 'Desconectado';
      default: return 'Desconhecido';
    }
  };

  const getConnectionStepText = () => {
    switch (connectionStep) {
      case 1: return 'Iniciando conexão com Instagram...';
      case 2: return 'Redirecionando para autorização...';
      case 3: return 'Aguardando autorização do usuário...';
      case 4: return 'Conectado com sucesso!';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Instagram Direct Messages</h1>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowSetupModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span>Configurar</span>
          </button>
          <button 
            onClick={handleConnectAccount}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            <span>Conectar Conta</span>
          </button>
          {instagramStatus?.status === 'connected' && (
            <button 
              onClick={handleDisconnect}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Desconectar</span>
            </button>
          )}
        </div>
      </div>

      {/* Connection Progress */}
      {loading && connectionStep > 0 && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
            <div className="flex-1">
              <p className="text-purple-800 dark:text-purple-300 font-medium">{getConnectionStepText()}</p>
              <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2 mt-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(connectionStep / 4) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-red-700 dark:text-red-300 flex-1">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Status da Conexão</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {instagramStatus ? getStatusText(instagramStatus.status) : 'Carregando...'}
              </p>
              {instagramStatus?.username && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{instagramStatus.username}</p>
              )}
            </div>
            <div className={`w-12 h-12 ${instagramStatus ? getStatusBg(instagramStatus.status) : 'bg-gray-100 dark:bg-gray-700'} rounded-lg flex items-center justify-center`}>
              <Instagram className={`w-6 h-6 ${instagramStatus ? getStatusColor(instagramStatus.status) : 'text-gray-400 dark:text-gray-500'}`} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">DMs Hoje</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">127</p>
              <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-2">+18% vs ontem</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Taxa de Resposta</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">96.3%</p>
              <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-2">+1.2% esta semana</p>
            </div>
            <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Test Message Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Teste de Envio de DM</h3>
        <div className="flex space-x-3">
          <input
            type="text"
            placeholder="Digite o username (ex: @usuario)"
            value={testUsername}
            onChange={(e) => setTestUsername(e.target.value)}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
          <button
            onClick={handleTestMessage}
            disabled={testLoading || !testUsername.trim() || instagramStatus?.status !== 'connected'}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            <span>Enviar Teste</span>
          </button>
        </div>
        {instagramStatus?.status !== 'connected' && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            ⚠️ Conecte o Instagram primeiro para enviar mensagens de teste
          </p>
        )}
      </div>

  

      {/* Setup Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-lg w-full mx-4 transform transition-all">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Instagram className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Conectar Instagram Business
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Para conectar o Instagram, você precisa configurar uma aplicação no Meta for Developers
              </p>
              
              <div className="text-left bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6 space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Acesse o Meta for Developers</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Crie uma aplicação Business</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Configure Instagram Basic Display API</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Adicione as credenciais no sistema</span>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowSetupModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Fechar
                </button>
                <button
                  onClick={() => window.open('https://developers.facebook.com/', '_blank')}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors flex items-center justify-center space-x-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Meta Developers</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <Instagram className="w-6 h-6 text-purple-600 dark:text-purple-400 mt-0.5" />
          <div>
            <h3 className="font-medium text-purple-800 dark:text-purple-300 mb-2">Como conectar seu Instagram Business</h3>
            <div className="text-sm text-purple-700 dark:text-purple-400 space-y-2">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <span>Clique em conectar conta</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <span>Certifique de ter uma conta comercial</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <span>Defina o prompt em Treinamento I.A</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                <span>Faça os primeiros testes de envio de mensagens!</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <p className="text-sm text-purple-800 dark:text-purple-300">
                <strong>📝 Nota:</strong> Todas as conversas são cryptografadas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstagramDirect;