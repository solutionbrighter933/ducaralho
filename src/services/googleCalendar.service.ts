import { supabase } from '../lib/supabase';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  attendees?: Array<{email: string, name?: string}>;
  allDay?: boolean;
}

export interface GoogleCalendarIntegration {
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

export class GoogleCalendarService {
  private static instance: GoogleCalendarService;

  public static getInstance(): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService();
    }
    return GoogleCalendarService.instance;
  }

  /**
   * Verifica se o usuário tem integração com o Google Calendar
   */
  async hasIntegration(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('google_calendar_integrations')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking Google Calendar integration:', error);
      return false;
    }
  }

  /**
   * Obtém a integração do Google Calendar do usuário
   */
  async getIntegration(userId: string): Promise<GoogleCalendarIntegration | null> {
    try {
      const { data, error } = await supabase
        .from('google_calendar_integrations')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting Google Calendar integration:', error);
      return null;
    }
  }

  /**
   * Obtém eventos do Google Calendar
   * Em uma implementação real, isso chamaria a API do Google Calendar
   */
  async getEvents(calendarId: string, startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    try {
      // Simulação para fins de demonstração
      // Em uma implementação real, isso chamaria a API do Google Calendar
      
      const today = new Date();
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
      
      return mockEvents;
    } catch (error) {
      console.error('Error getting events:', error);
      throw error;
    }
  }

  /**
   * Cria um novo evento no Google Calendar
   * Em uma implementação real, isso chamaria a API do Google Calendar
   */
  async createEvent(calendarId: string, event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
    try {
      // Simulação para fins de demonstração
      // Em uma implementação real, isso chamaria a API do Google Calendar
      
      const newEvent: CalendarEvent = {
        id: `event-${Date.now()}`,
        ...event
      };
      
      return newEvent;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  /**
   * Atualiza um evento existente no Google Calendar
   * Em uma implementação real, isso chamaria a API do Google Calendar
   */
  async updateEvent(calendarId: string, eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    try {
      // Simulação para fins de demonstração
      // Em uma implementação real, isso chamaria a API do Google Calendar
      
      const updatedEvent: CalendarEvent = {
        id: eventId,
        title: event.title || 'Sem título',
        start: event.start || new Date().toISOString(),
        end: event.end || new Date(Date.now() + 3600000).toISOString(),
        description: event.description,
        location: event.location,
        attendees: event.attendees,
        allDay: event.allDay
      };
      
      return updatedEvent;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  /**
   * Exclui um evento do Google Calendar
   * Em uma implementação real, isso chamaria a API do Google Calendar
   */
  async deleteEvent(calendarId: string, eventId: string): Promise<boolean> {
    try {
      // Simulação para fins de demonstração
      // Em uma implementação real, isso chamaria a API do Google Calendar
      
      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  /**
   * Obtém a lista de calendários do usuário
   * Em uma implementação real, isso chamaria a API do Google Calendar
   */
  async getCalendars(): Promise<Array<{id: string, name: string}>> {
    try {
      // Simulação para fins de demonstração
      // Em uma implementação real, isso chamaria a API do Google Calendar
      
      return [
        { id: 'primary', name: 'Calendário Principal' },
        { id: 'work@group.v.calendar.google.com', name: 'Trabalho' },
        { id: 'family@group.v.calendar.google.com', name: 'Família' }
      ];
    } catch (error) {
      console.error('Error getting calendars:', error);
      throw error;
    }
  }

  /**
   * Atualiza o calendário primário do usuário
   */
  async updatePrimaryCalendar(userId: string, calendarId: string, calendarName: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('google_calendar_integrations')
        .update({
          primary_calendar_id: calendarId,
          calendar_name: calendarName,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating primary calendar:', error);
      return false;
    }
  }

  /**
   * Desconecta a integração com o Google Calendar
   */
  async disconnect(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('google_calendar_integrations')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      return false;
    }
  }
}

export const googleCalendarService = GoogleCalendarService.getInstance();