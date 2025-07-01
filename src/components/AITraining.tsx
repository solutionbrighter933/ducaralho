import React, { useState, useEffect } from 'react';
import { Brain, Settings, Play, Save, X, Bot } from 'lucide-react';
import { useWhatsAppConnection } from '../hooks/useWhatsAppConnection';

interface AITrainingProps {
  setActiveSection?: (section: string) => void;
  setSettingsTab?: (tab: string) => void;
}

const AITraining: React.FC<AITrainingProps> = ({ setActiveSection, setSettingsTab }) => {
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [agentPrompt, setAgentPrompt] = useState('');
  const [isTraining, setIsTraining] = useState(false);
  
  const { whatsappNumber, updateAIPrompt, loading } = useWhatsAppConnection();

  useEffect(() => {
    if (whatsappNumber?.ai_prompt) {
      setAgentPrompt(whatsappNumber.ai_prompt);
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

  const handleStartTraining = () => {
    setShowPromptModal(true);
  };

  const handleGoToSettings = () => {
    if (setActiveSection && setSettingsTab) {
      setActiveSection('settings');
      setSettingsTab('ai-models');
    }
  };

  const handleSavePrompt = async () => {
    if (!agentPrompt.trim()) {
      alert('Por favor, digite um prompt para o agente');
      return;
    }

    setIsTraining(true);
    
    try {
      await updateAIPrompt(agentPrompt.trim());
      setShowPromptModal(false);
      alert('✅ Prompt do agente atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating AI prompt:', error);
      alert('❌ Erro ao atualizar prompt do agente. Tente novamente.');
    } finally {
      setIsTraining(false);
    }
  };

  const handleUseExample = (examplePrompt: string) => {
    setAgentPrompt(examplePrompt);
  };

  if (loading) {
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Treinamento do Agente A.I.</h1>
        <div className="flex space-x-3">
          <button 
            onClick={handleGoToSettings}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
          >
            <Settings className="w-5 h-5" />
            <span>Configurações</span>
          </button>
          <button 
            onClick={handleStartTraining}
            disabled={isTraining || !whatsappNumber}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTraining ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>Editar Prompt</span>
              </>
            )}
          </button>
        </div>
      </div>

      {!whatsappNumber && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <p className="text-yellow-700 dark:text-yellow-300">
              Configure um número WhatsApp primeiro para treinar o agente de IA.
            </p>
          </div>
        </div>
      )}

      {/* Current Agent Prompt */}
      {whatsappNumber && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
              <Bot className="w-5 h-5 text-indigo-600" />
              <span>Prompt Atual do Agente</span>
            </h2>
            <button 
              onClick={handleStartTraining}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium"
            >
              Editar
            </button>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {whatsappNumber.ai_prompt || 'Nenhum prompt configurado'}
            </p>
          </div>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <h4 className="font-medium text-blue-800 dark:text-blue-300 text-sm mb-1">Status da IA</h4>
              <p className="text-blue-700 dark:text-blue-400 text-sm">
                {whatsappNumber.is_ai_active ? '✅ Ativa' : '❌ Inativa'}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
              <h4 className="font-medium text-green-800 dark:text-green-300 text-sm mb-1">Conexão WhatsApp</h4>
              <p className="text-green-700 dark:text-green-400 text-sm">
                {whatsappNumber.connection_status === 'CONNECTED' ? '✅ Conectado' : '❌ Desconectado'}
              </p>
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
                <Bot className="w-6 h-6 text-indigo-600" />
                <span>Configurar Prompt do Agente</span>
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
                  Prompt do Agente
                </label>
                <textarea
                  value={agentPrompt}
                  onChange={(e) => setAgentPrompt(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Descreva como o agente deve se comportar, seu tom de voz, especialidade e objetivos..."
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Seja específico sobre a personalidade, conhecimento e objetivos do seu agente. 
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
                  disabled={!agentPrompt.trim() || isTraining}
                  className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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