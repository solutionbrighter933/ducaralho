import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Globe,
  Calendar,
  Palette, 
  Database,
  Save,
  Brain,
  Zap,
  Star,
  CheckCircle,
  Clock,
  Users,
  MessageSquare,
  Sun,
  Moon,
  Monitor,
  Loader2,
  Smartphone
} from 'lucide-react';
import { settingsService } from '../services/settingsService';
import GoogleCalendarIntegration from './GoogleCalendarIntegration';
import ZAPIIntegrationSettings from './ZAPIIntegrationSettings';
import PrivacyPolicy from './PrivacyPolicy';
import TermsOfService from './TermsOfService';

interface SettingsProps {
  theme?: 'light' | 'dark' | 'auto';
  setTheme?: (theme: 'light' | 'dark' | 'auto') => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

// Default settings to prevent loading issues
const defaultGeneralSettings = {
  company_name: 'Minha Empresa SaaS',
  timezone: 'America/Sao_Paulo',
  language: 'pt-BR'
};

const defaultNotificationSettings = {
  new_messages: true,
  system_alerts: true,
  weekly_reports: false,
  email_notifications: true
};

const defaultSecuritySettings = {
  two_factor_enabled: false,
  session_timeout: 30,
  password_requirements: {
    min_length: 8,
    require_uppercase: true,
    require_numbers: true,
    require_symbols: true
  }
};

const Settings: React.FC<SettingsProps> = ({ theme = 'auto', setTheme, activeTab = 'general', setActiveTab }) => {
  const [selectedAIModel, setSelectedAIModel] = useState('gpt-4o');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados para cada aba de configurações com valores padrão
  const [generalSettings, setGeneralSettings] = useState(defaultGeneralSettings);
  const [notificationSettings, setNotificationSettings] = useState(defaultNotificationSettings);
  const [securitySettings, setSecuritySettings] = useState(defaultSecuritySettings);

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  // Carregar configurações ao montar o componente
  useEffect(() => {
    loadSettings();
  }, []);

  // Atualizar aba ativa quando receber prop
  useEffect(() => {
    if (activeTab && setActiveTab) {
      setActiveTab(activeTab);
    }
  }, [activeTab, setActiveTab]);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📋 Loading settings...');
      
      // Load settings from service with fallbacks
      const [general, aiModels, notifications, security, appearance] = await Promise.all([
        settingsService.getGeneralSettings().catch(() => defaultGeneralSettings),
        settingsService.getAIModelSettings().catch(() => ({ selected_model: 'gpt-4o', model_config: {} })),
        settingsService.getNotificationSettings().catch(() => defaultNotificationSettings),
        settingsService.getSecuritySettings().catch(() => defaultSecuritySettings),
        settingsService.getAppearanceSettings().catch(() => ({ theme: 'auto', language: 'pt-BR', compact_mode: false }))
      ]);

      setGeneralSettings(general);
      setSelectedAIModel(aiModels.selected_model);
      setNotificationSettings(notifications);
      setSecuritySettings(security);
      
      if (setTheme) {
        setTheme(appearance.theme);
      }
      
      console.log('✅ Settings loaded successfully');
    } catch (error) {
      console.error('❌ Error loading settings:', error);
      // Use defaults if loading fails
      setGeneralSettings(defaultGeneralSettings);
      setNotificationSettings(defaultNotificationSettings);
      setSecuritySettings(defaultSecuritySettings);
      setSelectedAIModel('gpt-4o');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Save settings based on active tab
      switch (activeTab) {
        case 'general':
          await settingsService.saveGeneralSettings(generalSettings);
          break;
        
        case 'ai-models':
          await settingsService.saveAIModelSettings({
            selected_model: selectedAIModel,
            model_config: {}
          });
          break;
        
        case 'notifications':
          await settingsService.saveNotificationSettings(notificationSettings);
          break;
        
        case 'security':
          await settingsService.saveSecuritySettings(securitySettings);
          
          // If there's a password change, process it separately
          if (passwordForm.current_password && passwordForm.new_password) {
            if (passwordForm.new_password !== passwordForm.confirm_password) {
              throw new Error('As senhas não coincidem');
            }
            await settingsService.updatePassword(passwordForm.current_password, passwordForm.new_password);
            setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
          }
          break;
        
        case 'appearance':
          await settingsService.saveAppearanceSettings({
            theme: theme || 'auto',
            language: generalSettings.language,
            compact_mode: false
          });
          break;
      }

      setSuccess('Configurações salvas com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      setError(error instanceof Error ? error.message : 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'Geral', icon: SettingsIcon },
    { id: 'ai-models', label: 'Modelos de IA', icon: Brain },
    { id: 'zapi-integration', label: 'Integração Z-API', icon: Smartphone },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'security', label: 'Segurança', icon: Shield },
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'google-calendar', label: 'Google Calendar', icon: Calendar },
    { id: 'privacy-policy', label: 'Política de Privacidade', icon: Shield },
    { id: 'terms-of-service', label: 'Termos de Serviço', icon: Globe },
  ];

  const gpt5Models = [
    {
      id: 'gpt-5',
      name: 'GPT-5',
      provider: 'OpenAI',
      description: 'O modelo mais avançado da OpenAI com capacidades revolucionárias. Raciocínio superior, compreensão contextual profunda e habilidades multimodais de última geração.',
      strengths: ['Raciocínio avançado', 'Compreensão contextual superior', 'Multimodal avançado', 'Criatividade aprimorada'],
      bestFor: 'Casos complexos que exigem máxima inteligência',
      speed: 'Moderado',
      cost: 'Muito Alto',
      accuracy: 99,
      recommended: true,
      icon: '🚀',
      color: 'from-purple-600 to-pink-600'
    },
    {
      id: 'gpt-5-mini',
      name: 'GPT-5 Mini',
      provider: 'OpenAI',
      description: 'Versão otimizada do GPT-5 para velocidade máxima. Mantém alta qualidade com resposta ultra-rápida, ideal para atendimento em tempo real.',
      strengths: ['Velocidade extrema', 'Eficiência energética', 'Custo otimizado', 'Baixa latência'],
      bestFor: 'Atendimento em tempo real e alto volume',
      speed: 'Ultra Rápido',
      cost: 'Médio',
      accuracy: 96,
      recommended: false,
      icon: '⚡',
      color: 'from-cyan-500 to-blue-600'
    }
  ];

  const aiModels = [
    {
      id: 'grok-4',
      name: 'Grok 4',
      provider: 'xAI',
      description: 'Modelo revolucionário da xAI com humor e personalidade únicos. Excelente para conversas envolventes e respostas criativas com um toque de irreverência.',
      strengths: ['Humor inteligente', 'Personalidade marcante', 'Respostas criativas', 'Contexto atual'],
      bestFor: 'Atendimento descontraído e engajamento criativo',
      speed: 'Muito Rápido',
      cost: 'Alto',
      accuracy: 94,
      recommended: false,
      icon: '🚀',
      color: 'from-red-500 to-orange-600'
    },
    {
      id: 'gemini-2-5-pro',
      name: 'Gemini 2.5 Pro',
      provider: 'Google',
      description: 'Versão mais avançada do Gemini com capacidades multimodais superiores e integração nativa com serviços Google. Ideal para análise complexa e processamento de múltiplos tipos de mídia.',
      strengths: ['Multimodal avançado', 'Integração Google nativa', 'Análise de documentos', 'Processamento de imagens'],
      bestFor: 'Empresas Google Workspace e análise multimodal',
      speed: 'Rápido',
      cost: 'Médio',
      accuracy: 97,
      recommended: false,
      icon: '🌟',
      color: 'from-blue-500 to-purple-600'
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'OpenAI',
      description: 'Modelo mais avançado da OpenAI com capacidades multimodais. Excelente para conversas complexas, análise de contexto e raciocínio avançado.',
      strengths: ['Raciocínio complexo', 'Análise de contexto', 'Conversas naturais', 'Multimodal'],
      bestFor: 'Atendimento premium e consultas complexas',
      speed: 'Rápido',
      cost: 'Alto',
      accuracy: 98,
      recommended: true,
      icon: '🧠',
      color: 'from-green-500 to-emerald-600'
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: 'OpenAI',
      description: 'Versão otimizada do GPT-4 com melhor velocidade e custo-benefício. Ideal para a maioria dos casos de uso de atendimento ao cliente.',
      strengths: ['Velocidade otimizada', 'Custo-benefício', 'Respostas precisas', 'Contexto extenso'],
      bestFor: 'Atendimento geral e suporte técnico',
      speed: 'Muito Rápido',
      cost: 'Médio',
      accuracy: 95,
      recommended: false,
      icon: '⚡',
      color: 'from-blue-500 to-cyan-600'
    },
    {
      id: 'claude-3-sonnet',
      name: 'Claude 3.5 Sonnet',
      provider: 'Anthropic',
      description: 'Modelo da Anthropic focado em segurança e precisão. Excelente para análise detalhada e respostas bem estruturadas.',
      strengths: ['Segurança avançada', 'Análise detalhada', 'Respostas estruturadas', 'Ética aprimorada'],
      bestFor: 'Setores regulamentados e análise de documentos',
      speed: 'Rápido',
      cost: 'Alto',
      accuracy: 96,
      recommended: false,
      icon: '🛡️',
      color: 'from-purple-500 to-violet-600'
    },
    {
      id: 'gemini-pro',
      name: 'Gemini 2.0 Pro',
      provider: 'Google',
      description: 'Modelo do Google com excelente integração com serviços Google e capacidades multimodais avançadas.',
      strengths: ['Integração Google', 'Multimodal avançado', 'Velocidade alta', 'Custo competitivo'],
      bestFor: 'Empresas que usam Google Workspace',
      speed: 'Muito Rápido',
      cost: 'Baixo',
      accuracy: 93,
      recommended: false,
      icon: '🌟',
      color: 'from-orange-500 to-red-600'
    }
  ];

  // Combinar todos os modelos
  const allModels = [...gpt5Models, ...aiModels];

  const themeOptions = [
    {
      id: 'light',
      name: 'Claro',
      description: 'Interface clara, ideal para uso durante o dia',
      icon: Sun,
      preview: 'bg-white border-gray-200'
    },
    {
      id: 'dark',
      name: 'Escuro',
      description: 'Interface escura, reduz o cansaço visual',
      icon: Moon,
      preview: 'bg-gray-800 border-gray-600'
    },
    {
      id: 'auto',
      name: 'Auto',
      description: 'Alterna automaticamente baseado no horário do sistema',
      icon: Monitor,
      preview: 'bg-gradient-to-r from-white to-gray-100 border-gray-300'
    }
  ];

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
    if (setTheme) {
      setTheme(newTheme);
    }
  };

  const handleTabChange = (tabId: string) => {
    if (setActiveTab) {
      setActiveTab(tabId);
    }
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Configurações Gerais</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nome da Empresa
            </label>
            <input
              type="text"
              value={generalSettings.company_name}
              onChange={(e) => setGeneralSettings(prev => ({ ...prev, company_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fuso Horário
            </label>
            <select 
              value={generalSettings.timezone}
              onChange={(e) => setGeneralSettings(prev => ({ ...prev, timezone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="America/Sao_Paulo">America/Sao_Paulo</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/London">Europe/London</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Idioma
            </label>
            <select 
              value={generalSettings.language}
              onChange={(e) => setGeneralSettings(prev => ({ ...prev, language: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="pt-BR">Português (BR)</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAIModelsSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Modelos de Inteligência Artificial</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Escolha o modelo de IA que melhor se adapta às suas necessidades de atendimento. 
          Cada modelo tem características específicas de velocidade, precisão e custo.
        </p>
        
        <div className="space-y-4">
          {allModels.map((model) => (
            <div
              key={model.id}
              className={`relative border-2 rounded-xl p-6 cursor-pointer transition-all duration-200 ${
                selectedAIModel === model.id
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
              }`}
              onClick={() => setSelectedAIModel(model.id)}
            >
              {model.recommended && (
                <div className="absolute -top-2 -right-2">
                  <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center space-x-1">
                    <Star className="w-3 h-3" />
                    <span>Recomendado</span>
                  </div>
                </div>
              )}
              
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 bg-gradient-to-r ${model.color} rounded-lg flex items-center justify-center text-white text-xl`}>
                  {model.icon}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{model.name}</h4>
                    <span className="text-sm text-gray-500 dark:text-gray-400">por {model.provider}</span>
                    {selectedAIModel === model.id && (
                      <CheckCircle className="w-5 h-5 text-indigo-600" />
                    )}
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{model.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Velocidade: <strong>{model.speed}</strong></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Database className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Custo: <strong>{model.cost}</strong></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Brain className="w-4 h-4 text-purple-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Precisão: <strong>{model.accuracy}%</strong></span>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Melhor para:</p>
                    <p className="text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 rounded-full inline-block">
                      {model.bestFor}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pontos fortes:</p>
                    <div className="flex flex-wrap gap-2">
                      {model.strengths.map((strength, index) => (
                        <span
                          key={index}
                          className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full"
                        >
                          {strength}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Preferências de Notificação</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Novas Mensagens</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Receber notificações de novas conversas</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={notificationSettings.new_messages}
                onChange={(e) => setNotificationSettings(prev => ({ ...prev, new_messages: e.target.checked }))}
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Alertas de Sistema</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Notificações sobre status do sistema</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={notificationSettings.system_alerts}
                onChange={(e) => setNotificationSettings(prev => ({ ...prev, system_alerts: e.target.checked }))}
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Relatórios Semanais</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Resumo semanal de atividades</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={notificationSettings.weekly_reports}
                onChange={(e) => setNotificationSettings(prev => ({ ...prev, weekly_reports: e.target.checked }))}
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Notificações por Email</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Receber notificações importantes por email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={notificationSettings.email_notifications}
                onChange={(e) => setNotificationSettings(prev => ({ ...prev, email_notifications: e.target.checked }))}
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Configurações de Segurança</h3>
        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h4 className="font-medium text-green-800 dark:text-green-300">Autenticação de Dois Fatores</h4>
            </div>
            <p className="text-sm text-green-700 dark:text-green-400 mt-1">
              {securitySettings.two_factor_enabled ? 'Ativada' : 'Desativada'}
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Alterar Senha</h4>
            <div className="space-y-3">
              <input
                type="password"
                placeholder="Senha atual"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input
                type="password"
                placeholder="Nova senha"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input
                type="password"
                placeholder="Confirmar nova senha"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Sessões Ativas</h4>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Chrome - Windows</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">São Paulo, Brasil - Atual</p>
                </div>
                <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">Ativa</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Aparência</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Tema da Interface
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <div
                    key={option.id}
                    className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                      theme === option.id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                    }`}
                    onClick={() => handleThemeChange(option.id as 'light' | 'dark' | 'auto')}
                  >
                    <div className={`w-full h-16 ${option.preview} border rounded-lg mb-3 flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${
                        option.id === 'light' ? 'text-yellow-500' :
                        option.id === 'dark' ? 'text-blue-400' :
                        'text-gray-600'
                      }`} />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-gray-900 dark:text-white mb-1">{option.name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{option.description}</p>
                    </div>
                    {theme === option.id && (
                      <div className="flex justify-center mt-2">
                        <CheckCircle className="w-5 h-5 text-indigo-600" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">💡 Sobre os temas:</h4>
            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <li>• <strong>Claro:</strong> Interface clara, ideal para uso durante o dia</li>
              <li>• <strong>Escuro:</strong> Interface escura, reduz o cansaço visual</li>
              <li>• <strong>Auto:</strong> Alterna automaticamente baseado na preferência do sistema</li>
            </ul>
          </div>

          {/* Preview da Interface */}
          <div className="mt-6">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Preview da Interface</h4>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Exemplo de Card</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Este é um exemplo de como a interface aparece</p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Conteúdo de exemplo com o tema <strong>{theme === 'auto' ? 'automático' : theme}</strong> aplicado.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Carregando configurações...</span>
        </div>
      );
    }

    switch (activeTab) {
      case 'general':
        return renderGeneralSettings();
      case 'ai-models':
        return renderAIModelsSettings();
      case 'zapi-integration':
        return <ZAPIIntegrationSettings />;
      case 'notifications':
        return renderNotificationSettings();
      case 'security':
        return renderSecuritySettings();
      case 'appearance':
        return renderAppearanceSettings();
      case 'google-calendar':
        return <GoogleCalendarIntegration />;
      case 'privacy-policy':
        return <PrivacyPolicy />;
      case 'terms-of-service':
        return <TermsOfService />;
      default:
        return renderGeneralSettings();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configurações</h1>
        <button 
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-green-700 dark:text-green-300">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <nav className="p-4 space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;