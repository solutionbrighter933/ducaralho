import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '../lib/supabase';
import { products } from '../stripe-config';
import { Loader2, CreditCard, Check, Star, ArrowRight, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface StripeCheckoutProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const StripeCheckout: React.FC<StripeCheckoutProps> = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async (priceId: string, mode: 'payment' | 'subscription', trialDays?: number) => {
    try {
      setLoading(priceId);
      setError(null);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.error('❌ Auth session error:', sessionError);
        throw new Error('Você precisa estar logado para assinar um plano');
      }

      console.log('🔄 Creating checkout session for price:', priceId);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          price_id: priceId,
          mode,
          success_url: `https://www.atendos.com.br/success`,
          cancel_url: `https://www.atendos.com.br/pricing`,
          trial_days: trialDays ? Number(trialDays) : undefined
        }),
      });

      if (!response.ok) {
        console.error('❌ Checkout API error:', response.status, response.statusText);
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao criar sessão de checkout');
      }

      const { url } = await response.json();
      
      if (url) {
        console.log('✅ Redirecting to Stripe checkout:', url);
        window.location.href = url;
      } else {
        throw new Error('URL de checkout não recebida');
      }
    } catch (err) {
      console.error('Erro no checkout:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(null);
    }
  };


  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Escolha seu Plano
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Selecione o plano que melhor atende às suas necessidades
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => {
          const isPopular = product.popular === true;
          
          return (
          <div
            key={product.priceId}
            className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-sm ${
              isPopular 
                ? 'border-2 border-indigo-500 dark:border-indigo-400' 
                : 'border border-gray-200 dark:border-gray-700'
            } p-6 hover:shadow-md transition-all transform hover:-translate-y-1`}
          >
            {isPopular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full flex items-center space-x-1">
                  <Star className="w-3 h-3" />
                  <span>MAIS POPULAR</span>
                </div>
              </div>
            )}
            
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {product.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {product.description}
              </p>
              <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-4">
                {product.price}
              </div>
              {product.trialDays && (
                <div className="mb-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 py-1 px-3 rounded-full text-sm font-medium inline-flex items-center">
                  <Zap className="w-3 h-3 mr-1" />
                  {product.trialDays} dias grátis
                </div>
              )}
              
              <div className="space-y-3 mb-6 text-left">
                {product.features.map((feature, index) => (
                  <div 
                    key={index} 
                    className="flex items-start text-sm text-gray-600 dark:text-gray-400"
                  >
                    <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
                {/* <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Dashboard completo</span>
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  <span>Suporte técnico</span>
                </div>
                */}
              </div>

              <button
                onClick={() => handleCheckout(product.priceId, product.mode, product.trialDays)}
                disabled={loading === product.priceId}
                className={`w-full flex items-center justify-center space-x-2 px-6 py-3 ${
                  isPopular 
                    ? 'bg-indigo-600 hover:bg-indigo-700' 
                    : 'bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600'
                } text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === product.priceId ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ArrowRight className="w-5 h-5" />
                )}
                <span>{loading === product.priceId ? 'Processando...' : 'Começar Agora'}</span>
              </button>
            </div>
          </div>
        )})}
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mt-8">
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <CreditCard className="w-4 h-4" />
            <p>Experimente grátis por 7 dias. Cancele quando quiser.</p>
          </div>
          <p>Pagamento seguro processado pelo Stripe</p>
          <p>Sem compromisso. Sem taxas adicionais.</p>
        </div>
      </div>
    </div>
  );
};

export default StripeCheckout;