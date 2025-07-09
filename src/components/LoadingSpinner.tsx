import React from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

interface LoadingSpinnerProps {
  error?: string | null;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ error }) => {
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center max-w-lg mx-auto p-6">
          <img 
            src="/atendoslogo.png" 
            alt="Atendos IA" 
            className="h-12 w-auto mx-auto mb-6"
          />
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-red-800 mb-3">Erro de Configuração</h3>
            <p className="text-red-700 mb-4">
              {error && error.includes('Supabase') 
                ? 'Configuração do Supabase ausente ou inválida. Verifique seu arquivo .env.' 
                : error}
            </p>
            
            <div className="text-left bg-red-100 rounded-lg p-4 text-sm">
              <p className="font-semibold mb-3 text-red-800">💡 Como corrigir:</p>
              <ol className="list-decimal list-inside space-y-2 text-red-700">
                <li>Verifique se o arquivo <code className="bg-red-200 px-1 rounded">.env</code> existe na raiz do projeto</li>
                <li>Configure <code className="bg-red-200 px-1 rounded">VITE_SUPABASE_URL</code> com a URL do seu projeto Supabase</li>
                <li>Configure <code className="bg-red-200 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> com a chave anônima</li>
                <li>Verifique se os valores não são placeholders (como "your_supabase_project_url")</li>
                <li>Reinicie o servidor de desenvolvimento</li>
              </ol>
            </div>
          </div>
          
          <div className="flex gap-3 justify-center">
            <button 
              onClick={() => window.location.reload()} 
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar Novamente
            </button>
            <button 
              onClick={() => window.open('https://supabase.com/dashboard', '_blank')} 
              className="px-6 py-3 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              Abrir Supabase
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="text-center">
        <img 
          src="/atendoslogo.png" 
          alt="Atendos IA" 
          className="h-12 w-auto mx-auto mb-6"
        />
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-indigo-600" />
          <div className="absolute inset-0 w-12 h-12 border-2 border-indigo-200 rounded-full mx-auto"></div>
        </div>
        <p className="mt-6 text-lg text-gray-700 font-medium">Carregando Atendos IA...</p>
        
        <div className="mt-6 max-w-md mx-auto">
          <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
              <span>Preparando sua experiência...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;