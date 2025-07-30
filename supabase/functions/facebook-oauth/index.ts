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
  expires_in: number;
}

interface FacebookUserResponse {
  id: string;
  name: string;
  email: string;
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
  followers_count: number;
  media_count: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    console.log('🔧 Facebook OAuth Edge Function started');
    console.log('Environment check:');
    console.log('SUPABASE_URL:', Deno.env.get('SUPABASE_URL') ? 'Present ✅' : 'Missing ❌');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'Present ✅' : 'Missing ❌');
    console.log('FACEBOOK_APP_ID:', Deno.env.get('FACEBOOK_APP_ID') ? 'Present ✅' : 'Missing ❌');
    console.log('FACEBOOK_APP_SECRET:', Deno.env.get('FACEBOOK_APP_SECRET') ? 'Present ✅' : 'Missing ❌');

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

    const { code, redirect_uri, state, user_id, organization_id } = await req.json();

    if (!code || !redirect_uri) {
      return new Response(JSON.stringify({ error: 'Missing required parameters: code, redirect_uri' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const FACEBOOK_APP_ID = Deno.env.get('FACEBOOK_APP_ID') || '673665962294863';
    const FACEBOOK_APP_SECRET = Deno.env.get('FACEBOOK_APP_SECRET');

    if (!FACEBOOK_APP_SECRET) {
      return new Response(JSON.stringify({ error: 'Facebook API credentials not configured in environment variables.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🔄 Starting Facebook OAuth token exchange...');

    // PASSO 1: Trocar o código de autorização por um access token
    const tokenExchangeUrl = `https://graph.facebook.com/v21.0/oauth/access_token?` +
      `client_id=${FACEBOOK_APP_ID}&` +
      `redirect_uri=${encodeURIComponent(redirect_uri)}&` +
      `client_secret=${FACEBOOK_APP_SECRET}&` +
      `code=${code}`;

    const tokenResponse = await fetch(tokenExchangeUrl, {
      method: 'GET',
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
    console.log('✅ Successfully obtained Facebook access token');

    // PASSO 2: Obter informações do usuário do Facebook
    const userInfoResponse = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${tokenData.access_token}`, {
      method: 'GET',
    });

    if (!userInfoResponse.ok) {
      const errorData = await userInfoResponse.json();
      console.error('❌ Error fetching Facebook user info:', errorData);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch Facebook user information',
        details: errorData 
      }), {
        status: userInfoResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userInfo: FacebookUserResponse = await userInfoResponse.json();
    console.log('✅ Facebook user info retrieved:', userInfo);

    // PASSO 3: Obter páginas do Facebook que o usuário gerencia
    const pagesResponse = await fetch(`https://graph.facebook.com/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${tokenData.access_token}`, {
      method: 'GET',
    });

    if (!pagesResponse.ok) {
      const errorData = await pagesResponse.json();
      console.error('❌ Error fetching Facebook pages:', errorData);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch Facebook pages',
        details: errorData 
      }), {
        status: pagesResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pagesData: FacebookPageResponse = await pagesResponse.json();
    console.log('✅ Facebook pages retrieved:', pagesData.data.length);

    // PASSO 4: Para cada página com Instagram, obter detalhes da conta Instagram
    const pagesWithInstagram = [];
    
    for (const page of pagesData.data) {
      if (page.instagram_business_account) {
        try {
          // Obter detalhes da conta Instagram Business
          const instagramResponse = await fetch(
            `https://graph.facebook.com/${page.instagram_business_account.id}?fields=id,username,name,profile_picture_url,followers_count,media_count&access_token=${page.access_token}`,
            { method: 'GET' }
          );

          if (instagramResponse.ok) {
            const instagramData: InstagramAccountResponse = await instagramResponse.json();
            pagesWithInstagram.push({
              ...page,
              instagram_business_account: instagramData
            });
            console.log(`✅ Instagram data retrieved for page ${page.name}: @${instagramData.username}`);
          } else {
            console.log(`⚠️ Could not fetch Instagram data for page ${page.name}`);
            pagesWithInstagram.push(page);
          }
        } catch (error) {
          console.log(`⚠️ Error fetching Instagram data for page ${page.name}:`, error);
          pagesWithInstagram.push(page);
        }
      }
    }

    console.log(`📊 Found ${pagesWithInstagram.length} pages with Instagram Business accounts`);

    // PASSO 5: Salvar conexão no banco de dados
    const connectionData = {
      user_id: user.id,
      facebook_user_id: userInfo.id,
      facebook_access_token: tokenData.access_token,
      pages: pagesWithInstagram,
      selected_page_id: null,
      selected_instagram_account_id: null,
      instagram_username: null,
      status: pagesWithInstagram.length > 1 ? 'pending_page_selection' : 'connected',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Se há apenas uma página com Instagram, selecionar automaticamente
    if (pagesWithInstagram.length === 1) {
      const page = pagesWithInstagram[0];
      connectionData.selected_page_id = page.id;
      connectionData.selected_instagram_account_id = page.instagram_business_account?.id || null;
      connectionData.instagram_username = page.instagram_business_account?.username || null;
      connectionData.status = 'connected';
    }

    const { data: savedConnection, error: saveError } = await supabaseClient
      .from('facebook_connections')
      .upsert(connectionData, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (saveError) {
      console.error('❌ Error saving Facebook connection:', saveError);
      return new Response(JSON.stringify({ 
        error: 'Failed to save Facebook connection to database',
        details: saveError 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Facebook connection saved successfully');

    // PASSO 6: Retornar resultado baseado no número de páginas
    if (pagesWithInstagram.length === 0) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Nenhuma página do Facebook com conta do Instagram Business foi encontrada. Certifique-se de que você tem uma página do Facebook com uma conta do Instagram Business vinculada.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (pagesWithInstagram.length === 1) {
      // Conexão completa - uma página apenas
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Facebook connected successfully with single page',
        connection: savedConnection,
        facebook_user: userInfo,
        selected_page: pagesWithInstagram[0]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Múltiplas páginas - precisa selecionar
    return new Response(JSON.stringify({ 
      success: false,
      needs_page_selection: true,
      message: 'Multiple Facebook pages found. Please select one.',
      pages: pagesWithInstagram,
      facebook_user: userInfo,
      connection_id: savedConnection.id
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