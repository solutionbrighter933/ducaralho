import React from 'react';
import StripeCheckout from '../components/StripeCheckout';
import { ArrowLeft, CreditCard, LogIn, Code } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../components/AuthProvider';

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading, signOut, checkSubscriptionStatus } = useAuthContext();

  // Redirect to dashboard if user is not logged in
  React.useEffect(() => {
    if (!loading && !user) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleBackToLogin = async () => {
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // Even if logout fails, redirect to login
      navigate('/', { replace: true });
    }
  };

  const handleDeveloperMode = async () => {
    try {
      // Simulate having an active subscription for developer mode
      // This bypasses the subscription check by going directly to dashboard
      console.log('🔧 Entering developer mode - bypassing subscription check');
      
      // Set developer mode flag in localStorage
      localStorage.setItem('developer_mode', 'true');
      
      // Force a page reload to trigger the AppWrapper useEffect
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Erro ao entrar no modo desenvolvedor:', error);
      // Even if there's an error, still redirect to dashboard
      localStorage.setItem('developer_mode', 'true');
      window.location.href = '/dashboard';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center">
              <img 
                src="/atendoslogo.png" 
                alt="Atendos IA" 
                className="h-8 w-auto mr-4"
              />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Planos e Preços</h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Voltar</span>
              </button>
              
              <button
                onClick={handleBackToLogin}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <LogIn className="w-5 h-5" />
                <span>Voltar para Login</span>
              </button>
            </div>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-6 mb-12">
            <div className="flex flex-col md:flex-row items-center">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-800 rounded-full flex items-center justify-center mb-4 md:mb-0 md:mr-6">
                <CreditCard className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-indigo-900 dark:text-indigo-300 mb-2">
                  Experimente o Atendos IA por 7 dias grátis
                </h2>
                <p className="text-indigo-700 dark:text-indigo-400">
                  Automatize seu atendimento com inteligência artificial, integre com o WhatsApp e Instagram, e acompanhe tudo em um dashboard completo. Cancele quando quiser, sem compromisso.
                </p>
              </div>
            </div>
          </div>

     


          <StripeCheckout
            onSuccess={() => navigate('/success')}
            onCancel={() => navigate('/dashboard')}
          />
        </div>
      </div>
    </div>
  );
};

export default PricingPage;