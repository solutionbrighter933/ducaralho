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
  const [zapiConfigLoaded, setZapiConfigLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, profile, loading: authLoading, refreshProfile } = useAuthContext();

  // Carregar configuração da Z-API do Supabase
  useEffect(() => {
    if (!profile?.organization_id) return;

    const loadZAPIConfig = async () => {
      try {
        console.log('🔍 Carregando configuração Z-API para organização:', profile.organization_id);
        
        const { data: zapiConfig, error: zapiError } = await supabase
          .from('zapi_configs')
          .select('instance_id, token')
          .eq('organization_id', profile.organization_id)
          .maybeSingle();

        if (zapiError && zapiError.code !== 'PGRST116') {
          console.error('❌ Erro ao buscar configuração Z-API:', zapiError);
          throw zapiError;
        }

        if (zapiConfig) {
          console.log('✅ Configuração Z-API encontrada, definindo credenciais...');
          zapiService.setCredentials(zapiConfig.instance_id, zapiConfig.token);
          setZapiConfigLoaded(true);
        } else {
          console.log('⚠️ Nenhuma configuração Z-API encontrada para esta organização');
          zapiService.clearCredentials();
          setZapiConfigLoaded(false);
        }
      } catch (err) {
        console.error('❌ Erro ao carregar configuração Z-API:', err);
        zapiService.clearCredentials();
        setZapiConfigLoaded(false);
      }
    };

    loadZAPIConfig();
  }, [profile?.organization_id]);

  useEffect(() => {
    if (!profile?.id) return;

    const fetchWhatsAppNumber = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔍 === INÍCIO DA BUSCA DO NÚMERO WHATSAPP ===');
        console.log('🔍 Profile completo:', profile);
        console.log('🔍 profile.id:', profile.id);
        console.log('🔍 profile.organization_id:', profile.organization_id);
        console.log('🔍 profile.user_id:', profile.user_id);
        
        // BUSCA 1: Tentar encontrar por profile_id E organization_id (busca atual)
        console.log('🔍 BUSCA 1: Por profile_id E organization_id');
        const { data, error: fetchError } = await supabase
          .from('whatsapp_numbers')
          .select('*')
          .eq('profile_id', profile.id)
          .eq('organization_id', profile.organization_id)
          .maybeSingle();

        console.log('📊 BUSCA 1 - Resultado:', data);
        console.log('📊 BUSCA 1 - Erro:', fetchError);
        
        // BUSCA 2: Tentar encontrar APENAS por organization_id (caso o profile_id esteja errado)
        console.log('🔍 BUSCA 2: Apenas por organization_id');
        const { data: dataByOrg, error: fetchErrorByOrg } = await supabase
          .from('whatsapp_numbers')
          .select('*')
          .eq('organization_id', profile.organization_id);
        
        console.log('📊 BUSCA 2 - Resultados por organization_id:', dataByOrg);
        console.log('📊 BUSCA 2 - Quantidade encontrada:', dataByOrg?.length || 0);
        
        // BUSCA 3: Tentar encontrar APENAS por profile_id (caso o organization_id esteja errado)
        console.log('🔍 BUSCA 3: Apenas por profile_id');
        const { data: dataByProfile, error: fetchErrorByProfile } = await supabase
          .from('whatsapp_numbers')
          .select('*')
          .eq('profile_id', profile.id);
        
        console.log('📊 BUSCA 3 - Resultados por profile_id:', dataByProfile);
        console.log('📊 BUSCA 3 - Quantidade encontrada:', dataByProfile?.length || 0);
        
        // BUSCA 4: Buscar TODOS os registros da tabela para debug
        console.log('🔍 BUSCA 4: TODOS os registros da tabela (para debug)');
        const { data: allRecords, error: allRecordsError } = await supabase
          .from('whatsapp_numbers')
          .select('*')
          .limit(10);
        
        console.log('📊 BUSCA 4 - TODOS os registros:', allRecords);
        console.log('📊 BUSCA 4 - Total de registros na tabela:', allRecords?.length || 0);
        
        // Analisar qual busca encontrou dados
        let finalData = data;
        let searchMethod = 'profile_id + organization_id';
        
        if (!data && dataByOrg && dataByOrg.length > 0) {
          console.log('⚠️ Não encontrou por profile_id+organization_id, mas encontrou por organization_id');
          finalData = dataByOrg[0]; // Usar o primeiro registro encontrado
          searchMethod = 'organization_id apenas';
        } else if (!data && dataByProfile && dataByProfile.length > 0) {
          console.log('⚠️ Não encontrou por profile_id+organization_id, mas encontrou por profile_id');
          finalData = dataByProfile[0]; // Usar o primeiro registro encontrado
          searchMethod = 'profile_id apenas';
        }
        
        console.log('🎯 RESULTADO FINAL:');
        console.log('🎯 Método de busca usado:', searchMethod);
        console.log('🎯 Dados finais:', finalData);
        
        if (fetchError) {
          console.error('Error fetching WhatsApp number:', fetchError);
          if (fetchError.code !== 'PGRST116') {
            throw fetchError;
          }
        }

        console.log('📱 Número WhatsApp encontrado:', finalData);
        if (finalData) {
          console.log('📞 phone_number no banco:', finalData.phone_number);
          console.log('📝 display_name no banco:', finalData.display_name);
          console.log('🔗 connection_status no banco:', finalData.connection_status);
          console.log('👤 profile_id no banco:', finalData.profile_id);
          console.log('🏢 organization_id no banco:', finalData.organization_id);
        } else {
          console.log('❌ Nenhum número WhatsApp encontrado para este perfil');
          console.log('❌ Tentativas de busca:');
          console.log('   - Por profile_id + organization_id: FALHOU');
          console.log('   - Por organization_id apenas:', dataByOrg?.length || 0, 'registros');
          console.log('   - Por profile_id apenas:', dataByProfile?.length || 0, 'registros');
        }
        
        console.log('🔍 === FIM DA BUSCA DO NÚMERO WHATSAPP ===');
        setWhatsappNumber(finalData);
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

      // Verificar se já existe um registro para este profile E organização
      console.log('🔍 Buscando registros existentes para profile_id:', data.profileId, 'organization_id:', data.organizationId);
      
      const { data: existingRecords, error: fetchError } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .eq('profile_id', data.profileId)
        .eq('organization_id', data.organizationId);

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('❌ Erro ao buscar registros existentes:', fetchError);
        throw fetchError;
      }

      // Verificar se há múltiplos registros (isso não deveria acontecer)
      if (existingRecords && existingRecords.length > 1) {
        console.warn('⚠️ ATENÇÃO: Múltiplos registros encontrados para o mesmo profile/organização:', existingRecords.length);
        console.warn('📋 Registros encontrados:', existingRecords);
        
        // Usar o mais recente (último criado)
        existingRecords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        console.log('📝 Usando o registro mais recente:', existingRecords[0]);
      }
      
      const existingRecord = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;
      
      console.log('🔍 Registros existentes encontrados:', existingRecords?.length || 0);
      if (existingRecords && existingRecords.length > 0) {
        console.log('📋 Registros existentes detalhados:', existingRecords);
      }
      console.log('📝 Vai atualizar registro existente:', existingRecord ? `ID: ${existingRecord.id}` : 'Não - vai criar novo');
      
      const updateData = {
        profile_id: data.profileId,
        organization_id: data.organizationId,
        phone_number: data.phoneNumber, // Salva exatamente o valor recebido (string ou undefined)
        display_name: data.displayName || data.phoneNumber || 'WhatsApp Business',
        connection_status: data.connectionStatus,
        instance_id: data.instanceId,
        is_ai_active: data.isAiActive !== undefined ? data.isAiActive : true,
        ai_prompt: data.aiPrompt || 'Você é um assistente virtual prestativo.',
        updated_at: new Date().toISOString()
      };

      console.log('📊 Dados de atualização preparados:', updateData);
      console.log('📞 Número de telefone que será salvo:', data.phoneNumber);
      
      let result;

      if (existingRecord) {
        // Atualizar registro existente
        console.log(`📝 Atualizando registro existente do WhatsApp com ID: ${existingRecord.id}`);
        console.log('📊 Dados antes da atualização:', existingRecord);
        
        const { data: updatedData, error: updateError } = await supabase
          .from('whatsapp_numbers')
          .update(updateData)
          .eq('id', existingRecord.id)
          .eq('profile_id', data.profileId) // Garantir que só atualiza do usuário correto
          .select()
          .single();

        if (updateError) {
          console.error('❌ Erro ao atualizar número do WhatsApp:', updateError);
          console.error('❌ Código do erro:', updateError.code);
          console.error('❌ Mensagem do erro:', updateError.message);
          console.error('❌ Detalhes do erro:', updateError.details);
          
          // Verificar se é erro de chave única (número já existe)
          if (updateError.code === '23505' && updateError.message?.includes('phone_number')) {
            throw new Error(`O número de telefone "${data.phoneNumber}" já está sendo usado por outro registro. Escolha um número diferente.`);
          }
          
          throw updateError;
        }
        
        console.log('✅ Número do WhatsApp atualizado com sucesso:', updatedData);
        console.log('📞 Número atualizado para:', updatedData.phone_number);
        result = updatedData;
      } else {
        // Criar novo registro
        console.log('➕ Criando novo registro de número do WhatsApp');
        const { data: newData, error: insertError } = await supabase
          .from('whatsapp_numbers')
          .insert({
            ...updateData,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          console.error('❌ Erro ao criar número do WhatsApp:', insertError);
          console.error('❌ Código do erro:', insertError.code);
          console.error('❌ Mensagem do erro:', insertError.message);
          console.error('❌ Detalhes do erro:', insertError.details);
          
          // Verificar se é erro de chave única (número já existe)
          if (insertError.code === '23505' && insertError.message?.includes('phone_number')) {
            throw new Error(`O número de telefone "${data.phoneNumber}" já está sendo usado. Escolha um número diferente.`);
          }
          
          throw insertError;
        }
        
        console.log('✅ Número do WhatsApp criado com sucesso:', newData);
        result = newData;
      }

      setWhatsappNumber(result);
      console.log('🔄 Estado local atualizado com:', result);
      return result;
    } catch (err) {
      console.error('❌ Erro ao salvar número do WhatsApp no Supabase:', err);
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
    isZAPIConfigured: zapiConfigLoaded && zapiService.isConfigured(),
  };
};