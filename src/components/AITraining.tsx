import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  MessageSquare, 
  Zap, 
  ZapOff, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw,
  Smartphone,
  User,
  Building,
  Phone,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuthContext } from './AuthProvider';
import { supabase } from '../lib/supabase';

interface WhatsAppAgent {
  id: string;
  organization_id: string;
  phone_number: string | null;
  display_name: string;
  status: string;
  profile_id: string | null;
  ai_prompt: string;
  is_ai_active: boolean;
  connection_status: string;
  instance_id: string | null;
  nomeagente: string;
  agent_instance_id: string | null;
  agent_token: string | null;
  agent_phone_number: string | null;
  last_activity: string | null;
  created_at: string;
  updated_at: string;
}

interface AITrainingProps {
  setActiveSection?: (section: string) => void;
  setSettingsTab?: (tab: string) => void;
}

const AITraining: React.FC<AITrainingProps> = ({ setActiveSection, setSettingsTab }) => {
  const { user, profile } = useAuthContext();
  const [agents, setAgents] = useState<WhatsAppAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<WhatsAppAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [agentForm, setAgentForm] = useState({
    nomeagente: '',
    ai_prompt: '',
    is_ai_active: true,
    agent_instance_id: '',
    agent_token: '',
    agent_phone_number: ''
  });

  // Carregar agentes da organização
  const loadAgents = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!profile?.organization_id) {
        throw new Error('Organização não encontrada');
      }

      console.log('🤖 Carregando agentes de IA para organização:', profile.organization_id);

      const { data: agentsData, error: agentsError } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (agentsError) {
        console.error('❌ Erro ao buscar agentes:', agentsError);
        throw agentsError;
      }

      console.log('✅ Agentes encontrados:', agentsData?.length || 0);
      console.log('📊 Dados dos agentes:', agentsData);

      setAgents(agentsData || []);
    } catch (err) {
      console.error('❌ Erro ao carregar agentes:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    if (profile?.organization_id) {
      loadAgents();
    }
  }, [profile?.organization_id]);

  // Abrir modal para editar agente
  const openEditAgentModal = (agent: WhatsAppAgent) => {
    console.log('✏️ Editando agente:', agent);
    console.log('📞 phone_number do agente:', agent.phone_number);
    console.log('🤖 ai_prompt do agente:', agent.ai_prompt);
    
    setSelectedAgent(agent);
    setAgentForm({
      nomeagente: agent.nomeagente || 'Atendente IA',
      ai_prompt: agent.ai_prompt || 'Você é um assistente virtual prestativo.',
      is_ai_active: agent.is_ai_active,
      agent_instance_id: agent.agent_instance_id || '',
      agent_token: agent.agent_token || '',
      agent_phone_number: agent.agent_phone_number || agent.phone_number || ''
    });
    setShowAgentModal(true);
  };

  // Abrir modal para novo agente
  const openNewAgentModal = () => {
    setSelectedAgent(null);
    setAgentForm({
      nomeagente: 'Novo Agente IA',
      ai_prompt: 'Você é um assistente virtual prestativo que ajuda clientes com suas dúvidas de forma educada e eficiente.',
      is_ai_active: true,
      agent_instance_id: '',
      agent_token: '',
      agent_phone_number: ''
    });
    setShowAgentModal(true);
  };

  // Salvar agente
  const saveAgent = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      if (!profile?.organization_id) {
        throw new Error('Organização não encontrada');
      }

      console.log('💾 Salvando agente...');
      console.log('📊 Dados do formulário:', agentForm);

      const agentData = {
        organization_id: profile.organization_id,
        display_name: agentForm.nomeagente,
        nomeagente: agentForm.nomeagente,
        ai_prompt: agentForm.ai_prompt,
        is_ai_active: agentForm.is_ai_active,
        agent_instance_id: agentForm.agent_instance_id || null,
        agent_token: agentForm.agent_token || null,
        agent_phone_number: agentForm.agent_phone_number || null,
        phone_number: agentForm.agent_phone_number || null, // Sincronizar com phone_number principal
        updated_at: new Date().toISOString()
      };

      if (selectedAgent) {
        // Atualizar agente existente
        console.log(`📝 Atualizando agente existente ID: ${selectedAgent.id}`);
        
        const { data: updatedData, error: updateError } = await supabase
          .from('whatsapp_numbers')
          .update(agentData)
          .eq('id', selectedAgent.id)
          .eq('organization_id', profile.organization_id)
          .select()
          .single();

        if (updateError) {
          console.error('❌ Erro ao atualizar agente:', updateError);
          
          // Verificar se é erro de chave única
          if (updateError.code === '23505' && updateError.message?.includes('phone_number')) {
            throw new Error(`O número de telefone "${agentForm.agent_phone_number}" já está sendo usado por outro agente. Escolha um número diferente.`);
          }
          
          throw updateError;
        }

        console.log('✅ Agente atualizado com sucesso:', updatedData);
        setSuccess('Agente atualizado com sucesso!');
      } else {
        // Criar novo agente
        console.log('➕ Criando novo agente');
        
        const { data: newData, error: insertError } = await supabase
          .from('whatsapp_numbers')
          .insert({
            ...agentData,
            profile_id: profile.id,
            connection_status: 'DISCONNECTED',
            status: 'disconnected',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          console.error('❌ Erro ao criar agente:', insertError);
          
          // Verificar se é erro de chave única
          if (insertError.code === '23505' && insertError.message?.includes('phone_number')) {
            throw new Error(`O número de telefone "${agentForm.agent_phone_number}" já está sendo usado. Escolha um número diferente.`);
          }
          
          throw insertError;
        }

        console.log('✅ Agente criado com sucesso:', newData);
        setSuccess('Agente criado com sucesso!');
      }

      setShowAgentModal(false);
      setSelectedAgent(null);
      await loadAgents();
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      console.error('❌ Erro ao salvar agente:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar agente');
    } finally {
      setSaving(false);
    }
  };

  // Excluir agente
  const deleteAgent = async (agent: WhatsAppAgent) => {
    if (!confirm(`Tem certeza que deseja excluir o agente "${agent.nomeagente}"?`)) {
      return;
    }

    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('whatsapp_numbers')
        .delete()
        .eq('id', agent.id)
        .eq('organization_id', profile?.organization_id);

      if (deleteError) {
        throw deleteError;
      }

      setSuccess('Agente excluído com sucesso!');
      await loadAgents();
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      console.error('❌ Erro ao excluir agente:', err);
      setError(err instanceof Error ? err.message : 'Erro ao excluir agente');
    }
  };

  // Alternar status da IA
  const toggleAIStatus = async (agent: WhatsAppAgent) => {
    try {
      setError(null);

      const { error: updateError } = await supabase
        .from('whatsapp_numbers')
        .update({
          is_ai_active: !agent.is_ai_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', agent.id)
        .eq('organization_id', profile?.organization_id);

      if (updateError) {
        throw updateError;
      }

      setSuccess(`IA ${!agent.is_ai_active ? 'ativada' : 'desativada'} para ${agent.nomeagente}!`);
      await loadAgents();
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      console.error('❌ Erro ao alternar status da IA:', err);
      setError(err instanceof Error ? err.message : 'Erro ao alternar status da IA');
    }
  };

  // Alternar visibilidade do token
  const toggleTokenVisibility = (agentId: string) => {
    setShowTokens(prev => ({
      ...prev,
      [agentId]: !prev[agentId]
    }));
  };

  // Formatar número de telefone
  const formatPhoneNumber = (phone: string | null): string => {
    if (!phone) return 'Não configurado';
    
    const clean = phone.replace(/\D/g, '');
    if (clean.length >= 10) {
      const countryCode = clean.substring(0, 2);
      const areaCode = clean.substring(2, 4);
      const firstPart = clean.substring(4, clean.length - 4);
      const lastPart = clean.substring(clean.length - 4);
      return `+${countryCode} (${areaCode}) ${firstPart}-${lastPart}`;
    }
    return phone;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Carregando agentes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Treinamento de IA</h1>
        <div className="flex space-x-3">
          <button 
            onClick={loadAgents}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
          <button 
            onClick={openNewAgentModal}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Agente</span>
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-green-700 dark:text-green-300">{success}</p>
            </div>
            <button 
              onClick={() => setSuccess(null)}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Lista de Agentes */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Agentes de IA</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gerencie os agentes de inteligência artificial da sua organização
          </p>
        </div>
        
        <div className="p-6">
          {agents.length > 0 ? (
            <div className="space-y-4">
              {agents.map((agent) => (
                <div key={agent.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                          agent.is_ai_active ? 'bg-green-500' : 'bg-gray-500'
                        }`}>
                          <Brain className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {agent.nomeagente || agent.display_name}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              agent.is_ai_active 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                            }`}>
                              {agent.is_ai_active ? 'IA Ativa' : 'IA Inativa'}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              agent.connection_status === 'CONNECTED'
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                            }`}>
                              {agent.connection_status === 'CONNECTED' ? 'Conectado' : 'Desconectado'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Preview do Prompt */}
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prompt atual:</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {agent.ai_prompt || 'Nenhum prompt configurado'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={() => openEditAgentModal(agent)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Editar agente"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => toggleAIStatus(agent)}
                        className={`p-2 rounded-lg transition-colors ${
                          agent.is_ai_active
                            ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                            : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                        }`}
                        title={agent.is_ai_active ? 'Desativar IA' : 'Ativar IA'}
                      >
                        {agent.is_ai_active ? <ZapOff className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => deleteAgent(agent)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Excluir agente"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Brain className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhum agente encontrado</h3>
              <p className="text-gray-500 dark:text-gray-400">Crie seu primeiro agente de IA para começar</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Agente */}
      {showAgentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedAgent ? 'Editar Agente' : 'Novo Agente'}
              </h3>
              <button
                onClick={() => setShowAgentModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Configurações Básicas */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nome do Agente *
                  </label>
                  <input
                    type="text"
                    value={agentForm.nomeagente}
                    onChange={(e) => setAgentForm(prev => ({ ...prev, nomeagente: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Ex: Atendente Principal, Suporte Técnico, Vendas"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Número de Telefone do Agente *
                  </label>
                  <input
                    type="text"
                    value={agentForm.agent_phone_number}
                    onChange={(e) => setAgentForm(prev => ({ ...prev, agent_phone_number: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="5535912098993"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Número do WhatsApp que este agente vai usar para enviar mensagens
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Prompt do Agente *
                  </label>
                  <textarea
                    rows={6}
                    value={agentForm.ai_prompt}
                    onChange={(e) => setAgentForm(prev => ({ ...prev, ai_prompt: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Você é um assistente virtual prestativo que ajuda clientes com suas dúvidas de forma educada e eficiente..."
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Defina como este agente deve se comportar e responder aos clientes
                  </p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_ai_active"
                    checked={agentForm.is_ai_active}
                    onChange={(e) => setAgentForm(prev => ({ ...prev, is_ai_active: e.target.checked }))}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_ai_active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Ativar IA para este agente
                  </label>
                </div>
              </div>

              {/* Configurações Avançadas Z-API */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Configurações Z-API (Opcional)</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Instance ID Específico
                    </label>
                    <input
                      type="text"
                      value={agentForm.agent_instance_id}
                      onChange={(e) => setAgentForm(prev => ({ ...prev, agent_instance_id: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Ex: 3E34EADF8CD1007B145E2A88B4975A95"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Deixe vazio para usar a configuração padrão da organização
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Token Específico
                    </label>
                    <div className="relative">
                      <input
                        type={showTokens[selectedAgent?.id || 'new'] ? 'text' : 'password'}
                        value={agentForm.agent_token}
                        onChange={(e) => setAgentForm(prev => ({ ...prev, agent_token: e.target.value }))}
                        className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Ex: 7C19DEAA164FD4EF8312E717"
                      />
                      <button
                        type="button"
                        onClick={() => toggleTokenVisibility(selectedAgent?.id || 'new')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showTokens[selectedAgent?.id || 'new'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Deixe vazio para usar a configuração padrão da organização
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowAgentModal(false)}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveAgent}
                  disabled={saving || !agentForm.nomeagente.trim() || !agentForm.ai_prompt.trim()}
                  className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{saving ? 'Salvando...' : selectedAgent ? 'Atualizar Agente' : 'Criar Agente'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Informações sobre Configuração */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100 mb-4">💡 Como funciona</h3>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">1</div>
            <div>
              <p className="font-medium text-indigo-900 dark:text-indigo-100">Configure as credenciais Z-API</p>
              <p className="text-sm text-indigo-700 dark:text-indigo-300">
                Vá em Configurações &gt; Integração Z-API para definir as credenciais padrão
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">2</div>
            <div>
              <p className="font-medium text-indigo-900 dark:text-indigo-100">Crie agentes personalizados</p>
              <p className="text-sm text-indigo-700 dark:text-indigo-300">
                Cada agente pode ter seu próprio número, prompt e configurações Z-API
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">3</div>
            <div>
              <p className="font-medium text-indigo-900 dark:text-indigo-100">Conecte os números</p>
              <p className="text-sm text-indigo-700 dark:text-indigo-300">
                Use a aba "Números WhatsApp" para conectar cada número via QR Code
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AITraining;