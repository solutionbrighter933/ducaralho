import React, { useState, useEffect } from 'react';
import { Instagram, Save, Loader2, AlertCircle, CheckCircle, ExternalLink, Copy, Eye, EyeOff } from 'lucide-react';
import { useAuthContext } from './AuthProvider';
import { supabase } from '../lib/supabase';

interface InstagramWebhookConfig {
  id: string;
  user_id: string;
  organization_id: string;
  webhook_url: string;
  created_at: string;
  updated_at: string;
}

const InstagramWebhookSettings: React.FC = () => {
  const { user, profile } = useAuthContext();
  const [config, setConfig] = useState<InstagramWebhookConfig | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showUrl, setShowUrl] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user?.id && profile?.organization_id) {
      loadWebhookConfig();
    }
  }, [user?.id, profile?.organization_id]);

  const loadWebhookConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Carregando configuração do webhook Instagram...');

      const { data, error: fetchError } = await supabase
        .from('IndInsta')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('❌ Erro ao buscar configuração do webhook:', fetchError);
        throw fetchError;
      }

      if (data) {
        console.log('✅ Configuração do webhook encontrada:', data);
        setConfig(data);
        setWebhookUrl(data.webhook_url);
      } else {
        console.log('ℹ️ Nenhuma configuração de webhook encontrada');
        setConfig(null);
        setWebhookUrl('');
      }
    } catch (err) {
      console.error('❌ Erro ao carregar configuração do webhook:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar configuração');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      if (!user?.id || !profile?.organization_id) {
        throw new Error('Usuário ou organização não encontrados');
      }

      if (!webhookUrl.trim()) {
        throw new Error('URL do webhook é obrigatória');
      }

      // Validar se é uma URL válida
      try {
        new URL(webhookUrl.trim());
      } catch {
        throw new Error('URL do webhook inválida. Use o formato: https://exemplo.com/webhook');
      }

      console.log('💾 Salvando configuração do webhook Instagram...');

      const webhookData = {
        user_id: user.id,
        organization_id: profile.organization_id,
        webhook_url: webhookUrl.trim(),
        updated_at: new Date().toISOString()
      };

      let result;
      if (config?.id) {
        // Atualizar configuração existente
        console.log(`📝 Atualizando configuração existente ID: ${config.id}`);
        
        const { data, error: updateError } = await supabase
          .from('IndInsta')
          .update(webhookData)
          .eq('id', config.id)
          .eq('user_id', user.id) // Garantir que só atualiza do usuário correto
          .select()
          .single();

        if (updateError) {
          console.error('❌ Erro ao atualizar webhook:', updateError);
          throw updateError;
        }

        result = data;
        console.log('✅ Webhook atualizado com sucesso:', result);
      } else {
        // Criar nova configuração
        console.log('➕ Criando nova configuração de webhook');
        
        const { data, error: insertError } = await supabase
          .from('IndInsta')
          .insert({
            ...webhookData,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          console.error('❌ Erro ao criar webhook:', insertError);
          
          // Verificar se é erro de chave única (usuário já tem webhook)
          if (insertError.code === '23505' && insertError.message?.includes('idx_indinsta_user_unique')) {
            throw new Error('Você já possui um webhook configurado. A configuração será atualizada.');
          }
          
          throw insertError;
        }

        result = data;
        console.log('✅ Webhook criado com sucesso:', result);
      }

      setConfig(result);
      setSuccess('Webhook do Instagram salvo com sucesso!');
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      console.error('❌ Erro ao salvar webhook:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    try {
      if (!webhookUrl.trim()) {
        setError('Digite uma URL de webhook antes de testar');
        return;
      }

      setError(null);
      setSuccess(null);

      console.log('🧪 Testando webhook do Instagram...');

      // Fazer uma requisição de teste para verificar se o endpoint responde
      const testPayload = {
        test: true,
        message: 'Teste de webhook do Atendos IA',
        timestamp: new Date().toISOString(),
        user_id: user?.id,
        organization_id: profile?.organization_id
      };

      const response = await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        setSuccess('✅ Webhook testado com sucesso! O endpoint está respondendo.');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(`Erro na resposta: ${response.status} - ${response.statusText}`);
      }
    } catch (err) {
      console.error('❌ Erro ao testar webhook:', err);
      setError(err instanceof Error ? err.message : 'Erro ao testar webhook');
    }
  };

  const handleCopyUrl = async () => {
    if (!webhookUrl.trim()) return;

    try {
      await navigator.clipboard.writeText(webhookUrl.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar URL:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Carregando configuração...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Webhook do Instagram</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Configure a URL do webhook para receber notificações de mensagens do Instagram em tempo real.
        </p>
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
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Instagram className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">URL do Webhook Instagram</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {config ? 'Configuração existente encontrada' : 'Nenhuma configuração encontrada'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              URL do Webhook *
            </label>
            <div className="relative">
              <input
                type={showUrl ? 'text' : 'password'}
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://seu-servidor.com/webhook/instagram"
                className="w-full px-4 py-3 pr-24 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setShowUrl(!showUrl)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title={showUrl ? 'Ocultar URL' : 'Mostrar URL'}
                >
                  {showUrl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {webhookUrl.trim() && (
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Copiar URL"
                  >
                    <Copy className={`w-4 h-4 ${copied ? 'text-green-500' : ''}`} />
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              URL completa onde o Instagram enviará as notificações de mensagens
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleSave}
              disabled={saving || !webhookUrl.trim()}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saving ? 'Salvando...' : 'Salvar Webhook'}</span>
            </button>

            <button
              onClick={handleTestWebhook}
              disabled={!webhookUrl.trim() || saving}
              className="flex items-center space-x-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Testar Webhook</span>
            </button>
          </div>
        </div>
      </div>

      {/* Current Configuration Display */}
      {config && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 dark:text-white mb-2">Configuração Atual</h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">URL do Webhook:</span>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-gray-900 dark:text-white text-xs">
                  {showUrl ? config.webhook_url : '•'.repeat(Math.min(config.webhook_url.length, 40))}
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(config.webhook_url)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Copiar URL"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Última atualização:</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(config.updated_at).toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Criado em:</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(config.created_at).toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Information Card */}
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
        <h4 className="font-medium text-purple-800 dark:text-purple-300 mb-3 flex items-center space-x-2">
          <Instagram className="w-5 h-5" />
          <span>📋 Como configurar o webhook do Instagram:</span>
        </h4>
        <div className="space-y-3 text-sm text-purple-700 dark:text-purple-400">
          <div className="flex items-start space-x-2">
            <span className="font-bold">1.</span>
            <div>
              <p>Configure seu servidor/endpoint para receber webhooks do Instagram</p>
              <p className="text-xs text-purple-600 dark:text-purple-500 mt-1">
                O endpoint deve aceitar requisições POST com dados JSON
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-bold">2.</span>
            <p>Acesse o <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-800 dark:hover:text-purple-300">Facebook for Developers</a></p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-bold">3.</span>
            <p>Configure o webhook na sua aplicação Instagram/Facebook</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-bold">4.</span>
            <p>Cole a URL do seu webhook no campo acima e clique em "Salvar"</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-bold">5.</span>
            <p>Use o botão "Testar Webhook" para verificar se está funcionando</p>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-purple-100 dark:bg-purple-800/30 rounded-lg">
          <p className="text-sm text-purple-800 dark:text-purple-200">
            <strong>💡 Importante:</strong> O webhook deve estar acessível publicamente na internet. 
            URLs localhost não funcionarão para webhooks do Instagram.
          </p>
        </div>
      </div>

      {/* Example Payload */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h5 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
          <ExternalLink className="w-4 h-4" />
          <span>Exemplo de Payload que seu webhook receberá:</span>
        </h5>
        <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-xs text-gray-800 dark:text-gray-300 overflow-x-auto">
{`{
  "object": "instagram",
  "entry": [
    {
      "id": "instagram-account-id",
      "time": 1234567890,
      "messaging": [
        {
          "sender": {
            "id": "sender-id"
          },
          "recipient": {
            "id": "your-instagram-account-id"
          },
          "timestamp": 1234567890,
          "message": {
            "mid": "message-id",
            "text": "Olá! Como posso ajudar?"
          }
        }
      ]
    }
  ]
}`}</pre>
      </div>

      {/* Security Notice */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <h5 className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">Segurança</h5>
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              Mantenha sua URL de webhook segura e privada. Não compartilhe com terceiros não autorizados. 
              Considere implementar verificação de assinatura para validar que as requisições vêm realmente do Instagram.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstagramWebhookSettings;