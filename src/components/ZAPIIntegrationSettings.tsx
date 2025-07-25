import React, { useState, useEffect } from 'react';
import { Smartphone, Save, Loader2, AlertCircle, CheckCircle, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { useAuthContext } from './AuthProvider';
import { supabase } from '../lib/supabase';

interface ZAPIConfig {
  id?: string;
  organization_id: string;
  instance_id: string;
  token: string;
  created_at?: string;
  updated_at?: string;
}

const ZAPIIntegrationSettings: React.FC = () => {
  const { profile } = useAuthContext();
  const [config, setConfig] = useState<ZAPIConfig | null>(null);
  const [formData, setFormData] = useState({
    instance_id: '',
    token: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (profile?.organization_id) {
      loadZAPIConfig();
    }
  }, [profile?.organization_id]);

  const loadZAPIConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('zapi_configs')
        .select('*')
        .eq('organization_id', profile?.organization_id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (data) {
        setConfig(data);
        setFormData({
          instance_id: data.instance_id,
          token: data.token
        });
      }
    } catch (err) {
      console.error('Error loading Z-API config:', err);
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

      if (!profile?.organization_id) {
        throw new Error('Organização não encontrada');
      }

      if (!formData.instance_id.trim() || !formData.token.trim()) {
        throw new Error('Instance ID e Token são obrigatórios');
      }

      const configData = {
        organization_id: profile.organization_id,
        instance_id: formData.instance_id.trim(),
        token: formData.token.trim(),
        updated_at: new Date().toISOString()
      };

      let result;
      if (config?.id) {
        // Atualizar configuração existente
        const { data, error: updateError } = await supabase
          .from('zapi_configs')
          .update(configData)
          .eq('id', config.id)
          .select()
          .single();

        if (updateError) throw updateError;
        result = data;
      } else {
        // Criar nova configuração
        const { data, error: insertError } = await supabase
          .from('zapi_configs')
          .insert({
            ...configData,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) throw insertError;
        result = data;
      }

      setConfig(result);
      setSuccess('Configuração da Z-API salva com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving Z-API config:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      if (!formData.instance_id.trim() || !formData.token.trim()) {
        setError('Preencha Instance ID e Token antes de testar');
        return;
      }

      setError(null);
      setSuccess(null);

      // Testar conexão fazendo uma chamada simples à Z-API
      const testUrl = `https://api.z-api.io/instances/${formData.instance_id.trim()}/token/${formData.token.trim()}/status`;
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': 'F4a554efd9a4b4e51903dda0db517ffcaS'
        }
      });

      if (response.ok) {
        setSuccess('✅ Conexão com Z-API testada com sucesso!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorText = await response.text();
        throw new Error(`Erro na conexão: ${response.status} - ${errorText}`);
      }
    } catch (err) {
      console.error('Error testing Z-API connection:', err);
      setError(err instanceof Error ? err.message : 'Erro ao testar conexão');
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
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Integração Z-API</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Configure suas credenciais da Z-API para conectar números de WhatsApp. Cada organização pode ter sua própria instância.
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
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">Credenciais da Z-API</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {config ? 'Configuração existente encontrada' : 'Nenhuma configuração encontrada'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Instance ID *
            </label>
            <input
              type="text"
              value={formData.instance_id}
              onChange={(e) => setFormData(prev => ({ ...prev, instance_id: e.target.value }))}
              placeholder="Ex: 3E34EADF8CD1007B145E2A88B4975A95"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Token *
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={formData.token}
                onChange={(e) => setFormData(prev => ({ ...prev, token: e.target.value }))}
                placeholder="Ex: 7C19DEAA164FD4EF8312E717"
                className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleSave}
              disabled={saving || !formData.instance_id.trim() || !formData.token.trim()}
              className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saving ? 'Salvando...' : 'Salvar Configuração'}</span>
            </button>

            <button
              onClick={handleTestConnection}
              disabled={!formData.instance_id.trim() || !formData.token.trim()}
              className="flex items-center space-x-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Testar Conexão</span>
            </button>
          </div>
        </div>
      </div>

      {/* Information Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-3">📋 Como obter suas credenciais Z-API:</h4>
        <div className="space-y-2 text-sm text-blue-700 dark:text-blue-400">
          <div className="flex items-start space-x-2">
            <span className="font-bold">1.</span>
            <div>
              <p>Acesse o painel da Z-API em <a href="https://developer.z-api.io/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-800 dark:hover:text-blue-300">developer.z-api.io</a></p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-bold">2.</span>
            <p>Crie uma nova instância ou use uma existente</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-bold">3.</span>
            <p>Copie o <strong>Instance ID</strong> e o <strong>Token</strong> da sua instância</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-bold">4.</span>
            <p>Cole as credenciais nos campos acima e clique em "Salvar Configuração"</p>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-800/30 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>💡 Importante:</strong> Cada organização deve ter sua própria instância da Z-API. 
            Não compartilhe credenciais entre diferentes organizações.
          </p>
        </div>
      </div>

      {/* Current Configuration Display */}
      {config && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 dark:text-white mb-2">Configuração Atual</h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Instance ID:</span>
              <span className="font-mono text-gray-900 dark:text-white">{config.instance_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Token:</span>
              <span className="font-mono text-gray-900 dark:text-white">
                {showToken ? config.token : '•'.repeat(config.token.length)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Última atualização:</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(config.updated_at || config.created_at || '').toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZAPIIntegrationSettings;