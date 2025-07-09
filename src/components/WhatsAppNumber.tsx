import React, { useState, useEffect } from 'react';
import { Smartphone, CheckCircle, AlertCircle, QrCode, Loader2, Send, RefreshCw, Settings } from 'lucide-react';
import { useWhatsAppConnection } from '../hooks/useWhatsAppConnection';
import { zapiService } from '../services/zapi.service';

const WhatsAppNumber: React.FC = () => {
  const {
    whatsappNumber,
    loading: supabaseLoading,
    error: supabaseError,
    isConnected,
    checkInstanceStatus,
    connectWhatsApp,
    sendTestMessage,
    handleDisconnect,
    profile,
    authLoading,
    refreshProfile,
    saveOrUpdateWhatsAppNumberInSupabase
  } = useWhatsAppConnection();

  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeImage, setQrCodeImage] = useState<string>('');
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Olá! Este é um teste do Atendos IA 🤖');
  const [testLoading, setTestLoading] = useState(false);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('DISCONNECTED');
  const [instanceInfo, setInstanceInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [qrCodeLoading, setQrCodeLoading] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [profileRetryCount, setProfileRetryCount] = useState(0);

  // Verificar se a Z-API está configurada
  const isZAPIConfigured = zapiService.isConfigured();

  // Sincronizar status local com dados do Supabase
  useEffect(() => {
    if (whatsappNumber) {
      setConnectionStatus(whatsappNumber.connection_status);
    }
  }, [whatsappNumber]);

  // Tentar recuperar o perfil se ele não estiver disponível
  useEffect(() => {
    if (!profile && !authLoading && profileRetryCount < 3) {
      const retryTimeout = setTimeout(async () => {
        console.log(`🔄 Tentativa ${profileRetryCount + 1} de recuperar perfil...`);
        await refreshProfile();
        setProfileRetryCount(prev => prev + 1);
      }, 3000); // Tentar a cada 3 segundos
      
      return () => clearTimeout(retryTimeout);
    }
  }, [profile, authLoading, profileRetryCount, refreshProfile]);

  // FLUXO CORRIGIDO: Conectar número - Gerar QR Code diretamente
  const handleConnectNumber = async () => {
    if (!isZAPIConfigured) {
      setError('Credenciais da Z-API não configuradas. Verifique o arquivo .env');
      return;
    }

    if (!profile?.id || !profile?.organization_id) {
      setError('Perfil do usuário não encontrado. Tente recarregar a página.');
      return;
    }

    try {
      setConnectionLoading(true);
      setError(null);
      setSuccess(null);
      setQrCodeImage('');
      setQrCodeLoading(true);

      console.log('🔄 Iniciando conexão WhatsApp - Gerando QR Code diretamente...');

      // PASSO 1: Gerar QR Code diretamente
      const qrCodeResult = await zapiService.getQRCode();
      console.log('📊 Resultado da chamada getQRCode:', qrCodeResult);
      
      if (!qrCodeResult.success) {
        // Verificar se o erro indica que já está conectado
        if (qrCodeResult.error && qrCodeResult.error.includes('already connected')) {
          console.log('✅ Já está conectado (detectado pelo erro)');
          
          // Atualizar status no Supabase
          await saveOrUpdateWhatsAppNumberInSupabase({
            profileId: profile.id,
            organizationId: profile.organization_id,
            connectionStatus: 'CONNECTED',
            instanceId: zapiService.getConfig().instanceId,
            displayName: whatsappNumber?.display_name || 'WhatsApp Business',
            isAiActive: whatsappNumber?.is_ai_active !== undefined ? whatsappNumber.is_ai_active : true,
            aiPrompt: whatsappNumber?.ai_prompt || 'Você é um assistente virtual prestativo.'
          });
          
          // Verificar status para obter informações detalhadas
          await handleCheckInstanceStatus();
          
          setSuccess('WhatsApp já está conectado!');
          setTimeout(() => setSuccess(null), 3000);
          setQrCodeLoading(false);
          return;
        }
        
        throw new Error(qrCodeResult.error || 'Falha ao gerar QR Code');
      }
      
      // Verificar se já está conectado
      if (qrCodeResult.data?.alreadyConnected) {
        console.log('✅ WhatsApp já está conectado!');
        
        // Atualizar status no Supabase
        await saveOrUpdateWhatsAppNumberInSupabase({
          profileId: profile.id,
          organizationId: profile.organization_id,
          connectionStatus: 'CONNECTED',
          instanceId: zapiService.getConfig().instanceId,
          displayName: whatsappNumber?.display_name || 'WhatsApp Business',
          isAiActive: whatsappNumber?.is_ai_active !== undefined ? whatsappNumber.is_ai_active : true,
          aiPrompt: whatsappNumber?.ai_prompt || 'Você é um assistente virtual prestativo.'
        });
        
        // Verificar status para obter informações detalhadas
        await handleCheckInstanceStatus();
        
        setSuccess('WhatsApp já está conectado!');
        setTimeout(() => setSuccess(null), 3000);
        setQrCodeLoading(false);
        return;
      }
      
      // Se temos QR Code, mostrar
      if (qrCodeResult.data?.qrCode) {
        console.log('✅ QR Code gerado com sucesso!');
        
        // Salvar estado no Supabase
        await saveOrUpdateWhatsAppNumberInSupabase({
          profileId: profile.id,
          organizationId: profile.organization_id,
          connectionStatus: 'QR_GENERATED',
          instanceId: zapiService.getConfig().instanceId,
          displayName: whatsappNumber?.display_name || 'WhatsApp Business',
          isAiActive: whatsappNumber?.is_ai_active !== undefined ? whatsappNumber.is_ai_active : true,
          aiPrompt: whatsappNumber?.ai_prompt || 'Você é um assistente virtual prestativo.'
        });
        
        // Mostrar QR Code
        setQrCodeImage(qrCodeResult.data.qrCode);
        setShowQRModal(true);
        setSuccess('QR Code gerado com sucesso! Escaneie com seu WhatsApp.');
        setQrCodeLoading(false);
      } else {
        throw new Error('QR Code não encontrado na resposta');
      }
    } catch (err) {
      console.error('❌ Error in connection flow:', err);
      setError(err instanceof Error ? err.message : 'Erro ao conectar WhatsApp');
      setQrCodeLoading(false);
    } finally {
      setConnectionLoading(false);
    }
  };

  // Verificar status da instância manualmente
  const handleCheckInstanceStatus = async () => {
    try {
      setError(null);
      setCheckingConnection(true);
      
      if (!profile?.id || !profile?.organization_id) {
        throw new Error('Perfil do usuário não encontrado');
      }
      
      console.log('🔍 Verificação manual do status da instância via endpoint /status...');
      const result = await checkInstanceStatus();
      
      if (result) {
        setInstanceInfo(result.data);
        setConnectionStatus(result.connected ? 'CONNECTED' : 'DISCONNECTED');
        console.log('📊 Status da instância atualizado:', result.data);
        
        if (result.connected) {
          setSuccess('WhatsApp conectado e sincronizado com sucesso!');
          setShowQRModal(false); // Fechar modal se estiver conectado
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setSuccess('Status verificado - WhatsApp não conectado');
          setTimeout(() => setSuccess(null), 3000);
        }
      }
      
      return result;
    } catch (err) {
      console.error('Error checking instance status:', err);
      setError(err instanceof Error ? err.message : 'Erro ao verificar status da instância');
      return null;
    } finally {
      setCheckingConnection(false);
    }
  };

  // Enviar mensagem de teste via Z-API
  const handleTestMessage = async () => {
    if (!testPhone.trim()) {
      setError('Digite um número para teste');
      return;
    }

    if (!isZAPIConfigured) {
      setError('Credenciais da Z-API não configuradas');
      return;
    }

    setTestLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log(`🧪 Testing message to ${testPhone}...`);
      
      const result = await sendTestMessage(testPhone, testMessage);
      
      if (result.success) {
        setSuccess(`✅ Mensagem de teste enviada para ${testPhone}!`);
        setTestPhone('');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(result.error || 'Falha ao enviar mensagem');
      }
    } catch (err) {
      console.error('Error sending test message:', err);
      setError(err instanceof Error ? err.message : 'Erro ao enviar mensagem de teste');
    } finally {
      setTestLoading(false);
    }
  };

  // Desconectar WhatsApp
  const handleDisconnectWhatsApp = async () => {
    try {
      setConnectionLoading(true);
      setError(null);
      
      const result = await handleDisconnect();
      
      if (result.success) {
        setConnectionStatus('DISCONNECTED');
        setInstanceInfo(null);
        setSuccess('WhatsApp desconectado com sucesso!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(result.error || 'Falha ao desconectar');
      }
    } catch (err) {
      console.error('Error disconnecting WhatsApp:', err);
      setError(err instanceof Error ? err.message : 'Erro ao desconectar WhatsApp');
    } finally {
      setConnectionLoading(false);
    }
  };

  // Função para atualizar QR Code manualmente
  const handleRefreshQRCode = async () => {
    try {
      setQrCodeLoading(true);
      console.log('🔄 Atualização manual do QR Code solicitada...');
      
      const result = await zapiService.getQRCode();
      
      if (result.success && result.data?.qrCode) {
        setQrCodeImage(result.data.qrCode);
        console.log('✅ Imagem do QR Code atualizada com sucesso');
        setQrCodeLoading(false);
      } else if (result.success && result.data?.alreadyConnected) {
        setShowQRModal(false);
        setSuccess('WhatsApp já está conectado!');
        setTimeout(() => setSuccess(null), 3000);
        
        // Verificar status para obter informações atualizadas
        await handleCheckInstanceStatus();
        setQrCodeLoading(false);
      } else {
        throw new Error(result.error || 'QR Code não encontrado na resposta');
      }
    } catch (err) {
      console.error('❌ Error fetching QR Code:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar QR Code');
      setQrCodeLoading(false);
    }
  };

  // Função para tentar recuperar o perfil manualmente
  const handleRetryProfile = async () => {
    try {
      setError(null);
      console.log('🔄 Tentando recuperar perfil manualmente...');
      
      const result = await refreshProfile();
      
      if (result.success) {
        setSuccess('Perfil carregado com sucesso!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(result.error || 'Falha ao recuperar perfil');
      }
    } catch (err) {
      console.error('❌ Error recovering profile:', err);
      setError(err instanceof Error ? err.message : 'Erro ao recuperar perfil');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'CONNECTED': return 'text-green-600 dark:text-green-400';
      case 'CONNECTING': return 'text-yellow-600 dark:text-yellow-400';
      case 'QR_GENERATED': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-red-600 dark:text-red-400';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status.toUpperCase()) {
      case 'CONNECTED': return 'bg-green-100 dark:bg-green-900/30';
      case 'CONNECTING': return 'bg-yellow-100 dark:bg-yellow-900/30';
      case 'QR_GENERATED': return 'bg-blue-100 dark:bg-blue-900/30';
      default: return 'bg-red-100 dark:bg-red-900/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toUpperCase()) {
      case 'CONNECTED': return 'Conectado';
      case 'CONNECTING': return 'Conectando';
      case 'QR_GENERATED': return 'QR Code Gerado';
      default: return 'Desconectado';
    }
  };

  const isConnectedStatus = connectionStatus.toUpperCase() === 'CONNECTED';

  // Mostrar mensagem de carregamento se auth estiver carregando
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Carregando autenticação...</span>
      </div>
    );
  }

  // Mostrar mensagem de carregamento do Supabase
  if (supabaseLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Números WhatsApp</h1>
        <div className="flex space-x-3">
          <button 
            onClick={handleCheckInstanceStatus}
            disabled={connectionLoading || !profile?.id}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-5 h-5 ${connectionLoading ? 'animate-spin' : ''}`} />
            <span>Verificar Status</span>
          </button>
          
          {isConnectedStatus ? (
            <button 
              onClick={handleDisconnectWhatsApp}
              disabled={connectionLoading || !profile?.id}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connectionLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span>Desconectar</span>
            </button>
          ) : (
            <button 
              onClick={handleConnectNumber}
              disabled={connectionLoading || !isZAPIConfigured || !profile?.id}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connectionLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <QrCode className="w-5 h-5" />
              )}
              <span>Conectar Número</span>
            </button>
          )}
        </div>
      </div>

      {/* Configuration Status */}
      {!isZAPIConfigured && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-red-700 dark:text-red-300 font-medium">Configuração da Z-API Necessária</p>
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                Configure as variáveis VITE_ZAPI_INSTANCE_ID e VITE_ZAPI_TOKEN no arquivo .env
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Profile Loading Status */}
      {!profile && !authLoading && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="text-yellow-700 dark:text-yellow-300 font-medium">Carregando Perfil do Usuário</p>
                <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-1">
                  Aguardando dados do perfil para conectar o WhatsApp...
                </p>
              </div>
            </div>
            <button
              onClick={handleRetryProfile}
              className="px-3 py-1 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {(error || supabaseError) && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-red-700 dark:text-red-300">{error || supabaseError}</p>
            <button 
              onClick={() => {setError(null)}}
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

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Status da Conexão</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {getStatusText(connectionStatus)}
              </p>
              {whatsappNumber?.phone_number && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {whatsappNumber.phone_number}
                </p>
              )}
              {instanceInfo && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                  <p>Instância: {instanceInfo.name || instanceInfo.id}</p>
                  {instanceInfo.phone && (
                    <p>Telefone: {instanceInfo.phone}</p>
                  )}
                </div>
              )}
            </div>
            <div className={`w-12 h-12 ${getStatusBg(connectionStatus)} rounded-lg flex items-center justify-center`}>
              <Smartphone className={`w-6 h-6 ${getStatusColor(connectionStatus)}`} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">IA Ativa</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {whatsappNumber?.is_ai_active ? 'Sim' : 'Não'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Veja mais em Treinamento de I.A
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Configuração</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {isZAPIConfigured && profile?.id ? 'OK' : 'Pendente'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Veja mais em Conversas
              </p>
            </div>
            <div className={`w-12 h-12 ${isZAPIConfigured && profile?.id ? 'bg-blue-500' : 'bg-orange-500'} rounded-lg flex items-center justify-center`}>
              <Settings className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Test Message Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Teste de Envio de Mensagem</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Número de Telefone
              </label>
              <input
                type="text"
                placeholder="5511999999999"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                disabled={!isConnectedStatus || !isZAPIConfigured || !profile?.id}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mensagem
              </label>
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                disabled={!isConnectedStatus || !isZAPIConfigured || !profile?.id}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
              />
            </div>
          </div>
          <button
            onClick={handleTestMessage}
            disabled={testLoading || !testPhone.trim() || !isConnectedStatus || !isZAPIConfigured || !profile?.id}
            className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            <span>Enviar Teste</span>
          </button>
          {(!isConnectedStatus || !isZAPIConfigured || !profile?.id) && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ⚠️ {!isZAPIConfigured ? 'Configure a Z-API' : !profile?.id ? 'Aguarde o carregamento do perfil' : 'Conecte o WhatsApp'} primeiro para enviar mensagens de teste
            </p>
          )}
        </div>
      </div>

      {/* Fluxo Correto Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">📱 Como conectar?</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">Clique em "Conectar Número"</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">Gera o QR Code automaticamente</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">Escaneie o QR Code</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">Use seu WhatsApp para escanear o código</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">Clique em "Verificar Conexão"</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">Após escanear, verifique se a conexão foi bem-sucedida</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">Funcionalidades Liberadas</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">Envio de mensagens, conversas, IA, etc.</p>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Conectar WhatsApp
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Escaneie este QR Code com seu WhatsApp para conectar
              </p>
              
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 dark:border-gray-600 mb-6">
                {qrCodeLoading ? (
                  <div className="w-64 h-64 mx-auto flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-2" />
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Gerando QR Code...</p>
                      <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">Via Z-API</p>
                    </div>
                  </div>
                ) : qrCodeImage ? (
                  <img 
                    src={qrCodeImage.startsWith('data:') ? qrCodeImage : `data:image/png;base64,${qrCodeImage}`}
                    alt="QR Code" 
                    className="w-64 h-64 mx-auto"
                  />
                ) : (
                  <div className="w-64 h-64 mx-auto flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <div className="text-center">
                      <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                      <p className="text-gray-600 dark:text-gray-400 text-sm">QR Code não disponível</p>
                      <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">Tente atualizar</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-6">
                <div className="flex items-center justify-center space-x-2">
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    Após escanear o QR Code com seu WhatsApp, clique no botão abaixo para verificar a conexão.
                  </p>
                </div>
              </div>
              
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-6 space-y-1">
                <p>1. Abra o WhatsApp no seu celular</p>
                <p>2. Toque em Menu (⋮) → Dispositivos conectados</p>
                <p>3. Toque em "Conectar um dispositivo"</p>
                <p>4. Escaneie este código QR</p>
              </div>
              
              <div className="flex flex-col space-y-3">
                <button
                  onClick={handleCheckInstanceStatus}
                  disabled={checkingConnection}
                  className="w-full px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checkingConnection ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  <span>Já conectou? Verificar conexão</span>
                </button>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowQRModal(false)}
                    className="flex-1 px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={handleRefreshQRCode}
                    disabled={qrCodeLoading}
                    className="flex-1 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {qrCodeLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    <span>Atualizar QR</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppNumber;