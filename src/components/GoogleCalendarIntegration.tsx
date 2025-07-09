import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw, Loader2, AlertCircle, CheckCircle, X, Plus, Trash2 } from 'lucide-react';
import { useAuthContext } from './AuthProvider';
import { supabase } from '../lib/supabase';

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

interface CalendarInfo {
  id: string;
  name: string;
  description: string;
  primary: boolean;
  timeZone: string;
}

const GoogleCalendarIntegration: React.FC = () => {
  const { user, profile } = useAuthContext();
  const [isConnected, setIsConnected] = useState(false);
  const [integration, setIntegration] = useState<GoogleCalendarIntegration | null>(null);
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarsLoading, setCalendarsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID;
  const GOOGLE_REDIRECT_URI = import.meta.env.VITE_GOOGLE_CALENDAR_REDIRECT_URI;
  const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events';

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
      
      if (data) {
        // Fetch calendars if connected
        fetchCalendars();
      }
    } catch (err) {
      console.error('Error checking Google Calendar connection:', err);
      setError('Erro ao verificar status da conexão.');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendars = async () => {
    if (!integration?.access_token) return;
    
    setCalendarsLoading(true);
    try {
      // This would normally call the Google Calendar API
      // For demo purposes, we'll use mock data
      setTimeout(() => {
        const mockCalendars: CalendarInfo[] = [
          {
            id: 'primary',
            name: 'Calendário Principal',
            description: 'Seu calendário principal',
            primary: true,
            timeZone: 'America/Sao_Paulo'
          },
          {
            id: 'family@group.v.calendar.google.com',
            name: 'Família',
            description: 'Calendário compartilhado com a família',
            primary: false,
            timeZone: 'America/Sao_Paulo'
          },
          {
            id: 'work@group.v.calendar.google.com',
            name: 'Trabalho',
            description: 'Calendário de compromissos de trabalho',
            primary: false,
            timeZone: 'America/Sao_Paulo'
          }
        ];
        setCalendars(mockCalendars);
        setCalendarsLoading(false);
      }, 1000);
    } catch (err) {
      console.error('Error fetching calendars:', err);
      setError('Erro ao buscar calendários.');
      setCalendarsLoading(false);
    }
  };

  const handleConnect = () => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
      setError('Variáveis de ambiente do Google Calendar não configuradas. Verifique .env');
      return;
    }

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(GOOGLE_SCOPES)}&access_type=offline&prompt=consent`;
    window.location.href = authUrl;
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('google_calendar_integrations')
        .delete()
        .eq('user_id', user?.id);

      if (error) throw error;
      
      setIsConnected(false);
      setIntegration(null);
      setCalendars([]);
      
      setSuccess('Conexão com Google Calendar desconectada com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error disconnecting Google Calendar:', err);
      setError('Erro ao desconectar Google Calendar.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCalendar = async (calendarId: string, calendarName: string) => {
    if (!integration) return;
    
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('google_calendar_integrations')
        .update({
          primary_calendar_id: calendarId,
          calendar_name: calendarName,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id);

      if (error) throw error;
      
      setIntegration({
        ...integration,
        primary_calendar_id: calendarId,
        calendar_name: calendarName
      });
      
      setSuccess(`Calendário "${calendarName}" selecionado com sucesso!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error selecting calendar:', err);
      setError('Erro ao selecionar calendário.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Integração Google Calendar</h3>
      
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

      {/* Connection Status */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Google Calendar</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isConnected ? 'Conectado' : 'Desconectado'}
              </p>
              {integration?.expires_at && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Acesso válido até {new Date(integration.expires_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          {isConnected ? (
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Desconectar
            </button>
          ) : (
            <button
              onClick={handleConnect}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Conectar
            </button>
          )}
        </div>
      </div>

      {/* Calendars List */}
      {isConnected && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Seus Calendários</h4>
            <button 
              onClick={fetchCalendars}
              disabled={calendarsLoading}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${calendarsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {calendarsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Carregando calendários...</span>
            </div>
          ) : calendars.length > 0 ? (
            <div className="space-y-3">
              {calendars.map((calendar) => (
                <div 
                  key={calendar.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    integration?.primary_calendar_id === calendar.id
                      ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  } transition-colors`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white">{calendar.name}</h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {calendar.description || 'Sem descrição'} • {calendar.timeZone}
                      </p>
                      {calendar.primary && (
                        <span className="inline-block mt-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                          Calendário Principal
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {integration?.primary_calendar_id === calendar.id ? (
                    <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Selecionado</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSelectCalendar(calendar.id, calendar.name)}
                      className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Selecionar
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Nenhum calendário encontrado
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                Crie um calendário no Google Calendar e ele aparecerá aqui
              </p>
            </div>
          )}
        </div>
      )}

      {/* Integration Info */}
      {isConnected && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-4">Como funciona a integração</h4>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">1</div>
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">Conecte sua conta Google</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">Autorize o Atendos a acessar seus calendários</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">2</div>
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">Selecione um calendário</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">Escolha qual calendário será usado para gerenciar eventos</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">3</div>
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">Gerencie eventos</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">Visualize, crie e edite eventos diretamente do Atendos</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleCalendarIntegration;