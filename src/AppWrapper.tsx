import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from './components/AuthProvider';
import LoadingSpinner from './components/LoadingSpinner';
import AuthScreen from './components/AuthScreen';
import App from './App';

const AppWrapper: React.FC = () => {
  const { user, loading, error, hasActiveSubscription } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [developerMode, setDeveloperMode] = useState(false);

  // Check for developer mode flag in localStorage
  React.useEffect(() => {
    const isDeveloperMode = localStorage.getItem('developer_mode') === 'true';
    setDeveloperMode(isDeveloperMode);
  }, []);
  
  // Check if user needs to be redirected to pricing page
  React.useEffect(() => {
    if (!loading && user && hasActiveSubscription === false && !developerMode) {
      // Only redirect if not already on pricing or success page
      const currentPath = location.pathname;
      if (!['/pricing', '/success'].includes(currentPath)) {
        console.log('🔄 No active subscription, redirecting to pricing page');
        navigate('/pricing');
      }
    }
  }, [loading, user, hasActiveSubscription, developerMode, navigate, location.pathname]);

  if (loading) {
    return <LoadingSpinner error={error} />;
  }

  if (!user) {
    return <AuthScreen />;
  }

  return <App />;
};

export default AppWrapper;