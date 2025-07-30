import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InstagramTokenResponse {
  access_token: string;
  user_id: string;
}

interface InstagramUserResponse {
  id: string;
  username: string;
  account_type: string;
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
    console.log('INSTAGRAM_APP_ID:', Deno.env.get('INSTAGRAM_APP_ID') ? 'Present ✅' : 'Missing ❌');
    console.log('INSTAGRAM_APP_SECRET:', Deno.env.get('INSTAGRAM_APP_SECRET') ? 'Present ✅' : 'Missing ❌');

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

    const INSTAGRAM_APP_ID = Deno.env.get('INSTAGRAM_APP_ID') || '673665962294863';
    const INSTAGRAM_APP_SECRET = Deno.env.get('INSTAGRAM_APP_SECRET');

    if (!INSTAGRAM_APP_SECRET) {
      return new Response(JSON.stringify({ error: 'Instagram API credentials not configured in environment variables.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🔄 Starting Instagram OAuth token exchange...');

    // PASSO 1: Trocar o código de autorização por um access token
    const tokenExchangeUrl = `https://api.instagram.com/oauth/access_token`;

    const tokenResponse = await fetch(tokenExchangeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: INSTAGRAM_APP_ID,
        client_secret: INSTAGRAM_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: redirect_uri,
        code: code,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('❌ Error exchanging code for token:', errorData);
      return new Response(JSON.stringify({ 
        error: errorData.error_message || errorData.error?.message || 'Failed to exchange code for token',
        details: errorData 
      }), {
        status: tokenResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokenData: InstagramTokenResponse = await tokenResponse.json();
    console.log('✅ Successfully obtained Instagram access token');

    // PASSO 2: Obter informações do usuário do Instagram
    const userInfoResponse = await fetch(`https://graph.instagram.com/me?fields=id,username,account_type&access_token=${tokenData.access_token}`, {
      method: 'GET',
    });

    if (!userInfoResponse.ok) {
      const errorData = await userInfoResponse.json();
      console.error('❌ Error fetching Instagram user info:', errorData);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch Instagram user information',
        details: errorData 
      }), {
        status: userInfoResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userInfo: InstagramUserResponse = await userInfoResponse.json();
    console.log('✅ Instagram user info retrieved:', userInfo);

    // Verificar se é uma conta business
    if (userInfo.account_type !== 'BUSINESS') {
      return new Response(JSON.stringify({ 
        error: 'Esta integração requer uma conta do Instagram Business. Por favor, converta sua conta para Business no aplicativo do Instagram.',
        account_type: userInfo.account_type
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PASSO 3: Obter informações detalhadas da conta business
    const businessInfoResponse = await fetch(`https://graph.instagram.com/${userInfo.id}?fields=id,username,name,profile_picture_url,followers_count,media_count&access_token=${tokenData.access_token}`, {
      method: 'GET',
    });

    let businessInfo: InstagramAccountResponse = {
      id: userInfo.id,
      username: userInfo.username,
      name: userInfo.username,
      profile_picture_url: '',
      followers_count: 0,
      media_count: 0
    };

    if (businessInfoResponse.ok) {
      businessInfo = await businessInfoResponse.json();
      console.log('✅ Instagram business info retrieved:', businessInfo);
    } else {
      console.log('⚠️ Could not fetch detailed business info, using basic info');
    }

    // PASSO 4: Salvar a conexão no banco de dados
    const { data: savedConnection, error: saveError } = await supabaseClient
      .from('contas_conectadas')
      .upsert({
        user_id: user.id,
        instagram_account_id: businessInfo.id,
        instagram_username: businessInfo.username,
        page_id: null, // Para Instagram direto, não há página do Facebook
        access_token: tokenData.access_token,
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
        instagram_account_id: businessInfo.id,
        instagram_username: businessInfo.username,
        instagram_name: businessInfo.name,
        profile_picture_url: businessInfo.profile_picture_url,
        followers_count: businessInfo.followers_count,
        media_count: businessInfo.media_count,
        account_type: userInfo.account_type
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Instagram OAuth Edge Function Error:', error);
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