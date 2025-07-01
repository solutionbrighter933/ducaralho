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
  const { user, profile } = useAuthContext();

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

  // CONECTAR WHATSAPP - FLUXO CORRETO: QR CODE PRIMEIRO!
  const connectWhatsApp = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Starting WhatsApp connection - QR Code first!');

      if (!zapiService.isConfigured()) {
        throw new Error('Credenciais da Z-API não configuradas. Verifique o arquivo .env');
      }

      if (!profile?.id || !profile?.organization_id) {
        throw new Error('Perfil do usuário não encontrado');
      }

      // PASSO 1: Obter QR Code DIRETAMENTE (sem verificar status antes)
      console.log('📱 Step 1: Getting QR Code directly...');
      const qrResult = await zapiService.getQRCode();
      
      if (!qrResult.success || !qrResult.data?.qrCode) {
        throw new Error(qrResult.error || 'Falha ao obter QR Code');
      }

      // PASSO 2: Salvar estado inicial no Supabase
      console.log('💾 Step 2: Saving initial state to Supabase...');
      await saveOrUpdateWhatsAppNumberInSupabase({
        profileId: profile.id,
        organizationId: profile.organization_id,
        connectionStatus: 'QR_GENERATED', // Estado específico para QR gerado
        instanceId: zapiService.getConfig().instanceId,
        displayName: 'WhatsApp Business',
        isAiActive: whatsappNumber?.is_ai_active !== undefined ? whatsappNumber.is_ai_active : true,
        aiPrompt: whatsappNumber?.ai_prompt || 'Você é um assistente virtual prestativo.'
      });

      console.log('✅ QR Code generated successfully - ready for scanning!');

      return {
        qrCode: qrResult.data.qrCode,
        success: true,
        message: 'QR Code gerado com sucesso! Escaneie com seu WhatsApp.'
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Error generating QR Code:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Verificar status da instância usando /status (MÉTODO PRINCIPAL APÓS QR CODE)
  const checkInstanceStatus = async () => {
    try {
      if (!zapiService.isConfigured()) {
        throw new Error('Z-API não configurada');
      }

      if (!profile?.id || !profile?.organization_id) {
        throw new Error('Perfil do usuário não encontrado');
      }

      console.log('🔍 Checking instance status via /status endpoint...');

      // Usar o endpoint /status conforme documentação
      const result = await zapiService.getConnectionStatus();
      
      if (result.success && result.data) {
        const statusData = result.data;
        const isConnected = statusData.connected === true;
        const connectionStatus = isConnected ? 'CONNECTED' : 'DISCONNECTED';
        
        console.log('📊 Status retrieved:', {
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
            displayName: statusData.name || statusData.phone,
            connectionStatus: 'CONNECTED'
          });
        }

        return {
          connected: isConnected,
          data: statusData,
          savedData
        };
      } else {
        console.log('ℹ️ Status check failed - instance not connected yet');
        return {
          connected: false,
          data: null,
          error: result.error || 'Aguardando conexão via QR Code'
        };
      }
    } catch (err) {
      console.error('❌ Error checking instance status:', err);
      throw err;
    }
  };

  // Verificar informações da instância usando /device (MÉTODO ALTERNATIVO)
  const checkInstanceInfo = async () => {
    try {
      if (!zapiService.isConfigured()) {
        throw new Error('Z-API não configurada');
      }

      if (!profile?.id || !profile?.organization_id) {
        throw new Error('Perfil do usuário não encontrado');
      }

      console.log('🔍 Checking device info after connection...');

      const result = await zapiService.getDeviceInfo();
      
      if (result.success && result.data) {
        const deviceData = result.data;
        const isConnected = deviceData.connected === true;
        const connectionStatus = isConnected ? 'CONNECTED' : 'DISCONNECTED';
        
        console.log('📊 Device info retrieved:', {
          connected: isConnected,
          name: deviceData.name,
          phone: deviceData.phone
        });

        // Salvar/atualizar no Supabase
        const savedData = await saveOrUpdateWhatsAppNumberInSupabase({
          profileId: profile.id,
          organizationId: profile.organization_id,
          phoneNumber: deviceData.phone || undefined,
          connectionStatus,
          instanceId: zapiService.getConfig().instanceId,
          displayName: deviceData.name || deviceData.phone || 'WhatsApp Business',
          isAiActive: whatsappNumber?.is_ai_active !== undefined ? whatsappNumber.is_ai_active : true,
          aiPrompt: whatsappNumber?.ai_prompt || 'Você é um assistente virtual prestativo.'
        });

        // Se acabou de conectar, notificar N8N
        if (isConnected && deviceData.phone && 
            (!whatsappNumber || whatsappNumber.connection_status !== 'CONNECTED')) {
          await notifyN8NWhatsAppConnection({
            profileId: profile.id,
            organizationId: profile.organization_id,
            phoneNumber: deviceData.phone,
            instanceId: zapiService.getConfig().instanceId,
            displayName: deviceData.name || deviceData.phone,
            connectionStatus: 'CONNECTED'
          });
        }

        return {
          connected: isConnected,
          data: deviceData,
          savedData
        };
      } else {
        // Se der erro "You need to be connected", isso é NORMAL antes da conexão
        if (result.error && result.error.includes('You need to be connected')) {
          console.log('ℹ️ Instance not connected yet - this is expected before QR scan');
          return {
            connected: false,
            data: null,
            error: 'Aguardando conexão via QR Code'
          };
        }
        throw new Error(result.error || 'Falha ao obter informações do device');
      }
    } catch (err) {
      console.error('❌ Error checking device info:', err);
      
      // Se o erro for "You need to be connected", não é um erro real
      if (err instanceof Error && err.message.includes('You need to be connected')) {
        return {
          connected: false,
          data: null,
          error: 'Aguardando conexão via QR Code'
        };
      }
      
      throw err;
    }
  };

  // Desconectar WhatsApp
  const handleDisconnect = async () => {
    try {
      if (!profile?.id || !profile?.organization_id) {
        throw new Error('Perfil do usuário não encontrado');
      }

      console.log('🔄 Disconnecting WhatsApp...');

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

        console.log('✅ WhatsApp disconnected successfully');
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
      console.log(`🧪 Sending test message to ${phoneNumber} via Z-API...`);

      if (!zapiService.isConfigured()) {
        throw new Error('Credenciais da Z-API não configuradas');
      }

      const result = await zapiService.sendTextMessage(phoneNumber, message);
      
      if (!result.success) {
        throw new Error(result.error || 'Falha ao enviar mensagem');
      }

      console.log('✅ Test message sent successfully via Z-API');
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
        isAiActive: whatsappNumber.is_ai_active,
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
    connectWhatsApp, // FLUXO CORRETO: QR CODE PRIMEIRO!
    sendTestMessage,
    updateAIStatus,
    updateAIPrompt,
    checkZAPIStatus,
    checkInstanceStatus, // MÉTODO PRINCIPAL: usar /status
    checkInstanceInfo, // MÉTODO ALTERNATIVO: usar /device
    handleDisconnect,
    saveOrUpdateWhatsAppNumberInSupabase,
    notifyN8NWhatsAppConnection,
    isConnected: whatsappNumber?.connection_status === 'CONNECTED',
    isZAPIConfigured: zapiService.isConfigured(),
  };
};