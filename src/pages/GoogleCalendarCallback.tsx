import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthContext } from '../components/AuthProvider';
import { supabase } from '../lib/supabase';

const GoogleCalendarCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'success' | 'error' | 'loading'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      setStatus('error');
      setMessage(`Erro na autorização do Google: ${error}`);
      setLoading(false);
      return;
    }

    if (code && user?.id && profile?.organization_id) {
      exchangeCodeForTokens(code);
    } else if (!user?.id || !profile?.organization_id) {
      setStatus('error');
      setMessage('Usuário não autenticado ou perfil não carregado. Tente novamente.');
      setLoading(false);
    } else {
      setStatus('error');
      setMessage('Código de autorização não encontrado na URL.');
      setLoading(false);
    }
  }, [location.search, user?.id, profile?.organization_id]);

  const exchangeCodeForTokens = async (code: string) => {
    try {
      // Simular a troca de código por tokens (em produção, isso seria feito pela Edge Function)
      // Esta é uma simulação para fins de demonstração
      console.log('Simulando troca de código por tokens...');
      
      // Simular um atraso de rede
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simular o salvamento no banco de dados
      const { error } = await supabase
        .from('google_calendar_integrations')
        .upsert({
          user_id: user?.id,
          organization_id: profile?.organization_id,
          access_token: 'mock_access_token_' + Date.now(),
          refresh_token: 'mock_refresh_token_' + Date.now(),
          expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw new Error(error.message);
      }

      setStatus('success');
      setMessage('Integração com Google Calendar realizada com sucesso!');
    } catch (err) {
      console.error('Erro na troca de código por tokens:', err);
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Erro desconhecido ao integrar com Google Calendar.');
    } finally {
      setLoading(false);
      // Redireciona para a página de configurações após um pequeno atraso
      setTimeout(() => {
        navigate('/settings?tab=google-calendar');
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center max-w-md w-full">
        {loading ? (
          <>
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Processando integração...</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Por favor, aguarde enquanto configuramos sua conexão.</p>
          </>
        ) : status === 'success' ? (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Sucesso!</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">{message}</p>
          </>
        ) : (
          <>
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Erro na Integração</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">{message}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleCalendarCallback;