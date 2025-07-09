import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../components/AuthProvider';

interface MensagemWhatsApp {
  id: string;
  conversa_id: string;
  numero: string;
  mensagem: string;
  direcao: 'sent' | 'received';
  data_hora: string;
  nome_contato: string;
  tipo_mensagem: string;
  status_entrega: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

interface ConversaAgrupada {
  conversa_id: string;
  numero_contato: string;
  nome_contato: string;
  ultima_mensagem: string;
  ultima_atividade: string;
  total_mensagens: number;
  nao_lidas: number;
  status: string;
  mensagens: MensagemWhatsApp[];
}

interface EstatisticasConversas {
  total_conversas: number;
  conversas_ativas: number;
  mensagens_nao_lidas: number;
  ultima_atividade: string;
}

export const useWhatsAppConversations = () => {
  const [conversas, setConversas] = useState<ConversaAgrupada[]>([]);
  const [mensagens, setMensagens] = useState<MensagemWhatsApp[]>([]);
  const [conversaSelecionada, setConversaSelecionada] = useState<ConversaAgrupada | null>(null);
  const [estatisticas, setEstatisticas] = useState<EstatisticasConversas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user, profile } = useAuthContext();

  // Configuração da Z-API
  const ZAPI_CONFIG = {
    instanceId: '3E34EADF8CD1007B145E2A88B4975A95',
    token: '7C19DEAA164FD4EF8312E717',
    clientToken: 'F4a554efd9a4b4e51903dda0db517ffcaS',
    baseUrl: 'https://api.z-api.io/instances/3E34EADF8CD1007B145E2A88B4975A95/token/7C19DEAA164FD4EF8312E717'
  };

  // Debug: verificar dados das tabelas DIRETAMENTE
  const debugTabelas = async () => {
    try {
      console.log('🔍 DEBUG: Verificando dados da tabela mensagens_whatsapp...');
      
      if (!user?.id) {
        console.log('❌ Usuário não autenticado');
        return;
      }

      // Buscar mensagens diretamente da tabela
      const { data: mensagensRaw, error: mensagensError } = await supabase
        .from('mensagens_whatsapp')
        .select('*')
        .eq('user_id', user.id)
        .order('data_hora', { ascending: false })
        .limit(20);

      console.log('📨 MENSAGENS RAW:', mensagensRaw);
      console.log('❌ MENSAGENS ERROR:', mensagensError);

      // Contar totais
      const { count: totalMensagens } = await supabase
        .from('mensagens_whatsapp')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      console.log('📊 TOTAL MENSAGENS:', totalMensagens);

      return {
        mensagens: mensagensRaw || [],
        totalMensagens
      };

    } catch (err) {
      console.error('❌ Erro no debug:', err);
    }
  };

  // Agrupar mensagens por conversa_id para criar conversas dinâmicas
  const agruparMensagensPorConversa = (mensagens: MensagemWhatsApp[]): ConversaAgrupada[] => {
    const conversasMap = new Map<string, ConversaAgrupada>();

    mensagens.forEach(mensagem => {
      const conversaId = mensagem.conversa_id;
      
      if (!conversasMap.has(conversaId)) {
        // Criar nova conversa
        conversasMap.set(conversaId, {
          conversa_id: conversaId,
          numero_contato: mensagem.numero,
          nome_contato: mensagem.nome_contato || mensagem.numero,
          ultima_mensagem: mensagem.mensagem,
          ultima_atividade: mensagem.data_hora,
          total_mensagens: 0,
          nao_lidas: 0,
          status: 'ativa',
          mensagens: []
        });
      }

      const conversa = conversasMap.get(conversaId)!;
      
      // Adicionar mensagem à conversa
      conversa.mensagens.push(mensagem);
      conversa.total_mensagens++;
      
      // Atualizar última mensagem se for mais recente
      if (new Date(mensagem.data_hora) > new Date(conversa.ultima_atividade)) {
        conversa.ultima_mensagem = mensagem.mensagem;
        conversa.ultima_atividade = mensagem.data_hora;
        conversa.nome_contato = mensagem.nome_contato || mensagem.numero;
      }
      
      // Contar mensagens não lidas (received)
      if (mensagem.direcao === 'received' && mensagem.status_entrega !== 'read') {
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

      console.log('📞 Carregando mensagens para criar conversas dinamicamente para usuário:', user.id);

      // Buscar todas as mensagens do usuário
      const { data: mensagensData, error: mensagensError } = await supabase
        .from('mensagens_whatsapp')
        .select('*')
        .eq('user_id', user.id)
        .order('data_hora', { ascending: false });

      if (mensagensError) {
        console.error('❌ Erro ao buscar mensagens:', mensagensError);
        throw mensagensError;
      }

      console.log('📨 Mensagens encontradas:', mensagensData?.length || 0);
      
      if (mensagensData && mensagensData.length > 0) {
        // Agrupar mensagens por conversa
        const conversasAgrupadas = agruparMensagensPorConversa(mensagensData);
        setConversas(conversasAgrupadas);
        
        console.log('📋 Conversas criadas dinamicamente:', conversasAgrupadas.length);
        
        // Calcular estatísticas
        const stats = {
          total_conversas: conversasAgrupadas.length,
          conversas_ativas: conversasAgrupadas.filter(c => c.status === 'ativa').length,
          mensagens_nao_lidas: conversasAgrupadas.reduce((sum, c) => sum + c.nao_lidas, 0),
          ultima_atividade: conversasAgrupadas[0]?.ultima_atividade || ''
        };
        
        console.log('📊 Estatísticas calculadas:', stats);
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
      console.error('❌ Erro ao carregar conversas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Carregar mensagens de uma conversa específica
  const carregarMensagens = async (conversaId: string) => {
    try {
      console.log(`📨 Carregando mensagens da conversa: ${conversaId}`);

      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      const { data: mensagensData, error: mensagensError } = await supabase
        .from('mensagens_whatsapp')
        .select('*')
        .eq('conversa_id', conversaId)
        .eq('user_id', user.id)
        .order('data_hora', { ascending: true });

      if (mensagensError) {
        console.error('❌ Erro ao buscar mensagens:', mensagensError);
        throw mensagensError;
      }

      console.log('📨 Mensagens encontradas:', mensagensData?.length || 0);
      
      setMensagens(mensagensData || []);

    } catch (err) {
      console.error('❌ Erro ao carregar mensagens:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar mensagens');
    }
  };

  // Enviar mensagem via Z-API
  const enviarViaZAPI = async (numero: string, mensagem: string): Promise<any> => {
    try {
      console.log(`📤 Enviando mensagem via Z-API para ${numero}...`);

      const url = `${ZAPI_CONFIG.baseUrl}/send-text`;
      
      const payload = {
        phone: numero,
        message: mensagem
      };

      console.log('📡 URL Z-API:', url);
      console.log('📦 Payload:', payload);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': ZAPI_CONFIG.clientToken
        },
        body: JSON.stringify(payload)
      });

      console.log(`📡 Status da resposta Z-API: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro na resposta Z-API:', errorText);
        throw new Error(`Erro Z-API (${response.status}): ${errorText}`);
      }

      const resultado = await response.json();
      console.log('✅ Resposta Z-API:', resultado);

      return resultado;

    } catch (err) {
      console.error('❌ Erro ao enviar via Z-API:', err);
      throw err;
    }
  };

  // Enviar mensagem usando numero_contato da conversa selecionada
  const enviarMensagem = async (mensagemTexto: string) => {
    if (!conversaSelecionada || !user?.id) {
      throw new Error('Conversa não selecionada ou usuário não autenticado');
    }

    console.log(`📤 Iniciando envio de mensagem para conversa ${conversaSelecionada.conversa_id}...`);

    try {
      const numeroContato = conversaSelecionada.numero_contato;
      
      if (!numeroContato) {
        throw new Error('Número do contato não encontrado na conversa selecionada');
      }

      console.log(`📞 Número identificado da conversa: ${numeroContato}`);
      
      // PASSO 1: Enviar via Z-API
      const resultadoZAPI = await enviarViaZAPI(numeroContato, mensagemTexto);
      
      // PASSO 2: Salvar mensagem no banco com direção "sent"
      console.log('💾 Salvando mensagem no banco com direção "sent"...');
      
      const { data: resultado, error: envioError } = await supabase
        .rpc('inserir_mensagem_whatsapp', {
          p_conversa_id: conversaSelecionada.conversa_id,
          p_numero: numeroContato,
          p_mensagem: mensagemTexto,
          p_direcao: 'sent', // DIREÇÃO CORRETA: "sent" = mensagem ENVIADA
          p_data_hora: new Date().toISOString(),
          p_nome_contato: conversaSelecionada.nome_contato,
          p_user_id: user.id,
          p_organization_id: profile?.organization_id,
          p_tipo_mensagem: 'text',
          p_status_entrega: 'sent',
          p_metadata: {
            zapi_response: resultadoZAPI,
            sent_via: 'z-api',
            timestamp: new Date().toISOString()
          }
        });

      if (envioError) {
        console.error('❌ Erro ao salvar mensagem no banco:', envioError);
        throw envioError;
      }

      console.log('✅ Mensagem enviada via Z-API e salva no banco. ID:', resultado);

      // PASSO 3: Recarregar dados
      await carregarMensagens(conversaSelecionada.conversa_id);
      await carregarConversas();

      return {
        success: true,
        mensagem_id: resultado,
        zapi_response: resultadoZAPI,
        numero_contato: numeroContato
      };

    } catch (err) {
      console.error('❌ Erro no processo de envio:', err);
      throw err;
    }
  };

  // Marcar conversa como lida
  const marcarComoLida = async (conversaId?: string) => {
    const targetConversaId = conversaId || conversaSelecionada?.conversa_id;
    
    if (!targetConversaId || !user?.id) {
      throw new Error('ID da conversa não fornecido ou usuário não autenticado');
    }

    console.log(`📖 Marcando conversa como lida: ${targetConversaId}`);

    try {
      // Atualizar status das mensagens recebidas para 'read'
      const { error: updateError } = await supabase
        .from('mensagens_whatsapp')
        .update({
          status_entrega: 'read',
          updated_at: new Date().toISOString()
        })
        .eq('conversa_id', targetConversaId)
        .eq('user_id', user.id)
        .eq('direcao', 'received')
        .neq('status_entrega', 'read');

      if (updateError) {
        console.error('❌ Erro ao marcar como lida:', updateError);
        throw updateError;
      }

      console.log('✅ Conversa marcada como lida');
      
      // Recarregar conversas para atualizar contadores
      await carregarConversas();

      return true;

    } catch (err) {
      console.error('❌ Erro ao marcar como lida:', err);
      throw err;
    }
  };

  // Selecionar conversa
  const selecionarConversa = async (conversa: ConversaAgrupada) => {
    console.log('🎯 Selecionando conversa:', conversa);
    setConversaSelecionada(conversa);
    
    // Carregar mensagens da conversa selecionada
    await carregarMensagens(conversa.conversa_id);
    
    // Marcar como lida automaticamente se houver mensagens não lidas
    if (conversa.nao_lidas > 0) {
      await marcarComoLida(conversa.conversa_id);
    }
  };

  // Testar sistema usando a função do banco
  const testarSistema = async () => {
    try {
      console.log('🧪 Criando dados de teste via função do banco...');

      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      // Usar a função do banco para criar dados de teste
      const { data: resultado, error: testeError } = await supabase
        .rpc('testar_sistema_whatsapp');

      if (testeError) {
        console.error('❌ Erro no teste:', testeError);
        throw testeError;
      }

      console.log('✅ Teste executado com sucesso:', resultado);

      // Recarregar dados
      await carregarConversas();

      return resultado;

    } catch (err) {
      console.error('❌ Erro no teste:', err);
      throw err;
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    if (user?.id) {
      console.log('🚀 Iniciando carregamento de dados para usuário:', user.id);
      carregarConversas();
    }
  }, [user?.id]);

  // Configurar realtime para novas mensagens
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔄 Configurando realtime para mensagens...');

    const channel = supabase
      .channel('mensagens_whatsapp_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens_whatsapp',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📨 Nova mensagem recebida via realtime:', payload);
          
          // Recarregar conversas para atualizar contadores
          carregarConversas();
          
          // Se a mensagem é da conversa atual, recarregar mensagens
          if (conversaSelecionada && payload.new.conversa_id === conversaSelecionada.conversa_id) {
            carregarMensagens(conversaSelecionada.conversa_id);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Removendo canal realtime');
      supabase.removeChannel(channel);
    };
  }, [user?.id, conversaSelecionada?.conversa_id]);

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
    enviarMensagem,
    marcarComoLida,
    selecionarConversa,
    testarSistema,
    debugTabelas,

    // Setters
    setConversaSelecionada,
    setError,
  };
};