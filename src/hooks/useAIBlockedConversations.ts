import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../components/AuthProvider';

interface AIBlockedConversation {
  id: string;
  conversa_id: string;
  user_id: string;
  organization_id: string;
  created_at: string;
}

export const useAIBlockedConversations = () => {
  const [blockedConversations, setBlockedConversations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuthContext();

  // Carregar conversas bloqueadas
  const loadBlockedConversations = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      console.log('🔍 Carregando conversas com IA bloqueada para usuário:', user.id);

      const { data, error: fetchError } = await supabase
        .from('ai_blocked_conversations')
        .select('conversa_id')
        .eq('user_id', user.id);

      if (fetchError) {
        console.error('❌ Erro ao buscar conversas bloqueadas:', fetchError);
        throw fetchError;
      }

      const blockedIds = data?.map(item => item.conversa_id) || [];
      console.log('🚫 Conversas bloqueadas encontradas:', blockedIds.length);
      setBlockedConversations(blockedIds);
    } catch (err) {
      console.error('❌ Erro ao carregar conversas bloqueadas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Verificar se uma conversa está bloqueada
  const isConversationBlocked = (conversaId: string): boolean => {
    return blockedConversations.includes(conversaId);
  };

  // Bloquear uma conversa (desativar IA)
  const blockConversation = async (conversaId: string): Promise<boolean> => {
    try {
      if (!user?.id || !profile?.organization_id) {
        throw new Error('Usuário ou organização não encontrados');
      }

      console.log(`🚫 Bloqueando IA para conversa: ${conversaId}`);

      const { error: upsertError } = await supabase
        .from('ai_blocked_conversations')
        .upsert({
          conversa_id: conversaId,
          user_id: user.id,
          organization_id: profile.organization_id
        }, {
          onConflict: 'user_id,conversa_id'
        });

      if (upsertError) {
        console.error('❌ Erro ao bloquear conversa:', upsertError);
        throw upsertError;
      }

      // Atualizar estado local
      setBlockedConversations(prev => {
        if (!prev.includes(conversaId)) {
          return [...prev, conversaId];
        }
        return prev;
      });
      console.log('✅ Conversa bloqueada com sucesso');
      return true;
    } catch (err) {
      console.error('❌ Erro ao bloquear conversa:', err);
      setError(err instanceof Error ? err.message : 'Erro ao bloquear conversa');
      return false;
    }
  };

  // Desbloquear uma conversa (ativar IA)
  const unblockConversation = async (conversaId: string): Promise<boolean> => {
    try {
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      console.log(`✅ Desbloqueando IA para conversa: ${conversaId}`);

      const { error: deleteError } = await supabase
        .from('ai_blocked_conversations')
        .delete()
        .eq('conversa_id', conversaId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('❌ Erro ao desbloquear conversa:', deleteError);
        throw deleteError;
      }

      // Atualizar estado local
      setBlockedConversations(prev => prev.filter(id => id !== conversaId));
      console.log('✅ Conversa desbloqueada com sucesso');
      return true;
    } catch (err) {
      console.error('❌ Erro ao desbloquear conversa:', err);
      setError(err instanceof Error ? err.message : 'Erro ao desbloquear conversa');
      return false;
    }
  };

  // Alternar estado de bloqueio
  const toggleConversationBlock = async (conversaId: string): Promise<boolean> => {
    if (isConversationBlocked(conversaId)) {
      return await unblockConversation(conversaId);
    } else {
      return await blockConversation(conversaId);
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    if (user?.id) {
      loadBlockedConversations();
    }
  }, [user?.id]);

  // Configurar realtime para atualizações
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔄 Configurando realtime para conversas bloqueadas...');

    const channel = supabase
      .channel('ai_blocked_conversations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_blocked_conversations',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Mudança detectada em conversas bloqueadas:', payload);
          loadBlockedConversations();
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Removendo canal realtime de conversas bloqueadas');
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return {
    blockedConversations,
    loading,
    error,
    isConversationBlocked,
    blockConversation,
    unblockConversation,
    toggleConversationBlock,
    loadBlockedConversations
  };
};