import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

// Helper function to create responses with CORS headers
function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  // For 204 No Content, don't include Content-Type or body
  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse({}, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    const requestBody = await req.json().catch(() => ({}));
    const { return_url } = requestBody;
    
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser(token);

    if (getUserError) {
      console.error('❌ Failed to authenticate user:', getUserError);
      return corsResponse({ error: 'Failed to authenticate user' }, 401);
    }

    if (!user) {
      console.error('❌ User not found after authentication');
      return corsResponse({ error: 'User not found' }, 404);
    }

    console.log('✅ User authenticated:', user.id);
    
    const { data: customer, error: getCustomerError } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (getCustomerError) {
      console.error('Failed to fetch customer information from the database', getCustomerError);
      return corsResponse({ error: 'Failed to fetch customer information' }, 500);
    }

    if (!customer || !customer.customer_id) {
      console.error('❌ No Stripe customer found for user:', user.id);
      return corsResponse({ error: 'No Stripe customer found for this user' }, 404);
    }

    console.log('✅ Stripe customer found:', customer.customer_id);
    
    // Use the provided return_url or default to subscription page
    const portalReturnUrl = return_url || `${req.headers.get('origin')}/subscription`;
    
    // Create a Stripe Customer Portal session
    let session;
    try {
      console.log('🔄 Creating Stripe portal session for customer:', customer.customer_id);
      
      session = await stripe.billingPortal.sessions.create({
        customer: customer.customer_id,
        return_url: portalReturnUrl,
      });
      
      console.log('✅ Portal session created successfully:', session.id);
    } catch (stripeError: any) {
      console.error('Stripe portal session creation failed:', stripeError);
      
      // Handle specific configuration error
      if (stripeError.message && stripeError.message.includes('No configuration provided')) {
        return corsResponse({ 
          error: 'Portal do cliente não configurado no Stripe. Acesse: https://dashboard.stripe.com/test/settings/billing/portal e configure o portal do cliente.',
          stripe_dashboard_url: 'https://dashboard.stripe.com/test/settings/billing/portal',
          help_text: 'Configure o Portal do Cliente no Stripe Dashboard para permitir que os clientes gerenciem suas assinaturas.'
        }, 400);
      }
      
      return corsResponse({ error: stripeError.message || 'Failed to create portal session' }, 500);
    }

    console.log('✅ Returning portal URL:', session.url);
    return corsResponse({ url: session.url });
  } catch (error: any) {
    console.error(`Customer portal error: ${error.message}`);
    return corsResponse({ error: error.message }, 500);
  }
});