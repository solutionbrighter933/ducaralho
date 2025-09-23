import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../components/AuthProvider';

interface MensagemInstagram {
  id: string;
  sender_id: string;
  mensagem: string;
  direcao: 'sent' | 'RECEIVED';
  data_hora: string;
  created_at: string;
  updated_at: string;
  nomepersonalizado?: string;
}

interface ConversaInstagramAgrupada {
  sender_id: string;
  nome_contato: string;
  nomepersonalizado?: string;
  ultima_mensagem: string;
  ultima_atividade: string;
  total_mensagens: number;
  nao_lidas: number;
  mensagens: MensagemInstagram[];
}

interface EstatisticasInstagram {
  total_conversas: number;
  conversas_ativas: number;
  mensagens_nao_lidas: number;
  ultima_atividade: string;
}

export const useInstagramConversations = () => {
  const [conversas, setConversas] = useState<ConversaInstagramAgrupada[]>([]);
  const [mensagens, setMensagens] = useState<MensagemInstagram[]>([]);
  const [conversaSelecionada, setConversaSelecionada] = useState<ConversaInstagramAgrupada | null>(null);
  const [estatisticas, setEstatisticas] = useState<EstatisticasInstagram | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user, profile } = useAuthContext();

  // Função para detectar e extrair nome de mensagens
  const detectarNomeNaMensagem = (mensagem: string): string | null => {
    const textoLimpo = mensagem.toLowerCase().trim();
    
    // Padrões para detectar quando alguém fala seu nome
    const padroes = [
      // "Meu nome é João", "Me chamo Maria", etc.
      /(?:meu nome é|me chamo|sou o|sou a|eu sou)\s+([a-záàâãéèêíïóôõöúçñ]+(?:\s+[a-záàâãéèêíïóôõöúçñ]+)?)/i,
      
      // "Meu nome: João", "Nome: Maria", etc.
      /(?:meu nome|nome):\s*([a-záàâãéèêíïóôõöúçñ]+(?:\s+[a-záàâãéèêíïóôõöúçñ]+)?)/i,
      
      // "Eu me chamo João", "Me chamo Maria"
      /(?:eu me chamo|me chamo)\s+([a-záàâãéèêíïóôõöúçñ]+(?:\s+[a-záàâãéèêíïóôõöúçñ]+)?)/i,
      
      // "Sou João", "Sou a Maria"
      /(?:sou o|sou a|sou)\s+([a-záàâãéèêíïóôõöúçñ]+(?:\s+[a-záàâãéèêíïóôõöúçñ]+)?)/i,
      
      // "Meu nome completo é João Silva"
      /(?:meu nome completo é|nome completo é)\s+([a-záàâãéèêíïóôõöúçñ]+(?:\s+[a-záàâãéèêíïóôõöúçñ]+)*)/i,
      
      // "Pode me chamar de João"
      /(?:pode me chamar de|me chame de|chama de)\s+([a-záàâãéèêíïóôõöúçñ]+(?:\s+[a-záàâãéèêíïóôõöúçñ]+)?)/i,
      
      // "Aqui é o João", "Aqui é a Maria"
      /(?:aqui é o|aqui é a|aqui é)\s+([a-záàâãéèêíïóôõöúçñ]+(?:\s+[a-záàâãéèêíïóôõöúçñ]+)?)/i,
      
      // "Oi, eu sou João"
      /(?:oi,?\s*eu sou|olá,?\s*eu sou|oi,?\s*sou|olá,?\s*sou)\s+([a-záàâãéèêíïóôõöúçñ]+(?:\s+[a-záàâãéèêíïóôõöúçñ]+)?)/i
    ];
    
    // Testar cada padrão
    for (const padrao of padroes) {
      const match = textoLimpo.match(padrao);
      if (match && match[1]) {
        const nomeDetectado = match[1].trim();
        
        // Validar se o nome detectado não é muito curto ou contém caracteres inválidos
        if (nomeDetectado.length >= 2 && nomeDetectado.length <= 50) {
          // Capitalizar primeira letra de cada palavra
          const nomeFormatado = nomeDetectado
            .split(' ')
            .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
            .join(' ');
          
          console.log(`🎯 Nome detectado na mensagem: "${nomeFormatado}" (padrão: ${padrao})`);
          return nomeFormatado;
        }
      }
    }
    
    return null;
  };

  // Função para salvar nome personalizado automaticamente
  const salvarNomeDetectado = async (senderId: string, nomeDetectado: string) => {
    try {
      if (!user?.id || !profile?.organization_id) {
        console.warn('⚠️ Usuário ou perfil não disponível para salvar nome detectado');
        return false;
      }

      console.log(`💾 Salvando nome detectado automaticamente: ${senderId} -> ${nomeDetectado}`);

      // Verificar se já existe um nome personalizado para este sender
      const { data: existingMessage, error: checkError } = await supabase
        .from('conversas_instagram')
        .select('nomepersonalizado')
        .eq('sender_id', senderId)
        .eq('user_id', user.id)
        .not('nomepersonalizado', 'is', null)
        .limit(1)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Erro ao verificar nome existente:', checkError);
        return false;
      }

      // Se já existe um nome personalizado, não sobrescrever
      if (existingMessage && existingMessage.nomepersonalizado) {
        console.log(`ℹ️ Nome personalizado já existe para ${senderId}: ${existingMessage.nomepersonalizado}`);
        return false;
      }

      // Atualizar todas as mensagens deste sender_id com o nome detectado
      const { error: updateError } = await supabase
        .from('conversas_instagram')
        .update({
          nomepersonalizado: nomeDetectado,
          updated_at: new Date().toISOString()
        })
        .eq('sender_id', senderId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('❌ Erro ao salvar nome detectado:', updateError);
        return false;
      }

      console.log(`✅ Nome "${nomeDetectado}" salvo automaticamente para ${senderId}`);
      return true;
    } catch (err) {
      console.error('❌ Erro ao salvar nome detectado:', err);
      return false;
    }
  };

  // Agrupar mensagens por sender_id para criar conversas dinâmicas
  const agruparMensagensPorSender = (mensagens: MensagemInstagram[]): ConversaInstagramAgrupada[] => {
    const conversasMap = new Map<string, ConversaInstagramAgrupada>();

    mensagens.forEach(mensagem => {
      const senderId = mensagem.sender_id;
      
      if (!conversasMap.has(senderId)) {
        // Buscar nome personalizado da primeira mensagem que tenha
        const nomePersonalizado = mensagens.find(m => m.sender_id === senderId && m.nomepersonalizado)?.nomepersonalizado;
        
        // Criar nova conversa
        conversasMap.set(senderId, {
          sender_id: senderId,
          nome_contato: nomePersonalizado || `@${senderId}`, // Usar nome personalizado se disponível
          nomepersonalizado: nomePersonalizado,
          ultima_mensagem: mensagem.mensagem,
          ultima_atividade: mensagem.data_hora,
          total_mensagens: 0,
          nao_lidas: 0,
          mensagens: []
        });
      }

      const conversa = conversasMap.get(senderId)!;
      
      // Adicionar mensagem à conversa
      conversa.mensagens.push(mensagem);
      conversa.total_mensagens++;
      
      // Atualizar última mensagem se for mais recente
      if (new Date(mensagem.data_hora) > new Date(conversa.ultima_atividade)) {
        conversa.ultima_mensagem = mensagem.mensagem;
        conversa.ultima_atividade = mensagem.data_hora;
      }
      
      // Contar mensagens não lidas (RECEIVED)
      if (mensagem.direcao.toLowerCase() === 'received') {
        conversa.nao_lidas++;
      }
    });

    // Converter Map para Array e ordenar por última atividade
    return Array.from(conversasMap.values()).sort((a, b) => 
      new Date(b.ultima_atividade).getTime() - new Date(a.ultima_atividade).getTime()
    );
  };

  // Carregar mensagens e criar conversas dinamicamente
  const carregarConversas = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      console.log('📸 Carregando mensagens do Instagram para usuário:', user.id);

      // Buscar todas as mensagens do Instagram do usuário
      const { data: mensagensData, error: mensagensError } = await supabase
        .from('conversas_instagram')
        .select('*, nomepersonalizado')
        .eq('user_id', user.id)
        .order('data_hora', { ascending: false });

      if (mensagensError) {
        console.error('❌ Erro ao buscar mensagens do Instagram:', mensagensError);
        throw mensagensError;
      }

      console.log('📸 Mensagens do Instagram encontradas:', mensagensData?.length || 0);
      
      if (mensagensData && mensagensData.length > 0) {
        // NOVA LÓGICA: Detectar nomes em mensagens recebidas antes de agrupar
        for (const mensagem of mensagensData) {
          // Só processar mensagens recebidas (RECEIVED) que não tenham nome personalizado ainda
          if (mensagem.direcao.toLowerCase() === 'received' && !mensagem.nomepersonalizado) {
            const nomeDetectado = detectarNomeNaMensagem(mensagem.mensagem);
            
            if (nomeDetectado) {
              console.log(`🎯 Nome detectado em tempo real: ${nomeDetectado} para ${mensagem.sender_id}`);
              
              // Salvar nome detectado automaticamente
              const salvou = await salvarNomeDetectado(mensagem.sender_id, nomeDetectado);
              
              if (salvou) {
                // Atualizar a mensagem local para refletir a mudança
                mensagem.nomepersonalizado = nomeDetectado;
              }
            }
          }
        }
        
        // Agrupar mensagens por sender_id
        const conversasAgrupadas = agruparMensagensPorSender(mensagensData);
        setConversas(conversasAgrupadas);
        
        console.log('📋 Conversas do Instagram criadas dinamicamente:', conversasAgrupadas.length);
        
        // Calcular estatísticas
        const stats = {
          total_conversas: conversasAgrupadas.length,
          conversas_ativas: conversasAgrupadas.length, // Todas as conversas são consideradas ativas
          mensagens_nao_lidas: conversasAgrupadas.reduce((sum, c) => sum + c.nao_lidas, 0),
          ultima_atividade: conversasAgrupadas[0]?.ultima_atividade || ''
        };
        
        console.log('📊 Estatísticas do Instagram calculadas:', stats);
        setEstatisticas(stats);
      } else {
        setConversas([]);
        setEstatisticas({
          total_conversas: 0,
          conversas_ativas: 0,
          mensagens_nao_lidas: 0,
          ultima_atividade: ''
        });
      }

    } catch (err) {
      console.error('❌ Erro ao carregar conversas do Instagram:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Carregar mensagens de uma conversa específica (por sender_id)
  const carregarMensagens = async (senderId: string) => {
    try {
      console.log(`📸 Carregando mensagens do Instagram para sender: ${senderId}`);

      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      const { data: mensagensData, error: mensagensError } = await supabase
        .from('conversas_instagram')
        .select('*, nomepersonalizado')
        .eq('sender_id', senderId)
        .eq('user_id', user.id)
        .order('data_hora', { ascending: true });

      if (mensagensError) {
        console.error('❌ Erro ao buscar mensagens do Instagram:', mensagensError);
        throw mensagensError;
      }

      console.log('📸 Mensagens do Instagram encontradas:', mensagensData?.length || 0);
      
      setMensagens(mensagensData || []);

    } catch (err) {
      console.error('❌ Erro ao carregar mensagens do Instagram:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar mensagens');
    }
  };

  // Selecionar conversa
  const selecionarConversa = async (conversa: ConversaInstagramAgrupada) => {
    console.log('🎯 Selecionando conversa do Instagram:', conversa);
    setConversaSelecionada(conversa);
    
    // Carregar mensagens da conversa selecionada
    await carregarMensagens(conversa.sender_id);
  };

  // Marcar conversa como lida
  const marcarComoLida = async (senderId?: string) => {
    const targetSenderId = senderId || conversaSelecionada?.sender_id;
    
    if (!targetSenderId || !user?.id) {
      throw new Error('Sender ID não fornecido ou usuário não autenticado');
    }

    console.log(`📖 Marcando conversa do Instagram como lida: ${targetSenderId}`);

    try {
      // Atualizar status das mensagens recebidas para 'read' (se houver essa coluna)
      // Por enquanto, apenas recarregar as conversas
      await carregarConversas();

      return true;

    } catch (err) {
      console.error('❌ Erro ao marcar como lida:', err);
      throw err;
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    if (user?.id) {
      console.log('🚀 Iniciando carregamento de dados do Instagram para usuário:', user.id);
      carregarConversas();
    }
  }, [user?.id]);

  // Configurar realtime para novas mensagens (opcional)
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔄 Configurando realtime para mensagens do Instagram...');

    const channel = supabase
      .channel('conversas_instagram_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversas_instagram',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📸 Nova mensagem do Instagram recebida via realtime:', payload);
          
          // NOVA LÓGICA: Detectar nome em tempo real quando nova mensagem chega
          if (payload.new && payload.new.direcao?.toLowerCase() === 'received') {
            const nomeDetectado = detectarNomeNaMensagem(payload.new.mensagem);
            
            if (nomeDetectado && !payload.new.nomepersonalizado) {
              console.log(`🎯 Nome detectado em mensagem realtime: ${nomeDetectado} para ${payload.new.sender_id}`);
              
              // Salvar nome detectado automaticamente
              salvarNomeDetectado(payload.new.sender_id, nomeDetectado).then(salvou => {
                if (salvou) {
                  console.log('✅ Nome salvo automaticamente via realtime');
                  // Recarregar conversas para mostrar o nome atualizado
                  carregarConversas();
                }
              });
            }
          }
          
          // Recarregar conversas para atualizar contadores
          carregarConversas();
          
          // Se a mensagem é da conversa atual, recarregar mensagens
          if (conversaSelecionada && payload.new.sender_id === conversaSelecionada.sender_id) {
            carregarMensagens(conversaSelecionada.sender_id);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Removendo canal realtime do Instagram');
      supabase.removeChannel(channel);
    };
  }, [user?.id, conversaSelecionada?.sender_id]);


  // Função para apagar mensagem do Instagram
  const apagarMensagem = async (mensagemId: string) => {
    if (!user?.id) {
      throw new Error('Usuário não autenticado');
    }

    console.log(`🗑️ Apagando mensagem Instagram: ${mensagemId}`);

    try {
      // Apagar mensagem do banco
      const { error: deleteError } = await supabase
        .from('conversas_instagram')
        .delete()
        .eq('id', mensagemId)
        .eq('user_id', user.id); // Garantir que só pode apagar suas próprias mensagens

      if (deleteError) {
        console.error('❌ Erro ao apagar mensagem Instagram:', deleteError);
        throw deleteError;
      }

      console.log('✅ Mensagem Instagram apagada com sucesso');

      // Atualizar estado local removendo a mensagem
      setMensagens(prev => prev.filter(msg => msg.id !== mensagemId));

      // Recarregar conversas para atualizar contadores
      await carregarConversas();

      return true;

    } catch (err) {
      console.error('❌ Erro ao apagar mensagem Instagram:', err);
      throw err;
    }
  };

  // Função para enviar mensagem via Edge Function
  const enviarMensagem = async (recipientId: string, messageText: string) => {
    // Verificar se o usuário está autenticado
    if (!user?.id) {
      throw new Error('Usuário não autenticado');
    }

    // Verificar se o perfil está carregado
    if (!profile?.organization_id) {
      throw new Error('Perfil não carregado. Aguarde alguns segundos e tente novamente.');
    }

    console.log(`📤 Enviando mensagem Instagram para ${recipientId} via webhook...`);

    try {
      // Buscar a URL do webhook configurada pelo usuário
      const { data: webhookConfig, error: webhookError } = await supabase
        .from('IndInsta')
        .select('webhook_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (webhookError) {
        console.error('❌ Erro ao buscar configuração do webhook:', webhookError);
        throw new Error('Erro ao buscar configuração do webhook');
      }

      if (!webhookConfig || !webhookConfig.webhook_url) {
        throw new Error('Webhook do Instagram não configurado. Configure em Configurações > Webhook Instagram');
      }

      console.log('📡 Usando webhook configurado para enviar mensagem...');

      // Preparar payload para o webhook
      const payload = {
        action: 'send_message',
        recipient_id: recipientId,
        sender_id: recipientId,
        account_id: recipientId, // ID da conta Instagram
        message: messageText,
        pass: 'boltenv',
        timestamp: new Date().toISOString(),
        user_id: user.id,
        organization_id: profile?.organization_id,
        platform: 'instagram'
      };

      console.log('📦 Payload preparado:', payload);

      // Enviar para o webhook configurado
      const response = await fetch(webhookConfig.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro na resposta do webhook:', response.status, errorText);
        throw new Error(`Erro no webhook (${response.status}): ${errorText || response.statusText}`);
      }

      // Tentar parsear resposta como JSON, mas aceitar texto também
      let result;
      const responseText = await response.text();
      
      try {
        result = responseText ? JSON.parse(responseText) : { success: true };
      } catch (parseError) {
        // Se não conseguir parsear como JSON, assumir sucesso se status for OK
        result = { success: true, message: responseText };
      }

      console.log('✅ Mensagem Instagram enviada via webhook:', result);

      // Salvar a mensagem enviada na tabela local para histórico
      const { error: saveError } = await supabase
        .from('conversas_instagram')
        .insert({
          user_id: user.id,
          organization_id: profile?.organization_id,
          sender_id: recipientId,
          mensagem: messageText,
          direcao: 'sent', // Mensagem enviada por nós
          data_hora: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (saveError) {
        console.error('❌ Erro ao salvar mensagem no histórico:', saveError);
        // Não falhar a operação principal se não conseguir salvar no histórico
      } else {
        console.log('✅ Mensagem salva no histórico local');
      }

      // Recarregar conversas para mostrar a nova mensagem
      await carregarConversas();
      
      // Se há uma conversa selecionada com este recipient, recarregar mensagens
      if (conversaSelecionada && conversaSelecionada.sender_id === recipientId) {
        await carregarMensagens(recipientId);
      }

      return result;

    } catch (err) {
      console.error('❌ Erro ao enviar mensagem Instagram:', err);
      throw err;
    }
  };

  // Atualizar nome personalizado
  const atualizarNomePersonalizado = async (senderId: string, nomePersonalizado: string) => {
    try {
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      console.log(`✏️ Atualizando nome personalizado para ${senderId}: ${nomePersonalizado}`);

      // Atualizar todas as mensagens deste sender_id com o nome personalizado
      const { error: updateError } = await supabase
        .from('conversas_instagram')
        .update({
          nomepersonalizado: nomePersonalizado.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('sender_id', senderId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('❌ Erro ao atualizar nome personalizado:', updateError);
        throw updateError;
      }

      console.log('✅ Nome personalizado atualizado com sucesso');

      // Recarregar conversas para refletir a mudança
      await carregarConversas();

      // Se a conversa atual é a que foi atualizada, recarregar mensagens
      if (conversaSelecionada && conversaSelecionada.sender_id === senderId) {
        await carregarMensagens(senderId);
      }

      return true;
    } catch (err) {
      console.error('❌ Erro ao atualizar nome personalizado:', err);
      throw err;
    }
  };

  return {
    // Estados
    conversas,
    mensagens,
    conversaSelecionada,
    estatisticas,
    loading,
    error,

    // Ações
    carregarConversas,
    carregarMensagens,
    marcarComoLida,
    selecionarConversa,
    apagarMensagem,
    enviarMensagem,
    atualizarNomePersonalizado,

    // Setters
    setConversaSelecionada,
    setError,
  };
};