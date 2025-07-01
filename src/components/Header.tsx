import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, ChevronDown, LogOut, User, MessageSquare, Users, X } from 'lucide-react';
import { useAuthContext } from './AuthProvider';

interface HeaderProps {
  setActiveSection?: (section: string) => void;
}

const Header: React.FC<HeaderProps> = ({ setActiveSection }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, profile, signOut } = useAuthContext();
  
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Mock search results
  const searchResults = [
    {
      type: 'conversation',
      title: 'Maria Santos',
      subtitle: 'Última mensagem: Obrigada pelo atendimento!',
      icon: MessageSquare,
      action: () => setActiveSection?.('conversations')
    },
    {
      type: 'conversation',
      title: 'João Silva',
      subtitle: 'Última mensagem: Preciso de ajuda com meu pedido',
      icon: MessageSquare,
      action: () => setActiveSection?.('conversations')
    },
    {
      type: 'contact',
      title: 'Ana Costa',
      subtitle: 'Contato: +55 11 99999-1234',
      icon: Users,
      action: () => setActiveSection?.('conversations')
    },
    {
      type: 'contact',
      title: 'Pedro Oliveira',
      subtitle: 'Contato: +55 11 88888-5678',
      icon: Users,
      action: () => setActiveSection?.('conversations')
    }
  ];

  // Filter search results based on query
  const filteredResults = searchQuery.trim() 
    ? searchResults.filter(result => 
        result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        result.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleProfileClick = () => {
    setActiveSection?.('profile');
    setShowUserMenu(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSearchResults(value.trim().length > 0);
  };

  const handleSearchResultClick = (result: any) => {
    result.action();
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSearchResults(false);
  };

  // Get user display information with real-time updates
  const getUserDisplayName = () => {
    return profile?.full_name || user?.email?.split('@')[0] || 'Usuário';
  };

  const getUserRole = () => {
    return profile?.role || 'Admin';
  };

  const getUserEmail = () => {
    return profile?.email || user?.email || '';
  };

  const getUserAvatar = () => {
    // Use profile avatar if available, otherwise fallback to default
    return profile?.avatar_url || "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=64&h=64&dpr=2";
  };

  const getUserInitials = () => {
    const name = getUserDisplayName();
    return name.charAt(0).toUpperCase();
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4 transition-colors">
      <div className="flex items-center justify-between">
        {/* Search Section */}
        <div className="flex items-center space-x-4">
          <div className="relative" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar conversas, contatos..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10 pr-10 py-2 w-96 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                {filteredResults.length > 0 ? (
                  <div className="py-2">
                    {filteredResults.map((result, index) => {
                      const Icon = result.icon;
                      return (
                        <button
                          key={index}
                          onClick={() => handleSearchResultClick(result)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center space-x-3"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            result.type === 'conversation' 
                              ? 'bg-blue-100 dark:bg-blue-900/30' 
                              : 'bg-green-100 dark:bg-green-900/30'
                          }`}>
                            <Icon className={`w-4 h-4 ${
                              result.type === 'conversation' 
                                ? 'text-blue-600 dark:text-blue-400' 
                                : 'text-green-600 dark:text-green-400'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {result.title}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {result.subtitle}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            result.type === 'conversation' 
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          }`}>
                            {result.type === 'conversation' ? 'Conversa' : 'Contato'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <Search className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      Nenhum resultado encontrado para "{searchQuery}"
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Right Section - Notifications and User Menu */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notificações</h3>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="p-6 text-center">
                  <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Nenhuma notificação no momento!
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                    Você será notificado sobre novas mensagens e atividades importantes.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <div 
              className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-2 transition-colors"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              {/* User Avatar - Updated to use real profile data */}
              <div className="relative">
                {profile?.avatar_url ? (
                  <img
                    src={getUserAvatar()}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold ${profile?.avatar_url ? 'hidden' : ''}`}>
                  {getUserInitials()}
                </div>
              </div>
              
              {/* User Info - Updated to use real profile data */}
              <div className="text-sm">
                <p className="font-medium text-gray-900 dark:text-white">
                  {getUserDisplayName()}
                </p>
                <p className="text-gray-500 dark:text-gray-400">
                  {getUserRole()}
                </p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </div>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {getUserDisplayName()}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {getUserEmail()}
                  </p>
                </div>
                
                <div className="py-1">
                  <button 
                    onClick={handleProfileClick}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <User className="w-4 h-4 mr-3" />
                    Meu Perfil
                  </button>
                  
                  <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                  
                  <button 
                    onClick={handleSignOut}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sair
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;