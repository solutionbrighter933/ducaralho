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
  instagram_account_id: string;
  page_access_token: string;
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
    console.log('🔧 Instagram Send Message Edge Function started');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('✅ Supabase client initialized');

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

    console.log('✅ User authenticated:', user.id);

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { recipient_id, message_text, instagram_account_id, page_access_token }: SendMessageRequest = await req.json();

    if (!recipient_id || !message_text) {
      return new Response(JSON.stringify({ error: 'Missing required parameters: recipient_id, message_text' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📤 Sending Instagram message to ${recipient_id}...`);

    // Buscar a conexão do Facebook/Instagram do usuário
    const { data: connection, error: connectionError } = await supabaseClient
      .from('facebook_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'connected')
      .maybeSingle();

    if (connectionError) {
      console.error('❌ Error fetching Facebook connection:', connectionError);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch Facebook connection',
        details: connectionError 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!connection) {
      return new Response(JSON.stringify({ 
        error: 'No Facebook connection found. Please connect your Facebook account first.' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Encontrar a página selecionada
    const selectedPage = connection.pages?.find((page: any) => page.id === connection.selected_page_id);
    
    if (!selectedPage) {
      return new Response(JSON.stringify({ 
        error: 'No Facebook page selected. Please select a page with Instagram Business account.' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Usar o token da página ou o fornecido
    const accessToken = page_access_token || selectedPage.access_token;
    const instagramAccountId = instagram_account_id || connection.selected_instagram_account_id;

    if (!accessToken || !instagramAccountId) {
      return new Response(JSON.stringify({ 
        error: 'Missing access token or Instagram account ID' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enviar mensagem via Instagram API
    const instagramApiUrl = `https://graph.facebook.com/v21.0/${instagramAccountId}/messages`;
    
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
        'Authorization': `Bearer ${accessToken}`,
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
        } else if (responseData.error.message?.includes('Cannot message users who are not connected')) {
          errorMessage = 'Não é possível enviar mensagem para usuários que não estão conectados. O usuário precisa iniciar uma conversa primeiro.';
        } else {
          errorMessage = responseData.error.message || errorMessage;
        }
      }
      
      return new Response(JSON.stringify({ 
        error: errorMessage,
        details: responseData,
        instagram_account_id: instagramAccountId,
        api_url: instagramApiUrl
      }), {
        status: instagramResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Instagram message sent successfully:', responseData);

    // Salvar a mensagem enviada na tabela instagram_messages
    const { error: saveError } = await supabaseClient
      .from('instagram_messages')
      .insert({
        instagram_account_id: instagramAccountId,
        sender_id: recipient_id,
        message: message_text,
        direction: 'sent', // Mensagem enviada por nós
        timestamp: new Date().toISOString(),
        user_id: user.id,
        message_id: responseData.message_id || null,
        metadata: {
          api_response: responseData,
          sent_via: 'facebook_api',
          page_id: selectedPage.id
        }
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
      instagram_account_id: instagramAccountId,
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