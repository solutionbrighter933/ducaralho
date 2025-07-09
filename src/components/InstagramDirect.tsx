import React, { useState, useEffect } from 'react';
import { Instagram, AlertCircle, Lock } from 'lucide-react';

interface InstagramDirectProps {
  setActiveSection?: (section: string) => void;
}

const InstagramDirect: React.FC<InstagramDirectProps> = ({ setActiveSection }) => {
  const [showBlockMessage, setShowBlockMessage] = useState(true);

  // Mostrar mensagem de bloqueio assim que o componente for montado
  useEffect(() => {
    setShowBlockMessage(true);
  }, []);

  // Função para redirecionar para o Dashboard
  const handleBackToDashboard = () => {
    if (setActiveSection) {
      setActiveSection('dashboard');
    }
  };

  return (
    <div className="space-y-6">
      {/* Mensagem de bloqueio */}
      {showBlockMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl border border-red-300 dark:border-red-700">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Atenção!
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                Você não pode modificar esses dados no momento, função não disponível.
              </p>
              
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Esta funcionalidade está temporariamente indisponível.
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleBackToDashboard}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Instagram Direct Messages</h1>
      </div>

      {/* Conteúdo original do componente (não será visível devido ao modal de bloqueio) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Instagram className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              Instagram Direct Messages
            </p>
            <p className="text-gray-400 dark:text-gray-500 mt-2">
              Conecte sua conta do Instagram para gerenciar mensagens diretas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstagramDirect;