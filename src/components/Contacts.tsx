import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  MessageSquare,
  Send,
  Building,
  Target,
  Zap,
  Clock,
  UserCheck,
  Ban,
  Bot,
  User,
  Sparkles
} from 'lucide-react';
import { useAuthContext } from './AuthProvider';
import { supabase } from '../lib/supabase';
import { zapiService } from '../services/zapi.service';

interface Contact {
  id: string;
  organization_id: string;
  phone_number: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  location: string | null;
  tags: string[] | null;
  metadata: any;
  status: string;
  last_contact: string | null;
  created_at: string;
  updated_at: string;
}

interface LeadB2B {
  id: string;
  nomenegocio: string;
  numero: string;
  user_id: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

interface GeneratedLead {
  nome: string;
  numero: string;
  segmento: string;
  cidade: string;
  isNew?: boolean;
}

interface SentMessage {
  numero: string;
  timestamp: string;
  message: string;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  isTyping?: boolean;
  leads?: GeneratedLead[];
  showContactActions?: boolean;
}

interface SavedLeadB2B {
  id: string;
  nomenegocio: string;
  numero: string;
  user_id: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

const Contacts: React.FC = () => {
  const { user, profile } = useAuthContext();
  const [activeTab, setActiveTab] = useState<'contacts' | 'leads-generator'>('leads-generator');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leadsB2B, setLeadsB2B] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadB2B | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [waitingForLeads, setWaitingForLeads] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [generatedLeads, setGeneratedLeads] = useState<GeneratedLead[]>([]);
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [sendingMessages, setSendingMessages] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    phone_number: '',
    email: '',
    location: '',
    tags: [] as string[]
  });

  // Estados para o chat do gerador de leads
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: 'Olá! Sou seu assistente de geração de leads B2B. Como posso ajudá-lo hoje?',
      sender: 'assistant',
      timestamp: new Date(),
    }
  ]);
  const [extractedContacts, setExtractedContacts] = useState<Array<{
    id: string;
    nome: string;
    numero: string;
    endereco?: string;
    source: string;
  }>>([]);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingBulkMessage, setSendingBulkMessage] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [savedLeads, setSavedLeads] = useState<SavedLeadB2B[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Função para extrair contatos da resposta do N8N
  const extractContactsFromResponse = (responseText: string) => {
    const contacts: Array<{id: string; nome: string; numero: string; endereco?: string; source: string}> = [];
    
    // Regex para encontrar padrões de nome e telefone
    const patterns = [
      // Padrão: Nome - Telefone
      /([A-Za-zÀ-ÿ\s]+)\s*[-–—]\s*(\+?55\s*\(?[1-9]{2}\)?\s*9?\d{4}[-\s]?\d{4})/g,
      // Padrão: Nome: Telefone
      /([A-Za-zÀ-ÿ\s]+):\s*(\+?55\s*\(?[1-9]{2}\)?\s*9?\d{4}[-\s]?\d{4})/g,
      // Padrão: Nome (Telefone)
      /([A-Za-zÀ-ÿ\s]+)\s*\(\s*(\+?55\s*\(?[1-9]{2}\)?\s*9?\d{4}[-\s]?\d{4})\s*\)/g,
      // Padrão: Nome | Telefone
      /([A-Za-zÀ-ÿ\s]+)\s*\|\s*(\+?55\s*\(?[1-9]{2}\)?\s*9?\d{4}[-\s]?\d{4})/g,
      // Padrão mais flexível: qualquer nome seguido de número
      /([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]{2,30})\s+(\+?55\s*\(?[1-9]{2}\)?\s*9?\d{4}[-\s]?\d{4})/g
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(responseText)) !== null) {
        const nome = match[1].trim();
        const numero = match[2].replace(/\D/g, ''); // Remove formatação
        
        // Validar se o nome não é muito curto e o número tem tamanho correto
        if (nome.length >= 3 && numero.length >= 10 && numero.length <= 13) {
          // Verificar se já não foi adicionado
          const exists = contacts.some(c => c.numero === numero || c.nome.toLowerCase() === nome.toLowerCase());
          if (!exists) {
            contacts.push({
              id: `contact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              nome,
              numero,
              source: responseText.substring(Math.max(0, match.index - 50), match.index + match[0].length + 50)
            });
          }
        }
      }
    });

    // Se não encontrou contatos com regex, tentar buscar apenas números
    if (contacts.length === 0) {
      const phonePattern = /(\+?55\s*\(?[1-9]{2}\)?\s*9?\d{4}[-\s]?\d{4})/g;
      let phoneMatch;
      let phoneIndex = 1;
      
      while ((phoneMatch = phonePattern.exec(responseText)) !== null) {
        const numero = phoneMatch[1].replace(/\D/g, '');
        
        if (numero.length >= 10 && numero.length <= 13) {
          const exists = contacts.some(c => c.numero === numero);
          if (!exists) {
            contacts.push({
              id: `phone-${Date.now()}-${phoneIndex}`,
              nome: `Contato ${phoneIndex}`,
              numero,
              source: responseText.substring(Math.max(0, phoneMatch.index - 30), phoneMatch.index + phoneMatch[0].length + 30)
            });
            phoneIndex++;
          }
        }
      }
    }

    return contacts;
  };

  // Função para enviar mensagem individual
  const sendMessageToContact = async (contact: {nome: string; numero: string}) => {
    if (!messageText.trim()) {
      setError('Digite uma mensagem antes de enviar');
      return;
    }

    try {
      setSendingMessage(true);
      setError(null);

      // Verificar se Z-API está configurada
      if (!zapiService.isConfigured()) {
        throw new Error('Z-API não configurada. Configure em Configurações > Integração Z-API');
      }

      console.log(`📤 Enviando mensagem para ${contact.nome} (${contact.numero})...`);

      const result = await zapiService.sendTextMessage(contact.numero, messageText.trim());

      if (!result.success) {
        throw new Error(result.error || 'Falha ao enviar mensagem');
      }

      setSuccess(`✅ Mensagem enviada para ${contact.nome}!`);
      setShowMessageModal(false);
      setMessageText('');
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      console.error('❌ Erro ao enviar mensagem:', err);
      setError(err instanceof Error ? err.message : 'Erro ao enviar mensagem');
    } finally {
      setSendingMessage(false);
    }
  };

  // Função para enviar mensagem para todos os contatos
  const sendBulkMessage = async () => {
    if (!messageText.trim()) {
      setError('Digite uma mensagem antes de enviar');
      return;
    }

    if (extractedContacts.length === 0) {
      setError('Nenhum contato encontrado para enviar mensagem');
      return;
    }

    try {
      setSendingBulkMessage(true);
      setError(null);

      // Verificar se Z-API está configurada
      if (!zapiService.isConfigured()) {
        throw new Error('Z-API não configurada. Configure em Configurações > Integração Z-API');
      }

      console.log(`📤 Enviando mensagem para ${extractedContacts.length} contatos...`);

      let successCount = 0;
      let errorCount = 0;

      for (const contact of extractedContacts) {
        try {
          const result = await zapiService.sendTextMessage(contact.numero, messageText.trim());
          
          if (result.success) {
            successCount++;
            console.log(`✅ Mensagem enviada para ${contact.nome}`);
          } else {
            errorCount++;
            console.error(`❌ Falha ao enviar para ${contact.nome}:`, result.error);
          }
          
          // Pequeno delay entre envios para não sobrecarregar
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
          errorCount++;
          console.error(`❌ Erro ao enviar para ${contact.nome}:`, err);
        }
      }

      setSuccess(`✅ Mensagens enviadas! ${successCount} sucessos, ${errorCount} falhas`);
      setShowMessageModal(false);
      setMessageText('');
      setTimeout(() => setSuccess(null), 5000);

    } catch (err) {
      console.error('❌ Erro no envio em massa:', err);
      setError(err instanceof Error ? err.message : 'Erro no envio em massa');
    } finally {
      setSendingBulkMessage(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isTyping]);

  // Carregar leads salvos
  const loadSavedLeads = async () => {
    try {
      setLeadsLoading(true);
      
      if (!user?.id || !profile?.organization_id) {
        throw new Error('Usuário ou organização não encontrados');
      }

      console.log('📋 Carregando leads B2B salvos...');

      const { data: leadsData, error: leadsError } = await supabase
        .from('leadsb2b')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (leadsError) {
        console.error('❌ Erro ao buscar leads salvos:', leadsError);
        throw leadsError;
      }

      console.log('✅ Leads salvos carregados:', leadsData?.length || 0);
      setSavedLeads(leadsData || []);

    } catch (err) {
      console.error('❌ Erro ao carregar leads salvos:', err);
    } finally {
      setLeadsLoading(false);
    }
  };

  // Carregar leads B2B da tabela leadsb2b
  const loadLeadsB2B = async () => {
    try {
      setLoadingLeads(true);
      setError(null);

      if (!user?.id || !profile?.organization_id) {
        throw new Error('Usuário ou organização não encontrados');
      }

      console.log('📋 Carregando leads B2B da tabela leadsb2b...');

      const { data: leadsData, error: leadsError } = await supabase
        .from('leadsb2b')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (leadsError) {
        console.error('❌ Erro ao buscar leads B2B:', leadsError);
        throw leadsError;
      }

      console.log('✅ Leads B2B carregados:', leadsData?.length || 0);
      setLeadsB2B(leadsData || []);

    } catch (err) {
      console.error('❌ Erro ao carregar leads B2B:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoadingLeads(false);
    }
  };

  // Carregar leads quando mudar para aba de contatos
  useEffect(() => {
    if (activeTab === 'contacts' && user?.id && profile?.organization_id) {
      loadLeadsB2B();
    }
  }, [activeTab, user?.id, profile?.organization_id]);

  // Carregar leads salvos quando o componente montar
  useEffect(() => {
    if (user?.id && profile?.organization_id && activeTab === 'contacts') {
      loadSavedLeads();
    }
  }, [user?.id, profile?.organization_id, activeTab]);

  // Carregar dados iniciais
  useEffect(() => {
    if (user?.id && profile?.organization_id) {
      if (activeTab === 'contacts') {
        loadContacts();
      } else {
        loadLeadsB2B();
      }
    }
  }, [user?.id, profile?.organization_id, activeTab]);

  // Carregar mensagens enviadas do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sentLeadMessages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSentMessages(parsed);
      } catch (e) {
        console.warn('Erro ao carregar mensagens enviadas:', e);
      }
    }
  }, []);

  // Salvar mensagens enviadas no localStorage
  const saveSentMessages = (messages: SentMessage[]) => {
    localStorage.setItem('sentLeadMessages', JSON.stringify(messages));
  };

  // Verificar se já enviou mensagem para um número
  const hasMessageBeenSent = (numero: string): boolean => {
    return sentMessages.some(msg => msg.numero === numero);
  };

  // Adicionar mensagem à lista de enviadas
  const addSentMessage = (numero: string, message: string) => {
    const newMessage: SentMessage = {
      numero,
      timestamp: new Date().toISOString(),
      message
    };
    
    const updatedMessages = [...sentMessages, newMessage];
    setSentMessages(updatedMessages);
    saveSentMessages(updatedMessages);
  };

  // Limpar histórico de mensagens enviadas
  const clearSentMessages = () => {
    setSentMessages([]);
    localStorage.removeItem('sentLeadMessages');
  };

  const loadContacts = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id || !profile?.organization_id) {
        throw new Error('Usuário ou organização não encontrados');
      }

      const { data, error: fetchError } = await supabase
        .from('contacts')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setContacts(data || []);
    } catch (err) {
      console.error('❌ Erro ao carregar contatos:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Processar mensagem do usuário e extrair parâmetros
  const processUserMessage = (message: string) => {
    const messageLower = message.toLowerCase();
    
    // Extrair quantidade
    const quantityMatch = message.match(/(\d+)\s*leads?/i) || message.match(/gere?\s*(\d+)/i);
    const quantidade = quantityMatch ? parseInt(quantityMatch[1]) : 50;
    
    // Extrair segmento/nicho
    let segmento = '';
    const segmentoPatterns = [
      /(?:de|para)\s+([a-záàâãéèêíïóôõöúçñ\s]+?)(?:\s+em|\s+na|\s+no|$)/i,
      /leads?\s+(?:de|para)\s+([a-záàâãéèêíïóôõöúçñ\s]+?)(?:\s+em|\s+na|\s+no|$)/i,
      /(restaurantes?|clínicas?|lojas?|farmácias?|academias?|salões?|barbearias?|escritórios?|consultórios?|empresas?|comércios?|serviços?)/i
    ];
    
    for (const pattern of segmentoPatterns) {
      const match = message.match(pattern);
      if (match) {
        segmento = match[1].trim();
        break;
      }
    }
    
    // Extrair cidade
    let cidade = '';
    const cidadePatterns = [
      /(?:em|na|no)\s+([a-záàâãéèêíïóôõöúçñ\s]+?)(?:\s*$|\s*,|\s*\.)/i,
      /(são paulo|rio de janeiro|belo horizonte|salvador|brasília|fortaleza|recife|porto alegre|curitiba|goiânia)/i
    ];
    
    for (const pattern of cidadePatterns) {
      const match = message.match(pattern);
      if (match) {
        cidade = match[1].trim();
        break;
      }
    }
    
    return { quantidade, segmento, cidade };
  };

  // Gerar leads baseado na mensagem do usuário
  const generateLeadsFromMessage = async (userMessage: string) => {
    try {
      setIsGenerating(true);
      setIsTyping(true);
      setError(null);
      setWaitingForLeads(true);

      const response = await fetch('https://n8n.atendos.com.br/webhook/leads-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          user_id: user?.id,
          organization_id: profile?.organization_id,
          timestamp: new Date().toISOString(),
          session_id: `leads_${Date.now()}`
        }),
      });

      // Verificar se a resposta foi bem-sucedida
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}. Resposta: ${errorText}`);
      }

      // Processar resposta do N8N
      const contentType = response.headers.get('content-type');
      let responseText = '';
      
      if (contentType && contentType.includes('application/json')) {
        try {
          const data = await response.json();
          responseText = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        } catch (jsonError) {
          console.warn('⚠️ Resposta marcada como JSON mas não é válida, lendo como texto');
          responseText = await response.text();
        }
      } else {
        responseText = await response.text();
      }

      console.log('✅ Resposta do N8N recebida:', responseText.substring(0, 200) + '...');
      
      // Extrair contatos da resposta
      const contacts = extractContactsFromResponse(responseText);
      setExtractedContacts(contacts);
      
      console.log(`📞 ${contacts.length} contatos extraídos da resposta`);
      
      // Adicionar resposta do N8N ao chat
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: responseText,
        sender: 'assistant',
        timestamp: new Date(),
      };

      setChatMessages(prev => [...prev, assistantMessage]);
      
      // Se encontrou contatos, mostrar opções de envio
      if (contacts.length > 0) {
        setTimeout(() => {
          const contactsMessage: ChatMessage = {
            id: (Date.now() + 2).toString(),
            content: `📞 Encontrei ${contacts.length} contato${contacts.length !== 1 ? 's' : ''} com número de telefone. Deseja enviar mensagem?`,
            sender: 'assistant',
            timestamp: new Date(),
            showContactActions: true
          };
          setChatMessages(prev => [...prev, contactsMessage]);
        }, 1000);
      }

      setSuccess('✅ Leads gerados com sucesso via N8N!');
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      console.error('❌ Erro ao gerar leads via N8N:', err);
      
      // Mostrar erro na conversa
      const errorMessage: ChatMessage = {
        id: `ai-error-${Date.now()}`,
        content: `❌ Erro ao buscar leads via N8N: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
        sender: 'assistant',
        timestamp: new Date(),
      };
      
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      setWaitingForLeads(false);
      setIsGenerating(false);
    }
  };

  // Enviar mensagem no chat
  const handleSendChatMessage = async () => {
    if (!inputMessage.trim() || isGenerating) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      content: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    const currentMessage = inputMessage.trim();
    setInputMessage('');

    // Processar mensagem
    await generateLeadsFromMessage(currentMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChatMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const sendBulkMessages = async () => {
    if (!customMessage.trim()) {
      setError('Digite uma mensagem para enviar aos leads');
      return;
    }

    if (!zapiService.isConfigured()) {
      setError('Z-API não configurada. Configure em Configurações > Integração Z-API');
      return;
    }

    try {
      setSendingMessages(true);
      setError(null);
      setSuccess(null);

      const leadsToSend = generatedLeads.filter(lead => !hasMessageBeenSent(lead.numero));

      if (leadsToSend.length === 0) {
        setError('Todos os leads desta lista já receberam mensagens anteriormente');
        return;
      }

      console.log(`📤 Enviando mensagens para ${leadsToSend.length} leads (${generatedLeads.length - leadsToSend.length} já enviadas anteriormente)...`);

      let successCount = 0;
      let errorCount = 0;

      for (const lead of leadsToSend) {
        try {
          const personalizedMessage = customMessage
            .replace('{segmento}', lead.segmento)
            .replace('{cidade}', lead.cidade);

          const result = await zapiService.sendTextMessage(lead.numero, personalizedMessage);

          if (result.success) {
            successCount++;
            addSentMessage(lead.numero, personalizedMessage);
            console.log(`✅ Mensagem enviada para ${lead.nome} (${lead.numero})`);
          } else {
            errorCount++;
            console.error(`❌ Falha ao enviar para ${lead.nome}:`, result.error);
          }

          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (err) {
          errorCount++;
          console.error(`❌ Erro ao enviar para ${lead.nome}:`, err);
        }
      }

      if (successCount > 0) {
        const leadsToSave = leadsToSend.slice(0, successCount).map(lead => ({
          nomenegocio: lead.nome,
          numero: lead.numero,
          user_id: user?.id,
          organization_id: profile?.organization_id
        }));

        const { error: saveError } = await supabase
          .from('leadsb2b')
          .insert(leadsToSave);

        if (saveError) {
          console.error('❌ Erro ao salvar leads:', saveError);
        }
      }

      setSuccess(`✅ Mensagens enviadas: ${successCount} sucesso, ${errorCount} falhas. ${generatedLeads.length - leadsToSend.length} já enviadas anteriormente.`);
      setShowMessageModal(false);
      setCustomMessage('');
      
      await loadLeadsB2B();
      setTimeout(() => setSuccess(null), 5000);

    } catch (err) {
      console.error('❌ Erro no envio em massa:', err);
      setError(err instanceof Error ? err.message : 'Erro no envio em massa');
    } finally {
      setSendingMessages(false);
    }
  };

  const saveContact = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id || !profile?.organization_id) {
        throw new Error('Usuário ou organização não encontrados');
      }

      if (selectedContact) {
        const { error: updateError } = await supabase
          .from('contacts')
          .update({
            ...contactForm,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedContact.id)
          .eq('organization_id', profile.organization_id);

        if (updateError) {
          throw updateError;
        }

        setSuccess('Contato atualizado com sucesso!');
      } else {
        const { error: saveError } = await supabase
          .from('contacts')
          .insert({
            ...contactForm,
            organization_id: profile.organization_id,
            status: 'active'
          });

        if (saveError) {
          throw saveError;
        }

        setSuccess('Contato salvo com sucesso!');
      }

      setShowContactModal(false);
      setSelectedContact(null);
      setContactForm({ name: '', phone_number: '', email: '', location: '', tags: [] });
      await loadContacts();
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      console.error('❌ Erro ao salvar contato:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar contato');
    } finally {
      setLoading(false);
    }
  };

  const deleteContact = async (contactId: string) => {
    if (!confirm('Tem certeza que deseja excluir este contato?')) {
      return;
    }

    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId)
        .eq('organization_id', profile?.organization_id);

      if (deleteError) {
        throw deleteError;
      }

      setSuccess('Contato excluído com sucesso!');
      await loadContacts();
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      console.error('❌ Erro ao excluir contato:', err);
      setError(err instanceof Error ? err.message : 'Erro ao excluir contato');
    }
  };

  const openEditContactModal = (contact: Contact) => {
    setSelectedContact(contact);
    setContactForm({
      name: contact.name || '',
      phone_number: contact.phone_number,
      email: contact.email || '',
      location: contact.location || '',
      tags: contact.tags || []
    });
    setShowContactModal(true);
  };

  const openNewContactModal = () => {
    setSelectedContact(null);
    setContactForm({ name: '', phone_number: '', email: '', location: '', tags: [] });
    setShowContactModal(true);
  };

  const openMessageModal = () => {
    setCustomMessage(`Olá! Somos da {empresa} e identificamos que seu negócio "{nome}" em {cidade} pode se beneficiar muito dos nossos serviços de {segmento}. 

Gostaríamos de apresentar uma solução que pode revolucionar seus resultados. Tem alguns minutos para conversarmos?

Atenciosamente,
Equipe Comercial`);
    setShowMessageModal(true);
  };

  const filteredContacts = contacts.filter(contact => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      (contact.name || '').toLowerCase().includes(searchLower) ||
      contact.phone_number.toLowerCase().includes(searchLower) ||
      (contact.email || '').toLowerCase().includes(searchLower) ||
      (contact.location || '').toLowerCase().includes(searchLower)
    );
  });

  // Filtrar leads por termo de busca
  const leadsFiltered = leadsB2B.filter(lead => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const nomenegocio = (lead.nomenegocio || '').toLowerCase();
    const numero = (lead.numero || '').toLowerCase();
    
    return nomenegocio.includes(searchLower) || numero.includes(searchLower);
  });

  // Formatar número de telefone
  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    
    const clean = phone.replace(/\D/g, '');
    if (clean.length >= 10) {
      const countryCode = clean.substring(0, 2);
      const areaCode = clean.substring(2, 4);
      const firstPart = clean.substring(4, clean.length - 4);
      const lastPart = clean.substring(clean.length - 4);
      return `+${countryCode} (${areaCode}) ${firstPart}-${lastPart}`;
    }
    return phone;
  };

  // Abrir WhatsApp com lead
  const openWhatsAppWithLead = (lead: any) => {
    const phoneNumber = lead.numero.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá ${lead.nomenegocio}! Tudo bem? Sou da Atendos IA e gostaria de apresentar nossa solução de atendimento automatizado que pode revolucionar o atendimento da sua empresa. Posso te contar mais?`);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const quickSuggestions = [
    'Busque 50 restaurantes em São Paulo, priorize números de telefone',
    'Encontre 100 clínicas em Rio de Janeiro com contato',
    'Procure 200 lojas em Belo Horizonte, foque em telefones',
    'Busque academias em Brasília com números válidos',
    'Encontre escritórios em Porto Alegre, priorize contatos',
    'Liste empresas de tecnologia em Florianópolis com telefone'
  ];

  // Filtrar leads salvos
  const savedLeadsFiltered = savedLeads.filter(lead => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return lead.nomenegocio.toLowerCase().includes(searchLower) ||
           lead.numero.includes(searchTerm);
  });

  const sendCustomMessage = async () => {
    if (!customMessage.trim()) {
      setError('Digite uma mensagem para enviar');
      return;
    }

    if (!selectedLead) {
      setError('Nenhum lead selecionado');
      return;
    }

    if (!zapiService.isConfigured()) {
      setError('Z-API não configurada. Configure em Configurações > Integração Z-API');
      return;
    }

    try {
      setSendingMessage(true);
      setError(null);

      const result = await zapiService.sendTextMessage(selectedLead.numero, customMessage);

      if (result.success) {
        setSuccess('Mensagem enviada com sucesso!');
        addSentMessage(selectedLead.numero, customMessage);
        setShowMessageModal(false);
        setSelectedLead(null);
        setCustomMessage('');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(result.error || 'Erro ao enviar mensagem');
      }

    } catch (err) {
      console.error('❌ Erro ao enviar mensagem:', err);
      setError(err instanceof Error ? err.message : 'Erro ao enviar mensagem');
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading && activeTab === 'contacts') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Leadsgen</h1>
        <div className="flex space-x-3">
          <button 
            onClick={activeTab === 'contacts' ? loadContacts : loadLeadsB2B}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Atualizando...' : 'Atualizar'}</span>
          </button>
          {activeTab === 'contacts' && (
            <button 
              onClick={openNewContactModal}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Novo Contato</span>
            </button>
          )}
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-green-700 dark:text-green-300">{success}</p>
            </div>
            <button 
              onClick={() => setSuccess(null)}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('contacts')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'contacts'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Contatos ({leadsFiltered.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('leads-generator')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'leads-generator'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4" />
                <span>Gerador de Leads IA</span>
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs px-2 py-1 rounded-full">
                  {leadsB2B.length}
                </span>
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'contacts' ? (
            <div className="space-y-6">
              {/* Header com busca */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Leads B2B Salvos ({leadsFiltered.length})
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Leads gerados e salvos na sua base de dados
                  </p>
                </div>
                <button
                  onClick={loadLeadsB2B}
                  disabled={loadingLeads}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-5 h-5 ${loadingLeads ? 'animate-spin' : ''}`} />
                  <span>Atualizar</span>
                </button>
              </div>

              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por nome do negócio ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              {/* Lista de Leads */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                {loadingLeads ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <span className="ml-2 text-gray-600 dark:text-gray-400">Carregando leads...</span>
                  </div>
                ) : leadsFiltered.length > 0 ? (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {leadsFiltered.map((lead) => (
                      <div key={lead.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                              <Building className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {lead.nomenegocio}
                              </h3>
                              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                                <div className="flex items-center space-x-1">
                                  <Phone className="w-4 h-4" />
                                  <span>{formatPhoneNumber(lead.numero)}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>{new Date(lead.created_at).toLocaleDateString('pt-BR')}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => {
                              setSelectedLead(lead);
                              setCustomMessage(`Olá ${lead.nomenegocio}! Tudo bem? Sou da Atendos IA e gostaria de apresentar nossa solução de atendimento automatizado que pode revolucionar o atendimento da sua empresa. Posso te contar mais?`);
                              setShowMessageModal(true);
                            }}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                            title="Enviar mensagem personalizada"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {searchTerm ? 'Nenhum lead encontrado' : 'Nenhum lead salvo ainda'}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      {searchTerm 
                        ? 'Tente ajustar sua busca ou gerar novos leads'
                        : 'Use o Gerador de Leads para criar e salvar leads B2B'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Gerador de Leads IA - Interface ChatGPT */
            <div className="h-[600px] flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Gerador de Leads IA</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {isTyping ? 'Gerando leads...' : isGenerating ? 'Processando...' : 'Online'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {generatedLeads.length > 0 && (
                    <button
                      onClick={openMessageModal}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                    >
                      <Send className="w-4 h-4" />
                      <span>Enviar Mensagens ({generatedLeads.filter(lead => !hasMessageBeenSent(lead.numero)).length})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start space-x-3 max-w-[80%] ${
                      message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}>
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.sender === 'user' 
                          ? 'bg-indigo-500' 
                          : 'bg-gradient-to-r from-indigo-500 to-purple-600'
                      }`}>
                        {message.sender === 'user' ? (
                          <User className="w-4 h-4 text-white" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-white" />
                        )}
                      </div>

                      {/* Message Bubble */}
                      <div className={`rounded-2xl px-4 py-3 ${
                        message.sender === 'user'
                          ? 'bg-indigo-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                      }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        
                        {/* Ações de contatos */}
                        {message.showContactActions && extractedContacts.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <button
                              onClick={() => setShowContactsModal(true)}
                              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                            >
                              Ver Contatos Encontrados ({extractedContacts.length})
                            </button>
                          </div>
                        )}
                        
                        {/* Mostrar leads gerados se existirem */}
                        {message.leads && message.leads.length > 0 && (
                          <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                                Leads Gerados ({message.leads.length})
                              </h4>
                              <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                                {message.leads.filter(lead => !hasMessageBeenSent(lead.numero)).length} novos
                              </span>
                            </div>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                              {message.leads.slice(0, 5).map((lead, index) => {
                                const alreadySent = hasMessageBeenSent(lead.numero);
                                return (
                                  <div 
                                    key={index} 
                                    className={`text-xs p-2 rounded border ${
                                      alreadySent 
                                        ? 'border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300' 
                                        : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">{lead.nome}</span>
                                      {alreadySent && <span className="text-xs">✓ Enviado</span>}
                                    </div>
                                    <div className="text-gray-500 dark:text-gray-400">
                                      {formatPhoneNumber(lead.numero)} • {lead.cidade}
                                    </div>
                                  </div>
                                );
                              })}
                              {message.leads.length > 5 && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-1">
                                  +{message.leads.length - 5} leads adicionais
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <p className={`text-xs mt-2 ${
                          message.sender === 'user' 
                            ? 'text-indigo-100' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {formatTime(message.timestamp)}
                          {message.sender === 'assistant' && <span className="ml-2 font-medium">IA</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex items-start space-x-3 max-w-[80%]">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl px-4 py-3">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading Indicator for N8N */}
                {waitingForLeads && (
                  <div className="flex justify-center">
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 max-w-sm">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                        <span className="text-purple-800 dark:text-purple-300 font-medium">
                          {waitingForLeads ? 'Buscando leads via N8N...' : 'Processando...'}
                        </span>
                      </div>
                      <div className="text-3xl font-mono text-purple-900 dark:text-purple-100 text-center">
                        <div className="flex space-x-1 justify-center">
                          <div className="w-2 h-2 bg-purple-400 dark:bg-purple-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-purple-400 dark:bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-purple-400 dark:bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                      {waitingForLeads && (
                        <div className="text-sm text-purple-700 dark:text-purple-400 text-center mt-2">
                          Conectando com sistema de busca...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Suggestions */}
                {chatMessages.length === 1 && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                      Exemplos de solicitações:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {quickSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => setInputMessage(suggestion)}
                          className="text-left p-3 text-sm bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
                <div className="flex items-end space-x-3">
                  {/* Message Input */}
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Digite sua solicitação... Ex: 'Gere 100 leads de restaurantes em São Paulo'"
                      rows={1}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      style={{ minHeight: '48px', maxHeight: '120px' }}
                      disabled={isGenerating}
                    />
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={handleSendChatMessage}
                    disabled={!inputMessage.trim() || isGenerating}
                    className="p-3 bg-indigo-500 text-white rounded-2xl hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Footer */}
                <div className="mt-3 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Pressione Enter para enviar, Shift + Enter para nova linha
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Leads B2B Salvos - Sempre visível quando na aba leads-generator */}
          {activeTab === 'leads-generator' && (
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Leads B2B Salvos ({leadsB2B.length})
              </h3>
              
              {leadsB2B.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Nome do Negócio
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Número
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Data de Criação
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {leadsB2B.map((lead) => (
                        <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {lead.nomenegocio}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {formatPhoneNumber(lead.numero)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                              title="Enviar mensagem"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Target className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhum lead B2B salvo</h3>
                  <p className="text-gray-500 dark:text-gray-400">Use o gerador acima para criar e enviar mensagens para leads</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Contatos Extraídos */}
      {showContactsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Contatos Encontrados ({extractedContacts.length})
              </h3>
              <button
                onClick={() => setShowContactsModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Botão para enviar para todos */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-300">Enviar para Todos</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      Enviar a mesma mensagem para todos os {extractedContacts.length} contatos
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedContact(null);
                      setMessageText('Olá! Encontrei seu contato e gostaria de apresentar nossos serviços...');
                      setShowMessageModal(true);
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Enviar para Todos
                  </button>
                </div>
              </div>

              {/* Lista de contatos */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {extractedContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">{contact.nome}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{contact.numero}</p>
                      {contact.endereco && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">{contact.endereco}</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedContact({nome: contact.nome, numero: contact.numero});
                        setMessageText(`Olá ${contact.nome}! Encontrei seu contato e gostaria de apresentar nossos serviços...`);
                        setShowMessageModal(true);
                      }}
                      className="px-3 py-1 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Enviar Mensagem
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Contato */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedContact ? 'Editar Contato' : 'Novo Contato'}
              </h3>
              <button
                onClick={() => {
                  setShowContactModal(false);
                  setSelectedContact(null);
                  setContactForm({ name: '', phone_number: '', email: '', location: '', tags: [] });
                }}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  value={contactForm.name}
                  onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Nome do contato"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={contactForm.phone_number}
                  onChange={(e) => setContactForm(prev => ({ ...prev, phone_number: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="5511999999999"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="contato@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Localização
                </label>
                <input
                  type="text"
                  value={contactForm.location}
                  onChange={(e) => setContactForm(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Cidade, Estado"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowContactModal(false);
                    setSelectedContact(null);
                    setContactForm({ name: '', phone_number: '', email: '', location: '', tags: [] });
                  }}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveContact}
                  disabled={loading || !contactForm.phone_number.trim()}
                  className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>{loading ? 'Salvando...' : selectedContact ? 'Atualizar Contato' : 'Salvar Contato'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Mensagem em Massa */}
      {showMessageModal && !selectedLead && !selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Enviar Mensagem em Massa
              </h3>
              <button
                onClick={() => setShowMessageModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h4 className="font-medium text-blue-800 dark:text-blue-300">Resumo do Envio</h4>
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  <p><strong>Total de leads:</strong> {generatedLeads.length}</p>
                  <p><strong>Serão enviados:</strong> {generatedLeads.filter(lead => !hasMessageBeenSent(lead.numero)).length}</p>
                  <p><strong>Já enviados anteriormente:</strong> {generatedLeads.filter(lead => hasMessageBeenSent(lead.numero)).length}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mensagem Personalizada
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Digite sua mensagem personalizada..."
                />
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <p><strong>Variáveis disponíveis:</strong></p>
                  <p>• <code>{'{nome}'}</code> - Nome do negócio</p>
                  <p>• <code>{'{segmento}'}</code> - Segmento do negócio</p>
                  <p>• <code>{'{cidade}'}</code> - Cidade do negócio</p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={sendBulkMessages}
                  disabled={!customMessage.trim() || sendingMessages}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {sendingMessages ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>
                    {sendingMessages 
                      ? 'Enviando...' 
                      : `Enviar para ${generatedLeads.filter(lead => !hasMessageBeenSent(lead.numero)).length} leads`
                    }
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Mensagem Personalizada */}
      {showMessageModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Enviar Mensagem Personalizada
              </h3>
              <button
                onClick={() => {
                  setShowMessageModal(false);
                  setSelectedLead(null);
                  setCustomMessage('');
                }}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-blue-800 dark:text-blue-300 text-sm">
                  <strong>Lead:</strong> {selectedLead.nomenegocio}
                </p>
                <p className="text-blue-700 dark:text-blue-400 text-sm">
                  <strong>Telefone:</strong> {formatPhoneNumber(selectedLead.numero)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mensagem Personalizada
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Digite sua mensagem personalizada..."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Personalize sua mensagem para este lead específico
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowMessageModal(false);
                    setSelectedLead(null);
                    setCustomMessage('');
                  }}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={sendCustomMessage}
                  disabled={!customMessage.trim() || sendingMessage}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {sendingMessage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageSquare className="w-4 h-4" />
                  )}
                  <span>{sendingMessage ? 'Enviando...' : 'Enviar Mensagem'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Envio de Mensagem */}
      {showMessageModal && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedContact ? `Enviar para ${selectedContact.nome}` : `Enviar para Todos (${extractedContacts.length})`}
              </h3>
              <button
                onClick={() => {
                  setShowMessageModal(false);
                  setSelectedContact(null);
                  setMessageText('');
                }}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {selectedContact ? (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-blue-800 dark:text-blue-300 text-sm">
                    <strong>Destinatário:</strong> {selectedContact.nome}
                  </p>
                  <p className="text-blue-700 dark:text-blue-400 text-sm">
                    <strong>Número:</strong> {selectedContact.numero}
                  </p>
                </div>
              ) : (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                  <p className="text-orange-800 dark:text-orange-300 text-sm">
                    <strong>⚠️ Envio em massa:</strong> A mensagem será enviada para {extractedContacts.length} contatos
                  </p>
                  <p className="text-orange-700 dark:text-orange-400 text-xs mt-1">
                    Haverá um intervalo de 1 segundo entre cada envio
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mensagem
                </label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Digite sua mensagem..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowMessageModal(false);
                    setSelectedContact(null);
                    setMessageText('');
                  }}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={selectedContact ? () => sendMessageToContact(selectedContact) : sendBulkMessage}
                  disabled={!messageText.trim() || sendingMessage || sendingBulkMessage}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {(sendingMessage || sendingBulkMessage) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageSquare className="w-4 h-4" />
                  )}
                  <span>
                    {sendingMessage || sendingBulkMessage ? 'Enviando...' : 
                     selectedContact ? 'Enviar Mensagem' : `Enviar para Todos (${extractedContacts.length})`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts;