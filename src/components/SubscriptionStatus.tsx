import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from './AuthProvider';
import { CreditCard, Calendar, AlertCircle, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SubscriptionData {
  subscription_status: string;
  price_id: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  payment_method_brand: string;
  payment_method_last4: string;
}

const SubscriptionStatus: React.FC = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSubscription();
    }
  }, [user]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      setSubscription(data);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar assinatura');
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setCancelLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Você precisa estar logado para gerenciar sua assinatura');
      }
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle specific Stripe configuration error
        if (errorData.error && errorData.error.includes('No configuration provided')) {
          throw new Error('O portal de gerenciamento de assinatura ainda não foi configurado. Entre em contato com o suporte.');
        }
        
        throw new Error(errorData.error || 'Falha ao criar sessão do portal');
      }
      
      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('URL do portal não recebida');
      }
    } catch (err) {
      console.error('Erro ao gerenciar assinatura:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setCancelLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 dark:text-green-400';
      case 'trialing':
        return 'text-blue-600 dark:text-blue-400';
      case 'past_due':
      case 'unpaid':
        return 'text-red-600 dark:text-red-400';
      case 'canceled':
        return 'text-gray-600 dark:text-gray-400';
      default:
        return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativa';
      case 'trialing':
        return 'Período de Teste Gratuito';
      case 'past_due':
        return 'Pagamento em Atraso';
      case 'unpaid':
        return 'Não Pago';
      case 'canceled':
        return 'Cancelada';
      case 'incomplete':
        return 'Incompleta';
      case 'not_started':
        return 'Não Iniciada';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'trialing':
        return <CheckCircle className="w-5 h-5" />;
      case 'past_due':
      case 'unpaid':
      case 'canceled':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  const getPlanName = (priceId: string) => {
    const planMap: Record<string, string> = {
      'price_1Ri0FK09PxhT9skqmRPwZNCa': 'Atendos IA Starter',
      'price_1Rkur809PxhT9skqT19kNwd9': 'Atendos IA Plus',
      'price_1Rkurd09PxhT9skqA4v4IUHN': 'Atendos IA Pro'
    };
    return planMap[priceId] || 'Plano Desconhecido';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Carregando assinatura...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!subscription || subscription.subscription_status === 'not_started') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-8">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Nenhuma Assinatura Ativa
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Você ainda não possui uma assinatura ativa. Escolha um plano para começar.
          </p>
          <button
            onClick={() => navigate('/pricing')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Ver Planos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Status da Assinatura
        </h3>
        <button
          onClick={fetchSubscription}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Atualizar"
        >
          <Loader2 className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Plano:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {getPlanName(subscription.price_id)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Status:</span>
          <div className={`flex items-center space-x-2 ${getStatusColor(subscription.subscription_status)}`}>
            {getStatusIcon(subscription.subscription_status)}
            <span className="font-medium">
              {getStatusText(subscription.subscription_status)}
            </span>
          </div>
        </div>

        {subscription.subscription_status === 'trialing' && subscription.current_period_end && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-4">
            <div className="flex items-center space-x-2 text-blue-800 dark:text-blue-300">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">
                Seu período de teste gratuito termina em {formatDate(subscription.current_period_end)}
              </span>
            </div>
          </div>
        )}

        {subscription.current_period_start && subscription.current_period_end && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Período:</span>
            <div className="text-right">
              <div className="font-medium text-gray-900 dark:text-white">
                {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Próxima cobrança: {formatDate(subscription.current_period_end)}
              </div>
            </div>
          </div>
        )}

        {subscription.payment_method_brand && subscription.payment_method_last4 && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Método de Pagamento:</span>
            <div className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-gray-900 dark:text-white">
                {subscription.payment_method_brand.toUpperCase()} •••• {subscription.payment_method_last4}
              </span>
            </div>
          </div>
        )}

        {subscription.cancel_at_period_end && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-yellow-800 dark:text-yellow-300">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">
                Sua assinatura será cancelada no final do período atual
              </span>
            </div>
          </div>
        )}
        
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleManageSubscription}
            disabled={cancelLoading}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
          >
            {cancelLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            <span>
              {cancelLoading ? 'Processando...' : 'Gerenciar Assinatura'}
            </span>
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default SubscriptionStatus;