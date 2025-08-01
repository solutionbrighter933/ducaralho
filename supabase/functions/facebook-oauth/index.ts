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
      username?: string; // Adicionado para garantir que o campo existe
      name?: string;
      profile_picture_url?: string;
      followers_count?: number;
      media_count?: number;
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

    const { code, redirect_uri, state, user_id, organization_id } = await req.json();

    if (!code || !redirect_uri) {
      console.error('❌ Missing required parameters: code, redirect_uri');
      return new Response(JSON.stringify({ error: 'Missing required parameters: code, redirect_uri' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const FACEBOOK_APP_ID = Deno.env.get('FACEBOOK_APP_ID') || '673665962294863'; // Use o ID do seu aplicativo
    const FACEBOOK_APP_SECRET = Deno.env.get('FACEBOOK_APP_SECRET');

    if (!FACEBOOK_APP_SECRET) {
      console.error('❌ Facebook API credentials not configured in environment variables.');
      return new Response(JSON.stringify({ error: 'Facebook API credentials not configured in environment variables.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🔄 Starting Facebook OAuth token exchange (API v23.0)...');

    // PASSO 1: Trocar o código de autorização por um access token (API v23.0)
    const tokenExchangeUrl = `https://graph.facebook.com/v23.0/oauth/access_token?` +
      `client_id=${FACEBOOK_APP_ID}&` +
      `redirect_uri=${encodeURIComponent(redirect_uri)}&` +
      `client_secret=${FACEBOOK_APP_SECRET}&` +
      `code=${code}`;

    console.log('📡 Fetching token from (v23.0):', tokenExchangeUrl);
    const tokenResponse = await fetch(tokenExchangeUrl, {
      method: 'GET',
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('❌ Error exchanging code for token (v23.0):', errorData);
      return new Response(JSON.stringify({ 
        error: errorData.error?.message || 'Failed to exchange code for token',
        details: errorData,
        api_version: 'v23.0'
      }), {
        status: tokenResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokenData: FacebookTokenResponse = await tokenResponse.json();
    console.log('✅ Successfully obtained Facebook access token (v23.0). Expires in:', tokenData.expires_in);

    // PASSO 2: Obter informações do usuário do Facebook (API v23.0)
    console.log('📡 Fetching Facebook user info (v23.0)...');
    const userInfoResponse = await fetch(`https://graph.facebook.com/v23.0/me?fields=id,name,email&access_token=${tokenData.access_token}`, {
      method: 'GET',
    });

    if (!userInfoResponse.ok) {
      const errorData = await userInfoResponse.json();
      console.error('❌ Error fetching Facebook user info (v23.0):', errorData);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch Facebook user information',
        details: errorData,
        api_version: 'v23.0'
      }), {
        status: userInfoResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userInfo: FacebookUserResponse = await userInfoResponse.json();
    console.log('✅ Facebook user info retrieved (v23.0):', userInfo);

    // PASSO 3: Obter páginas do Facebook que o usuário gerencia (API v23.0)
    console.log('📡 Fetching Facebook pages (v23.0)...');
    const pagesApiUrl = `https://graph.facebook.com/v23.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}&access_token=${tokenData.access_token}`;
    console.log('📡 Pages API URL (v23.0):', pagesApiUrl);
    
    const pagesResponse = await fetch(pagesApiUrl, {
      method: 'GET',
    });

    // --- LOGS DETALHADOS PARA DEPURAÇÃO ---
    console.log('DEBUG (v23.0): pagesResponse.status:', pagesResponse.status);
    console.log('DEBUG (v23.0): pagesResponse.ok:', pagesResponse.ok);
    console.log('DEBUG (v23.0): pagesResponse.statusText:', pagesResponse.statusText);
    
    const rawPagesResponseText = await pagesResponse.text();
    console.log('DEBUG (v23.0): Raw pages response text (first 1000 chars):', rawPagesResponseText.substring(0, 1000));
    console.log('DEBUG (v23.0): Raw pages response text length:', rawPagesResponseText.length);
    // --- FIM DOS LOGS DETALHADOS ---

    if (!pagesResponse.ok) {
      // Se a resposta não foi OK, tentamos parsear o erro do texto bruto
      let errorData;
      try {
        errorData = JSON.parse(rawPagesResponseText);
      } catch (e) {
        errorData = { message: rawPagesResponseText };
      }
      console.error('❌ Error fetching Facebook pages (v23.0):', errorData);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch Facebook pages',
        details: errorData,
        api_version: 'v23.0',
        api_url: pagesApiUrl
      }), {
        status: pagesResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Agora, parseamos o JSON do texto bruto que já obtivemos
    let pagesData: FacebookPageResponse;
    try {
      pagesData = JSON.parse(rawPagesResponseText);
    } catch (parseError) {
      console.error('❌ Error parsing pages response JSON (v23.0):', parseError);
      console.error('❌ Raw response that failed to parse:', rawPagesResponseText);
      return new Response(JSON.stringify({ 
        error: 'Failed to parse Facebook pages response',
        details: { parseError: parseError.message, rawResponse: rawPagesResponseText.substring(0, 500) },
        api_version: 'v23.0'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('✅ Raw Facebook pages data retrieved (v23.0). Total pages:', pagesData.data?.length || 0);
    console.log('Raw pages data (v23.0):', JSON.stringify(pagesData.data, null, 2));

    // Verificar se pagesData.data existe e é um array
    if (!pagesData.data || !Array.isArray(pagesData.data)) {
      console.error('❌ Invalid pages data structure (v23.0):', pagesData);
      return new Response(JSON.stringify({ 
        error: 'Invalid pages data structure received from Facebook',
        details: pagesData,
        api_version: 'v23.0'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PASSO 4: Processar páginas com Instagram Business Account
    const pagesWithInstagram = [];
    
    for (const page of pagesData.data) {
      console.log(`📄 Processing page: ${page.name} (ID: ${page.id})`);
      
      if (page.instagram_business_account) {
        console.log(`📸 Page ${page.name} has Instagram Business Account: ${page.instagram_business_account.id}`);
        
        // Se os dados do Instagram já vieram na resposta expandida, usar diretamente
        if (page.instagram_business_account.username) {
          pagesWithInstagram.push({
            ...page,
            instagram_business_account: page.instagram_business_account
          });
          console.log(`✅ Instagram data already included for page ${page.name}: @${page.instagram_business_account.username}`);
        } else {
          // Caso contrário, fazer uma chamada separada para obter detalhes
          try {
            console.log(`📡 Fetching Instagram Business Account details for page: ${page.name} (ID: ${page.id})`);
            const instagramResponse = await fetch(
              `https://graph.facebook.com/v23.0/${page.instagram_business_account.id}?fields=id,username,name,profile_picture_url,followers_count,media_count&access_token=${page.access_token}`,
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
              const errorData = await instagramResponse.json();
              console.warn(`⚠️ Could not fetch Instagram data for page ${page.name}. Error:`, errorData);
              pagesWithInstagram.push(page); // Still include the page, but without full Instagram details
            }
          } catch (error) {
            console.warn(`⚠️ Error fetching Instagram data for page ${page.name}:`, error);
            pagesWithInstagram.push(page); // Still include the page
          }
        }
      } else {
        console.log(`ℹ️ Page ${page.name} (ID: ${page.id}) has no Instagram Business Account linked.`);
      }
    }

    console.log(`📊 Final list of pages with Instagram Business accounts (v23.0): ${pagesWithInstagram.length}`);
    console.log('Pages with Instagram data (v23.0):', JSON.stringify(pagesWithInstagram, null, 2));

    // PASSO 5: Salvar conexão no banco de dados
    const connectionData = {
      user_id: user.id,
      organization_id: organization_id || null,
      facebook_user_id: userInfo.id,
      facebook_access_token: tokenData.access_token,
      pages: pagesWithInstagram,
      selected_page_id: null,
      selected_instagram_account_id: null,
      instagram_username: null,
      status: pagesWithInstagram.length > 1 ? 'pending_page_selection' : (pagesWithInstagram.length === 1 ? 'connected' : 'no_pages'),
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

    console.log('💾 Attempting to upsert connection data (v23.0):', JSON.stringify(connectionData, null, 2));
    const { data: savedConnection, error: saveError } = await supabaseClient
      .from('facebook_connections')
      .upsert(connectionData, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (saveError) {
      console.error('❌ Error saving Facebook connection (v23.0):', saveError);
      return new Response(JSON.stringify({ 
        error: 'Failed to save Facebook connection to database',
        details: saveError,
        api_version: 'v23.0'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Facebook connection saved successfully (v23.0). Saved data:', JSON.stringify(savedConnection, null, 2));

    // PASSO 6: Retornar resultado baseado no número de páginas
    if (pagesWithInstagram.length === 0) {
      console.log('ℹ️ No Facebook page with Instagram Business account found (v23.0).');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Nenhuma página do Facebook com conta do Instagram Business foi encontrada. Certifique-se de que você tem uma página do Facebook com uma conta do Instagram Business vinculada.',
        api_version: 'v23.0',
        total_pages_found: pagesData.data?.length || 0,
        pages_without_instagram: pagesData.data?.filter(p => !p.instagram_business_account) || []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (pagesWithInstagram.length === 1) {
      // Conexão completa - uma página apenas
      console.log('✅ Single Facebook page with Instagram found (v23.0). Connection complete.');
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Facebook connected successfully with single page',
        connection: savedConnection,
        facebook_user: userInfo,
        selected_page: pagesWithInstagram[0],
        api_version: 'v23.0'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Múltiplas páginas - precisa selecionar
    console.log('⚠️ Multiple Facebook pages with Instagram found (v23.0). Awaiting page selection.');
    return new Response(JSON.stringify({ 
      success: false,
      needs_page_selection: true,
      message: 'Multiple Facebook pages found. Please select one.',
      pages: pagesWithInstagram,
      facebook_user: userInfo,
      connection_id: savedConnection.id,
      api_version: 'v23.0'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Facebook OAuth Edge Function Error (v23.0):', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        api_version: 'v23.0'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
