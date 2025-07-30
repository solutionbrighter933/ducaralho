import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface FacebookPageResponse {
  data: Array<{
    id: string;
    name: string;
    access_token: string;
    instagram_business_account?: {
      id: string;
    };
  }>;
}

interface InstagramAccountResponse {
  id: string;
  username: string;
  name: string;
  profile_picture_url: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    ); 
    console.log('SUPABASE_URL:', Deno.env.get('SUPABASE_URL') ? 'Loaded' : 'Missing');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'Loaded' : 'Missing');
    console.log('Supabase client initialized successfully.');


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

    const { code, redirect_uri, state } = await req.json();

    if (!code || !redirect_uri) {
      return new Response(JSON.stringify({ error: 'Missing required parameters: code, redirect_uri' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const FACEBOOK_APP_ID = Deno.env.get('FACEBOOK_APP_ID');
    const FACEBOOK_APP_SECRET = Deno.env.get('FACEBOOK_APP_SECRET');

    if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
      return new Response(JSON.stringify({ error: 'Facebook API credentials not configured in environment variables.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🔄 Starting Facebook OAuth token exchange...');

    // PASSO 1: Trocar o código de autorização por um short-lived user access token
    const tokenExchangeUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(redirect_uri)}&client_secret=${FACEBOOK_APP_SECRET}&code=${code}`;

    const tokenResponse = await fetch(tokenExchangeUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('❌ Error exchanging code for token:', errorData);
      return new Response(JSON.stringify({ 
        error: errorData.error?.message || 'Failed to exchange code for token',
        details: errorData 
      }), {
        status: tokenResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokenData: FacebookTokenResponse = await tokenResponse.json();
    console.log('✅ Successfully obtained short-lived user access token');

    // PASSO 2: Converter para long-lived user access token (opcional, mas recomendado)
    const longLivedTokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`;

    const longLivedResponse = await fetch(longLivedTokenUrl, {
      method: 'GET',
    });

    let userAccessToken = tokenData.access_token;
    if (longLivedResponse.ok) {
      const longLivedData: FacebookTokenResponse = await longLivedResponse.json();
      userAccessToken = longLivedData.access_token;
      console.log('✅ Successfully obtained long-lived user access token');
    } else {
      console.log('⚠️ Failed to get long-lived token, using short-lived token');
    }

    // PASSO 3: Obter as páginas do Facebook que o usuário gerencia
    const pagesResponse = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userAccessToken}`, {
      method: 'GET',
    });

    if (!pagesResponse.ok) {
      const errorData = await pagesResponse.json();
      console.error('❌ Error fetching user pages:', errorData);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch user pages',
        details: errorData 
      }), {
        status: pagesResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pagesData: FacebookPageResponse = await pagesResponse.json();
    console.log(`✅ Found ${pagesData.data.length} pages for user`);

    // PASSO 4: Encontrar páginas com Instagram Business Account vinculada
    let instagramConnection = null;

    for (const page of pagesData.data) {
      // Verificar se a página tem uma conta do Instagram Business vinculada
      const instagramCheckResponse = await fetch(`https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`, {
        method: 'GET',
      });

      if (instagramCheckResponse.ok) {
        const instagramCheckData = await instagramCheckResponse.json();
        
        if (instagramCheckData.instagram_business_account) {
          const instagramAccountId = instagramCheckData.instagram_business_account.id;
          
          // Obter informações da conta do Instagram
          const instagramInfoResponse = await fetch(`https://graph.facebook.com/v19.0/${instagramAccountId}?fields=id,username,name,profile_picture_url&access_token=${page.access_token}`, {
            method: 'GET',
          });

          if (instagramInfoResponse.ok) {
            const instagramInfo: InstagramAccountResponse = await instagramInfoResponse.json();
            
            instagramConnection = {
              instagram_account_id: instagramInfo.id,
              instagram_username: instagramInfo.username,
              page_id: page.id,
              page_name: page.name,
              page_access_token: page.access_token,
              instagram_name: instagramInfo.name,
              profile_picture_url: instagramInfo.profile_picture_url
            };
            
            console.log(`✅ Found Instagram Business Account: @${instagramInfo.username}`);
            break; // Usar a primeira conta encontrada
          }
        }
      }
    }

    if (!instagramConnection) {
      return new Response(JSON.stringify({ 
        error: 'No Instagram Business Account found linked to your Facebook pages. Please ensure you have a Facebook page with an Instagram Business Account connected.',
        pages_found: pagesData.data.length
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PASSO 5: Salvar a conexão no banco de dados
    const { data: savedConnection, error: saveError } = await supabaseClient
      .from('contas_conectadas')
      .upsert({
        user_id: user.id,
        instagram_account_id: instagramConnection.instagram_account_id,
        instagram_username: instagramConnection.instagram_username,
        page_id: instagramConnection.page_id,
        access_token: instagramConnection.page_access_token, // Page Access Token para enviar mensagens
        status: 'connected',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,instagram_account_id'
      })
      .select()
      .single();

    if (saveError) {
      console.error('❌ Error saving Instagram connection:', saveError);
      return new Response(JSON.stringify({ 
        error: 'Failed to save Instagram connection to database',
        details: saveError 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Instagram connection saved successfully');

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Instagram Business Account connected successfully',
      connection: {
        instagram_account_id: instagramConnection.instagram_account_id,
        instagram_username: instagramConnection.instagram_username,
        page_id: instagramConnection.page_id,
        page_name: instagramConnection.page_name,
        instagram_name: instagramConnection.instagram_name
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Facebook OAuth Edge Function Error:', error);
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