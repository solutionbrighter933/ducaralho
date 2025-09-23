import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  status?: string;
  htmlLink?: string;
}

interface GoogleCalendarListResponse {
  items: GoogleCalendarEvent[];
  nextPageToken?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    console.log('🔧 Google Calendar Events Edge Function started');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('✅ Supabase client initialized');

    // Autenticar o usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ Unauthorized: Missing Authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ Unauthorized: Invalid or expired token', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ User authenticated:', user.id);

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { calendar_id, time_min, time_max, max_results = 50 } = await req.json();

    if (!calendar_id) {
      return new Response(JSON.stringify({ error: 'Missing required parameter: calendar_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('📅 Fetching events for calendar:', calendar_id);

    // Buscar a integração do Google Calendar do usuário
    const { data: integration, error: integrationError } = await supabaseClient
      .from('google_calendar_integrations')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (integrationError) {
      console.error('❌ Error fetching Google Calendar integration:', integrationError);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch Google Calendar integration',
        details: integrationError 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!integration) {
      return new Response(JSON.stringify({ 
        error: 'No Google Calendar integration found. Please connect your Google Calendar first.' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se o token ainda é válido
    const now = new Date();
    const expiresAt = new Date(integration.expires_at);
    
    let accessToken = integration.access_token;

    if (now >= expiresAt) {
      console.log('🔄 Access token expired, refreshing...');
      
      // Refresh the access token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: Deno.env.get('VITE_GOOGLE_CALENDAR_CLIENT_ID') || '',
          client_secret: Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET') || '',
          refresh_token: integration.refresh_token,
          grant_type: 'refresh_token',
        }).toString(),
      });

      if (!refreshResponse.ok) {
        const refreshError = await refreshResponse.json();
        console.error('❌ Error refreshing token:', refreshError);
        return new Response(JSON.stringify({ 
          error: 'Failed to refresh Google Calendar token. Please reconnect your account.',
          details: refreshError 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;
      
      // Update the integration with new token
      const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
      
      await supabaseClient
        .from('google_calendar_integrations')
        .update({
          access_token: accessToken,
          expires_at: newExpiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      console.log('✅ Access token refreshed successfully');
    }

    // Buscar eventos do Google Calendar
    const calendarApiUrl = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar_id)}/events`);
    
    // Adicionar parâmetros de consulta
    if (time_min) calendarApiUrl.searchParams.set('timeMin', time_min);
    if (time_max) calendarApiUrl.searchParams.set('timeMax', time_max);
    calendarApiUrl.searchParams.set('maxResults', max_results.toString());
    calendarApiUrl.searchParams.set('singleEvents', 'true');
    calendarApiUrl.searchParams.set('orderBy', 'startTime');

    console.log('📡 Calling Google Calendar API:', calendarApiUrl.toString());

    const eventsResponse = await fetch(calendarApiUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!eventsResponse.ok) {
      const errorData = await eventsResponse.json();
      console.error('❌ Google Calendar API error:', errorData);
      
      // Handle specific API errors
      if (eventsResponse.status === 401) {
        return new Response(JSON.stringify({ 
          error: 'Google Calendar access token expired. Please reconnect your account.',
          details: errorData 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (eventsResponse.status === 403) {
        return new Response(JSON.stringify({ 
          error: 'Insufficient permissions to access Google Calendar. Please reconnect with proper permissions.',
          details: errorData 
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch events from Google Calendar',
        details: errorData 
      }), {
        status: eventsResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const eventsData: GoogleCalendarListResponse = await eventsResponse.json();
    
    console.log(`✅ Successfully fetched ${eventsData.items?.length || 0} events from Google Calendar`);

    // Salvar eventos na tabela calendar_events para cache local
    if (eventsData.items && eventsData.items.length > 0) {
      console.log('💾 Saving events to local database...');
      
      // Primeiro, limpar eventos antigos deste usuário
      await supabaseClient
        .from('calendar_events')
        .delete()
        .eq('user_id', user.id);

      // Inserir novos eventos
      const eventsToInsert = eventsData.items.map(event => ({
        user_id: user.id,
        organization_id: integration.organization_id,
        google_event_id: event.id,
        calendar_id: calendar_id,
        title: event.summary || 'Sem título',
        description: event.description || null,
        start_time: event.start?.dateTime || event.start?.date || new Date().toISOString(),
        end_time: event.end?.dateTime || event.end?.date || new Date().toISOString(),
        location: event.location || null,
        attendees: event.attendees ? JSON.stringify(event.attendees) : null,
        status: event.status || 'confirmed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabaseClient
        .from('calendar_events')
        .insert(eventsToInsert);

      if (insertError) {
        console.error('❌ Error saving events to database:', insertError);
        // Continue even if saving fails
      } else {
        console.log('✅ Events saved to local database');
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      events: eventsData.items || [],
      calendar_id,
      total_events: eventsData.items?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Google Calendar Events Edge Function Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});