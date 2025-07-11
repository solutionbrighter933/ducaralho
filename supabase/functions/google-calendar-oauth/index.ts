import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Autenticar o usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { code, redirect_uri, user_id, organization_id } = await req.json();

    if (!code || !redirect_uri || !user_id || !organization_id) {
      return new Response(JSON.stringify({ error: 'Missing required parameters: code, redirect_uri, user_id, organization_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GOOGLE_CLIENT_ID = Deno.env.get('VITE_GOOGLE_CALENDAR_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET');

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return new Response(JSON.stringify({ error: 'Google API credentials not configured in environment variables.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Trocar o código de autorização por tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Error exchanging code for tokens:', tokenData);
      return new Response(JSON.stringify({ error: tokenData.error_description || 'Failed to exchange code for tokens' }), {
        status: tokenResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { access_token, refresh_token, expires_in, scope } = tokenData;
    const expires_at = new Date(Date.now() + expires_in * 1000).toISOString();

    // Buscar informações do calendário primário
    const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    const calendarData = await calendarResponse.json();
    const primary_calendar_id = calendarData.id || 'primary';
    const calendar_name = calendarData.summary || 'Calendário Principal';

    // Salvar ou atualizar os tokens na tabela google_calendar_integrations
    const { data: existingIntegration, error: fetchError } = await supabaseClient
      .from('google_calendar_integrations')
      .select('id')
      .eq('user_id', user_id)
      .maybeSingle();

    let upsertError;
    if (existingIntegration) {
      const { error } = await supabaseClient
        .from('google_calendar_integrations')
        .update({
          access_token,
          refresh_token,
          expires_at,
          scope,
          primary_calendar_id,
          calendar_name,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user_id);
      upsertError = error;
    } else {
      const { error } = await supabaseClient
        .from('google_calendar_integrations')
        .insert({
          user_id,
          organization_id,
          access_token,
          refresh_token,
          expires_at,
          scope,
          primary_calendar_id,
          calendar_name,
        });
      upsertError = error;
    }

    if (upsertError) {
      console.error('Error saving/updating Google Calendar integration:', upsertError);
      return new Response(JSON.stringify({ error: 'Failed to save Google Calendar integration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      message: 'Google Calendar integration successful',
      calendar_id: primary_calendar_id,
      calendar_name: calendar_name
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Google Calendar OAuth Edge Function Error:', error);
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