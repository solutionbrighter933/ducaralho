import React, { useState, useEffect } from 'react';
import { Brain, Settings, Play, Save, X, Bot, MessageSquare, Instagram, Phone, AlertCircle, RefreshCw, Lock } from 'lucide-react';
import { useWhatsAppConnection } from '../hooks/useWhatsAppConnection';

interface AITrainingProps {
  setActiveSection?: (section: string) => void;
  setSettingsTab?: (tab: string) => void;
}

const AITraining: React.FC<AITrainingProps> = ({ setActiveSection, setSettingsTab }) => {
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [promptType, setPromptType] = useState<'whatsapp' | 'instagram'>('whatsapp');
  const [whatsappPrompt, setWhatsappPrompt] = useState('');
  const [instagramPrompt, setInstagramPrompt] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isTraining, setIsTraining] = useState(false);
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  
  const { 
    whatsappNumber, 
    updateAIPrompt, 
    loading, 
    profile, 
    authLoading, 
    saveOrUpdateWhatsAppNumberInSupabase,
    refreshProfile 
  } = useWhatsAppConnection();

  useEffect(() => {
    if (whatsappNumber?.ai_prompt) {
      setWhatsappPrompt(whatsappNumber.ai_prompt);
    }
    if (whatsappNumber?.phone_number) {
      setPhoneNumber(whatsappNumber.phone_number);
    }
  }, [whatsappNumber]);

  const promptExamples = [
    {
      title: 'Vendedor de Carros',
      prompt: 'Você é um vendedor de carros experiente e entusiasmado. Seu objetivo é ajudar os clientes a encontrar o carro perfeito para suas necessidades. Seja amigável, conhecedor e sempre destaque os benefícios dos veículos. Faça perguntas sobre o orçamento, preferências e uso pretendido do carro.'
    },
    {
      title: 'Suporte Técnico',
      prompt: 'Você é um especialista em suporte técnico. Sua missão é resolver problemas técnicos de forma clara e eficiente. Sempre peça detalhes específicos sobre o problema, ofereça soluções passo a passo e seja paciente com usuários menos experientes.'
    },
    {
      title: 'Atendimento E-commerce',
      prompt: 'Você é um atendente de e-commerce especializado em vendas online. Ajude os clientes com dúvidas sobre produtos, pedidos, entregas e devoluções. Seja proativo em oferecer produtos relacionados e sempre busque a satisfação do cliente.'
    },
    {
      title: 'Consultor Imobiliário',
      prompt: 'Você é um consultor imobiliário experiente. Ajude os clientes a encontrar a propriedade ideal, seja para compra, venda ou aluguel. Faça perguntas sobre localização, orçamento, tamanho e características desejadas. Sempre destaque os pontos positivos dos imóveis.'
    }
  ];

  // Verificar se o número de telefone está configurado
  const hasPhoneNumber = whatsappNumber?.phone_number && whatsappNumber.phone_number.trim() !== '';

  // Função para tentar recuperar o perfil
  const handleRetryProfile = async () => {
    try {
      console.log('🔄 Tentando recuperar perfil manualmente...');
      const result = await refreshProfile();
      
      if (!result.success) {
        alert('❌ Falha ao recuperar perfil: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Erro ao tentar recuperar perfil:', error);
      alert('❌ Erro ao tentar recuperar perfil. Tente recarregar a página.');
    }
  };

  const handleOpenPromptModal = (type: 'whatsapp' | 'instagram') => {
    // Check if profile is available before opening modal
    if (!profile?.id || !profile?.organization_id) {
      alert('❌ Perfil do usuário não está carregado. Aguarde um momento e tente novamente.');
      return;
    }

    // Verificar se o número de telefone está configurado para WhatsApp
    if (type === 'whatsapp' && !hasPhoneNumber) {
      alert('⚠️ Digite o número que foi conectado antes de configurar o prompt do WhatsApp.');
      setShowPhoneModal(true);
      return;
    }
    
    // Bloquear acesso ao prompt do Instagram para todos os usuários
    if (type === 'instagram') {
      alert('⚠️ A configuração de prompt para Instagram não está disponível no momento.');
      return;
    }
    
    setPromptType(type);
    setShowPromptModal(true);
  };

  const handleSavePhoneNumber = async () => {
    if (!profile?.id || !profile?.organization_id) {
      alert('❌ Perfil do usuário não está carregado. Aguarde um momento e tente novamente.');
      return;
    }

    if (!phoneNumber.trim()) {
      alert('Por favor, digite um número de telefone válido');
      return;
    }

    // Validar formato do número (básico)
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      alert('Por favor, digite um número de telefone válido (10-15 dígitos)');
      return;
    }

    setIsSavingPhone(true);
    
    try {
      await saveOrUpdateWhatsAppNumberInSupabase({
        profileId: profile.id,
        organizationId: profile.organization_id,
        phoneNumber: cleanPhone,
        connectionStatus: whatsappNumber?.connection_status || 'DISCONNECTED',
        instanceId: whatsappNumber?.instance_id || 'pending',
        displayName: whatsappNumber?.display_name || 'WhatsApp Business',
        isAiActive: whatsappNumber?.is_ai_active !== undefined ? whatsappNumber.is_ai_active : true,
        aiPrompt: whatsappNumber?.ai_prompt || 'Você é um assistente virtual prestativo.'
      });

      alert('✅ Número de telefone salvo com sucesso!');
      setShowPhoneModal(false);
    } catch (error) {
      console.error('Error saving phone number:', error);
      alert('❌ Erro ao salvar número de telefone. Tente novamente.');
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleGoToSettings = () => {
    if (setActiveSection && setSettingsTab) {
      setActiveSection('settings');
      setSettingsTab('ai-models');
    }
  };

  const handleSavePrompt = async () => {
    // Check if profile is available before saving
    if (!profile?.id || !profile?.organization_id) {
      alert('❌ Perfil do usuário não está carregado. Aguarde um momento e tente novamente.');
      return;
    }

    const currentPrompt = promptType === 'whatsapp' ? whatsappPrompt : instagramPrompt;
    
    if (!currentPrompt.trim()) {
      alert('Por favor, digite um prompt para o agente');
      return;
    }

    setIsTraining(true);
    
    try {
      if (promptType === 'whatsapp') {
        await updateAIPrompt(currentPrompt.trim());
        alert('✅ Prompt do WhatsApp atualizado com sucesso!');
      } else {
        // Nunca deve chegar aqui, pois o botão do Instagram está bloqueado
        alert('❌ A configuração de prompt para Instagram não está disponível no momento.');
      }
      setShowPromptModal(false);
    } catch (error) {
      console.error('Error updating AI prompt:', error);
      alert('❌ Erro ao atualizar prompt do agente. Tente novamente.');
    } finally {
      setIsTraining(false);
    }
  };

  const handleUseExample = (examplePrompt: string) => {
    if (promptType === 'whatsapp') {
      setWhatsappPrompt(examplePrompt);
    } else {
      setInstagramPrompt(examplePrompt);
    }
  };

  const getCurrentPrompt = () => {
    return promptType === 'whatsapp' ? whatsappPrompt : instagramPrompt;
  };

  const setCurrentPrompt = (value: string) => {
    if (promptType === 'whatsapp') {
      setWhatsappPrompt(value);
    } else {
      setInstagramPrompt(value);
    }
  };

  // Show loading if auth is still loading or main loading is true
  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Carregando...</span>
      </div>
    );
  }

  // Show message if profile is not available
  if (!profile?.id || !profile?.organization_id) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Carregando perfil do usuário...</p>
          <button
            onClick={handleRetryProfile}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Tentar Novamente</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Treinamento do Agente I.A</h1>
        <div className="flex space-x-3">
          <button 
            onClick={handleGoToSettings}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
          >
            <Settings className="w-5 h-5" />
            <span>Configurações</span>
          </button>
        </div>
      </div>

      {/* Phone Number Requirement Alert */}
      {!hasPhoneNumber && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-yellow-800 dark:text-yellow-300">Número de telefone necessário</h3>
              <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-1">
                Digite o número de telefone que está conectado antes de configurar prompts para o WhatsApp.
              </p>
              <button
                onClick={() => setShowPhoneModal(true)}
                className="mt-2 px-3 py-1 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Adicionar Número
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Platform Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WhatsApp Prompt Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">WhatsApp</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {hasPhoneNumber ? `Número: ${whatsappNumber?.phone_number}` : 'Número não configurado'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
              {whatsappPrompt || 'Nenhum prompt configurado para WhatsApp'}
            </p>
          </div>
          
          <button 
            onClick={() => handleOpenPromptModal('whatsapp')}
            disabled={isTraining || !hasPhoneNumber}
            className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              hasPhoneNumber 
                ? 'bg-green-500 text-white hover:bg-green-600' 
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Bot className="w-4 h-4" />
            <span>{hasPhoneNumber ? 'Definir Prompt para WhatsApp' : 'Adicione um número primeiro'}</span>
          </button>
        </div>

        {/* Instagram Prompt Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg flex items-center justify-center">
                <Instagram className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Instagram</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Configurar prompt para Instagram</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
              {instagramPrompt || 'Prompt já configurado'}
            </p>
          </div>
          
          <button 
            disabled={true}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed opacity-70"
          >
            <Lock className="w-4 h-4" />
            <span>Função não disponível</span>
          </button>
        </div>
      </div>

      {/* Phone Number Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <Phone className="w-6 h-6 text-green-600" />
                <span>Adicionar Número de Telefone</span>
              </h3>
              <button
                onClick={() => setShowPhoneModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Número de Telefone WhatsApp Conectado
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Ex: 5511999999999"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Digite apenas números (código do país + DDD + número). Ex: 5511999999999
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">💡 Importante:</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  <li>• O prompt de IA será aplicado apenas neste número</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowPhoneModal(false)}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSavePhoneNumber}
                  disabled={!phoneNumber.trim() || isSavingPhone}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSavingPhone ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Salvar Número</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agent Prompt Modal */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                {promptType === 'whatsapp' ? (
                  <MessageSquare className="w-6 h-6 text-green-600" />
                ) : (
                  <Instagram className="w-6 h-6 text-purple-600" />
                )}
                <span>
                  Configurar Prompt do {promptType === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
                </span>
              </h3>
              <button
                onClick={() => setShowPromptModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Prompt Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Prompt do Agente para {promptType === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
                </label>
                <textarea
                  value={getCurrentPrompt()}
                  onChange={(e) => setCurrentPrompt(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder={`Descreva como o agente deve se comportar no ${promptType === 'whatsapp' ? 'WhatsApp' : 'Instagram'}, seu tom de voz, especialidade e objetivos...`}
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Seja específico sobre a personalidade, conhecimento e objetivos do seu agente para {promptType === 'whatsapp' ? 'WhatsApp' : 'Instagram'}. 
                  Exemplo: "Você é um vendedor de carros experiente..."
                </p>
              </div>

              {/* Example Prompts */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Exemplos de Prompts</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {promptExamples.map((example, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors bg-white dark:bg-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900 dark:text-white">{example.title}</h5>
                        <button
                          onClick={() => handleUseExample(example.prompt)}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium"
                        >
                          Usar
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{example.prompt}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">💡 Dicas para um bom prompt:</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  <li>• Defina claramente o papel e especialidade do agente</li>
                  <li>• Especifique o tom de voz (formal, amigável, técnico, etc.)</li>
                  <li>• Inclua objetivos específicos (vender, resolver problemas, informar)</li>
                  <li>• Mencione como lidar com situações complexas</li>
                  <li>• Defina limites do que o agente pode ou não fazer</li>
                  <li>• Considere as características específicas da plataforma ({promptType === 'whatsapp' ? 'WhatsApp' : 'Instagram'})</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowPromptModal(false)}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSavePrompt}
                  disabled={!getCurrentPrompt().trim() || isTraining}
                  className={`px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 ${
                    promptType === 'whatsapp' 
                      ? 'bg-green-500 hover:bg-green-600' 
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                  }`}
                >
                  {isTraining ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Salvar Prompt</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AITraining;