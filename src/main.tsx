import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './components/AuthProvider';
import AppWrapper from './AppWrapper';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AppWrapper />
    </AuthProvider>
  </StrictMode>
);