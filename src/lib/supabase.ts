import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Supabase Configuration Check:');
console.log('URL:', supabaseUrl ? 'Present ✅' : 'Missing ❌');
console.log('Anon Key:', supabaseAnonKey ? 'Present ✅' : 'Missing ❌');

// Função para inicializar o cliente Supabase
const initializeSupabaseClient = () => {
  // Verificar se as variáveis de ambiente estão configuradas
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables');
    console.log('Please check your .env file and ensure you have:');
    console.log('VITE_SUPABASE_URL=your_supabase_url');
    console.log('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
    
    // Retornar um cliente mock para evitar erros
    return createMockClient();
  }

  try {
    // Criar cliente real do Supabase
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce'
      },
      global: {
        headers: {
          'X-Client-Info': 'atendos-ai-saas'
        }
      },
      db: {
        schema: 'public'
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });

    // Testar conexão em segundo plano
    testConnection(client);
    
    return client;
  } catch (error) {
    console.error('❌ Failed to create Supabase client:', error);
    console.log('Falling back to mock client');
    return createMockClient();
  }
};

// Função para testar a conexão com o Supabase
const testConnection = async (client: any) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const sessionPromise = client.auth.getSession();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 5000)
    );

    const { data, error } = await Promise.race([sessionPromise, timeoutPromise]) as any;
    
    clearTimeout(timeoutId);
    
    if (error && !error.message?.includes('timeout')) {
      console.error('❌ Supabase connection error:', error);
    } else {
      console.log('✅ Supabase connected successfully');
      console.log('Session:', data?.session ? 'Active' : 'None');
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('timeout')) {
      console.warn('⚠️ Supabase connection timeout - continuing anyway');
    } else {
      console.error('❌ Supabase initialization error:', err);
    }
  }
};

// Função para criar um cliente mock
const createMockClient = () => {
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      signUp: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: () => ({
      select: () => ({ 
        eq: () => ({ 
          single: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
          maybeSingle: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
          limit: () => Promise.resolve({ data: [], error: { message: 'Supabase not configured' } }),
          order: () => ({ limit: () => Promise.resolve({ data: [], error: { message: 'Supabase not configured' } }) })
        }),
        order: () => ({ limit: () => Promise.resolve({ data: [], error: { message: 'Supabase not configured' } }) })
      }),
      insert: () => ({ 
        select: () => ({ 
          single: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }) 
        }) 
      }),
      update: () => ({ 
        eq: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        select: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }) })
      }),
      rpc: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } })
    }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        getPublicUrl: () => ({ data: { publicUrl: '' } })
      })
    },
    channel: () => ({
      on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) })
    }),
    removeChannel: () => {}
  };
};

// Inicializar o cliente Supabase (real ou mock)
const supabase = initializeSupabaseClient();

// Database types
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          settings: any;
          subscription_tier: string;
          subscription_status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          settings?: any;
          subscription_tier?: string;
          subscription_status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          settings?: any;
          subscription_tier?: string;
          subscription_status?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          role: string;
          settings: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id: string;
          email: string;
          full_name: string;
          avatar_url?: string | null;
          role?: string;
          settings?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_id?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string | null;
          role?: string;
          settings?: any;
          updated_at?: string;
        };
      };
    };
  };
}

export { supabase };