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

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser(token);

    if (getUserError) {
      return corsResponse({ error: 'Failed to authenticate user' }, 401);
    }

    if (!user) {
      return corsResponse({ error: 'User not found' }, 404);
    }

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
      return corsResponse({ error: 'No Stripe customer found for this user' }, 404);
    }

    // Create a Stripe Customer Portal session
    let session;
    try {
      session = await stripe.billingPortal.sessions.create({
        customer: customer.customer_id,
        return_url: `${req.headers.get('origin')}/subscription`,
      });
    } catch (stripeError: any) {
      console.error('Stripe portal session creation failed:', stripeError);
      
      // Handle specific configuration error
      if (stripeError.message && stripeError.message.includes('No configuration provided')) {
        return corsResponse({ 
          error: 'No configuration provided and your test mode default configuration has not been created. Provide a configuration or create your default by saving your customer portal settings in test mode at https://dashboard.stripe.com/test/settings/billing/portal.'
        }, 400);
      }
      
      return corsResponse({ error: stripeError.message || 'Failed to create portal session' }, 500);
    }

    return corsResponse({ url: session.url });
  } catch (error: any) {
    console.error(`Customer portal error: ${error.message}`);
    return corsResponse({ error: error.message }, 500);
  }
});