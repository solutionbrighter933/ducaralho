import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit, Trash2, DollarSign, Eye, MessageSquare, RefreshCw, Loader2, AlertCircle, CheckCircle, X, MapPin } from 'lucide-react';
import { useAuthContext } from './AuthProvider';
import { supabase } from '../lib/supabase';
import { zapiService } from '../services/zapi.service';

interface Produto {
  id: number;
  nome: string;
  descricao: string;
  preco: number;
  estoque: number;
  organization_id: string;
  user_id: string;
}

interface Pedido {
  pedido_id: number;
  resumo: string;
  valor: number;
  status: string;
  invoiceUrl: string;
  id_asaas: string;
  id_conversa: string;
  rua?: string;
  bairro?: string;
  numero?: string;
}

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
}

interface MyProductsProps {
  addAppNotification?: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
}

const MyProducts: React.FC<MyProductsProps> = ({ addAppNotification }) => {
  const { user, profile } = useAuthContext();
  const [activeTab, setActiveTab] = useState<'produtos' | 'pedidos'>('pedidos');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteProductModal, setShowDeleteProductModal] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [cancelMessage, setCancelMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [cancelingOrder, setCancelingOrder] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(false);
  const [dismissedPaidAlerts, setDismissedPaidAlerts] = useState<Set<number>>(new Set());
  const [processedPayments, setProcessedPayments] = useState<Set<number>>(new Set());
  const [productForm, setProductForm] = useState({
    nome: '',
    descricao: '',
    preco: 0,
    estoque: 0
  });

  // Carregar alertas já dispensados do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dismissedPaidAlerts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDismissedPaidAlerts(new Set(parsed));
      } catch (e) {
        console.warn('Erro ao carregar alertas dispensados:', e);
      }
    }
  }, []);

  // Salvar alertas dispensados no localStorage
  const saveDismissedAlerts = (alerts: Set<number>) => {
    localStorage.setItem('dismissedPaidAlerts', JSON.stringify(Array.from(alerts)));
  };

  // Função para carregar pedidos
  const loadPedidos = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id || !profile?.organization_id) {
        throw new Error('Usuário ou organização não encontrados');
      }

      console.log('📦 Carregando pedidos...');

      const { data: pedidosData, error: pedidosError } = await supabase
        .from('pedidos')
        .select('pedido_id, resumo, valor, status, invoiceUrl, id_asaas, id_conversa, rua, bairro, numero')
        .eq('user_id', user.id)
        .eq('organization_id', profile.organization_id)
        .order('pedido_id', { ascending: false });

      if (pedidosError) {
        console.error('❌ Erro ao buscar pedidos:', pedidosError);
        throw pedidosError;
      }

      console.log('✅ Pedidos carregados:', pedidosData?.length || 0);
      setPedidos(pedidosData || []);

    } catch (err) {
      console.error('❌ Erro ao carregar pedidos:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Função para carregar produtos
  const loadProdutos = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id || !profile?.organization_id) {
        throw new Error('Usuário ou organização não encontrados');
      }

      console.log('📦 Carregando produtos...');

      const { data: produtosData, error: produtosError } = await supabase
        .from('produtos')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', profile.organization_id)
        .order('id', { ascending: false });

      if (produtosError) {
        console.error('❌ Erro ao buscar produtos:', produtosError);
        throw produtosError;
      }

      console.log('✅ Produtos carregados:', produtosData?.length || 0);
      setProdutos(produtosData || []);

    } catch (err) {
      console.error('❌ Erro ao carregar produtos:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    if (user?.id && profile?.organization_id) {
      if (activeTab === 'produtos') {
        loadProdutos();
      } else {
        loadPedidos();
      }
    }
  }, [user?.id, profile?.organization_id, activeTab]);

  // Configurar realtime para monitorar mudanças na tabela pedidos
  useEffect(() => {
    if (!user?.id || !profile?.organization_id) return;

    console.log('🔔 Configurando realtime para notificações de pedidos pagos...');

    const channel = supabase
      .channel('pedidos_payment_notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pedidos',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔔 Mudança detectada na tabela pedidos:', payload);
          
          const pedidoAtualizado = payload.new as Pedido;
          const pedidoAnterior = payload.old as Pedido;
          
          // Verificar se o status mudou para "pago"
          if (pedidoAtualizado.status?.toLowerCase() === 'pago' && 
              pedidoAnterior.status?.toLowerCase() !== 'pago' &&
              !processedPayments.has(pedidoAtualizado.pedido_id)) {
            
            console.log('🎉 Pedido foi pago! Enviando notificação...', pedidoAtualizado);
            
            // Marcar como processado para evitar duplicatas
            setProcessedPayments(prev => new Set(prev).add(pedidoAtualizado.pedido_id));
            
            // Enviar notificação
            if (addAppNotification) {
              addAppNotification({
                title: '🎉 Pedido Pago!',
                message: `Pedido #${pedidoAtualizado.pedido_id} foi pago e já pode ser preparado! Cliente: ${formatWhatsAppNumber(pedidoAtualizado.id_conversa)}`,
                type: 'success'
              });
            }
            
            // Recarregar dados para mostrar o status atualizado
            loadPedidos();
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔔 Removendo canal realtime de notificações de pedidos');
      supabase.removeChannel(channel);
    };
  }, [user?.id, profile?.organization_id, addAppNotification, processedPayments]);

  // Função para formatar endereço do cliente
  const formatCustomerAddress = (pedido: Pedido): string => {
    const { rua, numero, bairro } = pedido;
    
    if (!rua && !numero && !bairro) {
      return 'Endereço não informado';
    }
    
    const parts = [];
    
    if (rua) {
      if (numero) {
        parts.push(`${rua}, ${numero}`);
      } else {
        parts.push(rua);
      }
    } else if (numero) {
      parts.push(`Nº ${numero}`);
    }
    
    if (bairro) {
      parts.push(bairro);
    }
    
    return parts.join(' - ');
  };

  // Função para dispensar alerta de pedido pago
  const dismissPaidAlert = (pedidoId: number) => {
    const newDismissed = new Set(dismissedPaidAlerts);
    newDismissed.add(pedidoId);
    setDismissedPaidAlerts(newDismissed);
    saveDismissedAlerts(newDismissed);
  };

  // Função para abrir modal de mensagem personalizada
  const openMessageModal = (pedido: Pedido, isPaidAlert: boolean = false) => {
    setSelectedPedido(pedido);
    
    if (isPaidAlert) {
      setCustomMessage(`🎉 Ótima notícia! Seu pedido #${pedido.pedido_id} foi confirmado e está sendo preparado! Em breve nosso motoboy estará a caminho para a entrega. Obrigado pela preferência! 🚀`);
    } else {
      setCustomMessage(`Olá! Sobre seu pedido #${pedido.pedido_id} (${pedido.resumo}), gostaria de informar que...`);
    }
    
    setShowMessageModal(true);
  };

  // Função para abrir modal de cancelamento
  const openCancelModal = (pedido: Pedido) => {
    setSelectedPedido(pedido);
    setCancelMessage(`Olá! Infelizmente precisamos cancelar seu pedido #${pedido.pedido_id} (${pedido.resumo}). Pedimos desculpas pelo inconveniente. Se tiver dúvidas, estamos à disposição para esclarecer.`);
    setShowCancelModal(true);
  };

  // Função para enviar mensagem personalizada
  const sendCustomMessage = async () => {
    if (!selectedPedido || !customMessage.trim()) {
      setError('Pedido ou mensagem não selecionados');
      return;
    }

    try {
      setSendingMessage(true);
      setError(null);

      // Verificar se Z-API está configurada
      if (!zapiService.isConfigured()) {
        throw new Error('Z-API não configurada. Configure em Configurações > Integração Z-API');
      }

      const numeroCliente = selectedPedido.id_conversa;
      if (!numeroCliente) {
        throw new Error('Número do cliente não encontrado no pedido');
      }

      console.log(`📤 Enviando mensagem personalizada para ${numeroCliente}...`);

      const result = await zapiService.sendTextMessage(numeroCliente, customMessage.trim());

      if (!result.success) {
        throw new Error(result.error || 'Falha ao enviar mensagem');
      }

      setSuccess('✅ Mensagem enviada com sucesso!');
      setShowMessageModal(false);
      setCustomMessage('');
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      console.error('❌ Erro ao enviar mensagem:', err);
      setError(err instanceof Error ? err.message : 'Erro ao enviar mensagem');
    } finally {
      setSendingMessage(false);
    }
  };

  // Função para cancelar pedido
  const cancelOrder = async () => {
    if (!selectedPedido) {
      setError('Pedido não selecionado');
      return;
    }

    try {
      setCancelingOrder(true);
      setError(null);

      console.log(`🗑️ Cancelando pedido ${selectedPedido.pedido_id}...`);

      // Excluir pedido da tabela
      const { error: deleteError } = await supabase
        .from('pedidos')
        .delete()
        .eq('pedido_id', selectedPedido.pedido_id)
        .eq('user_id', user?.id)
        .eq('organization_id', profile?.organization_id);

      if (deleteError) {
        console.error('❌ Erro ao excluir pedido:', deleteError);
        throw deleteError;
      }

      console.log('✅ Pedido excluído com sucesso');

      // Enviar mensagem de cancelamento se fornecida
      if (cancelMessage.trim() && zapiService.isConfigured()) {
        try {
          const numeroCliente = selectedPedido.id_conversa;
          if (numeroCliente) {
            console.log(`📤 Enviando mensagem de cancelamento para ${numeroCliente}...`);
            
            const result = await zapiService.sendTextMessage(numeroCliente, cancelMessage.trim());
            
            if (result.success) {
              console.log('✅ Mensagem de cancelamento enviada');
            } else {
              console.warn('⚠️ Falha ao enviar mensagem de cancelamento:', result.error);
            }
          }
        } catch (msgError) {
          console.warn('⚠️ Erro ao enviar mensagem de cancelamento:', msgError);
          // Não falhar a operação principal se a mensagem falhar
        }
      }

      setSuccess('✅ Pedido cancelado com sucesso!');
      setShowCancelModal(false);
      setCancelMessage('');
      
      // Recarregar pedidos
      await loadPedidos();
      
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      console.error('❌ Erro ao cancelar pedido:', err);
      setError(err instanceof Error ? err.message : 'Erro ao cancelar pedido');
    } finally {
      setCancelingOrder(false);
    }
  };

  // Função para salvar produto
  const saveProduto = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id || !profile?.organization_id) {
        throw new Error('Usuário ou organização não encontrados');
      }

      if (selectedProduct) {
        // Atualizar produto existente
        const { error: updateError } = await supabase
          .from('produtos')
          .update({
            ...productForm
          })
          .eq('id', selectedProduct.id)
          .eq('user_id', user.id)
          .eq('organization_id', profile.organization_id);

        if (updateError) {
          throw updateError;
        }

        setSuccess('Produto atualizado com sucesso!');
      } else {
        // Criar novo produto
        const { error: saveError } = await supabase
          .from('produtos')
          .insert({
            ...productForm,
            user_id: user.id,
            organization_id: profile.organization_id
          });

        if (saveError) {
          throw saveError;
        }

        setSuccess('Produto salvo com sucesso!');
      }

      setShowProductModal(false);
      setSelectedProduct(null);
      setProductForm({ nome: '', descricao: '', preco: 0, estoque: 0 });
      await loadProdutos();
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      console.error('❌ Erro ao salvar produto:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar produto');
    } finally {
      setLoading(false);
    }
  };

  // Função para abrir modal de edição de produto
  const openEditProductModal = (produto: Produto) => {
    setSelectedProduct(produto);
    setProductForm({
      nome: produto.nome,
      descricao: produto.descricao,
      preco: produto.preco,
      estoque: produto.estoque
    });
    setShowProductModal(true);
  };

  // Função para abrir modal de exclusão de produto
  const openDeleteProductModal = (produto: Produto) => {
    setSelectedProduct(produto);
    setShowDeleteProductModal(true);
  };

  // Função para excluir produto
  const deleteProduto = async () => {
    if (!selectedProduct) {
      setError('Produto não selecionado');
      return;
    }

    try {
      setDeletingProduct(true);
      setError(null);

      console.log(`🗑️ Excluindo produto ${selectedProduct.id}...`);

      const { error: deleteError } = await supabase
        .from('produtos')
        .delete()
        .eq('id', selectedProduct.id)
        .eq('user_id', user?.id)
        .eq('organization_id', profile?.organization_id);

      if (deleteError) {
        console.error('❌ Erro ao excluir produto:', deleteError);
        throw deleteError;
      }

      console.log('✅ Produto excluído com sucesso');

      setSuccess('Produto excluído com sucesso!');
      setShowDeleteProductModal(false);
      setSelectedProduct(null);
      
      // Recarregar produtos
      await loadProdutos();
      
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      console.error('❌ Erro ao excluir produto:', err);
      setError(err instanceof Error ? err.message : 'Erro ao excluir produto');
    } finally {
      setDeletingProduct(false);
    }
  };

  // Função para limpar formulário e abrir modal para novo produto
  const openNewProductModal = () => {
    setSelectedProduct(null);
    setProductForm({ nome: '', descricao: '', preco: 0, estoque: 0 });
    setShowProductModal(true);
  };

  // Função para formatar número de WhatsApp
  const formatWhatsAppNumber = (numero: string): string => {
    if (!numero) return '';
    
    // Remove caracteres não numéricos
    const clean = numero.replace(/\D/g, '');
    
    // Formato brasileiro: +55 (11) 99999-9999
    if (clean.length >= 10) {
      const countryCode = clean.substring(0, 2);
      const areaCode = clean.substring(2, 4);
      const firstPart = clean.substring(4, clean.length - 4);
      const lastPart = clean.substring(clean.length - 4);
      
      return `+${countryCode} (${areaCode}) ${firstPart}-${lastPart}`;
    }
    
    return numero;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Smart Delivery</h1>
        <div className="flex space-x-3">
          <button 
            onClick={activeTab === 'produtos' ? loadProdutos : loadPedidos}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Atualizando...' : 'Atualizar Dados'}</span>
          </button>
          {activeTab === 'produtos' && (
            <button 
              onClick={openNewProductModal}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Novo Produto</span>
            </button>
          )}
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-green-700 dark:text-green-300">{success}</p>
            </div>
            <button 
              onClick={() => setSuccess(null)}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Alertas de Pedidos Pagos */}
      {pedidos
        .filter(pedido => pedido.status?.toLowerCase() === 'pago' && !dismissedPaidAlerts.has(pedido.pedido_id))
        .map(pedido => (
          <div key={`paid-alert-${pedido.pedido_id}`} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-green-800 dark:text-green-300 mb-1">
                    🎉 Pedido foi pago! Pode preparar e mandar o motoboy para entregar! Seu cliente já foi avisado!
                  </h3>
                  <p className="text-green-700 dark:text-green-400 text-sm mb-2">
                    <strong>Pedido #{pedido.pedido_id}</strong> - {pedido.resumo} - R$ {pedido.valor?.toFixed(2)}
                  </p>
                  <p className="text-green-600 dark:text-green-500 text-sm">
                    <strong>Cliente:</strong> {formatWhatsAppNumber(pedido.id_conversa)}
                  </p>
                  {(pedido.rua || pedido.bairro || pedido.numero) && (
                    <p className="text-green-600 dark:text-green-500 text-sm mt-1">
                      <strong>Endereço:</strong> {formatCustomerAddress(pedido)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => openMessageModal(pedido, true)}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                >
                  Enviar mensagem personalizada
                </button>
                <button
                  onClick={() => dismissPaidAlert(pedido.pedido_id)}
                  className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('pedidos')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'pedidos'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Pedidos
            </button>
            <button
              onClick={() => setActiveTab('produtos')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'produtos'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Produtos
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'pedidos' ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Pedidos</h2>
              
              {pedidos.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Resumo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Valor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          WhatsApp
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Endereço
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {pedidos.map((pedido) => (
                        <tr key={pedido.pedido_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            #{pedido.pedido_id}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                            <div className="max-w-xs">
                              <p className="truncate">{pedido.resumo}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            R$ {pedido.valor?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              pedido.status?.toLowerCase() === 'pago' 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                : pedido.status?.toLowerCase() === 'pendente'
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                            }`}>
                              {pedido.status || 'Indefinido'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                            <div className="max-w-xs">
                              <p className="font-medium">{formatWhatsAppNumber(pedido.id_conversa)}</p>
                              <p className="text-gray-500 dark:text-gray-400 text-xs">Cliente</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                            <div className="max-w-xs">
                              <p className="font-medium">{formatCustomerAddress(pedido)}</p>
                              <p className="text-gray-500 dark:text-gray-400 text-xs">Endereço de entrega</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <div className="flex space-x-2">
                              {pedido.invoiceUrl && (
                                <a
                                  href={pedido.invoiceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                  title="Ver fatura"
                                >
                                  <Eye className="w-4 h-4" />
                                </a>
                              )}
                              <button
                                onClick={() => openMessageModal(pedido)}
                                className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                                title="Enviar mensagem"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openCancelModal(pedido)}
                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                                title="Cancelar pedido"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhum pedido encontrado</h3>
                  <p className="text-gray-500 dark:text-gray-400">Os pedidos aparecerão aqui quando forem criados.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Produtos</h2>
              
              {produtos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {produtos.map((produto) => (
                    <div key={produto.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{produto.nome}</h3>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => openEditProductModal(produto)}
                            className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                            title="Editar produto"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => openDeleteProductModal(produto)}
                            className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            title="Excluir produto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">{produto.descricao}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                          R$ {produto.preco.toFixed(2)}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Estoque: {produto.estoque}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhum produto encontrado</h3>
                  <p className="text-gray-500 dark:text-gray-400">Adicione produtos para começar a vender.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Mensagem Personalizada */}
      {showMessageModal && selectedPedido && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Enviar Mensagem Personalizada
              </h3>
              <button
                onClick={() => setShowMessageModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-blue-800 dark:text-blue-300 text-sm">
                  <strong>Pedido:</strong> #{selectedPedido.pedido_id} - {selectedPedido.resumo}
                </p>
                <p className="text-blue-700 dark:text-blue-400 text-sm">
                  <strong>Cliente:</strong> {formatWhatsAppNumber(selectedPedido.id_conversa)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mensagem
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Digite sua mensagem personalizada..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={sendCustomMessage}
                  disabled={!customMessage.trim() || sendingMessage}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {sendingMessage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageSquare className="w-4 h-4" />
                  )}
                  <span>{sendingMessage ? 'Enviando...' : 'Enviar Mensagem'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cancelamento de Pedido */}
      {showCancelModal && selectedPedido && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Cancelar Pedido
              </h3>
              <button
                onClick={() => setShowCancelModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <p className="text-red-800 dark:text-red-300 font-medium">
                    Atenção: Esta ação não pode ser desfeita!
                  </p>
                </div>
                <p className="text-red-700 dark:text-red-400 text-sm mt-2">
                  O pedido será excluído permanentemente do sistema.
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                <p className="text-gray-800 dark:text-gray-300 text-sm">
                  <strong>Pedido:</strong> #{selectedPedido.pedido_id} - {selectedPedido.resumo}
                </p>
                <p className="text-gray-700 dark:text-gray-400 text-sm">
                  <strong>Valor:</strong> R$ {selectedPedido.valor?.toFixed(2)}
                </p>
                <p className="text-gray-700 dark:text-gray-400 text-sm">
                  <strong>Cliente:</strong> {formatWhatsAppNumber(selectedPedido.id_conversa)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mensagem de cancelamento (opcional)
                </label>
                <textarea
                  value={cancelMessage}
                  onChange={(e) => setCancelMessage(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Mensagem para notificar o cliente sobre o cancelamento..."
                />
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  Se preenchida, será enviada automaticamente para o cliente via WhatsApp
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={cancelOrder}
                  disabled={cancelingOrder}
                  className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {cancelingOrder ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>{cancelingOrder ? 'Cancelando...' : 'Confirmar Cancelamento'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exclusão de Produto */}
      {showDeleteProductModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Excluir Produto
              </h3>
              <button
                onClick={() => setShowDeleteProductModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <p className="text-red-800 dark:text-red-300 font-medium">
                    Atenção: Esta ação não pode ser desfeita!
                  </p>
                </div>
                <p className="text-red-700 dark:text-red-400 text-sm mt-2">
                  O produto será excluído permanentemente do sistema.
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                <p className="text-gray-800 dark:text-gray-300 text-sm">
                  <strong>Produto:</strong> {selectedProduct.nome}
                </p>
                <p className="text-gray-700 dark:text-gray-400 text-sm">
                  <strong>Preço:</strong> R$ {selectedProduct.preco.toFixed(2)}
                </p>
                <p className="text-gray-700 dark:text-gray-400 text-sm">
                  <strong>Estoque:</strong> {selectedProduct.estoque} unidades
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowDeleteProductModal(false)}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={deleteProduto}
                  disabled={deletingProduct}
                  className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {deletingProduct ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>{deletingProduct ? 'Excluindo...' : 'Confirmar Exclusão'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Produto */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedProduct ? 'Editar Produto' : 'Novo Produto'}
              </h3>
              <button
                onClick={() => {
                  setShowProductModal(false);
                  setSelectedProduct(null);
                  setProductForm({ nome: '', descricao: '', preco: 0, estoque: 0 });
                }}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome do Produto
                </label>
                <input
                  type="text"
                  value={productForm.nome}
                  onChange={(e) => setProductForm(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Nome do produto"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descrição
                </label>
                <textarea
                  value={productForm.descricao}
                  onChange={(e) => setProductForm(prev => ({ ...prev, descricao: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Descrição do produto"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Preço
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.preco}
                    onChange={(e) => setProductForm(prev => ({ ...prev, preco: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Estoque
                  </label>
                  <input
                    type="number"
                    value={productForm.estoque}
                    onChange={(e) => setProductForm(prev => ({ ...prev, estoque: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowProductModal(false);
                    setSelectedProduct(null);
                    setProductForm({ nome: '', descricao: '', preco: 0, estoque: 0 });
                  }}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveProduto}
                  disabled={loading || !productForm.nome.trim()}
                  className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>{loading ? 'Salvando...' : selectedProduct ? 'Atualizar Produto' : 'Salvar Produto'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProducts;