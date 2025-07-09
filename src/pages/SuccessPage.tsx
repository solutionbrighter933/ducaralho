import React, { useEffect, useState } from 'react';
import { CheckCircle, ArrowRight, Loader2, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../components/AuthProvider';

const SuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const { checkSubscriptionStatus } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    // Wait a moment for webhook processing, then fetch subscription
    const timer = setTimeout(async () => {
      try {
        // First check auth subscription status to update the global state
        await checkSubscriptionStatus();
        
        // Then fetch detailed subscription data for this component
        const { data } = await supabase
          .from('stripe_user_subscriptions')
          .select('*')
          .maybeSingle();
        
        setSubscription(data);
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setLoading(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const getPlanName = (priceId: string) => {
    const planMap: Record<string, string> = {
      'price_1Ri0iI09PxhT9skqKkk74mf4': 'Atendos IA - Plano Básico',
    };
    return planMap[priceId] || 'Plano Premium';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            {loading ? (
              <Loader2 className="w-8 h-8 text-green-600 dark:text-green-400 animate-spin" />
            ) : (
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Pagamento Realizado com Sucesso!
          </h1>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Obrigado por escolher o Atendos IA. {subscription?.subscription_status === 'trialing' ? 'Seu período de teste gratuito foi ativado' : 'Sua assinatura foi ativada'} e você já pode começar a usar todos os recursos.
          </p>

          {loading ? (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verificando sua assinatura...</span>
              </div>
            </div>
          ) : subscription && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-green-800 dark:text-green-300 mb-2">
                Assinatura Ativada
              </h3>
              <p className="text-green-700 dark:text-green-400 text-sm">
                {getPlanName(subscription.price_id)} {subscription.subscription_status === 'trialing' ? '(Período de Teste Gratuito)' : ''}
              </p>
              <p className="text-green-600 dark:text-green-500 text-xs mt-1">
                Status: {subscription.subscription_status === 'trialing' ? 'Período de Teste Gratuito' : 
                        (subscription.subscription_status === 'active' ? 'Ativa' : subscription.subscription_status)}
                {subscription.subscription_status === 'trialing' && subscription.current_period_end && 
                  ` (até ${new Date(subscription.current_period_end * 1000).toLocaleDateString('pt-BR')})`}
              </p>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
              <CreditCard className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">
                Sua assinatura foi ativada com sucesso. Você já pode acessar todos os recursos do Atendos IA.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <span>Ir para o Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigate('/ai-training')}
              className="w-full px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Configurar IA
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Você receberá um email de confirmação em breve com os detalhes da sua assinatura.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessPage;