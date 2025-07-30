import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendMessageRequest {
  recipient_id: string;
  message_text: string;
}

interface InstagramAPIResponse {
  recipient_id: string;
  message_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔧 Environment check:');
    console.log('SUPABASE_URL:', Deno.env.get('SUPABASE_URL') ? 'Present ✅' : 'Missing ❌');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'Present ✅' : 'Missing ❌');

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

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { recipient_id, message_text }: SendMessageRequest = await req.json();

    if (!recipient_id || !message_text) {
      return new Response(JSON.stringify({ error: 'Missing required parameters: recipient_id, message_text' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📤 Sending Instagram message to ${recipient_id}...`);

    // Buscar a conexão do Instagram do usuário
    const { data: connection, error: connectionError } = await supabaseClient
      .from('contas_conectadas')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'connected')
      .maybeSingle();

    if (connectionError) {
      console.error('❌ Error fetching Instagram connection:', connectionError);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch Instagram connection',
        details: connectionError 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!connection) {
      return new Response(JSON.stringify({ 
        error: 'No Instagram connection found. Please connect your Instagram account first.' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enviar mensagem via Instagram API
    const instagramApiUrl = `https://graph.instagram.com/v21.0/me/messages`;
    
    const messagePayload = {
      recipient: {
        id: recipient_id
      },
      message: {
        text: message_text
      }
    };

    console.log('📡 Calling Instagram API:', instagramApiUrl);
    console.log('📦 Message payload:', messagePayload);

    const instagramResponse = await fetch(instagramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${connection.access_token}`,
      },
      body: JSON.stringify(messagePayload),
    });

    const responseData = await instagramResponse.json();

    if (!instagramResponse.ok) {
      console.error('❌ Instagram API error:', responseData);
      
      // Tratar erros específicos da API do Instagram
      let errorMessage = 'Failed to send Instagram message';
      
      if (responseData.error) {
        if (responseData.error.code === 10 || responseData.error.message?.includes('Application does not have permission')) {
          errorMessage = 'Permissões insuficientes. Verifique se sua conta tem as permissões necessárias para enviar mensagens.';
        } else if (responseData.error.code === 100 || responseData.error.message?.includes('Invalid parameter')) {
          errorMessage = 'ID do destinatário inválido. Verifique se o ID está correto.';
        } else if (responseData.error.code === 200 || responseData.error.message?.includes('Permissions error')) {
          errorMessage = 'Erro de permissões. O destinatário pode não ter iniciado uma conversa com sua conta.';
        } else {
          errorMessage = responseData.error.message || errorMessage;
        }
      }
      
      return new Response(JSON.stringify({ 
        error: errorMessage,
        details: responseData,
        instagram_account_id: connection.instagram_account_id,
        api_url: instagramApiUrl
      }), {
        status: instagramResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Instagram message sent successfully:', responseData);

    // Salvar a mensagem enviada na tabela conversas_instagram
    const { error: saveError } = await supabaseClient
      .from('conversas_instagram')
      .insert({
        sender_id: recipient_id,
        mensagem: message_text,
        direcao: 'sent', // Mensagem enviada por nós
        data_hora: new Date().toISOString(),
        user_id: user.id,
        organization_id: null, // Pode ser null para conexões diretas do Instagram
      });

    if (saveError) {
      console.error('❌ Error saving sent message to database:', saveError);
      // Não falhar a operação principal se não conseguir salvar no banco
    } else {
      console.log('✅ Sent message saved to database');
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Instagram message sent successfully',
      instagram_response: responseData,
      recipient_id,
      message_text,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Instagram Send Message Edge Function Error:', error);
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