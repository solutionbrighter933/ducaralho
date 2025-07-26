import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, ChevronDown, LogOut, User, MessageSquare, Users, X, Instagram, CreditCard, Calendar, CheckCircle, AlertCircle, Info, Trash2 } from 'lucide-react';
import { useAuthContext } from './AuthProvider';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
}
interface HeaderProps {
  setActiveSection?: (section: string) => void;
  appNotifications?: AppNotification[];
  markNotificationAsRead?: (notificationId: string) => void;
  removeNotification?: (notificationId: string) => void;
  clearAllNotifications?: () => void;
}

interface SearchResult {
  type: 'conversation' | 'contact';
  platform: 'whatsapp' | 'instagram';
  title: string;
  subtitle: string;
  icon: any;
  action: () => void;
  conversa_id?: string;
  numero_contato?: string;
  sender_id?: string;
  data_hora?: string;
}

const Header: React.FC<HeaderProps> = ({ 
  setActiveSection, 
  appNotifications = [], 
  markNotificationAsRead, 
  removeNotification, 
  clearAllNotifications 
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const { user, profile, signOut, hasActiveSubscription } = useAuthContext();
  
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Contar notificações não lidas
  const unreadNotificationsCount = appNotifications.filter(n => !n.read).length;

  // Função para obter ícone da notificação baseado no tipo
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  // Função para obter cor de fundo da notificação
  const getNotificationBg = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  // Função para formatar tempo relativo
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'agora';
    if (diffMinutes < 60) return `${diffMinutes} min atrás`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d atrás`;
  };
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Função para buscar dados reais da aba Conversas (tabelas conversas_whatsapp, mensagens_whatsapp e conversas_instagram)
  const searchInConversationsData = async (query: string): Promise<SearchResult[]> => {
    if (!query.trim() || !user?.id) return [];

    try {
      setSearchLoading(true);
      const searchTerm = query.toLowerCase().trim();

      console.log('🔍 Searching in conversations data for:', searchTerm);

      // 1. Buscar conversas WhatsApp que correspondem ao termo
      const { data: conversasWhatsAppData, error: conversasWhatsAppError } = await supabase
        .from('conversas_whatsapp')
        .select('conversa_id, numero_contato, nome_contato, ultima_mensagem, ultima_atividade, total_mensagens, nao_lidas')
        .eq('user_id', user.id)
        .or(`nome_contato.ilike.%${searchTerm}%,numero_contato.ilike.%${searchTerm}%,ultima_mensagem.ilike.%${searchTerm}%`)
        .order('ultima_atividade', { ascending: false })
        .limit(5);

      if (conversasWhatsAppError) {
        console.error('❌ Erro ao buscar conversas WhatsApp:', conversasWhatsAppError);
      }

      // 2. Buscar mensagens WhatsApp específicas que contenham o termo
      const { data: mensagensWhatsAppData, error: mensagensWhatsAppError } = await supabase
        .from('mensagens_whatsapp')
        .select('conversa_id, numero, mensagem, nome_contato, data_hora, direcao')
        .eq('user_id', user.id)
        .ilike('mensagem', `%${searchTerm}%`)
        .order('data_hora', { ascending: false })
        .limit(5);

      if (mensagensWhatsAppError) {
        console.error('❌ Erro ao buscar mensagens WhatsApp:', mensagensWhatsAppError);
      }

      // 3. Buscar conversas Instagram que correspondem ao termo
      const { data: conversasInstagramData, error: conversasInstagramError } = await supabase
        .from('conversas_instagram')
        .select('sender_id, mensagem, data_hora')
        .eq('user_id', user.id)
        .or(`sender_id.ilike.%${searchTerm}%,mensagem.ilike.%${searchTerm}%`)
        .order('data_hora', { ascending: false })
        .limit(5);

      if (conversasInstagramError) {
        console.error('❌ Erro ao buscar conversas Instagram:', conversasInstagramError);
      }

      const results: SearchResult[] = [];

      // 4. Processar conversas WhatsApp encontradas
      if (conversasWhatsAppData && conversasWhatsAppData.length > 0) {
        console.log('📋 Found WhatsApp conversations:', conversasWhatsAppData.length);
        
        conversasWhatsAppData.forEach(conversa => {
          const nomeContato = conversa.nome_contato || conversa.numero_contato || 'Contato';
          const ultimaMensagem = conversa.ultima_mensagem || '';
          const mensagemTruncada = ultimaMensagem.length > 50 
            ? ultimaMensagem.substring(0, 50) + '...' 
            : ultimaMensagem;

          const dataFormatada = conversa.ultima_atividade 
            ? new Date(conversa.ultima_atividade).toLocaleDateString('pt-BR')
            : '';

          results.push({
            type: 'conversation',
            platform: 'whatsapp',
            title: nomeContato,
            subtitle: `${conversa.total_mensagens || 0} mensagens${conversa.nao_lidas > 0 ? ` • ${conversa.nao_lidas} não lidas` : ''} • ${dataFormatada}`,
            icon: MessageSquare,
            action: () => {
              console.log('🎯 Navigating to WhatsApp conversations for:', conversa.conversa_id);
              setActiveSection?.('conversations');
              setSearchQuery('');
              setShowSearchResults(false);
            },
            conversa_id: conversa.conversa_id,
            numero_contato: conversa.numero_contato,
            data_hora: conversa.ultima_atividade
          });
        });
      }

      // 5. Processar mensagens WhatsApp específicas encontradas (evitar duplicatas de conversas)
      if (mensagensWhatsAppData && mensagensWhatsAppData.length > 0) {
        console.log('📨 Found WhatsApp messages:', mensagensWhatsAppData.length);
        
        const conversasJaAdicionadas = new Set(results.map(r => r.conversa_id));
        
        mensagensWhatsAppData.forEach(mensagem => {
          if (!conversasJaAdicionadas.has(mensagem.conversa_id)) {
            const nomeContato = mensagem.nome_contato || mensagem.numero || 'Contato';
            const mensagemTruncada = mensagem.mensagem.length > 40 
              ? mensagem.mensagem.substring(0, 40) + '...' 
              : mensagem.mensagem;
            
            const direcaoTexto = mensagem.direcao === 'sent' ? 'Enviada' : 'Recebida';
            const dataFormatada = new Date(mensagem.data_hora).toLocaleDateString('pt-BR');

            results.push({
              type: 'conversation',
              platform: 'whatsapp',
              title: nomeContato,
              subtitle: `${direcaoTexto} em ${dataFormatada}: "${mensagemTruncada}"`,
              icon: MessageSquare,
              action: () => {
                console.log('🎯 Navigating to WhatsApp conversations for message:', mensagem.conversa_id);
                setActiveSection?.('conversations');
                setSearchQuery('');
                setShowSearchResults(false);
              },
              conversa_id: mensagem.conversa_id,
              numero_contato: mensagem.numero,
              data_hora: mensagem.data_hora
            });

            conversasJaAdicionadas.add(mensagem.conversa_id);
          }
        });
      }

      // 6. Processar conversas Instagram encontradas
      if (conversasInstagramData && conversasInstagramData.length > 0) {
        console.log('📸 Found Instagram conversations:', conversasInstagramData.length);
        
        // Agrupar mensagens por sender_id para evitar duplicatas
        const senderGroups = conversasInstagramData.reduce((groups, item) => {
          const group = groups[item.sender_id] || [];
          group.push(item);
          groups[item.sender_id] = group;
          return groups;
        }, {} as Record<string, typeof conversasInstagramData>);
        
        // Adicionar um resultado por sender_id
        Object.entries(senderGroups).forEach(([senderId, messages]) => {
          // Ordenar mensagens por data (mais recente primeiro)
          const sortedMessages = [...messages].sort((a, b) => 
            new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime()
          );
          
          const latestMessage = sortedMessages[0];
          const mensagemTruncada = latestMessage.mensagem.length > 40 
            ? latestMessage.mensagem.substring(0, 40) + '...' 
            : latestMessage.mensagem;
          
          const dataFormatada = new Date(latestMessage.data_hora).toLocaleDateString('pt-BR');

          results.push({
            type: 'conversation',
            platform: 'instagram',
            title: `@${senderId}`,
            subtitle: `Instagram • ${dataFormatada}: "${mensagemTruncada}"`,
            icon: Instagram,
            action: () => {
              console.log('🎯 Navigating to Instagram conversations for:', senderId);
              setActiveSection?.('conversations');
              setSearchQuery('');
              setShowSearchResults(false);
            },
            sender_id: senderId,
            data_hora: latestMessage.data_hora
          });
        });
      }

      // 7. Adicionar contatos únicos baseados nos números encontrados
      const numerosUnicos = new Set<string>();
      results.filter(r => r.platform === 'whatsapp').forEach(result => {
        if (result.numero_contato && !numerosUnicos.has(result.numero_contato)) {
          numerosUnicos.add(result.numero_contato);
        }
      });

      // Limitar contatos a 3 para não sobrecarregar
      Array.from(numerosUnicos).slice(0, 3).forEach(numero => {
        const conversaDoNumero = results.find(r => r.numero_contato === numero);
        if (conversaDoNumero) {
          results.push({
            type: 'contact',
            platform: 'whatsapp',
            title: conversaDoNumero.title,
            subtitle: `Contato WhatsApp: ${numero}`,
            icon: Users,
            action: () => {
              console.log('🎯 Navigating to conversations for contact:', numero);
              setActiveSection?.('conversations');
              setSearchQuery('');
              setShowSearchResults(false);
            },
            numero_contato: numero
          });
        }
      });

      // 8. Adicionar contatos Instagram únicos
      const senderIdsUnicos = new Set<string>();
      results.filter(r => r.platform === 'instagram').forEach(result => {
        if (result.sender_id && !senderIdsUnicos.has(result.sender_id)) {
          senderIdsUnicos.add(result.sender_id);
        }
      });

      // Limitar contatos Instagram a 3
      Array.from(senderIdsUnicos).slice(0, 3).forEach(senderId => {
        const conversaDoSender = results.find(r => r.sender_id === senderId && r.platform === 'instagram');
        if (conversaDoSender) {
          results.push({
            type: 'contact',
            platform: 'instagram',
            title: `@${senderId}`,
            subtitle: `Contato Instagram`,
            icon: Users,
            action: () => {
              console.log('🎯 Navigating to Instagram conversations for contact:', senderId);
              setActiveSection?.('conversations');
              setSearchQuery('');
              setShowSearchResults(false);
            },
            sender_id: senderId
          });
        }
      });

      // 9. Remover duplicatas e limitar resultados finais
      const resultadosUnicos = results.filter((result, index, self) => 
        index === self.findIndex(r => 
          r.type === result.type && 
          r.platform === result.platform &&
          ((r.conversa_id === result.conversa_id) || 
           (r.numero_contato === result.numero_contato) ||
           (r.sender_id === result.sender_id))
        )
      ).slice(0, 8); // Limitar a 8 resultados

      console.log('✅ Search completed. Results found:', resultadosUnicos.length);
      return resultadosUnicos;

    } catch (error) {
      console.error('❌ Error searching conversations data:', error);
      return [];
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleProfileClick = () => {
    setActiveSection?.('profile');
    setShowUserMenu(false);
  };

  const handleSubscriptionClick = () => {
    if (hasActiveSubscription) {
      setActiveSection?.('subscription');
    } else {
      navigate('/pricing');
    }
    setShowUserMenu(false);
  };

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (value.trim().length > 0) {
      setShowSearchResults(true);
      // Buscar dados reais das conversas
      const results = await searchInConversationsData(value);
      setSearchResults(results);
    } else {
      setShowSearchResults(false);
      setSearchResults([]);
    }
  };

  const handleSearchResultClick = (result: SearchResult) => {
    result.action();
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSearchResults(false);
    setSearchResults([]);
  };

  // Função para lidar com clique na notificação
  const handleNotificationClick = (notification: AppNotification) => {
    if (markNotificationAsRead) {
      markNotificationAsRead(notification.id);
    }
    
    // Se a notificação for sobre Google Calendar, navegar para a seção
    if (notification.message.includes('Google Calendar')) {
      setActiveSection?.('calendar');
      setShowNotifications(false);
    }
  };
  // Get user display information with real-time updates
  const getUserDisplayName = () => {
    return profile?.full_name || user?.email?.split('@')[0] || 'Usuário';
  };

  const getUserRole = () => {
    return profile?.role || 'Admin';
  };

  const getUserEmail = () => {
    return profile?.email || user?.email || '';
  };

  const getUserAvatar = () => {
    // Use profile avatar if available, otherwise fallback to default
    return profile?.avatar_url || "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=64&h=64&dpr=2";
  };

  const getUserInitials = () => {
    const name = getUserDisplayName();
    return name.charAt(0).toUpperCase();
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4 transition-colors">
      <div className="flex items-center justify-between">
        {/* Search Section */}
        <div className="flex items-center space-x-4">
          <div className="relative" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar conversas, contatos..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10 pr-10 py-2 w-96 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                {searchLoading ? (
                  <div className="py-8 text-center">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      Buscando conversas...
                    </p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="py-2">
                    {searchResults.map((result, index) => {
                      const Icon = result.icon;
                      return (
                        <button
                          key={index}
                          onClick={() => handleSearchResultClick(result)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center space-x-3"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            result.platform === 'whatsapp' 
                              ? 'bg-green-100 dark:bg-green-900/30' 
                              : 'bg-purple-100 dark:bg-purple-900/30'
                          }`}>
                            <Icon className={`w-4 h-4 ${
                              result.platform === 'whatsapp' 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-purple-600 dark:text-purple-400'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {result.title}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {result.subtitle}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            result.type === 'conversation' 
                              ? result.platform === 'whatsapp'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                              : result.platform === 'whatsapp'
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                : 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300'
                          }`}>
                            {result.type === 'conversation' ? 'Conversa' : 'Contato'} {result.platform === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : searchQuery.trim().length > 0 ? (
                  <div className="py-8 text-center">
                    <Search className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      Nenhuma conversa encontrada para "{searchQuery}"
                    </p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                      Tente buscar por nome do contato, número, username ou conteúdo da mensagem
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
        
        {/* Right Section - Notifications and User Menu */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notificações</h3>
                      {unreadNotificationsCount > 0 && (
                        <span className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs font-medium px-2 py-1 rounded-full">
                          {unreadNotificationsCount} nova{unreadNotificationsCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {appNotifications.length > 0 && clearAllNotifications && (
                        <button
                          onClick={clearAllNotifications}
                          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
                          title="Limpar todas"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {appNotifications.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto">
                    {appNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                          !notification.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`text-sm font-medium ${
                                !notification.read 
                                  ? 'text-gray-900 dark:text-white' 
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}>
                                {notification.title}
                              </p>
                              {removeNotification && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeNotification(notification.id);
                                  }}
                                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 ml-2"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-gray-500 dark:text-gray-500">
                                {formatTimeAgo(notification.timestamp)}
                              </p>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      Nenhuma notificação no momento!
                    </p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                      Você será notificado sobre novas mensagens e atividades importantes.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <div 
              className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-2 transition-colors"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              {/* User Avatar - Updated to use real profile data */}
              <div className="relative">
                {profile?.avatar_url ? (
                  <img
                    src={getUserAvatar()}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold ${profile?.avatar_url ? 'hidden' : ''}`}>
                  {getUserInitials()}
                </div>
                {/* Developer mode indicator */}
                {localStorage.getItem('developer_mode') === 'true' && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 border border-white dark:border-gray-800 rounded-full" title="Modo Desenvolvedor"></div>
                )}
              </div>
              
              {/* User Info - Updated to use real profile data */}
              <div className="text-sm">
                <p className="font-medium text-gray-900 dark:text-white">
                  {getUserDisplayName()}
                  {localStorage.getItem('developer_mode') === 'true' && (
                    <span className="ml-2 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full">DEV</span>
                  )}
                </p>
                <p className="text-gray-500 dark:text-gray-400">
                  {getUserRole()}
                </p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </div>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {getUserDisplayName()}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {getUserEmail()}
                  </p>
                  {localStorage.getItem('developer_mode') === 'true' && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-medium">
                      
                    </p>
                  )}
                </div>
                
                <div className="py-1">
                  <button 
                    onClick={handleProfileClick}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <User className="w-4 h-4 mr-3" />
                    Meu Perfil
                  </button>
                  
                  {localStorage.getItem('developer_mode') === 'true' && (
                    <button 
                      onClick={() => {
                        localStorage.removeItem('developer_mode');
                        window.location.href = '/pricing';
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                    >
                      <CreditCard className="w-4 h-4 mr-3" />
                      Sair do Modo Dev
                    </button>
                  )}
                  
                  <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                  
                  <button 
                    onClick={handleSignOut}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sair
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;