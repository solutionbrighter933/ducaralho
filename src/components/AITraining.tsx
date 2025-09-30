import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Bot,
  Smartphone,
  QrCode,
  RefreshCw,
  Instagram,
  Eye,
  EyeOff,
  Phone,
  Settings,
  ChevronRight,
  Wand2
} from 'lucide-react';
import { useAuthContext } from './AuthProvider';
import { supabase } from '../lib/supabase';
import { zapiService } from '../services/zapi.service';

interface WhatsAppAgent {
  id: string;
  display_name: string;
  phone_number: string | null;
  connection_status: string;
  agent_instance_id: string | null;
  agent_token: string | null;
  agent_phone_number: string | null;
  nomeagente: string | null;
  llm: string | null;
  ai_prompt: string;
  is_ai_active: boolean;
  created_at: string;
  updated_at: string;
}

interface InstagramAgent {
  id: string;
  user_id: string;
  organization_id: string;
  nomeagente: string;
  webhook_url: string;
  insta_prompt: string;
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
  const [instagramAgents, setInstagramAgents] = useState<InstagramAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'instagram'>('whatsapp');
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<WhatsAppAgent | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showNewAgentModal, setShowNewAgentModal] = useState(false);
  const [newAgentPlatform, setNewAgentPlatform] = useState<'whatsapp' | 'instagram'>('whatsapp');
  
  // Estados para criação de agente Instagram
  const [showNewInstagramAgentModal, setShowNewInstagramAgentModal] = useState(false);
  const [newInstagramAgentData, setNewInstagramAgentData] = useState({
    nomeagente: '',
    webhook_url: '',
    insta_prompt: 'Você é um assistente virtual prestativo para Instagram. Responda sempre de forma clara, objetiva e amigável. Ajude o cliente com suas dúvidas e necessidades da melhor forma possível.'
  });
  const [savingInstagramAgent, setSavingInstagramAgent] = useState(false);
  
  const [savingAgent, setSavingAgent] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [qrCodeImage, setQrCodeImage] = useState<string>('');
  const [showToken, setShowToken] = useState(false);
  const [currentStep, setCurrentStep] = useState<'credentials' | 'connecting' | 'connected'>('credentials');
  const [editingAgentData, setEditingAgentData] = useState<WhatsAppAgent | null>(null);
  const [editForm, setEditForm] = useState({
    nomeagente: '',
    phone_number: '',
    llm: 'gpt-4o',
    ai_prompt: 'Você é um assistente virtual prestativo e eficiente.',
    is_ai_active: true
  });
  const [savingEdit, setSavingEdit] = useState(false);
  
  // Estados para edição de agente Instagram
  const [showEditInstagramModal, setShowEditInstagramModal] = useState(false);
  const [editingInstagramAgent, setEditingInstagramAgent] = useState<InstagramAgent | null>(null);
  const [editInstagramAgentData, setEditInstagramAgentData] = useState({
    nomeagente: '',
    webhook_url: '',
    insta_prompt: ''
  });
  const [savingInstagramEdit, setSavingInstagramEdit] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [loadingInstagramAgents, setLoadingInstagramAgents] = useState(false);
  const [instagramError, setInstagramError] = useState<string | null>(null);

  // Form para novo agente - FLUXO Z-API PRIMEIRO
  const [agentForm, setAgentForm] = useState({
    nomeagente: '',
    phone_number: '',
    agent_instance_id: '',
    agent_token: '',
    agent_phone_number: '',
    llm: 'gpt-4o',
    ai_prompt: 'Você é um assistente virtual prestativo e eficiente.',
    is_ai_active: true,
    connection_status: 'DISCONNECTED'
  });

  // Lista completa de modelos de IA disponíveis
  const aiModels = [
    { id: 'gpt-5', name: 'GPT-5', description: 'Modelo mais avançado da OpenAI', color: 'from-purple-600 to-pink-600' },
    { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: 'Versão otimizada do GPT-5', color: 'from-cyan-500 to-blue-600' },
    { id: 'grok-4', name: 'Grok 4', description: 'IA da xAI com humor e personalidade', color: 'from-red-500 to-orange-600' },
    { id: 'claude-4-1-opus', name: 'Claude 4.1 Opus', description: 'Modelo premium da Anthropic', color: 'from-indigo-600 to-purple-700' },
    { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Equilibrio perfeito entre velocidade e qualidade', color: 'from-purple-500 to-violet-600' },
    { id: 'gpt-4o', name: 'GPT-4o', description: 'GPT-4 otimizado para conversas', color: 'from-green-500 to-emerald-600' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Versão mais rápida do GPT-4', color: 'from-blue-500 to-cyan-600' },
    { id: 'gemini-2-5-pro', name: 'Gemini 2.5 Pro', description: 'Modelo avançado do Google', color: 'from-blue-500 to-purple-600' },
    { id: 'gemini-2-0-pro', name: 'Gemini 2.0 Pro', description: 'IA multimodal do Google', color: 'from-orange-500 to-red-600' },
    { id: 'llama-3-3-70b', name: 'Llama 3.3 70B', description: 'Modelo open source da Meta', color: 'from-blue-600 to-indigo-700' },
    { id: 'mistral-large-2', name: 'Mistral Large 2', description: 'IA europeia de alta performance', color: 'from-orange-600 to-red-700' },
    { id: 'claude-3-opus', name: 'Claude 3 Opus', description: 'Modelo mais poderoso da Anthropic', color: 'from-violet-600 to-purple-700' },
    { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', description: 'Equilibrio ideal para uso geral', color: 'from-purple-400 to-pink-500' },
    { id: 'claude-3-haiku', name: 'Claude 3 Haiku', description: 'Modelo rápido e eficiente', color: 'from-teal-500 to-cyan-600' },
    { id: 'gpt-4', name: 'GPT-4', description: 'Modelo clássico da OpenAI', color: 'from-emerald-500 to-green-600' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Modelo econômico e rápido', color: 'from-blue-400 to-indigo-500' },
    { id: 'gemini-1-5-pro', name: 'Gemini 1.5 Pro', description: 'IA do Google com contexto longo', color: 'from-yellow-500 to-orange-600' },
    { id: 'gemini-1-0-pro', name: 'Gemini 1.0 Pro', description: 'Primeira versão do Gemini Pro', color: 'from-red-400 to-pink-500' },
    { id: 'llama-3-1-405b', name: 'Llama 3.1 405B', description: 'Maior modelo da Meta', color: 'from-indigo-500 to-purple-600' },
    { id: 'llama-3-1-70b', name: 'Llama 3.1 70B', description: 'Modelo balanceado da Meta', color: 'from-blue-500 to-indigo-600' },
    { id: 'llama-3-1-8b', name: 'Llama 3.1 8B', description: 'Modelo compacto da Meta', color: 'from-cyan-400 to-blue-500' },
    { id: 'mistral-large', name: 'Mistral Large', description: 'Modelo principal da Mistral', color: 'from-orange-500 to-red-600' },
    { id: 'mistral-medium', name: 'Mistral Medium', description: 'Equilibrio custo-benefício', color: 'from-yellow-500 to-orange-500' },
    { id: 'mistral-small', name: 'Mistral Small', description: 'Modelo econômico da Mistral', color: 'from-green-400 to-emerald-500' },
    { id: 'command-r-plus', name: 'Command R+', description: 'IA da Cohere para empresas', color: 'from-purple-500 to-indigo-600' },
    { id: 'command-r', name: 'Command R', description: 'Modelo padrão da Cohere', color: 'from-blue-400 to-purple-500' },
    { id: 'perplexity-sonar', name: 'Perplexity Sonar', description: 'IA com busca em tempo real', color: 'from-teal-500 to-blue-600' },
    { id: 'deepseek-v3', name: 'DeepSeek V3', description: 'IA chinesa de código aberto', color: 'from-red-500 to-pink-600' },
    { id: 'qwen-2-5-72b', name: 'Qwen 2.5 72B', description: 'Modelo da Alibaba Cloud', color: 'from-orange-400 to-yellow-500' },
    { id: 'yi-large', name: 'Yi Large', description: 'IA da 01.AI', color: 'from-green-500 to-teal-600' }
  ];

  // Carregar agentes existentes
  useEffect(() => {
    if (user?.id && profile?.organization_id) {
      loadAgents();
      loadInstagramAgents();
    }
  }, [user?.id, profile?.organization_id]);

  const loadAgents = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!profile?.organization_id) {
        throw new Error('Organização não encontrada');
      }

      console.log('🔍 Carregando agentes da organização:', profile.organization_id);

      const { data: agentsData, error: agentsError } = await supabase
        .from('whatsapp_numbers')
        .select('id, display_name, phone_number, connection_status, agent_instance_id, agent_token, agent_phone_number, nomeagente, llm, ai_prompt, is_ai_active, created_at, updated_at')
        .eq('organization_id', profile.organization_id)
        .not('agent_instance_id', 'is', null) // Apenas agentes com credenciais próprias
        .order('created_at', { ascending: false });

      if (agentsError) {
        console.error('❌ Erro ao carregar agentes:', agentsError);
        throw agentsError;
      }

      console.log('✅ Agentes carregados:', agentsData?.length || 0);
      setAgents(agentsData || []);

    } catch (err) {
      console.error('❌ Erro ao carregar agentes:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar agentes');
    } finally {
      setLoading(false);
    }
  };

  // Função para carregar agentes do Instagram
  const loadInstagramAgents = async () => {
    if (!profile?.organization_id) return;
    
    try {
      setLoadingInstagramAgents(true);
      setInstagramError(null);
      console.log('🔍 Carregando agentes do Instagram...');
      
      const { data: agents, error } = await supabase
        .from('IndInsta')
        .select('id, user_id, organization_id, webhook_url, nomeagente, insta_prompt, created_at, updated_at')
        .eq('user_id', user?.id)
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Erro ao carregar agentes do Instagram:', error);
        setInstagramError(error.message);
        return;
      }
      
      console.log('✅ Agentes do Instagram encontrados:', agents?.length || 0);
      setInstagramAgents(agents || []);
    } catch (err) {
      console.error('❌ Erro ao carregar agentes do Instagram:', err);
      setInstagramError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoadingInstagramAgents(false);
    }
  };

  // Função para abrir modal de novo agente
  const handleCreateNewAgent = (platform: 'whatsapp' | 'instagram') => {
    setNewAgentPlatform(platform);
    setShowNewAgentModal(true);
  };

  // Função para deletar agente Instagram
  const handleDeleteInstagramAgent = async (agentId: string) => {
    if (!window.confirm('Tem certeza que deseja deletar este agente Instagram?')) {
      return;
    }

    try {
      console.log('🗑️ Deletando agente Instagram:', agentId);
      
      const { error } = await supabase
        .from('IndInsta')
        .delete()
        .eq('id', agentId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('❌ Erro ao deletar agente Instagram:', error);
        throw error;
      }

      console.log('✅ Agente Instagram deletado com sucesso');
      setSuccess('Agente Instagram deletado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
      
      // Recarregar lista
      await loadInstagramAgents();
    } catch (err) {
      console.error('❌ Erro ao deletar agente Instagram:', err);
      setError(err instanceof Error ? err.message : 'Erro ao deletar agente Instagram');
    }
  };

  // Função para editar agente Instagram
  const handleEditInstagramAgent = (agent: any) => {
    setEditingAgent({
      ...agent,
      platform: 'instagram'
    });
    setShowEditModal(true);
  };

  // PASSO 1: Testar conexão com credenciais Z-API
  const testZAPIConnection = async (instanceId: string, token: string): Promise<boolean> => {
    try {
      setTestingConnection(true);
      console.log('🧪 Testando conexão Z-API:', { instanceId, token: token.substring(0, 8) + '...' });

      // Configurar credenciais temporariamente para teste
      const originalConfig = zapiService.getConfig();
      zapiService.setCredentials(instanceId, token);

      // Testar conexão
      const result = await zapiService.getConnectionStatus();
      
      // Restaurar configuração original
      if (originalConfig.instanceId && originalConfig.token) {
        zapiService.setCredentials(originalConfig.instanceId, originalConfig.token);
      } else {
        zapiService.clearCredentials();
      }

      if (result.success) {
        console.log('✅ Teste de conexão Z-API bem-sucedido');
        return true;
      } else {
        console.error('❌ Teste de conexão Z-API falhou:', result.error);
        setError(`Erro na conexão Z-API: ${result.error}`);
        return false;
      }
    } catch (err) {
      console.error('❌ Erro no teste de conexão:', err);
      setError(err instanceof Error ? err.message : 'Erro no teste de conexão');
      return false;
    } finally {
      setTestingConnection(false);
    }
  };

  // PASSO 2: Salvar agente no banco e gerar QR Code automaticamente
  const autoSaveAndConnect = async () => {
    if (!profile?.id || !profile?.organization_id) {
      setError('Perfil não encontrado');
      return;
    }

    if (!agentForm.nomeagente.trim() || !agentForm.phone_number.trim() || !agentForm.agent_instance_id.trim() || !agentForm.agent_token.trim()) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setSavingAgent(true);
      setError(null);
      setSuccess(null);

      console.log('💾 Salvando agente automaticamente...');

      // PASSO 2.1: Testar conexão Z-API
      const connectionOK = await testZAPIConnection(agentForm.agent_instance_id, agentForm.agent_token);
      if (!connectionOK) {
        return; // Erro já foi setado na função testZAPIConnection
      }

      // PASSO 2.2: Salvar no banco
      const agentData = {
        profile_id: profile.id,
        organization_id: profile.organization_id,
        display_name: agentForm.nomeagente.trim(),
        nomeagente: agentForm.nomeagente.trim(),
        phone_number: agentForm.phone_number.trim(),
        agent_instance_id: agentForm.agent_instance_id.trim(),
        agent_token: agentForm.agent_token.trim(),
        agent_phone_number: agentForm.phone_number.trim(),
        llm: agentForm.llm,
        ai_prompt: agentForm.ai_prompt.trim(),
        is_ai_active: agentForm.is_ai_active,
        connection_status: 'DISCONNECTED', // Ainda não conectou o WhatsApp
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: savedAgent, error: saveError } = await supabase
        .from('whatsapp_numbers')
        .insert(agentData)
        .select()
        .single();

      if (saveError) {
        console.error('❌ Erro ao salvar agente:', saveError);
        throw saveError;
      }

      console.log('✅ Agente salvo com sucesso:', savedAgent);

      // PASSO 2.3: Gerar QR Code automaticamente
      setCurrentStep('connecting');
      await generateQRCodeForAgent(savedAgent);

      // Recarregar lista de agentes
      await loadAgents();

    } catch (err) {
      console.error('❌ Erro no processo automático:', err);
      setError(err instanceof Error ? err.message : 'Erro no processo automático');
    } finally {
      setSavingAgent(false);
    }
  };

  // PASSO 3: Gerar QR Code para o agente
  const generateQRCodeForAgent = async (agent: WhatsAppAgent) => {
    try {
      setGeneratingQR(true);
      setError(null);

      if (!agent.agent_instance_id || !agent.agent_token) {
        throw new Error('Credenciais Z-API não encontradas no agente');
      }

      console.log('📱 Gerando QR Code para agente:', agent.nomeagente);

      // Configurar credenciais específicas do agente
      const originalConfig = zapiService.getConfig();
      zapiService.setCredentials(agent.agent_instance_id, agent.agent_token);

      // Gerar QR Code
      const qrResult = await zapiService.getQRCode();

      // Restaurar configuração original
      if (originalConfig.instanceId && originalConfig.token) {
        zapiService.setCredentials(originalConfig.instanceId, originalConfig.token);
      } else {
        zapiService.clearCredentials();
      }

      if (qrResult.success) {
        if (qrResult.data?.alreadyConnected) {
          console.log('✅ Agente já está conectado');
          
          // Atualizar status no banco
          await supabase
            .from('whatsapp_numbers')
            .update({
              connection_status: 'CONNECTED',
              updated_at: new Date().toISOString()
            })
            .eq('id', agent.id);

          setSuccess('Agente já está conectado!');
          setCurrentStep('connected');
          await loadAgents();
        } else if (qrResult.data?.qrCode) {
          console.log('✅ QR Code gerado com sucesso');
          setQrCodeImage(qrResult.data.qrCode);
          setShowQRModal(true);
          setCurrentStep('connecting');
        } else {
          throw new Error('QR Code não encontrado na resposta');
        }
      } else {
        throw new Error(qrResult.error || 'Falha ao gerar QR Code');
      }

    } catch (err) {
      console.error('❌ Erro ao gerar QR Code:', err);
      setError(err instanceof Error ? err.message : 'Erro ao gerar QR Code');
    } finally {
      setGeneratingQR(false);
    }
  };

  // Verificar conexão do agente
  const checkAgentConnection = async (agent: WhatsAppAgent) => {
    try {
      if (!agent.agent_instance_id || !agent.agent_token) {
        throw new Error('Credenciais Z-API não encontradas');
      }

      console.log('🔍 Verificando conexão do agente:', agent.nomeagente);

      // Configurar credenciais específicas do agente
      const originalConfig = zapiService.getConfig();
      zapiService.setCredentials(agent.agent_instance_id, agent.agent_token);

      // Verificar status
      const result = await zapiService.getConnectionStatus();

      // Restaurar configuração original
      if (originalConfig.instanceId && originalConfig.token) {
        zapiService.setCredentials(originalConfig.instanceId, originalConfig.token);
      } else {
        zapiService.clearCredentials();
      }

      if (result.success && result.data) {
        const isConnected = result.data.connected === true;
        const phoneNumber = result.data.phone || null;

        // Atualizar status no banco
        await supabase
          .from('whatsapp_numbers')
          .update({
            connection_status: isConnected ? 'CONNECTED' : 'DISCONNECTED',
            agent_phone_number: phoneNumber,
            phone_number: phoneNumber,
            updated_at: new Date().toISOString()
          })
          .eq('id', agent.id);

        if (isConnected) {
          setSuccess(`Agente ${agent.nomeagente} conectado! Número: ${phoneNumber || 'Detectando...'}`);
          setShowQRModal(false);
          setCurrentStep('connected');
        } else {
          setSuccess('Status verificado - agente não conectado ainda');
        }

        await loadAgents();
        return isConnected;
      } else {
        throw new Error(result.error || 'Falha ao verificar conexão');
      }

    } catch (err) {
      console.error('❌ Erro ao verificar conexão:', err);
      setError(err instanceof Error ? err.message : 'Erro ao verificar conexão');
      return false;
    }
  };

  // Detectar quando credenciais estão completas e salvar automaticamente
  const handleCredentialsChange = (field: 'agent_instance_id' | 'agent_token', value: string) => {
    const updatedForm = { ...agentForm, [field]: value };
    setAgentForm(updatedForm);

    // Se todos os campos obrigatórios estão preenchidos, salvar automaticamente
    if (updatedForm.nomeagente.trim() && 
        updatedForm.phone_number.trim() &&
        updatedForm.agent_instance_id.trim() && 
        updatedForm.agent_token.trim() &&
        !savingAgent) {
      
      console.log('🚀 Todos os campos preenchidos, iniciando processo automático...');
      setTimeout(() => {
        autoSaveAndConnect();
      }, 500); // Pequeno delay para melhor UX
    }
  };

  // Abrir modal para novo agente
  const openNewAgentModal = () => {
    setAgentForm({
      nomeagente: '',
      phone_number: '',
      agent_instance_id: '',
      agent_token: '',
      agent_phone_number: '',
      llm: 'gpt-4o',
      ai_prompt: 'Você é um assistente virtual prestativo e eficiente.',
      is_ai_active: true,
      connection_status: 'DISCONNECTED'
    });
    setEditingAgent(null);
    setCurrentStep('credentials');
    setShowAgentModal(true);
    setShowPromptEditor(false);
    setError(null);
    setSuccess(null);
  };

  // Fechar modal
  const closeModal = () => {
    setShowAgentModal(false);
    setShowQRModal(false);
    setShowEditModal(false);
    setEditingAgent(null);
    setEditingAgentData(null);
    setCurrentStep('credentials');
    setQrCodeImage('');
    setShowPromptEditor(false);
    setError(null);
    setSuccess(null);
  };

  // Abrir modal de edição
  const openEditModal = (agent: WhatsAppAgent) => {
    setEditingAgentData(agent);
    setEditForm({
      nomeagente: agent.nomeagente || agent.display_name,
      phone_number: agent.agent_phone_number || agent.phone_number || '',
      llm: agent.llm || 'gpt-4o',
      ai_prompt: agent.ai_prompt || 'Você é um assistente virtual prestativo e eficiente.',
      is_ai_active: agent.is_ai_active
    });
    setShowEditModal(true);
    setError(null);
    setSuccess(null);
  };

  // Salvar edições do agente
  const saveAgentEdit = async () => {
    if (!editingAgentData) return;

    try {
      setSavingEdit(true);
      setError(null);
      setSuccess(null);

      if (!editForm.nomeagente.trim() || !editForm.phone_number.trim()) {
        throw new Error('Nome do agente e número de telefone são obrigatórios');
      }

      console.log('💾 Salvando edições do agente:', editingAgentData.id);

      const { error: updateError } = await supabase
        .from('whatsapp_numbers')
        .update({
          nomeagente: editForm.nomeagente.trim(),
          display_name: editForm.nomeagente.trim(),
          phone_number: editForm.phone_number.trim(),
          agent_phone_number: editForm.phone_number.trim(),
          llm: editForm.llm,
          ai_prompt: editForm.ai_prompt.trim(),
          is_ai_active: editForm.is_ai_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingAgentData.id)
        .eq('organization_id', profile?.organization_id);

      if (updateError) {
        console.error('❌ Erro ao atualizar agente:', updateError);
        throw updateError;
      }

      console.log('✅ Agente atualizado com sucesso');
      setSuccess('Agente atualizado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
      
      setShowEditModal(false);
      await loadAgents();

    } catch (err) {
      console.error('❌ Erro ao salvar edições:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar edições');
    } finally {
      setSavingEdit(false);
    }
  };

  // Deletar agente
  const deleteAgent = async (agentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este agente? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('whatsapp_numbers')
        .delete()
        .eq('id', agentId)
        .eq('organization_id', profile?.organization_id);

      if (deleteError) {
        throw deleteError;
      }

      setSuccess('Agente excluído com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
      await loadAgents();

    } catch (err) {
      console.error('❌ Erro ao excluir agente:', err);
      setError(err instanceof Error ? err.message : 'Erro ao excluir agente');
    }
  };

  // Função para criar novo agente Instagram
  const createInstagramAgent = async () => {
    if (!profile?.id || !profile?.organization_id) {
      setError('Perfil não encontrado');
      return;
    }

    if (!newInstagramAgentData.nomeagente.trim() || !newInstagramAgentData.webhook_url.trim()) {
      setError('Nome do agente e URL do webhook são obrigatórios');
      return;
    }

    try {
      setSavingInstagramAgent(true);
      setError(null);
      setSuccess(null);

      console.log('💾 Criando agente do Instagram...');

      const agentData = {
        user_id: user?.id,
        organization_id: profile.organization_id,
        nomeagente: newInstagramAgentData.nomeagente.trim(),
        webhook_url: newInstagramAgentData.webhook_url.trim(),
        insta_prompt: newInstagramAgentData.insta_prompt.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: savedAgent, error: saveError } = await supabase
        .from('IndInsta')
        .insert(agentData)
        .select()
        .single();

      if (saveError) {
        console.error('❌ Erro ao criar agente do Instagram:', saveError);
        throw saveError;
      }

      console.log('✅ Agente do Instagram criado com sucesso:', savedAgent);
      setSuccess('Agente do Instagram criado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);

      // Limpar formulário e fechar modal
      setNewInstagramAgentData({
        nomeagente: '',
        webhook_url: '',
        insta_prompt: 'Você é um assistente virtual prestativo para Instagram. Responda sempre de forma clara, objetiva e amigável. Ajude o cliente com suas dúvidas e necessidades da melhor forma possível.'
      });
      setShowNewInstagramAgentModal(false);

      // Recarregar lista de agentes
      await loadInstagramAgents();

    } catch (err) {
      console.error('❌ Erro ao criar agente do Instagram:', err);
      setError(err instanceof Error ? err.message : 'Erro ao criar agente do Instagram');
    } finally {
      setSavingInstagramAgent(false);
    }
  };

  // Função para salvar edições do agente Instagram
  const saveInstagramAgentEdit = async () => {
    if (!editingInstagramAgent) return;

    try {
      setSavingInstagramEdit(true);
      setError(null);
      setSuccess(null);

      if (!editInstagramAgentData.nomeagente.trim() || !editInstagramAgentData.webhook_url.trim()) {
        throw new Error('Nome do agente e URL do webhook são obrigatórios');
      }

      console.log('💾 Salvando edições do agente Instagram:', editingInstagramAgent.id);

      const { error: updateError } = await supabase
        .from('IndInsta')
        .update({
          nomeagente: editInstagramAgentData.nomeagente.trim(),
          webhook_url: editInstagramAgentData.webhook_url.trim(),
          insta_prompt: editInstagramAgentData.insta_prompt.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', editingInstagramAgent.id)
        .eq('organization_id', profile?.organization_id);

      if (updateError) {
        console.error('❌ Erro ao atualizar agente Instagram:', updateError);
        throw updateError;
      }

      console.log('✅ Agente Instagram atualizado com sucesso');
      setSuccess('Agente Instagram atualizado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
      
      setShowEditInstagramModal(false);
      await loadInstagramAgents();

    } catch (err) {
      console.error('❌ Erro ao salvar edições do Instagram:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar edições');
    } finally {
      setSavingInstagramEdit(false);
    }
  };

  // Função para obter o nome do modelo de IA
  const getAIModelName = (modelId: string | null): string => {
    if (!modelId) return 'GPT-4o';
    const model = aiModels.find(m => m.id === modelId);
    return model?.name || modelId;
  };

  // Função para obter cor do modelo
  const getAIModelColor = (modelId: string | null): string => {
    if (!modelId) return 'bg-blue-500';
    const model = aiModels.find(m => m.id === modelId);
    return model ? `bg-gradient-to-r ${model.color}` : 'bg-blue-500';
  };

  // Função para obter descrição do modelo
  const getAIModelDescription = (modelId: string | null): string => {
    if (!modelId) return 'Modelo padrão';
    const model = aiModels.find(m => m.id === modelId);
    return model?.description || 'Modelo de IA';
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Brain className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agentes de IA</h1>
            <p className="text-gray-600 dark:text-gray-400">Gerencie seus assistentes virtuais do WhatsApp</p>
          </div>
        </div>
        <button
          onClick={openNewAgentModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Agente
        </button>
      </div>

      {/* Instagram Tab Content */}
      {activeTab === 'instagram' && (
        <div className="space-y-6">
          {/* Header com botão criar */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Agentes Instagram</h2>
              <p className="text-gray-600 dark:text-gray-400">Gerencie seus agentes de IA para Instagram</p>
            </div>
            <button
              onClick={() => handleCreateNewAgent('instagram')}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Criar Novo Agente Instagram</span>
            </button>
          </div>

          {/* Loading state */}
          {loadingInstagramAgents ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Carregando agentes Instagram...</span>
            </div>
          ) : instagramError ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <p className="text-red-700 dark:text-red-300">{instagramError}</p>
              </div>
            </div>
          ) : instagramAgents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {instagramAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                        <Instagram className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                          {agent.nomeagente || 'Agente Instagram'}
                        </h3>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                            Instagram
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => {
                          setEditingAgent(agent);
                          setShowEditModal(true);
                        }}
                        className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                        title="Editar agente"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteInstagramAgent(agent.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Deletar agente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Webhook URL */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-100 dark:border-purple-800">
                      <div className="flex items-center space-x-2 mb-1">
                        <ExternalLink className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-xs font-medium text-purple-800 dark:text-purple-300">Webhook URL</span>
                      </div>
                      <p className="text-sm font-mono text-gray-900 dark:text-white truncate">
                        {agent.webhook_url || 'Não configurado'}
                      </p>
                    </div>
                    
                    {/* Prompt Preview */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-100 dark:border-purple-800">
                      <div className="flex items-center space-x-2 mb-1">
                        <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-xs font-medium text-purple-800 dark:text-purple-300">Prompt da IA</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                        {agent.insta_prompt || 'Prompt não configurado'}
                      </p>
                    </div>
                    
                    {/* Data de criação */}
                    <div className="text-xs text-purple-600 dark:text-purple-400 text-center">
                      Criado em {new Date(agent.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Instagram className="w-16 h-16 text-purple-300 dark:text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                Nenhum agente Instagram criado
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Crie seu primeiro agente de IA para Instagram e comece a automatizar o atendimento
              </p>
              <button
                onClick={() => setShowNewAgentModal(true)}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors mx-auto"
              >
                <Plus className="w-5 h-5" />
                <span>Criar Primeiro Agente Instagram</span>
              </button>
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'instagram' && (
        <button 
          onClick={() => setShowNewAgentModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Criar Novo Agente Instagram</span>
        </button>
      )}

      {/* Mensagens de feedback */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-300">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Lista de agentes */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Carregando agentes...</span>
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12">
          <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhum agente encontrado</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Crie seu primeiro agente de IA para começar</p>
          <button
            onClick={openNewAgentModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Criar Agente
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <div key={agent.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    agent.connection_status === 'CONNECTED' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <Bot className={`w-5 h-5 ${
                      agent.connection_status === 'CONNECTED' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{agent.nomeagente || agent.display_name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Phone className="w-3 h-3" />
                      {agent.agent_phone_number || agent.phone_number || 'Não conectado'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(agent)}
                    className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Editar agente"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteAgent(agent.id)}
                    className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Excluir agente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    agent.connection_status === 'CONNECTED' 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                      : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                  }`}>
                    {agent.connection_status === 'CONNECTED' ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">IA Ativa:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    agent.is_ai_active 
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                  }`}>
                    {agent.is_ai_active ? 'Sim' : 'Não'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Modelo:</span>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getAIModelColor(agent.llm)}`}></div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{getAIModelName(agent.llm)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                <button
                  onClick={() => checkAgentConnection(agent)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Verificar
                </button>
                <button
                  onClick={() => generateQRCodeForAgent(agent)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                >
                  <QrCode className="w-4 h-4" />
                  QR Code
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para novo agente */}
      {showAgentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Novo Agente de IA</h2>
                <button
                  onClick={closeModal}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Indicador de progresso */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${
                    currentStep === 'credentials' ? 'text-blue-600' : 'text-green-600'
                  }`}>
                    1. Configuração
                  </span>
                  <span className={`text-sm font-medium ${
                    currentStep === 'connecting' ? 'text-blue-600' : 
                    currentStep === 'connected' ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    2. Conexão
                  </span>
                  <span className={`text-sm font-medium ${
                    currentStep === 'connected' ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    3. Concluído
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: currentStep === 'credentials' ? '33%' : 
                             currentStep === 'connecting' ? '66%' : '100%' 
                    }}
                  />
                </div>
              </div>

              {currentStep === 'credentials' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nome do Agente *
                    </label>
                    <input
                      type="text"
                      value={agentForm.nomeagente}
                      onChange={(e) => setAgentForm({ ...agentForm, nomeagente: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Ex: Atendimento Vendas"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Número do WhatsApp *
                    </label>
                    <input
                      type="text"
                      value={agentForm.phone_number}
                      onChange={(e) => setAgentForm({ ...agentForm, phone_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="5535987079368 (apenas números, com código do país)"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Digite apenas números, incluindo código do país (ex: 5535987079368)
                    </p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Credenciais Z-API</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      Insira suas credenciais da Z-API para conectar este agente ao WhatsApp.
                    </p>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                          Instance ID *
                        </label>
                        <input
                          type="text"
                          value={agentForm.agent_instance_id}
                          onChange={(e) => handleCredentialsChange('agent_instance_id', e.target.value)}
                          className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Seu Instance ID da Z-API"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                          Token *
                        </label>
                        <div className="relative">
                          <input
                            type={showToken ? "text" : "password"}
                            value={agentForm.agent_token}
                            onChange={(e) => handleCredentialsChange('agent_token', e.target.value)}
                            className="w-full px-3 py-2 pr-10 border border-blue-300 dark:border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Seu Token da Z-API"
                          />
                          <button
                            type="button"
                            onClick={() => setShowToken(!showToken)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Modelo de IA
                    </label>
                    <select
                      value={agentForm.llm}
                      onChange={(e) => setAgentForm({ ...agentForm, llm: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {aiModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} - {model.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Prompt do Sistema
                      </label>
                      <button
                        onClick={() => setShowPromptEditor(!showPromptEditor)}
                        className="flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        <Wand2 className="w-4 h-4" />
                        <span>{showPromptEditor ? 'Editor Simples' : 'Editor Avançado'}</span>
                      </button>
                    </div>
                    {showPromptEditor ? (
                      <div className="space-y-3">
                        <textarea
                          value={agentForm.ai_prompt}
                          onChange={(e) => setAgentForm({ ...agentForm, ai_prompt: e.target.value })}
                          rows={8}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                          placeholder="Descreva como o agente deve se comportar..."
                        />
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                          <h5 className="font-medium text-gray-900 dark:text-white mb-2">💡 Dicas para um bom prompt:</h5>
                          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <li>• Defina a personalidade do agente</li>
                            <li>• Especifique o tom de comunicação</li>
                            <li>• Inclua informações sobre sua empresa</li>
                            <li>• Defina quando escalar para humano</li>
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <textarea
                        value={agentForm.ai_prompt}
                        onChange={(e) => setAgentForm({ ...agentForm, ai_prompt: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Descreva como o agente deve se comportar..."
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_ai_active"
                      checked={agentForm.is_ai_active}
                      onChange={(e) => setAgentForm({ ...agentForm, is_ai_active: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="is_ai_active" className="text-sm text-gray-700 dark:text-gray-300">
                      Ativar IA automaticamente
                    </label>
                  </div>

                  {/* Botão de Avançar */}
                  <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={closeModal}
                      className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={autoSaveAndConnect}
                      disabled={savingAgent || testingConnection || !agentForm.nomeagente.trim() || !agentForm.phone_number.trim() || !agentForm.agent_instance_id.trim() || !agentForm.agent_token.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {(savingAgent || testingConnection) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <span>
                        {savingAgent ? 'Salvando...' : testingConnection ? 'Testando...' : 'Salvar e Conectar'}
                      </span>
                    </button>
                  </div>

                  {(savingAgent || testingConnection) && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                      <span className="text-blue-600 dark:text-blue-400">
                        {testingConnection ? 'Testando conexão...' : 'Salvando agente...'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 'connecting' && (
                <div className="text-center py-8">
                  <Smartphone className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Conectando ao WhatsApp</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Agente salvo com sucesso! Aguarde a geração do QR Code...
                  </p>
                  {generatingQR && (
                    <div className="flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                      <span className="text-blue-600 dark:text-blue-400">Gerando QR Code...</span>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 'connected' && (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Agente Conectado!</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Seu agente foi configurado e conectado com sucesso.
                  </p>
                  <button
                    onClick={closeModal}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Concluir
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Novo Agente Instagram */}
      {showNewInstagramAgentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <Instagram className="w-6 h-6 text-purple-500" />
                <span>Novo Agente Instagram</span>
              </h3>
              <button
                onClick={() => setShowNewInstagramAgentModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Nome do Agente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome do Agente *
                </label>
                <input
                  type="text"
                  value={newInstagramAgentData.nomeagente}
                  onChange={(e) => setNewInstagramAgentData(prev => ({ ...prev, nomeagente: e.target.value }))}
                  placeholder="Ex: Atendente Instagram"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              {/* URL do Webhook */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL do Webhook *
                </label>
                <input
                  type="url"
                  value={newInstagramAgentData.webhook_url}
                  onChange={(e) => setNewInstagramAgentData(prev => ({ ...prev, webhook_url: e.target.value }))}
                  placeholder="https://seu-servidor.com/webhook/instagram"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  URL onde o Instagram enviará as mensagens recebidas
                </p>
              </div>

              {/* Prompt da IA */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Prompt da IA
                </label>
                <textarea
                  value={newInstagramAgentData.insta_prompt}
                  onChange={(e) => setNewInstagramAgentData(prev => ({ ...prev, insta_prompt: e.target.value }))}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 font-mono"
                  placeholder="Você é um assistente virtual prestativo para Instagram. Responda sempre de forma clara, objetiva e amigável..."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Instruções que definem como a IA deve se comportar no Instagram
                </p>
              </div>
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowNewInstagramAgentModal(false)}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={createInstagramAgent}
                disabled={savingInstagramAgent || !newInstagramAgentData.nomeagente.trim() || !newInstagramAgentData.webhook_url.trim()}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingInstagramAgent ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Instagram className="w-5 h-5" />
                )}
                <span>{savingInstagramAgent ? 'Criando...' : 'Criar Agente Instagram'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição Instagram */}
      {showEditInstagramModal && editingInstagramAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <Instagram className="w-6 h-6 text-purple-500" />
                <span>Editar Agente Instagram</span>
              </h3>
              <button
                onClick={() => setShowEditInstagramModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Nome do Agente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome do Agente *
                </label>
                <input
                  type="text"
                  value={editInstagramAgentData.nomeagente}
                  onChange={(e) => setEditInstagramAgentData(prev => ({ ...prev, nomeagente: e.target.value }))}
                  placeholder="Ex: Atendente Instagram"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              {/* URL do Webhook */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL do Webhook *
                </label>
                <input
                  type="url"
                  value={editInstagramAgentData.webhook_url}
                  onChange={(e) => setEditInstagramAgentData(prev => ({ ...prev, webhook_url: e.target.value }))}
                  placeholder="https://seu-servidor.com/webhook/instagram"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              {/* Prompt da IA */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Prompt da IA
                </label>
                <textarea
                  value={editInstagramAgentData.insta_prompt}
                  onChange={(e) => setEditInstagramAgentData(prev => ({ ...prev, insta_prompt: e.target.value }))}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowEditInstagramModal(false)}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveInstagramAgentEdit}
                disabled={savingInstagramEdit || !editInstagramAgentData.nomeagente.trim() || !editInstagramAgentData.webhook_url.trim()}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingInstagramEdit ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Instagram className="w-5 h-5" />
                )}
                <span>{savingInstagramEdit ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal do QR Code */}
      {showQRModal && qrCodeImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Conectar WhatsApp</h2>
                <button
                  onClick={closeModal}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 text-center">
              <div className="mb-4">
                <img 
                  src={qrCodeImage} 
                  alt="QR Code WhatsApp" 
                  className="mx-auto max-w-full h-auto border border-gray-200 dark:border-gray-600 rounded-lg"
                />
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Escaneie o QR Code
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Abra o WhatsApp no seu celular e escaneie este código para conectar o agente.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => generateQRCodeForAgent(agents[0])}
                  disabled={generatingQR}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {generatingQR ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Atualizar
                </button>
                <button
                  onClick={() => checkAgentConnection(agents[0])}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Verificar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edição */}
      {showEditModal && editingAgentData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Editar Agente</h2>
                <button
                  onClick={closeModal}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nome do Agente *
                  </label>
                  <input
                    type="text"
                    value={editForm.nomeagente}
                    onChange={(e) => setEditForm({ ...editForm, nomeagente: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Ex: Atendimento Vendas"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Número do WhatsApp *
                  </label>
                  <input
                    type="text"
                    value={editForm.phone_number}
                    onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="5535987079368 (apenas números, com código do país)"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Digite apenas números, incluindo código do país
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Modelo de IA
                  </label>
                  <select
                    value={editForm.llm}
                    onChange={(e) => setEditForm({ ...editForm, llm: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {aiModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} - {model.description}
                      </option>
                    ))}
                  </select>
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className={`w-4 h-4 rounded-full ${getAIModelColor(editForm.llm)}`}></div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {getAIModelName(editForm.llm)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {getAIModelDescription(editForm.llm)}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Prompt do Sistema
                    </label>
                    <button
                      onClick={() => setShowPromptEditor(!showPromptEditor)}
                      className="flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      <Wand2 className="w-4 h-4" />
                      <span>{showPromptEditor ? 'Editor Simples' : 'Editor Avançado'}</span>
                    </button>
                  </div>
                  {showPromptEditor ? (
                    <div className="space-y-3">
                      <textarea
                        value={editForm.ai_prompt}
                        onChange={(e) => setEditForm({ ...editForm, ai_prompt: e.target.value })}
                        rows={8}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                        placeholder="Descreva como o agente deve se comportar..."
                      />
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <h5 className="font-medium text-gray-900 dark:text-white mb-2">💡 Dicas para um bom prompt:</h5>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <li>• Defina a personalidade do agente</li>
                          <li>• Especifique o tom de comunicação</li>
                          <li>• Inclua informações sobre sua empresa</li>
                          <li>• Defina quando escalar para humano</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <textarea
                      value={editForm.ai_prompt}
                      onChange={(e) => setEditForm({ ...editForm, ai_prompt: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Descreva como o agente deve se comportar..."
                    />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit_is_ai_active"
                    checked={editForm.is_ai_active}
                    onChange={(e) => setEditForm({ ...editForm, is_ai_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="edit_is_ai_active" className="text-sm text-gray-700 dark:text-gray-300">
                    Ativar IA automaticamente
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveAgentEdit}
                  disabled={savingEdit}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {savingEdit ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar
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