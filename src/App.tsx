import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Conversations from './components/Conversations';
import AITraining from './components/AITraining';
import WhatsAppNumber from './components/WhatsAppNumber';
import InstagramDirect from './components/InstagramDirect';
import GoogleCalendar from './components/GoogleCalendar';
import Settings from './components/Settings';
import Profile from './components/Profile';
import Support from './components/Support';
import SupabaseDebugger from './components/SupabaseDebugger';
import PricingPage from './pages/PricingPage';
import SuccessPage from './pages/SuccessPage';
import GoogleCalendarCallback from './pages/GoogleCalendarCallback';
import SubscriptionStatus from './components/SubscriptionStatus';

type ActiveSection = 'dashboard' | 'conversations' | 'ai-training' | 'whatsapp' | 'instagram' | 'calendar' | 'settings' | 'profile' | 'support' | 'debug' | 'subscription';
type Theme = 'light' | 'dark' | 'auto';

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
}
function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('whatsapp');
  const [theme, setTheme] = useState<Theme>('auto');
  const [settingsTab, setSettingsTab] = useState('general');
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);

  // Função para adicionar nova notificação
  const addAppNotification = (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: AppNotification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false
    };
    
    setAppNotifications(prev => [newNotification, ...prev]);
    
    // Auto-remove notification after 30 seconds
    setTimeout(() => {
      setAppNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 30000);
  };

  // Função para marcar notificação como lida
  const markNotificationAsRead = (notificationId: string) => {
    setAppNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  // Função para remover notificação
  const removeNotification = (notificationId: string) => {
    setAppNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  // Função para limpar todas as notificações
  const clearAllNotifications = () => {
    setAppNotifications([]);
  };
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
        return <InstagramDirect setActiveSection={setActiveSection} />;
      case 'calendar':
        return <GoogleCalendar addAppNotification={addAppNotification} />;
      case 'settings':
        return <Settings theme={theme} setTheme={setTheme} activeTab={settingsTab} setActiveTab={setSettingsTab} />;
      case 'profile':
        return <Profile />;
      case 'support':
        return <Support />;
      case 'debug':
        return <SupabaseDebugger />;
      case 'subscription':
        return <SubscriptionStatus />;
      default:
        return <WhatsAppNumber />;
    }
  };

  return (
    <Routes>
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/success" element={<SuccessPage />} />
      <Route path="/auth/callback/google-calendar" element={<GoogleCalendarCallback />} />
      <Route path="/*" element={
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
          <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header 
              setActiveSection={setActiveSection}
              appNotifications={appNotifications}
              markNotificationAsRead={markNotificationAsRead}
              removeNotification={removeNotification}
              clearAllNotifications={clearAllNotifications}
            />
            <main className="flex-1 overflow-y-auto p-6">
              {renderContent()}
            </main>
          </div>
        </div>
      } />
    </Routes>
  );
}

export default App;