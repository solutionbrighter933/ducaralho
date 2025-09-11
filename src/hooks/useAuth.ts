import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  profile: any | null;
  hasActiveSubscription: boolean | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    hasActiveSubscription: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;
    let profileRefreshInterval: NodeJS.Timeout | null = null;

    // Increased timeout and better error handling
    timeoutId = setTimeout(() => {
      if (mounted && state.loading) {
        console.warn('⚠️ Auth initialization timeout - checking Supabase configuration');
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey || 
            supabaseUrl === 'your_supabase_project_url' || 
            supabaseKey === 'your_supabase_anon_key') {
          setState(prev => ({
            ...prev,
            loading: false,
            error: 'Configuração do Supabase ausente ou inválida. Atualize seu arquivo .env com credenciais reais do Supabase.'
          }));
        } else {
          setState(prev => ({
            ...prev,
            loading: false,
            error: null
          }));
        }
      }
    }, 10000); // Increased to 10 seconds

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔍 Checking initial session...');
        
        // Check if Supabase is properly configured
        if (!import.meta.env.VITE_SUPABASE_URL || 
            !import.meta.env.VITE_SUPABASE_ANON_KEY ||
            import.meta.env.VITE_SUPABASE_URL === 'your_supabase_project_url' ||
            import.meta.env.VITE_SUPABASE_ANON_KEY === 'your_supabase_anon_key' ||
            import.meta.env.VITE_SUPABASE_URL.includes('localhost') ||
            import.meta.env.VITE_SUPABASE_URL.includes('127.0.0.1')) {
          throw new Error('Configuração do Supabase ausente ou inválida. Atualize seu arquivo .env com credenciais reais do Supabase.');
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session error:', error);
          if (mounted) {
            setState({
              user: null,
              profile: null,
              hasActiveSubscription: null,
              loading: false,
              error: `Erro de conexão com Supabase: ${error.message}`,
            });
          }
          return;
        }

        console.log('📋 Session check result:', session ? 'Found' : 'None');
        
        if (mounted) {
          if (session?.user) {
            console.log('👤 User found, fetching profile...');
            
            // Try to fetch user profile with shorter timeout and better error handling
            try {
              const profilePromise = supabase
                .from('profiles')
                .select(`
                  *,
                  organizations (
                    id,
                    name,
                    slug
                  )
                `)
                .eq('user_id', session.user.id)
                .maybeSingle();

              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Profile fetch timeout')), 8000)
              );

              const { data: profile, error: profileError } = await Promise.race([
                profilePromise,
                timeoutPromise
              ]) as any;

              if (profileError && !profileError.message?.includes('timeout')) {
                console.error('❌ Profile fetch error:', profileError);
                // Continue without profile - it will be created later
              }

              setState({
                user: session.user,
                profile: profile || null,
                hasActiveSubscription: null, // Will be updated after checking subscription
                loading: false,
                error: null,
              });
              
              // Set up periodic profile refresh to prevent profile loss
              if (session.user.id) {
                setupProfileRefresh(session.user.id);
              }
            } catch (profileError) {
              console.warn('⚠️ Profile fetch failed, continuing without profile:', profileError);
              // Continue with user but no profile - this is acceptable
              setState({
                user: session.user,
                profile: null,
                hasActiveSubscription: null,
                loading: false,
                error: null,
              });
              
              // Set up periodic profile refresh to recover profile
              if (session.user.id) {
                setupProfileRefresh(session.user.id);
              }
            }
          } else {
            console.log('🚫 No user session found');
            setState({
              user: null,
              profile: null,
              hasActiveSubscription: null,
              loading: false,
              error: null,
            });
          }
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        if (mounted) {
          setState({
            user: null,
            profile: null,
            hasActiveSubscription: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Erro de inicialização',
          });
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };

    // Function to periodically refresh profile data
    const setupProfileRefresh = (userId: string) => {
      // Clear any existing interval
      if (profileRefreshInterval) {
        clearInterval(profileRefreshInterval);
      }
      
      // Set up new interval to refresh profile every 5 seconds to prevent disconnection
      profileRefreshInterval = setInterval(async () => {
        if (!mounted) return;
        
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select(`
              *,
              organizations (
                id,
                name,
                slug
              )
            `)
            .eq('user_id', userId)
            .maybeSingle();

          if (profileError) {
            // Don't update state on error to avoid losing existing profile
          } else if (profile) {
            setState(prev => ({
              ...prev,
              profile,
            }));
          } else if (!state.profile) {
            // Try to create profile if it doesn't exist
            tryCreateProfile(userId);
          }
        } catch (error) {
        }
      }, 5000); // Every 5 seconds to prevent profile disconnection
    };

    // Function to attempt profile creation if it doesn't exist
    const tryCreateProfile = async (userId: string) => {
      try {
        console.log('🔄 Attempting to create missing profile...');
        
        // Get user details
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error('❌ Failed to get user details:', userError);
          return;
        }
        
        // Create default organization
        const { data: organization, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: user.email?.split('@')[0] || 'My Organization',
            slug: `org-${Date.now()}`,
          })
          .select()
          .single();
          
        if (orgError) {
          console.error('❌ Failed to create organization:', orgError);
          return;
        }
        
        // Create profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            organization_id: organization.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            role: 'admin',
          })
          .select()
          .single();
          
        if (profileError) {
          console.error('❌ Failed to create profile:', profileError);
          return;
        }
        
        console.log('✅ Profile created successfully:', profile);
        
        // Update state with new profile
        setState(prev => ({
          ...prev,
          profile,
        }));
      } catch (error) {
        console.error('❌ Error creating profile:', error);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event);
        
        if (!mounted) return;

        try {
          if (session?.user) {
            console.log('✅ User authenticated');
            
            // Try to fetch profile with shorter timeout and better error handling
            try {
              const profilePromise = supabase
                .from('profiles')
                .select(`
                  *,
                  organizations (
                    id,
                    name,
                    slug
                  )
                `)
                .eq('user_id', session.user.id)
                .maybeSingle();

              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
              );

              const { data: profile, error: profileError } = await Promise.race([
                profilePromise,
                timeoutPromise
              ]) as any;

              if (profileError && !profileError.message?.includes('timeout')) {
                console.error('❌ Profile fetch error:', profileError);
              }

              setState({
                user: session.user,
                profile: profile || null,
                hasActiveSubscription: null, // Will be updated after checking subscription
                loading: false,
                error: null,
              });
              
              // Set up periodic profile refresh
              setupProfileRefresh(session.user.id);
            } catch (profileError) {
              console.warn('⚠️ Profile fetch failed, continuing without profile:', profileError);
              setState({
                user: session.user,
                profile: null,
                hasActiveSubscription: null,
                loading: false,
                error: null,
              });
              
              // Set up periodic profile refresh to recover profile
              setupProfileRefresh(session.user.id);
            }
          } else {
            console.log('🚪 User signed out');
            setState({
              user: null,
              profile: null,
              hasActiveSubscription: null,
              loading: false,
              error: null,
            });
            
            // Clear profile refresh interval on sign out
            if (profileRefreshInterval) {
              clearInterval(profileRefreshInterval);
              profileRefreshInterval = null;
            }
          }
        } catch (error) {
          console.error('❌ Auth state change error:', error);
          setState({
            user: null,
            profile: null,
            hasActiveSubscription: null,
            loading: false,
            error: null,
          });
        }
      }
    );

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (profileRefreshInterval) {
        clearInterval(profileRefreshInterval);
      }
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log('🔐 Attempting sign in...');
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        console.error('❌ Sign in error:', error);
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: error.message 
        }));
        return { success: false, error: error.message };
      }

      console.log('✅ Sign in successful');
      
      // After successful sign in, check subscription status
      setTimeout(async () => {
        try {
          await checkSubscriptionStatus();
        } catch (error) {
          console.error('Error checking subscription after sign in:', error);
        }
      }, 1000);
      
      return { success: true, data };
    } catch (error) {
      console.error('❌ Sign in exception:', error);
      const errorMessage = error instanceof Error ? error.message : 'Falha no login';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage 
      }));
      return { success: false, error: errorMessage };
    }
  };

  const signUp = async (email: string, password: string, organizationName: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log('📝 Attempting sign up with email:', email);
      
      // First create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: organizationName,
            organization_name: organizationName
          }
        }
      });

      if (authError) {
        console.error('❌ Auth signup error:', authError);
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: authError.message 
        }));
        return { success: false, error: authError.message };
      }

      console.log('✅ User created successfully. Profile and organization will be created by database trigger.');

      return { success: true, data: authData };
    } catch (error) {
      console.error('❌ Sign up exception:', error);
      const errorMessage = error instanceof Error ? error.message : 'Falha no cadastro';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage 
      }));
      return { success: false, error: errorMessage };
    }
  };

  const signOut = async () => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      console.log('🚪 Signing out...');
      await supabase.auth.signOut();
      setState({
        user: null,
        profile: null,
        hasActiveSubscription: null,
        loading: false,
        error: null,
      });
      return { success: true };
    } catch (error) {
      console.error('❌ Sign out error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Falha no logout';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage 
      }));
      return { success: false, error: errorMessage };
    }
  };

  // Function to check subscription status
  const checkSubscriptionStatus = async () => {
    if (!state.user?.id) {
      console.warn('⚠️ Cannot check subscription status: No user logged in');
      return { success: false, error: 'Usuário não autenticado' };
    }
    
    try {
      console.log('🔄 Checking subscription status...');
      
      // First check if the user has a customer record
      const { data: customer, error: customerError } = await supabase
        .from('stripe_customers')
        .select('customer_id')
        .eq('user_id', state.user.id)
        .is('deleted_at', null)
        .maybeSingle();

      if (customerError) {
        console.error('❌ Error checking customer record:', customerError);
        return { success: false, error: customerError.message };
      }

      // If no customer record exists, user doesn't have a subscription
      if (!customer) {
        console.log('ℹ️ No Stripe customer record found for user');
        setState(prev => ({
          ...prev,
          hasActiveSubscription: false
        }));
        return { success: true, hasActiveSubscription: false };
      }

      // Now check subscription status
      const { data, error } = await supabase
        .from('stripe_user_subscriptions')
        .select('subscription_status')
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching subscription status:', error);
        // Don't update state on error to avoid false negatives
        return { success: false, error: error.message };
      }

      const hasActiveSubscription = data && 
        ['active', 'trialing'].includes(data.subscription_status);
      
      console.log('✅ Subscription status checked:', hasActiveSubscription ? 'Active' : 'Inactive');
      
      setState(prev => ({
        ...prev,
        hasActiveSubscription
      }));
      
      return { success: true, hasActiveSubscription };
    } catch (error) {
      console.error('❌ Error checking subscription status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao verificar assinatura';
      // Don't update state on error to avoid false negatives
      return { success: false, error: errorMessage };
    }
  };

  // Função para forçar uma atualização do perfil
  const refreshProfile = async () => {
    if (!state.user?.id) {
      console.warn('⚠️ Cannot refresh profile: No user logged in');
      return { success: false, error: 'Usuário não autenticado' };
    }
    
    try {
      console.log('🔄 Manually refreshing profile data...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          organizations (
            id,
            name,
            slug
          )
        `)
        .eq('user_id', state.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('❌ Manual profile refresh error:', profileError);
        return { success: false, error: profileError.message };
      }

      if (profile) {
        console.log('✅ Profile refreshed successfully');
        setState(prev => ({
          ...prev,
          profile
        }));
        
        // After profile refresh, also check subscription status
        await checkSubscriptionStatus();
        
        return { success: true, profile };
      } else {
        console.warn('⚠️ Profile not found during manual refresh');
        return { success: false, error: 'Perfil não encontrado' };
      }
    } catch (error) {
      console.error('❌ Manual profile refresh exception:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar perfil';
      return { success: false, error: errorMessage };
    }
  };

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    checkSubscriptionStatus,
    isAuthenticated: !!state.user,
  };
};