import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit, Trash2, DollarSign, Eye, EyeOff, Volume2, VolumeX, MessageSquare, RefreshCw, Loader2, AlertCircle, CheckCircle, X, MapPin, Upload, FileSpreadsheet, Download } from 'lucide-react';
import { useAuthContext } from './AuthProvider';
import { supabase } from '../lib/supabase';
import { zapiService } from '../services/zapi.service';
import OrderReceiptTemplate from './OrderReceiptTemplate';
import * as XLSX from 'xlsx';

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
  const [printingOrderId, setPrintingOrderId] = useState<number | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);

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

  // Função para imprimir comprovante do pedido
  const printOrderReceipt = async (pedido: Pedido) => {
    try {
      setPrintingOrderId(pedido.pedido_id);
      console.log('🖨️ Iniciando impressão do comprovante para pedido:', pedido.pedido_id);

      // Criar um iframe oculto para renderizar o comprovante
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.style.width = '300px';
      iframe.style.height = '600px';
      iframe.style.border = 'none';
      
      document.body.appendChild(iframe);

      // Aguardar o iframe carregar
      await new Promise<void>((resolve) => {
        iframe.onload = () => resolve();
        iframe.src = 'about:blank';
      });

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('Não foi possível acessar o documento do iframe');
      }

      // Criar o HTML do comprovante
      const receiptHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Comprovante Pedido #${pedido.pedido_id}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.4;
              color: #000;
              background: #fff;
              padding: 10px;
              max-width: 300px;
              margin: 0 auto;
            }
            
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 8px;
              margin-bottom: 10px;
            }
            
            .header h1 {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 4px;
            }
            
            .header p {
              font-size: 10px;
              color: #666;
            }
            
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
            }
            
            .section {
              margin-bottom: 12px;
            }
            
            .section-title {
              font-weight: bold;
              display: block;
              margin-bottom: 4px;
            }
            
            .status-badge {
              background-color: ${pedido.status?.toLowerCase() === 'pago' ? '#10B981' : '#F59E0B'};
              color: white;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 10px;
            }
            
            .description-box {
              padding: 4px;
              background-color: #f5f5f5;
              border-radius: 4px;
              font-size: 11px;
            }
            
            .divider {
              border-top: 1px solid #ccc;
              padding-top: 8px;
            }
            
            .footer {
              border-top: 2px solid #000;
              padding-top: 8px;
              text-align: center;
              font-size: 10px;
              color: #666;
            }
            
            @media print {
              @page {
                size: 80mm auto;
                margin: 5mm;
              }
              
              body {
                margin: 0;
                padding: 5mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ATENDOS IA</h1>
            <p>Comprovante de Pedido</p>
          </div>

          <div class="section">
            <div class="info-row">
              <strong>Pedido #:</strong>
              <span>${pedido.pedido_id}</span>
            </div>
            
            <div class="info-row">
              <strong>Data/Hora:</strong>
              <span>${new Date().toLocaleString('pt-BR')}</span>
            </div>
            
            <div class="info-row">
              <strong>Status:</strong>
              <span class="status-badge">${pedido.status || 'Pendente'}</span>
            </div>
            
            <div class="info-row">
              <strong>Valor:</strong>
              <span style="font-size: 14px; font-weight: bold;">R$ ${pedido.valor?.toFixed(2) || '0.00'}</span>
            </div>
          </div>

          <div class="section divider">
            <span class="section-title">Descrição:</span>
            <div class="description-box">
              ${pedido.resumo}
            </div>
          </div>

          <div class="section divider">
            <span class="section-title">Cliente:</span>
            <div style="font-size: 11px;">
              <div style="margin-bottom: 2px;">
                <strong>WhatsApp:</strong> ${formatWhatsAppNumber(pedido.id_conversa)}
              </div>
              <div>
                <strong>Endereço:</strong> ${formatCustomerAddress(pedido)}
              </div>
            </div>
          </div>

          ${pedido.id_asaas ? `
          <div class="section divider">
            <span class="section-title">Pagamento:</span>
            <div style="font-size: 10px;">
              <div>ID Asaas: ${pedido.id_asaas}</div>
              ${pedido.invoiceUrl ? '<div style="margin-top: 2px;">Fatura disponível online</div>' : ''}
            </div>
          </div>
          ` : ''}

          <div class="footer">
            <p style="margin-bottom: 4px;">Obrigado pela preferência!</p>
            <p>www.atendos.com.br</p>
          </div>
        </body>
        </html>
      `;

      // Escrever o HTML no iframe
      iframeDoc.open();
      iframeDoc.write(receiptHTML);
      iframeDoc.close();

      // Aguardar um momento para o conteúdo carregar
      setTimeout(() => {
        try {
          // Acionar impressão
          iframe.contentWindow?.print();
          console.log('✅ Diálogo de impressão acionado para pedido:', pedido.pedido_id);
        } catch (printError) {
          console.error('❌ Erro ao acionar impressão:', printError);
        } finally {
          // Remover iframe após impressão
          setTimeout(() => {
            document.body.removeChild(iframe);
            setPrintingOrderId(null);
          }, 1000);
        }
      }, 500);

    } catch (err) {
      console.error('❌ Erro na impressão do comprovante:', err);
      setPrintingOrderId(null);
    }
  };

  // Função auxiliar para formatar endereço
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

    console.log('🔔 Configurando realtime para notificações e impressão automática de pedidos...');

    const channel = supabase
      .channel('pedidos_payment_notifications')
      .on(
        'postgres_changes',
        {
          event: '*', // Escutar INSERT e UPDATE
          schema: 'public',
          table: 'pedidos',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔔 Mudança detectada na tabela pedidos:', payload.eventType, payload);
          
          if (payload.eventType === 'INSERT') {
            // NOVO PEDIDO CRIADO - IMPRIMIR AUTOMATICAMENTE
            const novoPedido = payload.new as Pedido;
            console.log('🆕 Novo pedido detectado! Acionando impressão automática:', novoPedido);
            
            // Aguardar um momento para garantir que os dados estejam salvos
            setTimeout(() => {
              printOrderReceipt(novoPedido);
            }, 1000);
            
            // Notificar sobre novo pedido
            if (addAppNotification) {
              addAppNotification({
                title: '📦 Novo Pedido!',
                message: `Pedido #${novoPedido.pedido_id} criado! Comprovante sendo impresso automaticamente.`,
                type: 'info'
              });
            }
            
            // Recarregar dados
            loadPedidos();
          }
          
          if (payload.eventType === 'UPDATE') {
            // PEDIDO ATUALIZADO - VERIFICAR SE FOI PAGO
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
        }
      )
      .subscribe();

    return () => {
      console.log('🔔 Removendo canal realtime de notificações de pedidos');
      supabase.removeChannel(channel);
    };
  }, [user?.id, profile?.organization_id, addAppNotification, processedPayments]);

  // Função para imprimir comprovante manualmente
  const handleManualPrint = (pedido: Pedido) => {
    printOrderReceipt(pedido);
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

  // Função para processar arquivo Excel
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setError(null);
    setSuccess(null);

    // Verificar se é um arquivo Excel
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];

    if (!validTypes.includes(file.type)) {
      setError('Formato de arquivo não suportado. Use arquivos .xlsx, .xls ou .csv');
      return;
    }

    // Ler arquivo
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Pegar a primeira planilha
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Converter para JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length === 0) {
          setError('Planilha vazia ou sem dados válidos');
          return;
        }

        // Assumir que a primeira linha são os cabeçalhos
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1) as any[][];
        
        // Mapear dados para formato esperado
        const mappedData = rows
          .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
          .map((row, index) => {
            const produto: any = {};
            
            headers.forEach((header, headerIndex) => {
              if (header && row[headerIndex] !== undefined) {
                const normalizedHeader = header.toString().toLowerCase().trim();
                
                // Mapear colunas comuns
                if (normalizedHeader.includes('nome') || normalizedHeader.includes('produto') || normalizedHeader.includes('name')) {
                  produto.nome = row[headerIndex]?.toString() || '';
                } else if (normalizedHeader.includes('descri') || normalizedHeader.includes('description')) {
                  produto.descricao = row[headerIndex]?.toString() || '';
                } else if (normalizedHeader.includes('preco') || normalizedHeader.includes('valor') || normalizedHeader.includes('price')) {
                  const preco = parseFloat(row[headerIndex]?.toString().replace(/[^\d.,]/g, '').replace(',', '.'));
                  produto.preco = isNaN(preco) ? 0 : preco;
                } else if (normalizedHeader.includes('estoque') || normalizedHeader.includes('quantidade') || normalizedHeader.includes('stock')) {
                  const estoque = parseInt(row[headerIndex]?.toString());
                  produto.estoque = isNaN(estoque) ? 0 : estoque;
                } else {
                  // Manter outros campos como estão
                  produto[normalizedHeader] = row[headerIndex];
                }
              }
            });
            
            // Validar campos obrigatórios
            if (!produto.nome) {
              produto.nome = `Produto ${index + 1}`;
            }
            if (produto.preco === undefined) {
              produto.preco = 0;
            }
            if (produto.estoque === undefined) {
              produto.estoque = 0;
            }
            
            return produto;
          });
        
        setImportData(mappedData);
        setImportPreview(mappedData.slice(0, 5)); // Mostrar apenas os primeiros 5 para preview
        
        console.log('📊 Dados importados:', mappedData.length, 'produtos');
        console.log('📋 Preview dos dados:', mappedData.slice(0, 3));
        
      } catch (err) {
        console.error('❌ Erro ao processar arquivo:', err);
        setError('Erro ao processar arquivo. Verifique se é um arquivo Excel válido.');
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  // Função para importar produtos para o Supabase
  const handleImportProducts = async () => {
    if (!importData.length || !profile?.organization_id || !user?.id) {
      setError('Dados de importação ou usuário não encontrados');
      return;
    }

    try {
      setImportLoading(true);
      setError(null);
      setSuccess(null);

      console.log('📤 Importando', importData.length, 'produtos para o Supabase...');

      // Preparar dados para inserção
      const produtosParaInserir = importData.map(produto => ({
        nome: produto.nome || 'Produto sem nome',
        descricao: produto.descricao || '',
        preco: produto.preco || 0,
        estoque: produto.estoque || 0,
        organization_id: profile.organization_id,
        user_id: user.id
      }));

      console.log('📊 Produtos preparados para inserção:', produtosParaInserir.slice(0, 2));

      // Inserir produtos no Supabase
      const { data: produtosInseridos, error: insertError } = await supabase
        .from('produtos')
        .insert(produtosParaInserir)
        .select();

      if (insertError) {
        console.error('❌ Erro ao inserir produtos:', insertError);
        throw insertError;
      }

      console.log('✅ Produtos inseridos com sucesso:', produtosInseridos?.length);

      // Fechar modal e limpar dados
      setShowImportModal(false);
      setImportFile(null);
      setImportData([]);
      setImportPreview([]);

      // Recarregar lista de produtos
      await loadProdutos();

      setSuccess(`✅ ${produtosInseridos?.length || 0} produtos importados com sucesso!`);
      setTimeout(() => setSuccess(null), 5000);

      // Notificar sobre importação
      if (addAppNotification) {
        addAppNotification({
          title: '📦 Produtos Importados',
          message: `${produtosInseridos?.length || 0} produtos foram importados da planilha Excel com sucesso!`,
          type: 'success'
        });
      }

    } catch (err) {
      console.error('❌ Erro na importação:', err);
      setError(err instanceof Error ? err.message : 'Erro na importação de produtos');
    } finally {
      setImportLoading(false);
    }
  };

  // Função para baixar template Excel
  const downloadExcelTemplate = () => {
    // Criar dados de exemplo para o template
    const templateData = [
      ['Nome', 'Descrição', 'Preço', 'Estoque'],
      ['Produto Exemplo 1', 'Descrição do produto 1', '29.90', '100'],
      ['Produto Exemplo 2', 'Descrição do produto 2', '49.90', '50'],
      ['Produto Exemplo 3', 'Descrição do produto 3', '19.90', '200']
    ];

    // Criar workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    
    // Adicionar larguras das colunas
    ws['!cols'] = [
      { width: 25 }, // Nome
      { width: 40 }, // Descrição
      { width: 15 }, // Preço
      { width: 15 }  // Estoque
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
    
    // Baixar arquivo
    XLSX.writeFile(wb, 'template_produtos_atendos.xlsx');
    
    if (addAppNotification) {
      addAppNotification({
        title: '📥 Template Baixado',
        message: 'Template Excel baixado com sucesso! Preencha os dados e importe.',
        type: 'info'
      });
    }
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
            <>
              <button 
                onClick={openNewProductModal}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Novo Produto</span>
              </button>
              <button 
                onClick={() => setShowImportModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <Upload className="w-5 h-5" />
                <span>Importar Excel</span>
              </button>
            </>
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
                                onClick={() => handleManualPrint(pedido)}
                                disabled={printingOrderId === pedido.pedido_id}
                                className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 disabled:opacity-50"
                                title="Imprimir comprovante"
                              >
                                {printingOrderId === pedido.pedido_id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                  </svg>
                                )}
                              </button>
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

      {/* Modal de Importação Excel */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <FileSpreadsheet className="w-6 h-6 text-green-600" />
                <span>Importar Produtos do Excel</span>
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportData([]);
                  setImportPreview([]);
                }}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Instruções e Template */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">📋 Como importar produtos:</h4>
                <div className="space-y-2 text-sm text-blue-800 dark:text-blue-400">
                  <div className="flex items-start space-x-2">
                    <span className="font-bold">1.</span>
                    <div>
                      <p>Baixe o template Excel clicando no botão abaixo</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="font-bold">2.</span>
                    <p>Preencha os dados dos produtos nas colunas: <strong>Nome, Descrição, Preço, Estoque</strong></p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="font-bold">3.</span>
                    <p>Salve o arquivo e faça o upload usando o botão "Escolher Arquivo"</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="font-bold">4.</span>
                    <p>Revise os dados na prévia e clique em "Importar Produtos"</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <button
                    onClick={downloadExcelTemplate}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Template Excel</span>
                  </button>
                </div>
              </div>

              {/* Upload de Arquivo */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Selecionar Arquivo Excel
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/30 dark:file:text-indigo-300"
                    />
                  </div>
                  {importFile && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Arquivo selecionado: <strong>{importFile.name}</strong> ({(importFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              </div>

              {/* Preview dos Dados */}
              {importPreview.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      Prévia dos Dados ({importData.length} produtos encontrados)
                    </h4>
                    {importData.length > 5 && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Mostrando primeiros 5 de {importData.length}
                      </span>
                    )}
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Nome
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Descrição
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Preço
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Estoque
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {importPreview.map((produto, index) => (
                          <tr key={index}>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {produto.nome || 'N/A'}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                              {produto.descricao || 'Sem descrição'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              R$ {(produto.preco || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {produto.estoque || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {importData.length > 5 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                      ... e mais {importData.length - 5} produtos
                    </p>
                  )}
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportData([]);
                    setImportPreview([]);
                  }}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                
                <button
                  onClick={handleImportProducts}
                  disabled={importLoading || importData.length === 0}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {importLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>
                    {importLoading 
                      ? 'Importando...' 
                      : `Importar ${importData.length} Produto${importData.length !== 1 ? 's' : ''}`
                    }
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de Impressão */}
      {printingOrderId && (
        <div className="fixed bottom-4 right-4 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-50">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Imprimindo pedido #{printingOrderId}...</span>
        </div>
      )}
    </div>
  );
};

export default MyProducts;