import React, { createContext, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';

interface AuthContextType {
  user: any;
  profile: any;
  loading: boolean;
  error: string | null;
  hasActiveSubscription: boolean | null;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, organizationName: string) => Promise<any>;
  signOut: () => Promise<any>;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<any>;
  checkSubscriptionStatus: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();

  // Check subscription status on initial load
  React.useEffect(() => {
    if (auth.user && auth.hasActiveSubscription === null) {
      auth.checkSubscriptionStatus();
    }
  }, [auth.user, auth.hasActiveSubscription]);

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};