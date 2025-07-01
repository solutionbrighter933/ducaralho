import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  profile: any | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    // Set a timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (mounted && state.loading) {
        console.warn('⚠️ Auth initialization timeout - forcing completion');
        setState(prev => ({
          ...prev,
          loading: false,
          error: null
        }));
      }
    }, 5000); // Reduced to 5 seconds

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔍 Checking initial session...');
        
        // Check if Supabase is properly configured
        if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
          throw new Error('Configuração do Supabase ausente. Verifique seu arquivo .env');
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session error:', error);
          if (mounted) {
            setState({
              user: null,
              profile: null,
              loading: false,
              error: null,
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
                setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
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
                loading: false,
                error: null,
              });
            } catch (profileError) {
              console.warn('⚠️ Profile fetch failed, continuing without profile:', profileError);
              // Continue with user but no profile - this is acceptable
              setState({
                user: session.user,
                profile: null,
                loading: false,
                error: null,
              });
            }
          } else {
            console.log('🚫 No user session found');
            setState({
              user: null,
              profile: null,
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
            loading: false,
            error: null,
          });
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
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
                loading: false,
                error: null,
              });
            } catch (profileError) {
              console.warn('⚠️ Profile fetch failed, continuing without profile:', profileError);
              setState({
                user: session.user,
                profile: null,
                loading: false,
                error: null,
              });
            }
          } else {
            console.log('🚪 User signed out');
            setState({
              user: null,
              profile: null,
              loading: false,
              error: null,
            });
          }
        } catch (error) {
          console.error('❌ Auth state change error:', error);
          setState({
            user: null,
            profile: null,
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
      console.log('📝 Attempting sign up...');
      
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

      if (authData.user) {
        console.log('👤 User created, setting up organization and profile...');
        
        try {
          // Create organization first
          const { data: organization, error: orgError } = await supabase
            .from('organizations')
            .insert({
              name: organizationName,
              slug: organizationName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
            })
            .select()
            .single();

          if (orgError) {
            console.error('❌ Organization creation error:', orgError);
            // Continue anyway - user can set this up later
          } else {
            console.log('🏢 Organization created:', organization);

            // Create user profile
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                user_id: authData.user.id,
                organization_id: organization.id,
                email: authData.user.email!,
                full_name: organizationName,
                role: 'admin',
                settings: {
                  general: {
                    company_name: organizationName,
                    timezone: 'America/Sao_Paulo',
                    language: 'pt-BR'
                  },
                  notifications: {
                    new_messages: true,
                    system_alerts: true,
                    weekly_reports: false,
                    email_notifications: true
                  },
                  appearance: {
                    theme: 'auto',
                    language: 'pt-BR',
                    compact_mode: false
                  },
                  security: {
                    two_factor_enabled: false,
                    session_timeout: 30,
                    password_requirements: {
                      min_length: 8,
                      require_uppercase: true,
                      require_numbers: true,
                      require_symbols: true
                    }
                  },
                  ai_models: {
                    selected_model: 'gpt-4o',
                    model_config: {}
                  }
                }
              });

            if (profileError) {
              console.error('❌ Profile creation error:', profileError);
              // Continue anyway - user can complete setup later
            } else {
              console.log('👤 Profile created successfully');
            }
          }
        } catch (setupError) {
          console.error('⚠️ Post-signup setup error:', setupError);
          // Even if profile creation fails, the auth was successful
        }
      }

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

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!state.user,
  };
};