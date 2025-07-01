import { supabase } from '../lib/supabase';

export interface GeneralSettings {
  company_name: string;
  timezone: string;
  language: string;
}

export interface AIModelSettings {
  selected_model: string;
  model_config: any;
}

export interface NotificationSettings {
  new_messages: boolean;
  system_alerts: boolean;
  weekly_reports: boolean;
  email_notifications: boolean;
}

export interface SecuritySettings {
  two_factor_enabled: boolean;
  session_timeout: number;
  password_requirements: any;
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  compact_mode: boolean;
}

export class SettingsService {
  private static instance: SettingsService;

  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  private async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error('Usuário não autenticado');
    }
    return user;
  }

  private async getUserProfile() {
    try {
      const user = await this.getCurrentUser();
      
      console.log('🔍 Fetching profile for user:', user.id);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('❌ Profile fetch error:', error);
        return null;
      }

      if (!profile) {
        console.log('📝 No profile found');
        return null;
      }

      console.log('✅ Profile found:', profile);
      return profile;
    } catch (error) {
      console.error('❌ Error in getUserProfile:', error);
      return null;
    }
  }

  // Configurações Gerais
  async saveGeneralSettings(settings: GeneralSettings): Promise<void> {
    try {
      const profile = await this.getUserProfile();
      if (!profile) {
        throw new Error('Perfil não encontrado');
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({
          settings: {
            ...profile.settings,
            general: settings
          },
          updated_at: new Date().toISOString()
        })
        .eq('user_id', profile.user_id);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao salvar configurações gerais:', error);
      throw error;
    }
  }

  async getGeneralSettings(): Promise<GeneralSettings> {
    try {
      const profile = await this.getUserProfile();
      if (!profile) {
        return {
          company_name: 'Minha Empresa SaaS',
          timezone: 'America/Sao_Paulo',
          language: 'pt-BR'
        };
      }
      
      return profile.settings?.general || {
        company_name: 'Minha Empresa SaaS',
        timezone: 'America/Sao_Paulo',
        language: 'pt-BR'
      };
    } catch (error) {
      console.error('Erro ao buscar configurações gerais:', error);
      return {
        company_name: 'Minha Empresa SaaS',
        timezone: 'America/Sao_Paulo',
        language: 'pt-BR'
      };
    }
  }

  // Configurações de Modelos de IA
  async saveAIModelSettings(settings: AIModelSettings): Promise<void> {
    try {
      const profile = await this.getUserProfile();
      if (!profile) {
        throw new Error('Perfil não encontrado');
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({
          settings: {
            ...profile.settings,
            ai_models: settings
          },
          updated_at: new Date().toISOString()
        })
        .eq('user_id', profile.user_id);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao salvar configurações de IA:', error);
      throw error;
    }
  }

  async getAIModelSettings(): Promise<AIModelSettings> {
    try {
      const profile = await this.getUserProfile();
      if (!profile) {
        return {
          selected_model: 'gpt-4o',
          model_config: {}
        };
      }
      
      return profile.settings?.ai_models || {
        selected_model: 'gpt-4o',
        model_config: {}
      };
    } catch (error) {
      console.error('Erro ao buscar configurações de IA:', error);
      return {
        selected_model: 'gpt-4o',
        model_config: {}
      };
    }
  }

  // Configurações de Notificações
  async saveNotificationSettings(settings: NotificationSettings): Promise<void> {
    try {
      const profile = await this.getUserProfile();
      if (!profile) {
        throw new Error('Perfil não encontrado');
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({
          settings: {
            ...profile.settings,
            notifications: settings
          },
          updated_at: new Date().toISOString()
        })
        .eq('user_id', profile.user_id);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao salvar configurações de notificações:', error);
      throw error;
    }
  }

  async getNotificationSettings(): Promise<NotificationSettings> {
    try {
      const profile = await this.getUserProfile();
      if (!profile) {
        return {
          new_messages: true,
          system_alerts: true,
          weekly_reports: false,
          email_notifications: true
        };
      }
      
      return profile.settings?.notifications || {
        new_messages: true,
        system_alerts: true,
        weekly_reports: false,
        email_notifications: true
      };
    } catch (error) {
      console.error('Erro ao buscar configurações de notificações:', error);
      return {
        new_messages: true,
        system_alerts: true,
        weekly_reports: false,
        email_notifications: true
      };
    }
  }

  // Configurações de Segurança
  async saveSecuritySettings(settings: SecuritySettings): Promise<void> {
    try {
      const profile = await this.getUserProfile();
      if (!profile) {
        throw new Error('Perfil não encontrado');
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({
          settings: {
            ...profile.settings,
            security: settings
          },
          updated_at: new Date().toISOString()
        })
        .eq('user_id', profile.user_id);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao salvar configurações de segurança:', error);
      throw error;
    }
  }

  async getSecuritySettings(): Promise<SecuritySettings> {
    try {
      const profile = await this.getUserProfile();
      if (!profile) {
        return {
          two_factor_enabled: false,
          session_timeout: 30,
          password_requirements: {
            min_length: 8,
            require_uppercase: true,
            require_numbers: true,
            require_symbols: true
          }
        };
      }
      
      return profile.settings?.security || {
        two_factor_enabled: false,
        session_timeout: 30,
        password_requirements: {
          min_length: 8,
          require_uppercase: true,
          require_numbers: true,
          require_symbols: true
        }
      };
    } catch (error) {
      console.error('Erro ao buscar configurações de segurança:', error);
      return {
        two_factor_enabled: false,
        session_timeout: 30,
        password_requirements: {
          min_length: 8,
          require_uppercase: true,
          require_numbers: true,
          require_symbols: true
        }
      };
    }
  }

  // Configurações de Aparência
  async saveAppearanceSettings(settings: AppearanceSettings): Promise<void> {
    try {
      const profile = await this.getUserProfile();
      if (!profile) {
        throw new Error('Perfil não encontrado');
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({
          settings: {
            ...profile.settings,
            appearance: settings
          },
          updated_at: new Date().toISOString()
        })
        .eq('user_id', profile.user_id);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao salvar configurações de aparência:', error);
      throw error;
    }
  }

  async getAppearanceSettings(): Promise<AppearanceSettings> {
    try {
      const profile = await this.getUserProfile();
      if (!profile) {
        return {
          theme: 'auto',
          language: 'pt-BR',
          compact_mode: false
        };
      }
      
      return profile.settings?.appearance || {
        theme: 'auto',
        language: 'pt-BR',
        compact_mode: false
      };
    } catch (error) {
      console.error('Erro ao buscar configurações de aparência:', error);
      return {
        theme: 'auto',
        language: 'pt-BR',
        compact_mode: false
      };
    }
  }

  // Atualizar senha
  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Primeiro, verificar a senha atual fazendo login
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error('Usuário não encontrado');
      }

      // Tentar fazer login com a senha atual para verificar
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError) {
        throw new Error('Senha atual incorreta');
      }

      // Atualizar para a nova senha
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      throw error;
    }
  }
}

export const settingsService = SettingsService.getInstance();