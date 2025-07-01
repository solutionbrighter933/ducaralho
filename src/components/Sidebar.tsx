import React from 'react';
import { 
  BarChart3, 
  MessageSquare, 
  Brain, 
  Smartphone, 
  Instagram,
  Settings, 
  User, 
  HelpCircle
} from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: any) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, setActiveSection }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'conversations', label: 'Conversas', icon: MessageSquare },
    { id: 'ai-training', label: 'Treinamento A.I.', icon: Brain },
    { id: 'whatsapp', label: 'Número WhatsApp', icon: Smartphone },
    { id: 'instagram', label: 'Instagram Direct', icon: Instagram },
    { id: 'settings', label: 'Configurações', icon: Settings },
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'support', label: 'Suporte', icon: HelpCircle },
  ];

  return (
    <div className="w-64 bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700 transition-colors">
      <div className="p-6">
        <div className="flex items-center justify-center mb-8">
          <img 
            src="/Attendos Logo.png" 
            alt="Attendos AI" 
            className="h-8 w-auto"
          />
        </div>
        
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;