import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, RotateCcw, Settings, Paperclip, Smile, AlertCircle } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  isTyping?: boolean;
}

const Support: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Olá! Sou o assistente de suporte do Atendos IA. Como posso ajudá-lo hoje?',
      sender: 'assistant',
      timestamp: new Date(),
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const sendMessageToAPI = async (message: string): Promise<string> => {
    try {
      console.log('🚀 Enviando mensagem para API:', message);
      
      const response = await fetch('https://joaosiqueira.app.n8n.cloud/webhook/chatgpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
        },
        body: JSON.stringify({
          message: message,
          timestamp: new Date().toISOString(),
          user_id: 'attendos_user',
          session_id: `session_${Date.now()}`
        }),
      });

      console.log('📡 Status da resposta:', response.status);
      console.log('📡 Headers da resposta:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
      }

      // Verificar o tipo de conteúdo da resposta
      const contentType = response.headers.get('content-type');
      console.log('📄 Content-Type:', contentType);

      let responseText = '';

      // CORREÇÃO: Ler o corpo da resposta apenas UMA vez
      if (contentType && contentType.includes('application/json')) {
        // Se for JSON, fazer parse direto
        try {
          const data = await response.json();
          console.log('✅ Resposta JSON recebida:', data);
          
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
          } else {
            // Se não conseguir extrair, usar a resposta completa como string
            responseText = JSON.stringify(data);
          }
        } catch (jsonError) {
          console.error('❌ Erro ao fazer parse do JSON:', jsonError);
          throw new Error('Resposta JSON inválida da API');
        }
      } else {
        // Se não for JSON, ler como texto
        try {
          responseText = await response.text();
          console.log('📝 Resposta como texto:', responseText);
        } catch (textError) {
          console.error('❌ Erro ao ler resposta como texto:', textError);
          throw new Error('Erro ao ler resposta da API');
        }
      }

      // Verificar se a resposta não está vazia
      if (!responseText || responseText.trim() === '') {
        throw new Error('Resposta vazia da API');
      }

      return responseText.trim();
      
    } catch (error) {
      console.error('❌ Erro detalhado ao chamar API:', error);
      
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('Erro de conexão: Não foi possível conectar à API. Verifique sua conexão com a internet.');
      } else if (error instanceof Error && error.message.includes('body stream already read')) {
        throw new Error('Erro interno: Problema na leitura da resposta da API.');
      } else if (error instanceof SyntaxError && error.message.includes('JSON')) {
        throw new Error('Erro de formato: A API retornou uma resposta JSON inválida.');
      } else {
        throw new Error(`Erro de conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);
    setError(null);

    try {
      // Chamar a API
      const apiResponse = await sendMessageToAPI(currentMessage);
      
      // Simular um pequeno delay para parecer mais natural
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: apiResponse,
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      
    } catch (error) {
      console.error('❌ Erro no envio da mensagem:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMessage);
      
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Verifique sua conexão e tente novamente em alguns instantes.',
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    if (messages.length > 1) {
      const lastUserMessage = messages.filter(m => m.sender === 'user').pop();
      if (lastUserMessage) {
        setInputMessage(lastUserMessage.content);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: '1',
        content: 'Olá! Sou o assistente de suporte do Atendos IA. Como posso ajudá-lo hoje?',
        sender: 'assistant',
        timestamp: new Date(),
      }
    ]);
    setError(null);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const quickQuestions = [
    'Como conectar o WhatsApp?',
    'Como treinar o agente de IA?',
    'Como configurar notificações?',
    'Como exportar relatórios?',
    'Como gerenciar contatos?',
    'Como ativar o modo escuro?'
  ];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Suporte Atendos IA</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isTyping ? 'Digitando...' : isLoading ? 'Processando...' : 'Online'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleClearChat}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Limpar conversa"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              <button 
                onClick={handleRetry}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium mt-1"
              >
                Tentar novamente
              </button>
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-lg font-bold flex-shrink-0"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
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
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>

              {/* Message Bubble */}
              <div className={`rounded-2xl px-4 py-3 ${
                message.sender === 'user'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
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
                <Bot className="w-4 h-4 text-white" />
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

        {/* Quick Questions */}
        {messages.length === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Perguntas frequentes:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {quickQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => setInputMessage(question)}
                  className="text-left p-3 text-sm bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors"
                >
                  {question}
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
          {/* Attachment Button */}
          <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Message Input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              rows={1}
              className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              style={{ minHeight: '48px', maxHeight: '120px' }}
              disabled={isLoading}
            />
            
            {/* Emoji Button */}
            <button className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              <Smile className="w-5 h-5" />
            </button>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="p-3 bg-indigo-500 text-white rounded-2xl hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
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
  );
};

export default Support;