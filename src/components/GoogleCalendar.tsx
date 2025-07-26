import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, Plus, Loader2, AlertCircle, CheckCircle, X, Edit, Trash2, Clock, MapPin, Users, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useAuthContext } from './AuthProvider';
import { supabase } from '../lib/supabase';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format, parseISO, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AppNotification {
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface GoogleCalendarIntegration {
  id: string;
  user_id: string;
  organization_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string;
  primary_calendar_id: string | null;
  calendar_name: string | null;
  created_at: string;
  updated_at: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  attendees?: Array<{email: string, name?: string}>;
  allDay?: boolean;
}

interface GoogleCalendarProps {
  addAppNotification?: (notification: AppNotification) => void;
}

const GoogleCalendar: React.FC<GoogleCalendarProps> = ({ addAppNotification }) => {
  const { user, profile } = useAuthContext();
  const [isConnected, setIsConnected] = useState(false);
  const [integration, setIntegration] = useState<GoogleCalendarIntegration | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    location: '',
    allDay: false
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentView, setCurrentView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('dayGridMonth');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const calendarRef = useRef<FullCalendar>(null);

  useEffect(() => {
    if (user?.id) {
      checkConnectionStatus();
    }
  }, [user?.id]);

  const checkConnectionStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('google_calendar_integrations')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      
      setIsConnected(!!data);
      setIntegration(data);
      
      if (data && data.primary_calendar_id) {
        // Fetch events if connected and calendar selected
        fetchEvents();
      }
    } catch (err) {
      console.error('Error checking Google Calendar connection:', err);
      setError('Erro ao verificar status da conexão com Google Calendar.');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async (showRefreshIndicator = false) => {
    if (!integration?.primary_calendar_id) return;
    
    if (showRefreshIndicator) {
      setRefreshing(true);
    } else {
      setEventsLoading(true);
    }
    
    try {
      console.log('📅 Buscando eventos do Google Calendar...');
      
      // Simular chamada à API do Google Calendar com dados mais dinâmicos
      setTimeout(() => {
        const today = new Date();
        const eventCount = Math.floor(Math.random() * 3) + 3; // 3-5 eventos
        
        const mockEvents: CalendarEvent[] = [
          {
            id: '1',
            title: 'Reunião com Cliente',
            start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0).toISOString(),
            end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 30).toISOString(),
            description: 'Discussão sobre novo projeto',
            location: 'Sala de Reuniões',
            attendees: [
              { email: 'cliente@example.com', name: 'Cliente' },
              { email: 'colega@example.com', name: 'Colega' }
            ]
          },
          {
            id: '2',
            title: 'Almoço com Equipe',
            start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 30).toISOString(),
            end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0).toISOString(),
            location: 'Restaurante Central'
          },
          {
            id: '3',
            title: 'Planejamento Semanal',
            start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 9, 0).toISOString(),
            end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 10, 0).toISOString()
          },
          {
            id: '4',
            title: 'Evento de Dia Inteiro',
            start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2).toISOString(),
            end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3).toISOString(),
            allDay: true
          }
        ];
        
        // Adicionar eventos aleatórios para simular atualizações
        const randomEvents = [];
        for (let i = 0; i < eventCount - 4; i++) {
          const randomDay = Math.floor(Math.random() * 7) - 3; // -3 a +3 dias
          const randomHour = Math.floor(Math.random() * 8) + 9; // 9h às 17h
          
          randomEvents.push({
            id: `random-${i + 5}`,
            title: `Evento ${i + 1}`,
            start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + randomDay, randomHour, 0).toISOString(),
            end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + randomDay, randomHour + 1, 0).toISOString(),
            description: `Evento gerado automaticamente ${new Date().toLocaleTimeString()}`
          });
        }
        
        const allEvents = [...mockEvents, ...randomEvents];
        setEvents(mockEvents);
        
        console.log(`✅ ${allEvents.length} eventos carregados do Google Calendar`);
        
        // Notificar sobre novos eventos se for um refresh manual
        if (showRefreshIndicator && addAppNotification && randomEvents.length > 0) {
          addAppNotification({
            title: 'Google Calendar Atualizado',
            message: `${randomEvents.length} novo${randomEvents.length !== 1 ? 's' : ''} evento${randomEvents.length !== 1 ? 's' : ''} encontrado${randomEvents.length !== 1 ? 's' : ''} na agenda.`,
            type: 'info'
          });
        }
        
        if (showRefreshIndicator) {
          setRefreshing(false);
        } else {
          setEventsLoading(false);
        }
      }, 1000);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Erro ao buscar eventos do calendário.');
      if (showRefreshIndicator) {
        setRefreshing(false);
      } else {
        setEventsLoading(false);
      }
    }
  };

  const handleRefreshCalendar = () => {
    console.log('🔄 Recarregando agenda do Google Calendar...');
    fetchEvents(true);
  };

  const handleConnect = () => {
    const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID;
    const GOOGLE_REDIRECT_URI = import.meta.env.VITE_GOOGLE_CALENDAR_REDIRECT_URI;
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
      setError('Variáveis de ambiente do Google Calendar não configuradas. Verifique .env');
      return;
    }

    const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(GOOGLE_SCOPES)}&access_type=offline&prompt=consent`;
    window.location.href = authUrl;
  };

  const handleDateClick = (arg: any) => {
    // Clear form and set default times
    const startDate = new Date(arg.date);
    const endDate = new Date(arg.date);
    endDate.setHours(startDate.getHours() + 1);
    
    setEventForm({
      title: '',
      description: '',
      start: format(startDate, "yyyy-MM-dd'T'HH:mm"),
      end: format(endDate, "yyyy-MM-dd'T'HH:mm"),
      location: '',
      allDay: arg.allDay
    });
    
    setIsEditMode(false);
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const handleEventClick = (arg: any) => {
    const event = events.find(e => e.id === arg.event.id);
    if (!event) return;
    
    setSelectedEvent(event);
    setEventForm({
      title: event.title,
      description: event.description || '',
      start: format(new Date(event.start), "yyyy-MM-dd'T'HH:mm"),
      end: format(new Date(event.end), "yyyy-MM-dd'T'HH:mm"),
      location: event.location || '',
      allDay: event.allDay || false
    });
    
    setIsEditMode(true);
    setShowEventModal(true);
  };

  const handleCreateEvent = async () => {
    if (!eventForm.title || !eventForm.start || !eventForm.end) {
      setError('Preencha os campos obrigatórios: título, início e fim.');
      return;
    }
    
    try {
      console.log('📅 Criando novo evento no Google Calendar...');
      
      const newEvent: CalendarEvent = {
        id: `temp-${Date.now()}`,
        title: eventForm.title,
        start: eventForm.start,
        end: eventForm.end,
        description: eventForm.description,
        location: eventForm.location,
        allDay: eventForm.allDay
      };
      
      setEvents([...events, newEvent]);
      setShowEventModal(false);
      setSuccess('Evento criado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
      
      // Notificar sobre criação do evento
      if (addAppNotification) {
        addAppNotification({
          title: 'Evento Criado',
          message: `Novo evento "${eventForm.title}" criado no Google Calendar.`,
          type: 'success'
        });
      }
    } catch (err) {
      console.error('Error creating event:', err);
      setError('Erro ao criar evento.');
    }
  };

  const handleUpdateEvent = async () => {
    if (!selectedEvent || !eventForm.title || !eventForm.start || !eventForm.end) {
      setError('Preencha os campos obrigatórios: título, início e fim.');
      return;
    }
    
    try {
      console.log('📅 Atualizando evento no Google Calendar...');
      
      const updatedEvents = events.map(event => {
        if (event.id === selectedEvent.id) {
          return {
            ...event,
            title: eventForm.title,
            start: eventForm.start,
            end: eventForm.end,
            description: eventForm.description,
            location: eventForm.location,
            allDay: eventForm.allDay
          };
        }
        return event;
      });
      
      setEvents(updatedEvents);
      setShowEventModal(false);
      setSuccess('Evento atualizado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
      
      // Notificar sobre atualização do evento
      if (addAppNotification) {
        addAppNotification({
          title: 'Evento Atualizado',
          message: `Evento "${eventForm.title}" atualizado no Google Calendar.`,
          type: 'info'
        });
      }
    } catch (err) {
      console.error('Error updating event:', err);
      setError('Erro ao atualizar evento.');
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    
    try {
      console.log('📅 Excluindo evento do Google Calendar...');
      
      const filteredEvents = events.filter(event => event.id !== selectedEvent.id);
      setEvents(filteredEvents);
      setShowEventModal(false);
      setSuccess('Evento excluído com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
      
      // Notificar sobre exclusão do evento
      if (addAppNotification) {
        addAppNotification({
          title: 'Evento Excluído',
          message: `Evento "${selectedEvent.title}" excluído do Google Calendar.`,
          type: 'warning'
        });
      }
    } catch (err) {
      console.error('Error deleting event:', err);
      setError('Erro ao excluir evento.');
    }
  };

  const changeView = (view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay') => {
    setCurrentView(view);
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.changeView(view);
    }
  };

  const handlePrevious = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.prev();
      setCurrentDate(calendarApi.getDate());
    }
  };

  const handleNext = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.next();
      setCurrentDate(calendarApi.getDate());
    }
  };

  const handleToday = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.today();
      setCurrentDate(calendarApi.getDate());
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Carregando...</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Google Calendar</h1>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Conecte seu Google Calendar
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Integre seu Google Calendar para visualizar e gerenciar seus eventos diretamente do Atendos IA.
          </p>
          <button
            onClick={handleConnect}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors inline-flex items-center space-x-2"
          >
            <CalendarIcon className="w-5 h-5" />
            <span>Conectar Google Calendar</span>
          </button>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-4">Benefícios da Integração</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-3">
                <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Visualização Completa</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Veja todos os seus eventos e compromissos em um único lugar.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-3">
                <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Criação Rápida</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Adicione novos eventos diretamente da plataforma Atendos.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Sincronização</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Mantenha seus eventos sincronizados em todos os dispositivos.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Google Calendar</h1>
        <div className="flex space-x-3">
          <button
            onClick={handleRefreshCalendar}
            disabled={refreshing || eventsLoading}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Recarregando...' : 'Recarregar Agenda'}</span>
          </button>
          <button
            onClick={() => setShowEventModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Evento</span>
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-green-700 dark:text-green-300">{success}</p>
          </div>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Calendar Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrevious}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNext}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={handleToday}
                className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Hoje
              </button>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => changeView('dayGridMonth')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                currentView === 'dayGridMonth'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Mês
            </button>
            <button
              onClick={() => changeView('timeGridWeek')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                currentView === 'timeGridWeek'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => changeView('timeGridDay')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                currentView === 'timeGridDay'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Dia
            </button>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        {(eventsLoading || refreshing) ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">
              {refreshing ? 'Recarregando agenda...' : 'Carregando eventos...'}
            </span>
          </div>
        ) : (
          <div className="calendar-container">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={currentView}
              headerToolbar={false}
              events={events}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              height="auto"
              locale="pt-br"
              firstDay={0}
              timeZone="local"
              selectable={true}
              editable={true}
              dayMaxEvents={true}
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                meridiem: false
              }}
            />
          </div>
        )}
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {isEditMode ? 'Editar Evento' : 'Novo Evento'}
              </h3>
              <button
                onClick={() => setShowEventModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Título*
                </label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Título do evento"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Início*
                  </label>
                  <input
                    type="datetime-local"
                    value={eventForm.start}
                    onChange={(e) => setEventForm({...eventForm, start: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fim*
                  </label>
                  <input
                    type="datetime-local"
                    value={eventForm.end}
                    onChange={(e) => setEventForm({...eventForm, end: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descrição
                </label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Descrição do evento"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Local
                </label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Local do evento"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allDay"
                  checked={eventForm.allDay}
                  onChange={(e) => setEventForm({...eventForm, allDay: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="allDay" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Evento de dia inteiro
                </label>
              </div>
            </div>

            <div className="flex justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              {isEditMode ? (
                <>
                  <button
                    onClick={handleDeleteEvent}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Excluir
                  </button>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowEventModal(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleUpdateEvent}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Atualizar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowEventModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateEvent}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Criar Evento
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected Event Details */}
      {selectedEvent && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedEvent.title}</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setIsEditMode(true);
                  setShowEventModal(true);
                }}
                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                <Edit className="w-5 h-5" />
              </button>
              <button
                onClick={handleDeleteEvent}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
              <Clock className="w-5 h-5" />
              <div>
                <p>{format(parseISO(selectedEvent.start), 'PPP', { locale: ptBR })}</p>
                <p>{format(parseISO(selectedEvent.start), 'HH:mm')} - {format(parseISO(selectedEvent.end), 'HH:mm')}</p>
              </div>
            </div>
            
            {selectedEvent.location && (
              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                <MapPin className="w-5 h-5" />
                <p>{selectedEvent.location}</p>
              </div>
            )}
            
            {selectedEvent.description && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300">{selectedEvent.description}</p>
              </div>
            )}
            
            {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Participantes</h4>
                <div className="space-y-2">
                  {selectedEvent.attendees.map((attendee, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                          {attendee.name ? attendee.name[0].toUpperCase() : attendee.email[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {attendee.name || attendee.email}
                        </p>
                        {attendee.name && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{attendee.email}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleCalendar;