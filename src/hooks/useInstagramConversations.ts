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
}

interface ConversaInstagramAgrupada {
  sender_id: string;
  nome_contato: string;
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

  const { user } = useAuthContext();

  // Agrupar mensagens por sender_id para criar conversas dinâmicas
  const agruparMensagensPorSender = (mensagens: MensagemInstagram[]): ConversaInstagramAgrupada[] => {
    const conversasMap = new Map<string, ConversaInstagramAgrupada>();

    mensagens.forEach(mensagem => {
      const senderId = mensagem.sender_id;
      
      if (!conversasMap.has(senderId)) {
        // Criar nova conversa
        conversasMap.set(senderId, {
          sender_id: senderId,
          nome_contato: `@${senderId}`, // Usar o sender_id como nome por padrão
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
        .select('*')
        .eq('user_id', user.id)
        .order('data_hora', { ascending: false });

      if (mensagensError) {
        console.error('❌ Erro ao buscar mensagens do Instagram:', mensagensError);
        throw mensagensError;
      }

      console.log('📸 Mensagens do Instagram encontradas:', mensagensData?.length || 0);
      
      if (mensagensData && mensagensData.length > 0) {
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
        .select('*')
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

    // Setters
    setConversaSelecionada,
    setError,
  };
};