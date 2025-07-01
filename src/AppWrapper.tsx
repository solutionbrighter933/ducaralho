import React, { useState } from 'react';
import { useAuthContext } from './components/AuthProvider';
import LoadingSpinner from './components/LoadingSpinner';
import AuthScreen from './components/AuthScreen';
import App from './App';

const AppWrapper: React.FC = () => {
  const { user, loading, error } = useAuthContext();

  if (loading) {
    return <LoadingSpinner error={error} />;
  }

  if (!user) {
    return <AuthScreen />;
  }

  return <App />;
};

export default AppWrapper;