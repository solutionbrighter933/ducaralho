import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../components/AuthProvider';
import { zapiService } from '../services/zapi.service';

interface WhatsAppNumber {
  id: string;
  phone_number: string | null;
  display_name: string | null;
  connection_status: string;
  is_ai_active: boolean;
  ai_prompt: string;
  profile_id: string;
  organization_id: string;
  instance_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useWhatsAppConnection = () => {
  const [whatsappNumber, setWhatsappNumber] = useState<WhatsAppNumber | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, profile, loading: authLoading, refreshProfile } = useAuthContext();

  useEffect(() => {
    if (!profile?.id) return;

    const fetchWhatsAppNumber = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('whatsapp_numbers')
          .select('*')
          .eq('profile_id', profile.id)
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching WhatsApp number:', fetchError);
          if (fetchError.code !== 'PGRST116') {
            throw fetchError;
          }
        }

        setWhatsappNumber(data);
      } catch (err) {
        console.error('Error fetching WhatsApp number:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchWhatsAppNumber();

    // Configurar realtime subscription
    const channel = supabase
      .channel('whatsapp_numbers_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_numbers',
          filter: `profile_id=eq.${profile.id}`
        },
        (payload) => {
          console.log('WhatsApp number updated:', payload);
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setWhatsappNumber(payload.new as WhatsAppNumber);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  // Função para salvar ou atualizar número WhatsApp no Supabase
  const saveOrUpdateWhatsAppNumberInSupabase = async (data: {
    profileId: string;
    organizationId: string;
    phoneNumber?: string;
    connectionStatus: string;
    instanceId: string;
    displayName?: string;
    isAiActive?: boolean;
    aiPrompt?: string;
  }) => {
    try {
      console.log('💾 Saving/updating WhatsApp number in Supabase:', data);

      // Verificar se já existe um registro para este profile
      const { data: existingRecord, error: fetchError } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .eq('profile_id', data.profileId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      const updateData = {
        profile_id: data.profileId,
        organization_id: data.organizationId,
        phone_number: data.phoneNumber || null,
        display_name: data.displayName || data.phoneNumber || 'WhatsApp Business',
        connection_status: data.connectionStatus,
        instance_id: data.instanceId,
        is_ai_active: data.isAiActive !== undefined ? data.isAiActive : true,
        ai_prompt: data.aiPrompt || 'Você é um assistente virtual prestativo.',
        updated_at: new Date().toISOString()
      };

      let result;

      if (existingRecord) {
        // Atualizar registro existente
        console.log('📝 Updating existing WhatsApp number record');
        const { data: updatedData, error: updateError } = await supabase
          .from('whatsapp_numbers')
          .update(updateData)
          .eq('id', existingRecord.id)
          .select()
          .single();

        if (updateError) throw updateError;
        result = updatedData;
      } else {
        // Criar novo registro
        console.log('➕ Creating new WhatsApp number record');
        const { data: newData, error: insertError } = await supabase
          .from('whatsapp_numbers')
          .insert({
            ...updateData,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) throw insertError;
        result = newData;
      }

      console.log('✅ WhatsApp number saved successfully:', result);
      setWhatsappNumber(result);
      return result;
    } catch (err) {
      console.error('❌ Error saving WhatsApp number to Supabase:', err);
      throw err;
    }
  };

  // Função para notificar N8N sobre conexão do WhatsApp
  const notifyN8NWhatsAppConnection = async (data: {
    profileId: string;
    organizationId: string;
    phoneNumber: string;
    instanceId: string;
    displayName: string;
    connectionStatus: string;
  }) => {
    try {
      const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
      if (!webhookUrl) {
        console.warn('⚠️ N8N webhook URL not configured');
        return;
      }

      console.log('📡 Notifying N8N about WhatsApp connection:', data);

      const payload = {
        event: 'whatsapp_connected',
        profileId: data.profileId,
        organizationId: data.organizationId,
        phoneNumber: data.phoneNumber,
        instanceId: data.instanceId,
        displayName: data.displayName,
        connectionStatus: data.connectionStatus,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`N8N webhook failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.text();
      console.log('✅ N8N notified successfully:', result);
    } catch (err) {
      console.error('❌ Error notifying N8N:', err);
      // Não falhar a operação principal se o N8N falhar
    }
  };

  // CONECTAR WHATSAPP - IMPLEMENTAÇÃO CORRIGIDA
  const connectWhatsApp = async () => {
    try {
      console.log('🔄 Iniciando conexão WhatsApp - Gerando QR Code...');
      setLoading(true);
      setError(null);

      if (!zapiService.isConfigured()) {
        console.error('❌ Z-API não configurada');
        throw new Error('Credenciais da Z-API não configuradas. Verifique o arquivo .env');
      }

      if (!profile?.id || !profile?.organization_id) {
        console.error('❌ Perfil do usuário não encontrado');
        throw new Error('Perfil do usuário não encontrado');
      }

      // Verificar status atual primeiro
      console.log('🔍 Verificando status atual antes de gerar QR Code...');
      const statusResult = await zapiService.getConnectionStatus();
      
      if (statusResult.success && statusResult.data && statusResult.data.connected) {
        console.log('✅ WhatsApp já está conectado! Atualizando status...');
        
        // Atualizar status no Supabase
        await saveOrUpdateWhatsAppNumberInSupabase({
          profileId: profile.id,
          organizationId: profile.organization_id,
          phoneNumber: statusResult.data.phone || undefined,
          connectionStatus: 'CONNECTED',
          instanceId: zapiService.getConfig().instanceId,
          displayName: statusResult.data.name || 'WhatsApp Business',
          isAiActive: whatsappNumber?.is_ai_active !== undefined ? whatsappNumber.is_ai_active : true,
          aiPrompt: whatsappNumber?.ai_prompt || 'Você é um assistente virtual prestativo.'
        });
        
        return {
          success: true,
          alreadyConnected: true,
          message: 'WhatsApp já está conectado!'
        };
      }

      // Obter QR Code diretamente da Z-API
      console.log('📱 Obtendo QR Code da Z-API...');
      const qrResult = await zapiService.getQRCode();
      console.log('📊 Resultado da chamada getQRCode:', qrResult);
      
      if (qrResult.success) {
        // Verificar se já está conectado
        if (qrResult.data?.alreadyConnected) {
          console.log('✅ WhatsApp já está conectado, atualizando status no Supabase...');
          
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
          
          // Verificar status para obter número de telefone
          const deviceInfo = await checkInstanceStatus();
          
          return {
            success: true,
            alreadyConnected: true,
            message: 'WhatsApp já está conectado!'
          };
        }
        
        // Se temos QR Code, salvar estado e retornar
        if (qrResult.data?.qrCode) {
          console.log('✅ QR Code gerado com sucesso, salvando estado no Supabase...');
          
          // Salvar estado inicial no Supabase
          await saveOrUpdateWhatsAppNumberInSupabase({
            profileId: profile.id,
            organizationId: profile.organization_id,
            connectionStatus: 'QR_GENERATED',
            instanceId: zapiService.getConfig().instanceId,
            displayName: whatsappNumber?.display_name || 'WhatsApp Business',
            isAiActive: whatsappNumber?.is_ai_active !== undefined ? whatsappNumber.is_ai_active : true,
            aiPrompt: whatsappNumber?.ai_prompt || 'Você é um assistente virtual prestativo.'
          });
          
          return {
            success: true,
            qrCode: qrResult.data.qrCode,
            message: 'QR Code gerado com sucesso! Escaneie com seu WhatsApp.'
          };
        }
        
        // Se chegamos aqui, algo inesperado aconteceu
        throw new Error('Resposta inesperada da Z-API: nem QR Code nem conexão existente');
      } else {
        // Se o erro indicar que já está conectado, tratar como sucesso
        if (qrResult.error && qrResult.error.includes('already connected')) {
          console.log('✅ Erro indica que já está conectado, tratando como sucesso');
          
          // Atualizar status no Supabase
          await saveOrUpdateWhatsAppNumberInSupabase({
            profileId: profile.id,
            organizationId: profile.organization_id,
            connectionStatus: 'CONNECTED',
            instanceId: zapiService.getConfig().instanceId,
            displayName: 'WhatsApp Business',
            isAiActive: whatsappNumber?.is_ai_active !== undefined ? whatsappNumber.is_ai_active : true,
            aiPrompt: whatsappNumber?.ai_prompt || 'Você é um assistente virtual prestativo.'
          });
          
          return {
            success: true,
            alreadyConnected: true,
            message: 'WhatsApp já está conectado!'
          };
        }
        
        throw new Error(qrResult.error || 'Falha ao gerar QR Code');
      }
    } catch (err) {
      console.error('❌ Error in connectWhatsApp:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Verificar status da instância usando /status
  const checkInstanceStatus = async () => {
    try {
      if (!zapiService.isConfigured()) {
        throw new Error('Z-API não configurada');
      }

      if (!profile?.id || !profile?.organization_id) {
        throw new Error('Perfil do usuário não encontrado');
      }

      console.log('🔍 Verificando status da instância via endpoint /status...');

      // Usar o endpoint /status para verificar conexão
      const result = await zapiService.getConnectionStatus();
      
      if (result.success && result.data) {
        const statusData = result.data;
        const isConnected = statusData.connected === true;
        const connectionStatus = isConnected ? 'CONNECTED' : 'DISCONNECTED';
        
        console.log('📊 Status obtido:', {
          connected: isConnected,
          phone: statusData.phone,
          name: statusData.name,
          status: connectionStatus
        });

        // Salvar/atualizar no Supabase
        const savedData = await saveOrUpdateWhatsAppNumberInSupabase({
          profileId: profile.id,
          organizationId: profile.organization_id,
          phoneNumber: statusData.phone || undefined,
          connectionStatus,
          instanceId: zapiService.getConfig().instanceId,
          displayName: statusData.name || statusData.phone || 'WhatsApp Business',
          isAiActive: whatsappNumber?.is_ai_active !== undefined ? whatsappNumber.is_ai_active : true,
          aiPrompt: whatsappNumber?.ai_prompt || 'Você é um assistente virtual prestativo.'
        });

        // Se acabou de conectar, notificar N8N
        if (isConnected && statusData.phone && 
            (!whatsappNumber || whatsappNumber.connection_status !== 'CONNECTED')) {
          await notifyN8NWhatsAppConnection({
            profileId: profile.id,
            organizationId: profile.organization_id,
            phoneNumber: statusData.phone,
            instanceId: zapiService.getConfig().instanceId,
            displayName: statusData.name || statusData.phone || 'WhatsApp Business',
            connectionStatus: 'CONNECTED'
          });
        }

        return {
          connected: isConnected,
          data: statusData,
          savedData
        };
      } else {
        // Se o erro for esperado (não conectado ainda), não mostrar como erro
        if (result.error && result.error.includes('You need to be connected')) {
          console.log('ℹ️ Dispositivo ainda não conectado - aguardando escaneamento do QR Code');
          return {
            connected: false,
            data: null,
            waitingForQrScan: true
          };
        }
        
        console.error('❌ Falha ao obter status:', result.error);
        return {
          connected: false,
          data: null,
          error: result.error || 'Falha ao obter status da conexão'
        };
      }
    } catch (err) {
      console.error('❌ Error checking instance status:', err);
      throw err;
    }
  };

  // Desconectar WhatsApp
  const handleDisconnect = async () => {
    try {
      if (!profile?.id || !profile?.organization_id) {
        throw new Error('Perfil do usuário não encontrado');
      }

      console.log('🔄 Desconectando WhatsApp...');

      const result = await zapiService.disconnectInstance();
      
      if (result.success) {
        // Atualizar status no Supabase
        await saveOrUpdateWhatsAppNumberInSupabase({
          profileId: profile.id,
          organizationId: profile.organization_id,
          connectionStatus: 'DISCONNECTED',
          instanceId: zapiService.getConfig().instanceId,
          displayName: whatsappNumber?.display_name || 'WhatsApp Business',
          isAiActive: whatsappNumber?.is_ai_active !== undefined ? whatsappNumber.is_ai_active : true,
          aiPrompt: whatsappNumber?.ai_prompt || 'Você é um assistente virtual prestativo.'
        });

        console.log('✅ WhatsApp desconectado com sucesso');
        return result;
      } else {
        throw new Error(result.error || 'Falha ao desconectar');
      }
    } catch (err) {
      console.error('❌ Error disconnecting WhatsApp:', err);
      throw err;
    }
  };

  // Enviar mensagem de teste via Z-API
  const sendTestMessage = async (phoneNumber: string, message: string) => {
    try {
      console.log(`🧪 Enviando mensagem de teste para ${phoneNumber} via Z-API...`);

      if (!zapiService.isConfigured()) {
        throw new Error('Credenciais da Z-API não configuradas');
      }

      const result = await zapiService.sendTextMessage(phoneNumber, message);
      
      if (!result.success) {
        throw new Error(result.error || 'Falha ao enviar mensagem');
      }

      console.log('✅ Mensagem de teste enviada com sucesso via Z-API');
      return result;
    } catch (err) {
      console.error('Error sending test message:', err);
      throw err;
    }
  };

  const updateAIStatus = async (isActive: boolean) => {
    try {
      if (!whatsappNumber) {
        throw new Error('No WhatsApp number configured');
      }

      if (!profile?.id || !profile?.organization_id) {
        throw new Error('Perfil do usuário não encontrado');
      }

      // Atualizar no Supabase
      await saveOrUpdateWhatsAppNumberInSupabase({
        profileId: profile.id,
        organizationId: profile.organization_id,
        phoneNumber: whatsappNumber.phone_number || undefined,
        connectionStatus: whatsappNumber.connection_status,
        instanceId: whatsappNumber.instance_id || zapiService.getConfig().instanceId,
        displayName: whatsappNumber.display_name || undefined,
        isAiActive: isActive,
        aiPrompt: whatsappNumber.ai_prompt
      });

      console.log(`✅ AI status updated to: ${isActive ? 'ACTIVE' : 'INACTIVE'}`);
    } catch (err) {
      console.error('Error updating AI status:', err);
      throw err;
    }
  };

  const updateAIPrompt = async (prompt: string) => {
    try {
      if (!profile?.id || !profile?.organization_id) {
        throw new Error('Perfil do usuário não encontrado');
      }

      // Atualizar no Supabase
      await saveOrUpdateWhatsAppNumberInSupabase({
        profileId: profile.id,
        organizationId: profile.organization_id,
        phoneNumber: whatsappNumber?.phone_number || undefined,
        connectionStatus: whatsappNumber?.connection_status || 'DISCONNECTED',
        instanceId: whatsappNumber?.instance_id || zapiService.getConfig().instanceId,
        displayName: whatsappNumber?.display_name || 'WhatsApp Business',
        isAiActive: whatsappNumber?.is_ai_active !== undefined ? whatsappNumber.is_ai_active : true,
        aiPrompt: prompt
      });

      console.log('✅ AI prompt updated successfully');
    } catch (err) {
      console.error('Error updating AI prompt:', err);
      throw err;
    }
  };

  // Verificar status da conexão Z-API (apenas para informação)
  const checkZAPIStatus = async () => {
    try {
      if (!zapiService.isConfigured()) {
        return { connected: false, error: 'Z-API não configurada' };
      }

      const result = await zapiService.getConnectionStatus();
      return {
        connected: result.success && result.data?.connected === true,
        data: result.data,
        error: result.error
      };
    } catch (err) {
      console.error('Error checking Z-API status:', err);
      return { connected: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
    }
  };

  return {
    whatsappNumber,
    loading,
    error,
    profile, // Expose profile for components
    authLoading, // Expose auth loading state
    connectWhatsApp,
    sendTestMessage,
    updateAIStatus,
    updateAIPrompt,
    checkZAPIStatus,
    checkInstanceStatus,
    handleDisconnect,
    saveOrUpdateWhatsAppNumberInSupabase,
    notifyN8NWhatsAppConnection,
    refreshProfile, // Expose profile refresh function
    isConnected: whatsappNumber?.connection_status === 'CONNECTED',
    isZAPIConfigured: zapiService.isConfigured(),
  };
};