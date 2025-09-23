import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertCircle,
  Activity,
  Send,
  MessageCircle,
  Calendar,
  BarChart3,
  ArrowDownLeft,
  ArrowUpRight,
  Instagram
} from 'lucide-react';
import { useAuthContext } from './AuthProvider';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  totalContacts: number;
  activeConversations: number;
  totalMessages: number;
  unreadMessages: number;
  messagesThisWeek: number[];
  weeklyDetails: Array<{
    day: string;
    date: string;
    sent: number;
    received: number;
    total: number;
  }>;
  avgResponseTime: string;
  lastActivity: string;
}

interface RecentActivity {
  type: string;
  message: string;
  time: string;
  status: string;
  direction: 'sent' | 'received';
  platform: 'whatsapp' | 'instagram';
}

const Dashboard: React.FC = () => {
  const { user } = useAuthContext();
  const [stats, setStats] = useState<DashboardStats>({
    totalContacts: 0,
    activeConversations: 0,
    totalMessages: 0,
    unreadMessages: 0,
    messagesThisWeek: [0, 0, 0, 0, 0, 0, 0],
    weeklyDetails: [],
    avgResponseTime: '22 segundos',
    lastActivity: ''
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'total' | 'sent' | 'received'>('total');

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
      
      // Atualizar dados a cada 30 segundos
      const interval = setInterval(loadDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Buscar estatísticas das conversas WhatsApp
      const { data: conversasWhatsAppStats } = await supabase
        .rpc('obter_estatisticas_conversas_whatsapp');

      // Buscar mensagens da última semana para o gráfico INTERATIVO
      const weeklyData = await getDetailedWeeklyMessageStats();
      
      // Buscar atividade recente combinando WhatsApp e Instagram
      const recentActivities = await getCombinedRecentActivity();

      // Buscar estatísticas do Instagram
      const instagramStats = await getInstagramStats();

      // Combinar estatísticas do WhatsApp e Instagram
      const whatsappStats = conversasWhatsAppStats && conversasWhatsAppStats.length > 0 ? conversasWhatsAppStats[0] : null;
      
      const combinedStats = {
        totalContacts: (parseInt(whatsappStats?.total_conversas) || 0) + (instagramStats.totalConversations || 0),
        activeConversations: (parseInt(whatsappStats?.conversas_ativas) || 0) + (instagramStats.activeConversations || 0),
        totalMessages: await getTotalMessagesFromWhatsApp() + (instagramStats.totalMessages || 0),
        unreadMessages: (parseInt(whatsappStats?.mensagens_nao_lidas) || 0) + (instagramStats.unreadMessages || 0),
        messagesThisWeek: weeklyData.map(d => d.total),
        weeklyDetails: weeklyData,
        avgResponseTime: '22 segundos', // Sempre fixo como solicitado
        lastActivity: getLatestTimestamp(whatsappStats?.ultima_atividade, instagramStats.lastActivity)
      };

      setStats(combinedStats);
      setRecentActivity(recentActivities);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Função para obter a timestamp mais recente entre WhatsApp e Instagram
  const getLatestTimestamp = (whatsappTimestamp: string | null | undefined, instagramTimestamp: string | null | undefined): string => {
    if (!whatsappTimestamp && !instagramTimestamp) return '';
    if (!whatsappTimestamp) return instagramTimestamp || '';
    if (!instagramTimestamp) return whatsappTimestamp || '';
    
    const whatsappDate = new Date(whatsappTimestamp).getTime();
    const instagramDate = new Date(instagramTimestamp).getTime();
    
    return whatsappDate > instagramDate ? whatsappTimestamp : instagramTimestamp;
  };

  // Obter estatísticas do Instagram
  const getInstagramStats = async (): Promise<{
    totalConversations: number;
    activeConversations: number;
    totalMessages: number;
    unreadMessages: number;
    lastActivity: string | null;
  }> => {
    try {
      if (!user?.id) return { 
        totalConversations: 0, 
        activeConversations: 0, 
        totalMessages: 0, 
        unreadMessages: 0, 
        lastActivity: null 
      };

      // Buscar conversas únicas do Instagram (agrupadas por sender_id)
      const { data: instagramMessages } = await supabase
        .from('conversas_instagram')
        .select('sender_id, data_hora')
        .eq('user_id', user.id)
        .order('data_hora', { ascending: false });

      if (!instagramMessages || instagramMessages.length === 0) {
        return { 
          totalConversations: 0, 
          activeConversations: 0, 
          totalMessages: 0, 
          unreadMessages: 0, 
          lastActivity: null 
        };
      }

      // Contar conversas únicas (por sender_id)
      const uniqueSenders = new Set(instagramMessages.map(msg => msg.sender_id));
      const totalConversations = uniqueSenders.size;
      
      // Considerar todas as conversas como ativas
      const activeConversations = totalConversations;
      
      // Total de mensagens é o número total de registros
      const totalMessages = instagramMessages.length;
      
      // Não temos conceito de "não lidas" no Instagram, então assumimos 0
      const unreadMessages = 0;
      
      // Última atividade é a data mais recente
      const lastActivity = instagramMessages[0]?.data_hora || null;

      return {
        totalConversations,
        activeConversations,
        totalMessages,
        unreadMessages,
        lastActivity
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas do Instagram:', error);
      return { 
        totalConversations: 0, 
        activeConversations: 0, 
        totalMessages: 0, 
        unreadMessages: 0, 
        lastActivity: null 
      };
    }
  };

  const getTotalMessagesFromWhatsApp = async (): Promise<number> => {
    try {
      const { count } = await supabase
        .from('mensagens_whatsapp')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);
      
      return count || 0;
    } catch (error) {
      console.error('Erro ao buscar total de mensagens:', error);
      return 0;
    }
  };

  // NOVO: Buscar dados detalhados da semana com separação de enviadas/recebidas
  const getDetailedWeeklyMessageStats = async () => {
    try {
      const weekData = [];
      const today = new Date();
      
      // Buscar dados dos últimos 7 dias (incluindo hoje)
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        // Definir início e fim do dia
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        // Buscar mensagens enviadas do WhatsApp
        const { count: whatsappSentCount } = await supabase
          .from('mensagens_whatsapp')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user?.id)
          .eq('direcao', 'sent')
          .gte('data_hora', startOfDay.toISOString())
          .lte('data_hora', endOfDay.toISOString());
        
        // Buscar mensagens recebidas do WhatsApp
        const { count: whatsappReceivedCount } = await supabase
          .from('mensagens_whatsapp')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user?.id)
          .eq('direcao', 'received')
          .gte('data_hora', startOfDay.toISOString())
          .lte('data_hora', endOfDay.toISOString());
        
        // Buscar mensagens enviadas do Instagram
        const { count: instagramSentCount } = await supabase
          .from('conversas_instagram')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user?.id)
          .eq('direcao', 'sent')
          .gte('data_hora', startOfDay.toISOString())
          .lte('data_hora', endOfDay.toISOString());
        
        // Buscar mensagens recebidas do Instagram
        const { count: instagramReceivedCount } = await supabase
          .from('conversas_instagram')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user?.id)
          .eq('direcao', 'received')
          .gte('data_hora', startOfDay.toISOString())
          .lte('data_hora', endOfDay.toISOString());
        
        const sent = (whatsappSentCount || 0) + (instagramSentCount || 0);
        const received = (whatsappReceivedCount || 0) + (instagramReceivedCount || 0);
        const total = sent + received;
        
        weekData.push({
          day: getDayName(6 - i),
          date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          sent,
          received,
          total
        });
      }
      
      return weekData;
    } catch (error) {
      console.error('Erro ao buscar estatísticas semanais detalhadas:', error);
      return Array(7).fill(0).map((_, i) => ({
        day: getDayName(i),
        date: '',
        sent: 0,
        received: 0,
        total: 0
      }));
    }
  };

  // Buscar atividade recente combinando WhatsApp e Instagram
  const getCombinedRecentActivity = async (): Promise<RecentActivity[]> => {
    try {
      if (!user?.id) {
        return [];
      }

      // Buscar mensagens recentes do WhatsApp
      const { data: whatsappMessages } = await supabase
        .from('mensagens_whatsapp')
        .select('mensagem, direcao, data_hora, nome_contato, numero')
        .eq('user_id', user.id)
        .order('data_hora', { ascending: false })
        .limit(5);

      // Buscar mensagens recentes do Instagram
      const { data: instagramMessages } = await supabase
        .from('conversas_instagram')
        .select('mensagem, direcao, data_hora, sender_id')
        .eq('user_id', user.id)
        .order('data_hora', { ascending: false })
        .limit(5);

      const whatsappActivities: RecentActivity[] = (whatsappMessages || []).map(msg => {
        const nomeContato = msg.nome_contato || msg.numero || 'Contato';
        const mensagemTruncada = msg.mensagem.length > 50 
          ? msg.mensagem.substring(0, 50) + '...' 
          : msg.mensagem;

        // Normalizar direção para comparação case-insensitive
        const direcaoNormalizada = (msg.direcao || '').toLowerCase().trim();
        const isReceived = direcaoNormalizada === 'received';
        const isSent = direcaoNormalizada === 'sent';
        
        let message = '';
        let type = '';
        
        if (isReceived) {
          // Mensagem RECEBIDA - eu recebi do contato
          message = `Mensagem recebida de ${nomeContato}: "${mensagemTruncada}"`;
          type = 'message_received';
        } else if (isSent) {
          // Mensagem ENVIADA - eu enviei para o contato
          message = `Mensagem enviada para ${nomeContato}: "${mensagemTruncada}"`;
          type = 'message_sent';
        } else {
          // Direção desconhecida - assumir como recebida por padrão
          message = `Mensagem de ${nomeContato}: "${mensagemTruncada}" (direção: ${msg.direcao})`;
          type = 'message_unknown';
        }

        return {
          type,
          message,
          time: formatTimeAgo(msg.data_hora),
          status: isReceived ? 'received' : isSent ? 'sent' : 'unknown',
          direction: isReceived ? 'received' : isSent ? 'sent' : 'unknown',
          platform: 'whatsapp' as const
        };
      });

      const instagramActivities: RecentActivity[] = (instagramMessages || []).map(msg => {
        const senderName = `@${msg.sender_id}`;
        const mensagemTruncada = msg.mensagem.length > 50 
          ? msg.mensagem.substring(0, 50) + '...' 
          : msg.mensagem;

        // Normalizar direção para comparação case-insensitive
        const direcaoNormalizada = (msg.direcao || '').toLowerCase().trim();
        const isReceived = direcaoNormalizada === 'received';
        const isSent = direcaoNormalizada === 'sent';
        
        let message = '';
        let type = '';
        
        if (isReceived) {
          // Mensagem RECEBIDA - eu recebi do contato
          message = `Instagram: Mensagem recebida de ${senderName}: "${mensagemTruncada}"`;
          type = 'instagram_received';
        } else if (isSent) {
          // Mensagem ENVIADA - eu enviei para o contato
          message = `Instagram: Mensagem enviada para ${senderName}: "${mensagemTruncada}"`;
          type = 'instagram_sent';
        } else {
          // Direção desconhecida - assumir como recebida por padrão
          message = `Instagram: Mensagem de ${senderName}: "${mensagemTruncada}" (direção: ${msg.direcao})`;
          type = 'instagram_unknown';
        }

        return {
          type,
          message,
          time: formatTimeAgo(msg.data_hora),
          status: isReceived ? 'received' : isSent ? 'sent' : 'unknown',
          direction: isReceived ? 'received' : isSent ? 'sent' : 'unknown',
          platform: 'instagram' as const
        };
      });

      // Combinar e ordenar por tempo (mais recente primeiro)
      const combinedActivities = [...whatsappActivities, ...instagramActivities]
        .sort((a, b) => {
          // Ordenar por data_hora original em vez de tempo formatado
          const whatsappMsg = whatsappMessages?.find(m => formatTimeAgo(m.data_hora) === a.time);
          const instagramMsg = instagramMessages?.find(m => formatTimeAgo(m.data_hora) === a.time);
          const whatsappMsgB = whatsappMessages?.find(m => formatTimeAgo(m.data_hora) === b.time);
          const instagramMsgB = instagramMessages?.find(m => formatTimeAgo(m.data_hora) === b.time);
          
          const dateA = whatsappMsg?.data_hora || instagramMsg?.data_hora || '';
          const dateB = whatsappMsgB?.data_hora || instagramMsgB?.data_hora || '';
          
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        })
        .slice(0, 8); // Limitar a 8 atividades

      return combinedActivities;
    } catch (error) {
      console.error('Erro ao buscar atividade recente combinada:', error);
      return [];
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'agora';
    if (diffMinutes < 60) return `${diffMinutes} min atrás`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d atrás`;
  };

  const getDayName = (index: number): string => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const today = new Date();
    const dayIndex = (today.getDay() - 6 + index + 7) % 7;
    return days[dayIndex];
  };

  // NOVO: Obter dados baseado na métrica selecionada
  const getCurrentMetricData = () => {
    return stats.weeklyDetails.map(day => {
      switch (selectedMetric) {
        case 'sent': return day.sent;
        case 'received': return day.received;
        default: return day.total;
      }
    });
  };

  const getCurrentMetricColor = () => {
    switch (selectedMetric) {
      case 'sent': return 'from-blue-500 to-blue-600';
      case 'received': return 'from-green-500 to-green-600';
      default: return 'from-indigo-500 to-purple-500';
    }
  };

  const getCurrentMetricLabel = () => {
    switch (selectedMetric) {
      case 'sent': return 'Mensagens Enviadas';
      case 'received': return 'Mensagens Recebidas';
      default: return 'Total de Mensagens';
    }
  };

  const maxMessages = Math.max(...getCurrentMetricData(), 1);

  const dashboardCards = [
    {
      title: 'Total de Contatos',
      value: stats.totalContacts.toString(),
      change: stats.totalContacts > 0 ? '+' + Math.round((stats.totalContacts / 30) * 100) / 100 + '/dia' : 'Nenhum contato',
      positive: true,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Conversas Ativas',
      value: stats.activeConversations.toString(),
      change: stats.unreadMessages > 0 ? `${stats.unreadMessages} não lidas` : 'Todas lidas',
      positive: stats.unreadMessages === 0,
      icon: MessageSquare,
      color: 'bg-green-500'
    },
    {
      title: 'Total de Mensagens',
      value: stats.totalMessages.toString(),
      change: stats.messagesThisWeek.reduce((a, b) => a + b, 0) + ' esta semana',
      positive: true,
      icon: MessageCircle,
      color: 'bg-purple-500'
    },
    {
      title: 'Tempo Médio de Resposta',
      value: '22 segundos',
      change: 'Acima da média',
      positive: true,
      icon: Clock,
      color: 'bg-orange-500'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Carregando dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <Clock className="w-4 h-4" />
          <span>Última atualização: {stats.lastActivity ? formatTimeAgo(stats.lastActivity) : 'nunca'}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all duration-200 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                  <div className="flex items-center mt-2">
                    <span className={`text-sm font-medium ${stat.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRÁFICO DE LINHA INTERATIVO - DESIGN ATUALIZADO */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <span>Mensagens dos Últimos 7 Dias</span>
            </h2>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total: {getCurrentMetricData().reduce((a, b) => a + b, 0)}
            </div>
          </div>

          {/* Seletores de Métrica */}
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => setSelectedMetric('total')}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                selectedMetric === 'total'
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Total
            </button>
            <button
              onClick={() => setSelectedMetric('sent')}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                selectedMetric === 'sent'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Enviadas
            </button>
            <button
              onClick={() => setSelectedMetric('received')}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                selectedMetric === 'received'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Recebidas
            </button>
          </div>
          
          {/* Gráfico de Linha Estilo Moderno */}
          <div className="relative h-64 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl p-6">
            <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
              {/* Grid Lines */}
              <defs>
                <pattern id="grid" width="57.14" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 57.14 0 L 0 0 0 40" fill="none" stroke="rgba(156, 163, 175, 0.2)" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              {/* Linha do Gráfico */}
              <polyline
                fill="none"
                stroke="#3B82F6"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={getCurrentMetricData().map((value, index) => {
                  const x = (index * 400) / (getCurrentMetricData().length - 1);
                  const y = 180 - ((value / Math.max(...getCurrentMetricData(), 1)) * 160);
                  return `${x},${y}`;
                }).join(' ')}
                className="drop-shadow-sm"
              />
              
              {/* Pontos do Gráfico */}
              {getCurrentMetricData().map((value, index) => {
                const x = (index * 400) / (getCurrentMetricData().length - 1);
                const y = 180 - ((value / Math.max(...getCurrentMetricData(), 1)) * 160);
                const isHovered = hoveredBar === index;
                
                return (
                  <g key={index}>
                    {/* Ponto Principal */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isHovered ? "8" : "6"}
                      fill="#3B82F6"
                      stroke="white"
                      strokeWidth="3"
                      className={`cursor-pointer transition-all duration-200 ${
                        isHovered ? 'drop-shadow-lg' : 'drop-shadow-sm'
                      }`}
                      onMouseEnter={() => setHoveredBar(index)}
                      onMouseLeave={() => setHoveredBar(null)}
                    />
                    
                    {/* Área de Hover Invisível (maior para facilitar interação) */}
                    <circle
                      cx={x}
                      cy={y}
                      r="15"
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredBar(index)}
                      onMouseLeave={() => setHoveredBar(null)}
                    />
                  </g>
                );
              })}
            </svg>
            
            {/* Tooltip Interativo */}
            {hoveredBar !== null && stats.weeklyDetails[hoveredBar] && (
              <div 
                className="absolute bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs px-4 py-3 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-10 min-w-max"
                style={{
                  left: `${(hoveredBar * 100) / (getCurrentMetricData().length - 1)}%`,
                  top: '10px',
                  transform: 'translateX(-50%)'
                }}
              >
                <div className="font-semibold text-center mb-2">
                  {stats.weeklyDetails[hoveredBar].day} - {stats.weeklyDetails[hoveredBar].date}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Enviadas: {stats.weeklyDetails[hoveredBar].sent}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Recebidas: {stats.weeklyDetails[hoveredBar].received}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                    <span>Total: {stats.weeklyDetails[hoveredBar].total}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Labels dos Dias */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-6 pb-2">
              {stats.weeklyDetails.map((day, index) => (
                <span 
                  key={index}
                  className={`text-xs transition-colors ${
                    hoveredBar === index
                      ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {day.day || getDayName(index)}
                </span>
              ))}
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>{getCurrentMetricLabel()}</span>
            </div>
          </div>
        </div>

        {/* Recent Activity - ATUALIZADA para incluir Instagram */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <Activity className="w-5 h-5 text-green-600" />
            <span>Atividade Recente</span>
          </h2>
          
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  {/* Ícone baseado na plataforma e direção */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    activity.platform === 'whatsapp'
                      ? activity.direction === 'received'
                        ? 'bg-green-100 dark:bg-green-900/30' 
                        : activity.direction === 'sent'
                          ? 'bg-blue-100 dark:bg-blue-900/30'
                          : 'bg-gray-100 dark:bg-gray-900/30'
                      : activity.direction === 'received'
                        ? 'bg-purple-100 dark:bg-purple-900/30'
                        : activity.direction === 'sent'
                          ? 'bg-pink-100 dark:bg-pink-900/30'
                          : 'bg-gray-100 dark:bg-gray-900/30'
                  }`}>
                    {activity.platform === 'whatsapp' ? (
                      activity.direction === 'received' ? (
                        <ArrowDownLeft className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : activity.direction === 'sent' ? (
                        <ArrowUpRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <MessageCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      )
                    ) : (
                      activity.direction === 'received' ? (
                        <Instagram className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      ) : activity.direction === 'sent' ? (
                        <Instagram className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                      ) : (
                        <Instagram className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      )
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white leading-relaxed">{activity.message}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center space-x-1">
                      <span>{activity.time}</span>
                      <span>•</span>
                      <span className={`font-medium ${
                        activity.platform === 'whatsapp'
                          ? activity.direction === 'received'
                            ? 'text-green-600 dark:text-green-400' 
                            : activity.direction === 'sent'
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-600 dark:text-gray-400'
                          : activity.direction === 'received'
                            ? 'text-purple-600 dark:text-purple-400'
                            : activity.direction === 'sent'
                              ? 'text-pink-600 dark:text-pink-400'
                              : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {activity.direction === 'received' ? 'Recebida' : 
                         activity.direction === 'sent' ? 'Enviada' : 
                         `Direção: ${activity.status}`}
                        {activity.platform === 'instagram' ? ' (Instagram)' : ''}
                      </span>
                    </p>
                  </div>
                  
                  {/* Status indicator */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${
                    activity.platform === 'whatsapp'
                      ? activity.direction === 'received' 
                        ? 'bg-green-500' 
                        : activity.direction === 'sent'
                          ? 'bg-blue-500'
                          : 'bg-gray-500'
                      : activity.direction === 'received' 
                        ? 'bg-purple-500' 
                        : activity.direction === 'sent'
                          ? 'bg-pink-500'
                          : 'bg-gray-500'
                  }`}></div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Nenhuma atividade recente
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                  As atividades aparecerão aqui quando você começar a usar o sistema
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100 mb-4 flex items-center space-x-2">
          <TrendingUp className="w-5 h-5" />
          <span>Resumo do Sistema</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-indigo-100 dark:border-indigo-800">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Sistema Ativo</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {stats.totalMessages > 0 ? 'Processando mensagens' : 'Aguardando mensagens'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-indigo-100 dark:border-indigo-800">
            <div className="flex items-center space-x-3">
              <Calendar className="w-8 h-8 text-blue-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Última Atividade</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {stats.lastActivity ? formatTimeAgo(stats.lastActivity) : 'Nenhuma atividade'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-indigo-100 dark:border-indigo-800">
            <div className="flex items-center space-x-3">
              <Activity className="w-8 h-8 text-purple-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Performance</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Resposta em 22 segundos
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;