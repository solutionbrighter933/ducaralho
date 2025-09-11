import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  MessageSquare, 
  Brain, 
  Smartphone,
  Calendar,
  Facebook,
  Package,
  Users,
  Video,
  Settings, 
  User, 
  CreditCard,
  HelpCircle,
  UserCheck
} from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: any) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, setActiveSection }) => {
  const navigate = useNavigate();
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'conversations', label: 'Conversas', icon: MessageSquare },
    { id: 'ai-training', label: 'Treinamento I.A', icon: Brain },
    { id: 'whatsapp', label: 'Número WhatsApp', icon: Smartphone },
    { id: 'instagram', label: 'Login com Facebook', icon: Facebook },
    { id: 'calendar', label: 'Google Calendar', icon: Calendar },
    { id: 'my-products', label: 'Smart Delivery', icon: Package },
    { id: 'meeting', label: 'Meeting', icon: Video },
    { id: 'contacts', label: 'Leadsgen', icon: Users },
    { id: 'cadastros', label: 'Cadastros', icon: UserCheck },
    { id: 'subscription', label: 'Assinatura', icon: CreditCard },
    { id: 'settings', label: 'Configurações', icon: Settings },
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'support', label: 'Suporte', icon: HelpCircle },
  ];

  return (
    <div className="w-64 bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700 transition-colors">
      <div className="absolute top-4 right-4 md:hidden">
        <button
          onClick={() => navigate('/pricing')}
          className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
        >
          <CreditCard className="w-4 h-4" />
        </button>
      </div>
      <div className="p-6">
        <div className="flex items-center justify-center mb-8">
          <img 
            src="/atendoslogo.png" 
            alt="Atendos IA" 
            className="h-8 w-auto"
          />
        </div>
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeSection === item.id
                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;