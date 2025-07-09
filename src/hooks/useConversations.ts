import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../components/AuthProvider';
import { zapiService } from '../services/zapi.service';

interface Contact {
  id: string;
  phone_number: string;
  name: string | null;
  avatar_url: string | null;
  last_contact: string | null;
}

interface Conversation {
  id: string;
  contact_id: string;
  whatsapp_number_id: string;
  status: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  numero_contato_cliente?: string;
  nome_contato_cliente?: string;
  contact?: Contact;
  last_message?: {
    content: string;
    sender_type: string;
    created_at: string;
  };
}

interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'customer' | 'ai' | 'agent';
  content: string;
  message_type: string;
  is_ai_generated: boolean;
  created_at: string;
  id_conversa?: string;
  conteudo?: string;
  remetente?: string;
}

interface ZAPIChat {
  id: string;
  name: string;
  image: string;
  isGroup: boolean;
  unreadCount: number;
  lastMessage: {
    content: string;
    timestamp: number;
    fromMe: boolean;
  };
}

interface ZAPIContact {
  name: string;
  phone: string;
  notify: string;
  short: string;
  imgUrl: string;
}

interface ZAPIChatMetadata {
  id: string;
  name: string;
  image: string;
  isGroup: boolean;
  unreadCount: number;
  messages: Array<{
    id: string;
    content: string;
    timestamp: number;
    fromMe: boolean;
    type: string;
  }>;
}

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zapiChats, setZapiChats] = useState<ZAPIChat[]>([]);
  const [zapiContacts, setZapiContacts] = useState<ZAPIContact[]>([]);
  const [chatMetadata, setChatMetadata] = useState<ZAPIChatMetadata | null>(null);
  const [autoReadEnabled, setAutoReadEnabled] = useState(true);
  const { profile } = useAuthContext();

  // Buscar chats da Z-API
  const fetchZAPIChats = async () => {
    try {
      if (!zapiService.isConfigured()) {
        console.warn('⚠️ Z-API not configured, skipping chat fetch');
        return;
      }

      console.log('📞 Fetching chats from Z-API...');
      const result = await zapiService.getChats();
      
      if (result.success && result.data) {
        setZapiChats(result.data);
        console.log('✅ Z-API chats loaded:', result.data.length);
        return result.data;
      } else {
        console.error('❌ Failed to fetch Z-API chats:', result.error);
        return [];
      }
    } catch (err) {
      console.error('❌ Error fetching Z-API chats:', err);
      return [];
    }
  };

  // Buscar contatos da Z-API
  const fetchZAPIContacts = async () => {
    try {
      if (!zapiService.isConfigured()) {
        console.warn('⚠️ Z-API not configured, skipping contacts fetch');
        return;
      }

      console.log('📞 Fetching contacts from Z-API...');
      const result = await zapiService.getContacts();
      
      if (result.success && result.data) {
        setZapiContacts(result.data);
        console.log('✅ Z-API contacts loaded:', result.data.length);
        return result.data;
      } else {
        console.error('❌ Failed to fetch Z-API contacts:', result.error);
        return [];
      }
    } catch (err) {
      console.error('❌ Error fetching Z-API contacts:', err);
      return [];
    }
  };

  // Buscar metadata de um chat específico da Z-API
  const fetchChatMetadata = async (phoneNumber: string) => {
    try {
      if (!zapiService.isConfigured()) {
        console.warn('⚠️ Z-API not configured, skipping chat metadata fetch');
        return null;
      }

      console.log(`📞 Fetching chat metadata for ${phoneNumber}...`);
      const result = await zapiService.getChatMetadata(phoneNumber);
      
      if (result.success && result.data) {
        setChatMetadata(result.data);
        console.log('✅ Chat metadata loaded:', result.data);
        return result.data;
      } else {
        console.error('❌ Failed to fetch chat metadata:', result.error);
        return null;
      }
    } catch (err) {
      console.error('❌ Error fetching chat metadata:', err);
      return null;
    }
  };

  // Buscar mensagens de um chat específico da Z-API
  const fetchChatMessages = async (phoneNumber: string, limit: number = 50) => {
    try {
      if (!zapiService.isConfigured()) {
        console.warn('⚠️ Z-API not configured, skipping chat messages fetch');
        return [];
      }

      console.log(`📨 Fetching chat messages for ${phoneNumber}...`);
      const result = await zapiService.getChatMessages(phoneNumber, limit);
      
      if (result.success && result.data) {
        console.log('✅ Chat messages loaded:', result.data.length);
        return result.data;
      } else {
        console.error('❌ Failed to fetch chat messages:', result.error);
        return [];
      }
    } catch (err) {
      console.error('❌ Error fetching chat messages:', err);
      return [];
    }
  };

  // Sincronizar chats da Z-API com Supabase - VERSÃO CORRIGIDA
  const syncChatsWithSupabase = async () => {
    try {
      if (!profile?.id || !profile?.organization_id) {
        console.warn('⚠️ Profile not available, skipping sync');
        return;
      }

      // Primeiro buscar chats da Z-API
      const chatsData = await fetchZAPIChats();
      if (!chatsData || chatsData.length === 0) {
        console.warn('⚠️ No Z-API chats to sync');
        return;
      }

      console.log('🔄 Syncing Z-API chats with Supabase...');

      // Buscar número WhatsApp do usuário
      const { data: whatsappNumber, error: whatsappError } = await supabase
        .from('whatsapp_numbers')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (whatsappError || !whatsappNumber) {
        console.warn('⚠️ WhatsApp number not found, skipping sync');
        return;
      }

      for (const chat of chatsData) {
        // CRITICAL FIX: Check if chat.id exists before processing
        if (!chat.id) {
          console.warn('⚠️ Skipping chat with undefined ID:', chat);
          continue;
        }

        // Verificar se é um grupo (ignorar grupos por enquanto)
        if (chat.isGroup) {
          continue;
        }

        // Extrair número de telefone do ID do chat
        const phoneNumber = chat.id.replace('@c.us', '').replace('@g.us', '');

        // Additional validation: ensure phoneNumber is valid
        if (!phoneNumber || phoneNumber === chat.id) {
          console.warn('⚠️ Could not extract valid phone number from chat ID:', chat.id);
          continue;
        }

        // Buscar ou criar contato
        let { data: contact, error: contactError } = await supabase
          .from('contacts')
          .select('*')
          .eq('organization_id', profile.organization_id)
          .eq('phone_number', phoneNumber)
          .maybeSingle();

        if (contactError && contactError.code !== 'PGRST116') {
          console.error('❌ Error fetching contact:', contactError);
          continue;
        }

        if (!contact) {
          // Criar novo contato
          const { data: newContact, error: createContactError } = await supabase
            .from('contacts')
            .insert({
              organization_id: profile.organization_id,
              phone_number: phoneNumber,
              name: chat.name || phoneNumber,
              avatar_url: chat.image || null,
              status: 'active',
              last_contact: new Date(chat.lastMessage.timestamp * 1000).toISOString(),
            })
            .select()
            .single();

          if (createContactError) {
            console.error('❌ Error creating contact:', createContactError);
            continue;
          }

          contact = newContact;
          console.log('➕ Created new contact:', contact.name);
        } else {
          // Atualizar contato existente
          await supabase
            .from('contacts')
            .update({
              name: chat.name || contact.name,
              avatar_url: chat.image || contact.avatar_url,
              last_contact: new Date(chat.lastMessage.timestamp * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', contact.id);
        }

        // Buscar ou criar conversa
        let { data: conversation, error: conversationError } = await supabase
          .from('conversations')
          .select('*')
          .eq('contact_id', contact.id)
          .eq('whatsapp_number_id', whatsappNumber.id)
          .maybeSingle();

        if (conversationError && conversationError.code !== 'PGRST116') {
          console.error('❌ Error fetching conversation:', conversationError);
          continue;
        }

        if (!conversation) {
          // Criar nova conversa
          const { data: newConversation, error: createConversationError } = await supabase
            .from('conversations')
            .insert({
              organization_id: profile.organization_id,
              whatsapp_number_id: whatsappNumber.id,
              contact_id: contact.id,
              status: 'open',
              last_message_at: new Date(chat.lastMessage.timestamp * 1000).toISOString(),
              numero_contato_cliente: phoneNumber,
              nome_contato_cliente: chat.name || phoneNumber,
              id_conta_whatsapp: whatsappNumber.id,
            })
            .select()
            .single();

          if (createConversationError) {
            console.error('❌ Error creating conversation:', createConversationError);
            continue;
          }

          conversation = newConversation;
          console.log('➕ Created new conversation for:', contact.name);
        } else {
          // Atualizar conversa existente
          await supabase
            .from('conversations')
            .update({
              last_message_at: new Date(chat.lastMessage.timestamp * 1000).toISOString(),
              updated_at: new Date().toISOString(),
              numero_contato_cliente: phoneNumber,
              nome_contato_cliente: chat.name || phoneNumber,
              id_conta_whatsapp: whatsappNumber.id,
            })
            .eq('id', conversation.id);
        }

        // Sincronizar mensagens do chat
        try {
          const chatMessages = await fetchChatMessages(phoneNumber, 20);
          if (chatMessages && chatMessages.length > 0) {
            for (const msg of chatMessages) {
              // Verificar se a mensagem já existe
              const { data: existingMessage } = await supabase
                .from('messages')
                .select('id')
                .eq('conversation_id', conversation.id)
                .eq('metadata->whatsapp_message_id', msg.id)
                .maybeSingle();

              if (!existingMessage) {
                // Criar nova mensagem
                await supabase
                  .from('messages')
                  .insert({
                    conversation_id: conversation.id,
                    sender_type: msg.fromMe ? 'agent' : 'customer',
                    content: msg.content || '',
                    message_type: msg.type || 'text',
                    is_ai_generated: false,
                    created_at: new Date(msg.timestamp * 1000).toISOString(),
                    metadata: {
                      whatsapp_message_id: msg.id,
                      timestamp: msg.timestamp
                    },
                    id_conversa: conversation.id,
                    conteudo: msg.content || '',
                    remetente: msg.fromMe ? 'humano' : 'cliente',
                  });
              }
            }
          }
        } catch (msgError) {
          console.warn('⚠️ Failed to sync messages for chat:', phoneNumber, msgError);
        }
      }

      console.log('✅ Chats synced with Supabase successfully');
    } catch (err) {
      console.error('❌ Error syncing chats with Supabase:', err);
    }
  };

  // Buscar conversas do Supabase
  const fetchConversations = async () => {
    try {
      setError(null);

      if (!profile?.id) {
        console.warn('⚠️ Profile not available');
        return;
      }

      // Buscar número WhatsApp do usuário
      const { data: whatsappNumber, error: whatsappError } = await supabase
        .from('whatsapp_numbers')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (whatsappError && whatsappError.code !== 'PGRST116') {
        throw whatsappError;
      }

      if (!whatsappNumber) {
        console.log('ℹ️ No WhatsApp number found for user');
        setConversations([]);
        return;
      }

      // Buscar conversas do Supabase
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          contacts (
            id,
            phone_number,
            name,
            avatar_url,
            last_contact
          )
        `)
        .eq('whatsapp_number_id', whatsappNumber.id)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Buscar última mensagem para cada conversa
      const conversationsWithLastMessage = await Promise.all(
        (data || []).map(async (conversation) => {
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content, sender_type, created_at, conteudo, remetente')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...conversation,
            last_message: lastMessage ? {
              content: lastMessage.content || lastMessage.conteudo || '',
              sender_type: lastMessage.sender_type || lastMessage.remetente || '',
              created_at: lastMessage.created_at || ''
            } : null
          };
        })
      );

      setConversations(conversationsWithLastMessage);
      console.log('✅ Conversations loaded from Supabase:', conversationsWithLastMessage.length);
    } catch (err) {
      console.error('❌ Error fetching conversations:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  useEffect(() => {
    if (!profile?.id) return;

    // Buscar dados iniciais
    const loadData = async () => {
      setLoading(true);
      
      try {
        // Primeiro sincronizar com Z-API
        await syncChatsWithSupabase();
        
        // Depois buscar conversas do Supabase
        await fetchConversations();
      } catch (err) {
        console.error('❌ Error loading conversations data:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar conversas');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Configurar realtime subscription para conversas
    const conversationsChannel = supabase
      .channel('conversations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          console.log('Conversation updated:', payload);
          fetchConversations(); // Recarregar conversas
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      setChatMetadata(null);
      return;
    }

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', selectedConversation.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        setMessages(data || []);

        // Buscar metadata do chat da Z-API se disponível
        if (selectedConversation.contact?.phone_number) {
          await fetchChatMetadata(selectedConversation.contact.phone_number);
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    fetchMessages();

    // Configurar realtime subscription para mensagens
    const messagesChannel = supabase
      .channel('messages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
        },
        (payload) => {
          console.log('Message updated:', payload);
          if (payload.eventType === 'INSERT') {
            setMessages(prev => [...prev, payload.new as Message]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [selectedConversation?.id]);

  // Enviar mensagem via Z-API e salvar no Supabase
  const sendMessage = async (phoneNumber: string, content: string) => {
    try {
      if (!selectedConversation) {
        throw new Error('Nenhuma conversa selecionada');
      }

      console.log(`📤 Sending message to ${phoneNumber}...`);

      // Enviar via Z-API
      const zapiResult = await zapiService.sendTextMessage(phoneNumber, content);
      
      if (!zapiResult.success) {
        throw new Error(zapiResult.error || 'Falha ao enviar mensagem via Z-API');
      }

      // Salvar no Supabase
      const { error: supabaseError } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_type: 'agent',
          content: content,
          message_type: 'text',
          is_ai_generated: false,
          id_conversa: selectedConversation.id,
          conteudo: content,
          remetente: 'humano',
        });

      if (supabaseError) {
        console.error('❌ Error saving message to Supabase:', supabaseError);
        throw supabaseError;
      }

      // Atualizar timestamp da conversa
      await supabase
        .from('conversations')
        .update({ 
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedConversation.id);

      console.log('✅ Message sent and saved successfully');
      return zapiResult;
    } catch (err) {
      console.error('❌ Error sending message:', err);
      throw err;
    }
  };

  // Marcar mensagem como lida via Z-API
  const markAsRead = async (phoneNumber: string, messageId?: string) => {
    try {
      console.log(`📖 Marking messages as read for ${phoneNumber}...`);
      
      const result = await zapiService.markMessageAsRead(phoneNumber, messageId);
      
      if (result.success) {
        console.log('✅ Messages marked as read successfully');
      }
      
      return result;
    } catch (err) {
      console.error('❌ Error marking messages as read:', err);
      throw err;
    }
  };

  // Modificar chat (marcar como lido, arquivar, etc.)
  const modifyChat = async (phoneNumber: string, action: 'read' | 'unread' | 'archive' | 'unarchive' | 'pin' | 'unpin') => {
    try {
      console.log(`💬 Modifying chat ${phoneNumber} with action: ${action}...`);
      
      const result = await zapiService.modifyChat(phoneNumber, action);
      
      if (result.success) {
        console.log('✅ Chat modified successfully');
        
        // Atualizar estado local se necessário
        if (action === 'read' || action === 'unread') {
          // Recarregar chats para refletir mudanças
          await fetchZAPIChats();
        }
      }
      
      return result;
    } catch (err) {
      console.error('❌ Error modifying chat:', err);
      throw err;
    }
  };

  // Buscar metadata de contato da Z-API
  const getContactMetadata = async (phoneNumber: string) => {
    try {
      console.log(`📞 Getting contact metadata for ${phoneNumber}...`);
      
      const result = await zapiService.getContactMetadata(phoneNumber);
      
      if (result.success) {
        console.log('✅ Contact metadata retrieved:', result.data);
      }
      
      return result;
    } catch (err) {
      console.error('❌ Error getting contact metadata:', err);
      throw err;
    }
  };

  // Atualizar leitura automática
  const updateAutoRead = async (enable: boolean) => {
    try {
      console.log(`📖 ${enable ? 'Enabling' : 'Disabling'} auto-read...`);
      
      const result = await zapiService.updateAutoReadMessage(enable);
      
      if (result.success) {
        setAutoReadEnabled(enable);
        console.log(`✅ Auto-read ${enable ? 'enabled' : 'disabled'} successfully`);
      }
      
      return result;
    } catch (err) {
      console.error('❌ Error updating auto-read:', err);
      throw err;
    }
  };

  // Sincronizar dados manualmente
  const syncData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Manual sync requested...');
      
      // Sincronizar com Z-API e Supabase
      await syncChatsWithSupabase();
      
      // Recarregar conversas
      await fetchConversations();
      
      console.log('✅ Manual sync completed');
    } catch (err) {
      console.error('❌ Error during manual sync:', err);
      setError(err instanceof Error ? err.message : 'Erro na sincronização');
    } finally {
      setLoading(false);
    }
  };

  return {
    conversations,
    messages,
    selectedConversation,
    loading,
    error,
    zapiChats,
    zapiContacts,
    chatMetadata,
    autoReadEnabled,
    setSelectedConversation,
    sendMessage,
    markAsRead,
    modifyChat,
    getContactMetadata,
    updateAutoRead,
    syncData,
    fetchZAPIChats,
    fetchZAPIContacts,
    fetchChatMetadata,
    fetchChatMessages,
    syncChatsWithSupabase,
  };
};