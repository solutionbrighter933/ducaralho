import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Conversations from './components/Conversations';
import AITraining from './components/AITraining';
import WhatsAppNumber from './components/WhatsAppNumber';
import InstagramDirect from './components/InstagramDirect';
import Settings from './components/Settings';
import Profile from './components/Profile';
import Support from './components/Support';

type ActiveSection = 'dashboard' | 'conversations' | 'ai-training' | 'whatsapp' | 'instagram' | 'settings' | 'profile' | 'support';
type Theme = 'light' | 'dark' | 'auto';

function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('whatsapp');
  const [theme, setTheme] = useState<Theme>('auto');
  const [settingsTab, setSettingsTab] = useState('general');

  // Aplicar tema ao carregar
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Aplicar tema quando mudar
  useEffect(() => {
    const root = window.document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // Auto mode - detectar preferência do sistema
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      if (mediaQuery.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      
      // Escutar mudanças na preferência do sistema
      const handleChange = (e: MediaQueryListEvent) => {
        if (theme === 'auto') {
          if (e.matches) {
            root.classList.add('dark');
          } else {
            root.classList.remove('dark');
          }
        }
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    
    localStorage.setItem('theme', theme);
  }, [theme]);

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'conversations':
        return <Conversations />;
      case 'ai-training':
        return <AITraining setActiveSection={setActiveSection} setSettingsTab={setSettingsTab} />;
      case 'whatsapp':
        return <WhatsAppNumber />;
      case 'instagram':
        return <InstagramDirect />;
      case 'settings':
        return <Settings theme={theme} setTheme={setTheme} activeTab={settingsTab} setActiveTab={setSettingsTab} />;
      case 'profile':
        return <Profile />;
      case 'support':
        return <Support />;
      default:
        return <WhatsAppNumber />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header setActiveSection={setActiveSection} />
        <main className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;