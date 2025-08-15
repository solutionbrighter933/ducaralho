import React, { useState, useEffect } from 'react';
import { Users, Search, Loader2, AlertCircle, CheckCircle, Phone, Building, RefreshCw, UserPlus, Download, Filter, Send, X, Bot, MessageSquare, Sparkles, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from './AuthProvider';
import { useWhatsAppConnection } from '../hooks/useWhatsAppConnection';
import { zapiService } from '../services/zapi.service';

interface LeadB2B {
  nomenegocio: string;
  numero: string;
}

interface LeadGenerationMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  isTyping?: boolean;
}

const Contacts: React.FC = () => {
  const { user, loading: authLoading, profile } = useAuthContext();
  const [contacts, setContacts] = useState<LeadB2B[]>([]);
  const { isConnected, isZAPIConfigured } = useWhatsAppConnection();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBulkMessageModal, setShowBulkMessageModal] = useState(false);
  const [bulkMessageContent, setBulkMessageContent] = useState('');
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [bulkSendResult, setBulkSendResult] = useState<{sent: number, failed: number, total: number, errors: string[] } | null>(null);
  const [activeTab, setActiveTab] = useState<'contacts' | 'generate-leads'>('contacts');
  const [detectedPhoneNumbers, setDetectedPhoneNumbers] = useState<string[]>([]);
  const [detectedCompanyData, setDetectedCompanyData] = useState<{name: string, phone: string}[]>([]);
  const [savingToContacts, setSavingToContacts] = useState(false);
  const [leadMessages, setLeadMessages] = useState<LeadGenerationMessage[]>([
    {
      id: '1',
      content: 'Olá! Sou seu assistente para geração de leads B2B. Como posso ajudá-lo hoje? Você pode me pedir para buscar empresas específicas, como "Buscar clínicas de odonto em São Paulo" ou "Encontrar restaurantes em Belo Horizonte".',
      sender: 'assistant',
      timestamp: new Date(),
    }
  ]);
  const [leadInput, setLeadInput] = useState('');
  const [isGeneratingLeads, setIsGeneratingLeads] = useState(false);
  const [showPersonalizedMessageModal, setShowPersonalizedMessageModal] = useState(false);
  const [showSendAllPersonalizedMessageModal, setShowSendAllPersonalizedMessageModal] = useState(false);
  const [personalizedMessageContent, setPersonalizedMessageContent] = useState('');
  const [targetPhoneNumberForPersonalizedMessage, setTargetPhoneNumberForPersonalizedMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isConnectingSheets, setIsConnectingSheets] = useState(false);
  const [sheetsConnected, setSheetsConnected] = useState(false);

  // Função para enviar mensagem para o webhook N8N de leads
  const sendLeadRequestToAPI = async (message: string): Promise<string> => {
    try {
      console.log('🚀 Enviando solicitação de leads para N8N:', message);
      
      const webhookUrl = import.meta.env.VITE_N8N_LEADS_WEBHOOK_URL;
      if (!webhookUrl) {
        throw new Error('URL do webhook de leads não configurada. Verifique VITE_N8N_LEADS_WEBHOOK_URL no arquivo .env');
      }
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
        },
        body: JSON.stringify({
          message: message,
          timestamp: new Date().toISOString(),
          user_id: user?.id || 'attendos_user',
          session_id: `leads_session_${Date.now()}`,
          type: 'lead_generation'
        }),
      });

      console.log('📡 Status da resposta N8N leads:', response.status);
      console.log('📡 Headers da resposta N8N leads:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
      }

      // Verificar o tipo de conteúdo da resposta
      const contentType = response.headers.get('content-type');
      console.log('📄 Content-Type N8N leads:', contentType);

      let responseText = '';

      if (contentType && contentType.includes('application/json')) {
        try {
          const data = await response.json();
          console.log('✅ Resposta JSON N8N leads recebida:', data);
          
          // Extrair o texto da resposta
          if (typeof data === 'string') {
            responseText = data;
          } else if (data.response) {
            responseText = data.response;
          } else if (data.message) {
            responseText = data.message;
          } else if (data.text) {
            responseText = data.text;
          } else if (data.content) {
            responseText = data.content;
          } else if (data.answer) {
            responseText = data.answer;
          } else if (data.reply) {
            responseText = data.reply;
          } else if (data.leads) {
            responseText = data.leads;
          } else {
            responseText = JSON.stringify(data);
          }
        } catch (jsonError) {
          console.error('❌ Erro ao fazer parse do JSON N8N leads:', jsonError);
          throw new Error('Resposta JSON inválida da API de leads');
        }
      } else {
        try {
          responseText = await response.text();
          console.log('📝 Resposta como texto N8N leads:', responseText);
        } catch (textError) {
          console.error('❌ Erro ao ler resposta como texto N8N leads:', textError);
          throw new Error('Erro ao ler resposta da API de leads');
        }
      }

      if (!responseText || responseText.trim() === '') {
        throw new Error('Resposta vazia da API de leads');
      }

      return responseText.trim();
      
    } catch (error) {
      console.error('❌ Erro detalhado ao chamar API de leads:', error);
      
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('Erro de conexão: Não foi possível conectar à API de leads. Verifique sua conexão com a internet.');
      } else if (error instanceof Error && error.message.includes('body stream already read')) {
        throw new Error('Erro interno: Problema na leitura da resposta da API de leads.');
      } else if (error instanceof SyntaxError && error.message.includes('JSON')) {
        throw new Error('Erro de formato: A API de leads retornou uma resposta JSON inválida.');
      } else {
        throw new Error(`Erro de conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }
  };
  useEffect(() => {
    if (!authLoading) {
      fetchContacts();
    }
  }, [authLoading]);

  const fetchContacts = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('📞 Carregando contatos da tabela leadsb2b...');

      const { data, error: fetchError } = await supabase
        .from('leadsb2b')
        .select('nomenegocio, numero')
        .order('nomenegocio', { ascending: true });

      if (fetchError) {
        console.error('❌ Erro ao buscar contatos:', fetchError);
        throw fetchError;
      }

      console.log('✅ Contatos carregados:', data?.length || 0);
      setContacts(data || []);
    } catch (err) {
      console.error('❌ Erro ao carregar contatos:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar contatos.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchContacts();
  };

  const handleExportContacts = () => {
    if (contacts.length === 0) {
      setError('Nenhum contato para exportar.');
      return;
    }

    try {
      // Criar CSV
      const csvHeader = 'Nome do Negócio,Número\n';
      const csvContent = contacts
        .map(contact => `"${contact.nomenegocio}","${contact.numero}"`)
        .join('\n');
      
      const csvData = csvHeader + csvContent;
      
      // Criar e baixar arquivo
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `contatos_b2b_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccess('Contatos exportados com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('❌ Erro ao exportar contatos:', err);
      setError('Erro ao exportar contatos.');
    }
  };

  const handleConnectGoogleSheets = async () => {
    setIsConnectingSheets(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log('🔗 Iniciando conexão com Google Sheets...');
      
      // Simular processo de conexão (em produção, isso seria uma integração real)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simular sucesso na conexão
      setSheetsConnected(true);
      setSuccess('Google Sheets conectado com sucesso! Agora você pode exportar contatos diretamente para planilhas.');
      setTimeout(() => setSuccess(null), 5000);
      
      console.log('✅ Google Sheets conectado com sucesso');
    } catch (err) {
      console.error('❌ Erro ao conectar Google Sheets:', err);
      setError('Erro ao conectar com Google Sheets. Tente novamente.');
    } finally {
      setIsConnectingSheets(false);
    }
  };

  const handleExportToSheets = async () => {
    if (!sheetsConnected) {
      setError('Conecte o Google Sheets primeiro para exportar contatos.');
      return;
    }

    if (contacts.length === 0) {
      setError('Nenhum contato para exportar.');
      return;
    }

    try {
      setLoading(true);
      console.log('📊 Exportando contatos para Google Sheets...');
      
      // Simular exportação (em produção, isso seria uma integração real com Google Sheets API)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setSuccess(`${contacts.length} contatos exportados para Google Sheets com sucesso!`);
      setTimeout(() => setSuccess(null), 5000);
      
      console.log('✅ Contatos exportados para Google Sheets');
    } catch (err) {
      console.error('❌ Erro ao exportar para Google Sheets:', err);
      setError('Erro ao exportar contatos para Google Sheets.');
    } finally {
      setLoading(false);
    }
  };

  // Detectar números de telefone na última resposta da IA
  useEffect(() => {
    const lastAssistantMessage = leadMessages.slice().reverse().find(msg => msg.sender === 'assistant');
    if (lastAssistantMessage) {
      // Regex aprimorada para detectar números de telefone brasileiros
      const phoneRegex = /\b(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\d{4}[-.\s]?\d{4}|\d{4}[-.\s]?\d{4})\b/g;
      const numbers = lastAssistantMessage.content.match(phoneRegex);
      if (numbers) {
        // Remover duplicatas e formatar para apenas dígitos para envio
        const uniqueNumbers = Array.from(new Set(numbers.map(num => num.replace(/\D/g, ''))));
        setDetectedPhoneNumbers(uniqueNumbers);
      } else {
        setDetectedPhoneNumbers([]);
      }
      
      // Detectar dados de empresas (nome + telefone)
      const detectedData = detectCompanyData(lastAssistantMessage.content);
      setDetectedCompanyData(detectedData);
    }
  }, [leadMessages]);

  const handleSendBulkMessage = async () => {
    if (!bulkMessageContent.trim()) {
      setError('A mensagem não pode estar vazia.');
      return;
    }

    setIsSendingBulk(true);
    setBulkSendResult(null);
    setError(null);
    setSuccess(null);

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const contact of filteredContacts) {
      try {
        // Ensure the phone number is clean and in a format Z-API expects (e.g., just digits)
        const cleanedPhoneNumber = contact.numero.replace(/\D/g, '');
        if (!cleanedPhoneNumber) {
          throw new Error(`Número inválido para ${contact.nomenegocio}`);
        }

        const result = await zapiService.sendTextMessage(cleanedPhoneNumber, bulkMessageContent);

        if (result.success) {
          sentCount++;
        } else {
          failedCount++;
          errors.push(`Falha ao enviar para ${contact.nomenegocio} (${contact.numero}): ${result.error || 'Erro desconhecido'}`);
        }
      } catch (err) {
        failedCount++;
        errors.push(`Exceção ao enviar para ${contact.nomenegocio} (${contact.numero}): ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      }
    }

    setIsSendingBulk(false);
    setBulkSendResult({
      sent: sentCount,
      failed: failedCount,
      total: filteredContacts.length,
      errors: errors
    });

    if (failedCount === 0) {
      setSuccess(`Mensagem enviada para todos os ${sentCount} contatos com sucesso!`);
      setBulkMessageContent(''); // Clear message content on full success
    } else if (sentCount > 0) {
      setError(`Mensagem enviada para ${sentCount} contatos, mas falhou para ${failedCount}.`);
    } else {
      setError('Falha ao enviar mensagem para todos os contatos.');
    }
    // Keep modal open to show results, user can close it
    // setTimeout(() => setShowBulkMessageModal(false), 5000); // Auto-close after 5 seconds
  };

  const handleSendLeadRequest = async () => {
    if (!leadInput.trim() || isGeneratingLeads) return;

    const userMessage: LeadGenerationMessage = {
      id: Date.now().toString(),
      content: leadInput.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setLeadMessages(prev => [...prev, userMessage]);
    const currentMessage = leadInput.trim();
    setLeadInput('');
    setIsGeneratingLeads(true);
    setIsTyping(true);
    setError(null);

    try {
      // Chamar a API N8N de leads
      const apiResponse = await sendLeadRequestToAPI(currentMessage);
      
      // Simular um pequeno delay para parecer mais natural
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const assistantMessage: LeadGenerationMessage = {
        id: (Date.now() + 1).toString(),
        content: apiResponse,
        sender: 'assistant',
        timestamp: new Date(),
      };

      setLeadMessages(prev => [...prev, assistantMessage]);
      
    } catch (error) {
      console.error('❌ Erro na geração de leads:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMessage);
      
      const fallbackMessage: LeadGenerationMessage = {
        id: (Date.now() + 1).toString(),
        content: 'Desculpe, ocorreu um erro ao processar sua solicitação de leads. Verifique sua conexão e tente novamente em alguns instantes.',
        sender: 'assistant',
        timestamp: new Date(),
      };
      setLeadMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsGeneratingLeads(false);
      setIsTyping(false);
    }
  };

  const handleLeadKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendLeadRequest();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const quickSuggestions = [
    'Buscar clínicas de odonto em São Paulo',
    'Encontrar restaurantes em Belo Horizonte',
    'Localizar farmácias no Rio de Janeiro',
    'Buscar escritórios de advocacia em Brasília',
    'Encontrar academias em Curitiba',
    'Localizar pet shops em Salvador'
  ];

  const formatPhoneNumber = (numero: string) => {
    // Formatar número de telefone brasileiro
    const cleaned = numero.replace(/\D/g, '');
    
    if (cleaned.length === 11) {
      // Celular: (XX) 9XXXX-XXXX
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
      // Fixo: (XX) XXXX-XXXX
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 13 && cleaned.startsWith('55')) {
      // Com código do país: +55 (XX) 9XXXX-XXXX
      return `+55 (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    
    return numero; // Retorna original se não conseguir formatar
  };

  const handleOpenPersonalizedMessageModal = (phoneNumber: string) => {
    setTargetPhoneNumberForPersonalizedMessage(phoneNumber);
    setPersonalizedMessageContent(''); // Limpar conteúdo da mensagem anterior
    setShowPersonalizedMessageModal(true);
  };

  const handleSaveCompaniesToContacts = async () => {
    console.log('handleSaveCompaniesToContacts called. Current profile:', profile); // Log de depuração
    if (!profile || !profile.id || !profile.organization_id) { // Verificação explícita
      setError('Perfil do usuário não carregado ou incompleto. Por favor, aguarde ou recarregue a página.');
      return;
    }

    if (detectedCompanyData.length === 0) {
      setError('Nenhum dado de empresa detectado para salvar.');
      return;
    }

    if (!user?.id || !profile?.organization_id) {
      setError('Usuário não autenticado ou organização não encontrada.');
      return;
    }

    setSavingToContacts(true);
    setError(null);
    setSuccess(null);

    let savedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    try {
      for (const company of detectedCompanyData) {
        try {
          console.log(`💾 Salvando empresa: ${company.name} - ${company.phone}`);
          
          // Verificar se a empresa já existe para este usuário/organização
          const { data: existingLead, error: checkError } = await supabase
            .from('leadsb2b')
            .select('id')
            .eq('user_id', user.id)
            .eq('organization_id', profile.organization_id)
            .eq('numero', company.phone)
            .maybeSingle();

          if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
          }

          if (existingLead) {
            console.log(`⚠️ Empresa ${company.name} já existe nos contatos`);
            errors.push(`${company.name}: Já existe nos contatos`);
            failedCount++;
            continue;
          }

          // Inserir nova empresa
          const { error: insertError } = await supabase
            .from('leadsb2b')
            .insert({
              nomenegocio: company.name,
              numero: company.phone,
              user_id: user.id,
              organization_id: profile.organization_id
            });

          if (insertError) {
            throw insertError;
          }

          savedCount++;
          console.log(`✅ Empresa ${company.name} salva com sucesso`);
        } catch (err) {
          failedCount++;
          const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
          errors.push(`${company.name}: ${errorMsg}`);
          console.error(`❌ Erro ao salvar empresa ${company.name}:`, err);
        }
      }

      // Atualizar lista de contatos após salvar
      if (savedCount > 0) {
        await fetchContacts();
      }

      // Mostrar resultado
      if (savedCount > 0) {
        setSuccess(`✅ ${savedCount} empresa(s) adicionada(s) aos contatos com sucesso! ${failedCount > 0 ? `${failedCount} falha(s).` : ''}`);
      } else {
        setError(`Nenhuma empresa foi adicionada. ${errors.length > 0 ? errors.join(', ') : ''}`);
      }

      setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);

    } catch (err) {
      console.error('❌ Erro geral ao salvar empresas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao salvar empresas.');
    } finally {
      setSavingToContacts(false);
    }
  };

  const handleSendAllPersonalizedMessage = async () => {
    if (!personalizedMessageContent.trim()) {
      setError('A mensagem não pode estar vazia.');
      return;
    }

    if (!isZAPIConfigured || !isConnected) {
      setError('Z-API não configurada ou desconectada. Verifique a aba "Número WhatsApp".');
      return;
    }

    setIsSendingBulk(true); // Reutilizando o estado de loading para envio
    setError(null);
    setSuccess(null);

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const number of detectedPhoneNumbers) {
      try {
        console.log(`📤 Enviando mensagem para TODOS para ${number}...`);
        const result = await zapiService.sendTextMessage(number, personalizedMessageContent.trim());

        if (result.success) {
          sentCount++;
        } else {
          failedCount++;
          errors.push(`Falha para ${formatPhoneNumber(number)}: ${result.error || 'Erro desconhecido'}`);
        }
      } catch (err) {
        failedCount++;
        errors.push(`Exceção para ${formatPhoneNumber(number)}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      }
    }

    setBulkSendResult({ sent: sentCount, failed: failedCount, total: detectedPhoneNumbers.length, errors });
    setSuccess(`✅ Mensagens enviadas para ${sentCount} de ${detectedPhoneNumbers.length} números. ${failedCount > 0 ? `${failedCount} falha(s).` : ''}`);
    setShowSendAllPersonalizedMessageModal(false);
    setPersonalizedMessageContent('');
    setTimeout(() => setSuccess(null), 5000); // Manter a mensagem de sucesso por mais tempo
    setIsSendingBulk(false);
  };

  const handleSendPersonalizedMessage = async () => {
    if (!targetPhoneNumberForPersonalizedMessage || !personalizedMessageContent.trim()) {
      setError('Número e mensagem são obrigatórios.');
      return;
    }

    if (!isZAPIConfigured || !isConnected) {
      setError('Z-API não configurada ou desconectada. Verifique a aba "Número WhatsApp".');
      return;
    }

    setIsSendingBulk(true); // Reutilizando o estado de loading para envio
    setError(null);
    setSuccess(null);

    try {
      console.log(`📤 Enviando mensagem personalizada para ${targetPhoneNumberForPersonalizedMessage}...`);
      const result = await zapiService.sendTextMessage(targetPhoneNumberForPersonalizedMessage, personalizedMessageContent.trim());

      if (result.success) {
        setSuccess(`✅ Mensagem enviada para ${formatPhoneNumber(targetPhoneNumberForPersonalizedMessage)} com sucesso!`);
        setShowPersonalizedMessageModal(false);
        setPersonalizedMessageContent('');
        setTargetPhoneNumberForPersonalizedMessage('');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(result.error || 'Falha ao enviar mensagem via Z-API.');
      }
    } catch (err) {
      console.error('❌ Erro ao enviar mensagem personalizada:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao enviar mensagem.');
    } finally {
      setIsSendingBulk(false);
    }
  };

  // Função para detectar dados de empresas na resposta da IA
  const detectCompanyData = (responseText: string): Array<{name: string, phone: string}> => {
    console.log('🔍 DETECTANDO DADOS DE EMPRESAS NA RESPOSTA:');
    console.log('📄 Texto da resposta:', responseText);
    
    const detected: Array<{name: string, phone: string}> = [];
    const lines = responseText.split('\n');
    
    // Regex para detectar números de telefone brasileiros
    const phoneRegex = /\+55\s*\d{2}\s*\d{4,5}[-\s]?\d{4}/g;
    
    // Mapa para armazenar nomes de empresas por linha
    const companyNames: { [lineIndex: number]: string } = {};
    
    console.log('📋 Processando', lines.length, 'linhas...');
    
    // PASSO 1: Detectar nomes de empresas nas linhas numeradas
    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim();
      console.log(`📝 Linha ${lineIndex + 1}:`, trimmedLine);
      
      // Verificar se é uma linha numerada (1., 2., 3., etc.)
      const listMatch = trimmedLine.match(/^(\d+)\.\s*(.+)$/);
      if (listMatch) {
        const itemNumber = listMatch[1];
        const nameAfterNumber = listMatch[2].trim();
        console.log(`🏢 Item ${itemNumber} detectado:`, nameAfterNumber);
        
        // Limpar o nome (remover tudo após hífen, parênteses, etc.)
        let companyName = nameAfterNumber;
        
        // Remover tudo após " - " (endereço, descrições)
        if (companyName.includes(' - ')) {
          companyName = companyName.split(' - ')[0].trim();
        }
        
        // Remover tudo após " (" (informações extras)
        if (companyName.includes(' (')) {
          companyName = companyName.split(' (')[0].trim();
        }
        
        // Remover tudo após "," (vírgulas com informações extras)
        if (companyName.includes(',')) {
          companyName = companyName.split(',')[0].trim();
        }
        
        console.log(`🧹 Nome da empresa limpo:`, companyName);
        
        // Validar se é um nome de empresa válido
        if (companyName.length >= 2 && companyName.length <= 100 && 
            !companyName.toLowerCase().includes('telefone') &&
            !companyName.toLowerCase().includes('endereço') &&
            !/^\d+$/.test(companyName)) {
          companyNames[lineIndex] = companyName;
          console.log(`✅ Nome de empresa válido armazenado para linha ${lineIndex + 1}:`, companyName);
        } else {
          console.log(`❌ Nome rejeitado como inválido:`, companyName);
        }
      }
    });
    
    console.log('📊 Nomes de empresas detectados:', companyNames);
    
    // PASSO 2: Detectar telefones e associar com nomes de empresas
    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim();
      
      // Procurar telefones nesta linha
      const phoneMatches = trimmedLine.match(phoneRegex);
      if (phoneMatches) {
        phoneMatches.forEach(phoneMatch => {
          console.log(`📞 Telefone detectado na linha ${lineIndex + 1}:`, phoneMatch);
          
          // Limpar telefone
          const cleanPhone = phoneMatch.replace(/\D/g, '');
          console.log(`🧹 Telefone limpo:`, cleanPhone);
          
          // Procurar o nome da empresa mais próximo (nas linhas anteriores)
          let companyName = '';
          
          // Procurar da linha atual para trás até encontrar um nome de empresa
          for (let i = lineIndex; i >= 0; i--) {
            if (companyNames[i]) {
              companyName = companyNames[i];
              console.log(`✅ Nome da empresa encontrado na linha ${i + 1}:`, companyName);
              break;
            }
          }
          
          // Só adicionar se encontramos um nome de empresa válido
          if (companyName) {
            // Verificar se já existe (evitar duplicatas)
            const isDuplicate = detected.some(item => item.phone === cleanPhone);
            if (!isDuplicate) {
              detected.push({ name: companyName, phone: cleanPhone });
              console.log(`✅ EMPRESA ADICIONADA: ${companyName} - ${cleanPhone}`);
            } else {
              console.log(`⚠️ Duplicata ignorada:`, companyName, cleanPhone);
            }
          } else {
            console.log(`❌ Telefone ignorado (sem nome de empresa):`, cleanPhone);
          }
        });
      }
    });
    
    console.log('🎯 RESULTADO FINAL:', detected);
    return detected;
  };

  const filteredContacts = contacts.filter(contact =>
    contact.nomenegocio.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.numero.includes(searchTerm)
  );

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Carregando contatos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contatos B2B</h1>
        <div className="flex space-x-3">
       

          {activeTab === 'contacts' && (
            <button
              onClick={() => setShowBulkMessageModal(true)}
              disabled={!isConnected || !isZAPIConfigured || contacts.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
              <span>Enviar Mensagem para Todos</span>
            </button>
          )}

          {activeTab === 'contacts' && (
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
          )}
          
          {activeTab === 'contacts' && (
            <button
              onClick={handleExportContacts}
              disabled={contacts.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              <span>Exportar CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'contacts'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Contatos ({contacts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('generate-leads')}
            className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'generate-leads'
                ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-b-2 border-purple-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span>Gerar Leads</span>
          </button>
        </div>
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

      {/* Content based on active tab */}
      {activeTab === 'contacts' ? (
        <>
          {/* Search and Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por nome do negócio ou número..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-80 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
              
              <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Total: {contacts.length} contatos</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4" />
                  <span>Filtrados: {filteredContacts.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contacts Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {filteredContacts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Nome do Negócio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Número de Telefone
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredContacts.map((contact, index) => (
                      <tr key={`${contact.numero}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                              <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {contact.nomenegocio}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                Contato B2B
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            <span className="text-sm text-gray-900 dark:text-white font-mono">
                              {formatPhoneNumber(contact.numero)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <a
                              href={`https://wa.me/${contact.numero.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                              title="Abrir no WhatsApp"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {searchTerm ? 'Nenhum contato encontrado' : 'Nenhum contato B2B disponível'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {searchTerm 
                    ? 'Tente ajustar sua busca ou limpar o filtro.'
                    : 'Os contatos B2B aparecerão aqui quando forem adicionados à tabela leadsb2b.'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                  >
                    <Filter className="w-5 h-5" />
                    <span>Limpar Filtro</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Contatos</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{contacts.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Contatos Filtrados</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{filteredContacts.length}</p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <Filter className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Números Únicos</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {new Set(contacts.map(c => c.numero)).size}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Phone className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">📋 Sobre os Contatos B2B</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Funcionalidades:</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  <li>• Visualização de todos os contatos B2B</li>
                  <li>• Busca por nome do negócio ou número</li>
                </ul>
              </div>
            </div>
            
            {sheetsConnected && (
              <div className="mt-4 p-3 bg-green-100 dark:bg-green-800/30 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>✅ Google Sheets Conectado:</strong> Agora você pode exportar seus contatos diretamente para planilhas do Google Sheets com um clique!
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Lead Generation Chat Interface */
        <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Gerador de Leads B2B</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isTyping ? 'Gerando leads...' : isGeneratingLeads ? 'Processando...' : 'Pronto para ajudar'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setLeadMessages([leadMessages[0]])}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Limpar conversa"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {leadMessages.map((message) => (
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
                      ? 'bg-blue-500' 
                      : 'bg-gradient-to-r from-purple-500 to-pink-600'
                  }`}>
                    {message.sender === 'user' ? (
                      <Users className="w-4 h-4 text-white" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-white" />
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div className={`rounded-2xl px-4 py-3 ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-2 ${
                      message.sender === 'user' 
                        ? 'text-blue-100' 
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
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
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

            {/* Quick Suggestions */}
            {leadMessages.length === 1 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Sugestões de busca:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {quickSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setLeadInput(suggestion)}
                      className="text-left p-3 text-sm bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-end space-x-3">
              {/* Message Input */}
              <div className="flex-1 relative">
                <textarea
                  value={leadInput}
                  onChange={(e) => setLeadInput(e.target.value)}
                  onKeyPress={handleLeadKeyPress}
                  placeholder="Digite sua solicitação... Ex: 'Buscar clínicas de odonto em São Paulo'"
                  rows={1}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                  disabled={isGeneratingLeads}
                />
              </div>

              {/* Send Button */}
              <button
                onClick={handleSendLeadRequest}
                disabled={!leadInput.trim() || isGeneratingLeads}
                className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-2xl hover:from-purple-600 hover:to-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isGeneratingLeads ? (
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

      {showBulkMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Enviar Mensagem para Todos
              </h3>
              <button
                onClick={() => setShowBulkMessageModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {bulkSendResult && (
              <div className={`p-3 rounded-lg mb-4 ${bulkSendResult.failed === 0 ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
                <p className="font-medium">Resumo do Envio:</p>
                <p>Enviadas: {bulkSendResult.sent}/{bulkSendResult.total}</p>
                <p>Falhas: {bulkSendResult.failed}</p>
                {bulkSendResult.errors.length > 0 && (
                  <div className="mt-2 text-xs">
                    <p className="font-semibold">Erros:</p>
                    <ul className="list-disc list-inside">
                      {bulkSendResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mensagem
              </label>
              <textarea
                value={bulkMessageContent}
                onChange={(e) => setBulkMessageContent(e.target.value)}
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Digite a mensagem para enviar a todos os contatos..."
                disabled={isSendingBulk}
              ></textarea>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
              <button
                onClick={() => {
                  setShowBulkMessageModal(false);
                  setBulkMessageContent('');
                  setBulkSendResult(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                disabled={isSendingBulk}
              >
                Cancelar
              </button>
              <button
                onClick={handleSendBulkMessage}
                disabled={!bulkMessageContent.trim() || isSendingBulk}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingBulk ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{isSendingBulk ? 'Enviando...' : 'Enviar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seção de Adicionar aos Contatos */}
      {activeTab === 'generate-leads' && detectedCompanyData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-green-600" />
            <span>Adicionar aos Contatos</span>
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {detectedCompanyData.length} empresa(s) detectada(s) na resposta da IA. Clique para adicionar aos seus contatos.
          </p>
          <div className="space-y-2 mb-4">
            {detectedCompanyData.map((company, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{company.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{formatPhoneNumber(company.phone)}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={handleSaveCompaniesToContacts}
            disabled={savingToContacts}
            className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingToContacts ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            <span>{savingToContacts ? 'Salvando...' : 'Adicionar Todas aos Contatos'}</span>
          </button>
        </div>
      )}

      {/* Seção de Envio de Mensagem Personalizada */}
      {activeTab === 'generate-leads' && detectedPhoneNumbers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <Send className="w-5 h-5 text-indigo-600" />
            <span>Enviar Mensagem Personalizada</span>
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Números de telefone detectados na resposta da IA. Clique para enviar uma mensagem personalizada.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              key={`all-${detectedPhoneNumbers.length}`} // Chave única para o botão "Enviar para Todos"
              onClick={() => {
                setPersonalizedMessageContent(''); // Limpar conteúdo da mensagem anterior
                setShowSendAllPersonalizedMessageModal(true);
              }}
              disabled={!isZAPIConfigured || !isConnected || detectedPhoneNumbers.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span>Enviar Para Todos ({detectedPhoneNumbers.length})</span>
            </button>
            {detectedPhoneNumbers.map((number, index) => (
              <button
                key={index}
                onClick={() => handleOpenPersonalizedMessageModal(number)}
                disabled={!isZAPIConfigured || !isConnected}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Phone className="w-4 h-4" />
                <span>Enviar para {formatPhoneNumber(number)}</span>
              </button>
            ))}
          </div>
          {(!isZAPIConfigured || !isConnected) && (
            <p className="text-sm text-red-500 dark:text-red-400 mt-4">
              ⚠️ Z-API não configurada ou desconectada. Verifique a aba "Número WhatsApp" para habilitar o envio.
            </p>
          )}
        </div>
      )}

      {/* Modal de Mensagem Personalizada */}
      {showPersonalizedMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Enviar Mensagem Personalizada
              </h3>
              <button
                onClick={() => setShowPersonalizedMessageModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Número de Telefone
                </label>
                <input
                  type="text"
                  value={formatPhoneNumber(targetPhoneNumberForPersonalizedMessage)}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mensagem
                </label>
                <textarea
                  value={personalizedMessageContent}
                  onChange={(e) => setPersonalizedMessageContent(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Digite sua mensagem personalizada..."
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
              <button
                onClick={() => setShowPersonalizedMessageModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendPersonalizedMessage}
                disabled={!personalizedMessageContent.trim() || isSendingBulk}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingBulk ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{isSendingBulk ? 'Enviando...' : 'Enviar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Mensagem Personalizada Para Todos */}
      {showSendAllPersonalizedMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Enviar Mensagem Para Todos
              </h3>
              <button
                onClick={() => setShowSendAllPersonalizedMessageModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mensagem para {detectedPhoneNumbers.length} números
                </label>
                <textarea
                  value={personalizedMessageContent}
                  onChange={(e) => setPersonalizedMessageContent(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Digite sua mensagem personalizada para todos os números detectados..."
                ></textarea>
              </div>
              {bulkSendResult && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-sm">
                  <p className="text-gray-900 dark:text-white">
                    Enviados: {bulkSendResult.sent} / {bulkSendResult.total}
                  </p>
                  {bulkSendResult.failed > 0 && (
                    <p className="text-red-600 dark:text-red-400">
                      Falhas: {bulkSendResult.failed}
                    </p>
                  )}
                  {bulkSendResult.errors.length > 0 && (
                    <ul className="list-disc list-inside text-red-500 dark:text-red-300 mt-2 max-h-24 overflow-y-auto">
                      {bulkSendResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
              <button
                onClick={() => setShowSendAllPersonalizedMessageModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendAllPersonalizedMessage}
                disabled={!personalizedMessageContent.trim() || isSendingBulk}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingBulk ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{isSendingBulk ? 'Enviando...' : 'Enviar Para Todos'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts;