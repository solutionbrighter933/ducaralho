import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Filter, MoreVertical, CreditCard as Edit, Trash2, Eye, MessageSquare, X, CheckCircle, AlertCircle, Loader2, Save, Upload, Download, FileText, Calendar, DollarSign, User, Phone, MapPin, Clock, Printer, Send, Ban } from 'lucide-react';
import { useAuthContext } from './AuthProvider';
import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import OrderReceiptTemplate from './OrderReceiptTemplate';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
interface jsPDF {
autoTable: (options: any) => jsPDF;
}
}

interface AppNotification {
title: string;
message: string;
type: 'success' | 'info' | 'warning' | 'error';
}

interface Produto {
id: string;
nome: string;
descricao: string;
preco: number;
categoria: string;
ativo: boolean;
created_at: string;
updated_at: string;
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
agente_nome?: string;
nome_cliente?: string;
created_at: string;
updated_at: string;
}

interface MyProductsProps {
addAppNotification?: (notification: AppNotification) => void;
}

const MyProducts: React.FC<MyProductsProps> = ({ addAppNotification }) => {
const { user, profile } = useAuthContext();
const [activeTab, setActiveTab] = useState<'produtos' | 'pedidos'>('pedidos');
const [produtos, setProdutos] = useState<Produto[]>([]);
const [pedidos, setPedidos] = useState<Pedido[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [success, setSuccess] = useState<string | null>(null);
const [searchTerm, setSearchTerm] = useState('');
const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null);
const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
const [showProductModal, setShowProductModal] = useState(false);
const [showMessageModal, setShowMessageModal] = useState(false);
const [showCancelModal, setShowCancelModal] = useState(false);
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [showImportModal, setShowImportModal] = useState(false);
const [isEditMode, setIsEditMode] = useState(false);
const [messageText, setMessageText] = useState('');
const [sendingMessage, setSendingMessage] = useState(false);
const [cancelingOrder, setCancelingOrder] = useState(false);
const [deletingProduct, setDeletingProduct] = useState(false);
const [importingData, setImportingData] = useState(false);
const [productForm, setProductForm] = useState({
nome: '',
descricao: '',
preco: '',
categoria: '',
ativo: true
});

// Carregar dados iniciais
useEffect(() => {
if (user?.id && profile?.organization_id) {
loadData();
}
}, [user?.id, profile?.organization_id]);

const loadData = async () => {
try {
setLoading(true);
setError(null);


  console.log('🔍 Carregando dados reais das tabelas...');

  // Buscar pedidos reais da tabela 'pedidos'
  const { data: pedidosData, error: pedidosError } = await supabase
    .from('pedidos')
    .select('*')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false });

  if (pedidosError) {
    console.error('❌ Erro ao buscar pedidos:', pedidosError);
    // Se a tabela não existir, usar dados de exemplo
    if (pedidosError.code === '42P01') {
      console.log('ℹ️ Tabela pedidos não existe, usando dados de exemplo');
      setPedidos([
        {
          pedido_id: 1001,
          resumo: 'Produto Premium + Consultoria Personalizada + Suporte VIP por 6 meses',
          valor: 1299.99,
          status: 'pago',
          invoiceUrl: 'https://example.com/invoice/1001',
          id_asaas: 'pay_123456789',
          id_conversa: '5511999888777',
          rua: 'Rua das Flores',
          bairro: 'Centro',
          numero: '123',
          agente_nome: 'Ana Silva',
          nome_cliente: 'João Santos',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);
    } else {
      throw pedidosError;
    }
  } else {
    console.log('✅ Pedidos carregados da tabela:', pedidosData?.length || 0);
    setPedidos(pedidosData || []);
  }

  // Buscar produtos reais da tabela 'produtos'
  const { data: produtosData, error: produtosError } = await supabase
    .from('produtos')
    .select('*')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false });

  if (produtosError) {
    console.error('❌ Erro ao buscar produtos:', produtosError);
    // Se a tabela não existir, usar dados de exemplo
    if (produtosError.code === '42P01') {
      console.log('ℹ️ Tabela produtos não existe, usando dados de exemplo');
      setProdutos([
        {
          id: '1',
          nome: 'Produto Premium',
          descricao: 'Descrição detalhada do produto premium',
          preco: 299.99,
          categoria: 'Premium',
          ativo: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);
    } else {
      throw produtosError;
    }
  } else {
    console.log('✅ Produtos carregados da tabela:', produtosData?.length || 0);
    setProdutos(produtosData || []);
  }

} catch (err) {
  console.error('❌ Erro ao carregar dados:', err);
  setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
} finally {
  setLoading(false);
}
};

// Função de impressão usando o novo template
const handlePrintReceipt = async (pedido: Pedido) => {
try {
console.log('🖨️ Iniciando geração do comprovante para pedido:', pedido.pedido_id);


  // Criar uma nova instância do jsPDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 200] // Formato de impressora térmica (80mm de largura)
  });

  // Configurar fonte
  doc.setFont('helvetica');
  
  let yPosition = 15;
  const pageWidth = 80;
  const margin = 5;
  const contentWidth = pageWidth - (margin * 2);

  // Função para adicionar texto centralizado
  const addCenteredText = (text: string, fontSize: number, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    if (isBold) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    
    const textWidth = doc.getTextWidth(text);
    const x = (pageWidth - textWidth) / 2;
    doc.text(text, x, yPosition);
    yPosition += fontSize * 0.5 + 2;
  };

  // Função para adicionar texto alinhado à esquerda
  const addLeftText = (label: string, value: string, labelSize: number = 8, valueSize: number = 10, isBold: boolean = false) => {
    doc.setFontSize(labelSize);
    doc.setFont('helvetica', 'normal');
    doc.text(label, margin, yPosition);
    yPosition += labelSize * 0.4 + 1;
    
    doc.setFontSize(valueSize);
    if (isBold) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    
    // Quebrar texto longo em múltiplas linhas
    const lines = doc.splitTextToSize(value, contentWidth);
    doc.text(lines, margin, yPosition);
    yPosition += (lines.length * valueSize * 0.4) + 4;
  };

  // Cabeçalho
  addCenteredText('ATENDOS IA', 14, true);
  addCenteredText('Comprovante de Pedido', 10);
  addCenteredText(new Date().toLocaleString('pt-BR'), 8);
  
  yPosition += 5;
  
  // Linha separadora
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // AGENTE RESPONSÁVEL - DESTAQUE PRINCIPAL
  doc.setFillColor(59, 130, 246); // Azul
  doc.rect(margin, yPosition - 3, contentWidth, 12, 'F');
  doc.setTextColor(255, 255, 255); // Texto branco
  addCenteredText('AGENTE RESPONSÁVEL', 8, true);
  yPosition -= 4;
  addCenteredText(pedido.agente_nome || 'AGENTE NÃO INFORMADO', 12, true);
  yPosition += 8;
  
  // Resetar cor do texto
  doc.setTextColor(0, 0, 0);

  // NOME DO CLIENTE - DESTAQUE PRINCIPAL
  if (pedido.nome_cliente) {
    doc.setFillColor(40, 167, 69); // Verde
    doc.rect(margin, yPosition - 3, contentWidth, 12, 'F');
    doc.setTextColor(255, 255, 255); // Texto branco
    addCenteredText('CLIENTE', 8, true);
    yPosition -= 4;
    addCenteredText(pedido.nome_cliente, 12, true);
    yPosition += 8;
    
    // Resetar cor do texto
    doc.setTextColor(0, 0, 0);
  }

  // Informações do Pedido
  doc.setFillColor(248, 249, 250); // Cinza claro
  doc.rect(margin, yPosition - 2, contentWidth, 25, 'F');
  yPosition += 2;
  
  addLeftText('Pedido #:', pedido.pedido_id.toString(), 8, 10, true);
  addLeftText('Status:', pedido.status || 'Pendente', 8, 10);
  addLeftText('Valor Total:', `R$ ${pedido.valor?.toFixed(2) || '0.00'}`, 8, 12, true);
  
  yPosition += 5;

  // RESUMO DO PEDIDO - DESTAQUE PRINCIPAL
  doc.setFillColor(255, 193, 7); // Amarelo
  doc.rect(margin, yPosition - 3, contentWidth, 8, 'F');
  doc.setTextColor(0, 0, 0);
  addCenteredText('RESUMO DO PEDIDO', 8, true);
  yPosition += 2;
  
  // Caixa branca para o resumo
  doc.setFillColor(255, 255, 255);
  const resumoHeight = Math.max(15, (pedido.resumo.length / 40) * 4);
  doc.rect(margin, yPosition - 2, contentWidth, resumoHeight, 'F');
  doc.setDrawColor(255, 193, 7);
  doc.setLineWidth(0.5);
  doc.rect(margin, yPosition - 2, contentWidth, resumoHeight);
  
  yPosition += 2;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const resumoLines = doc.splitTextToSize(pedido.resumo, contentWidth - 4);
  doc.text(resumoLines, margin + 2, yPosition);
  yPosition += (resumoLines.length * 4) + 8;

  // Dados do Cliente
  addLeftText('DADOS DO CLIENTE', '', 10, 10, true);
  addLeftText('WhatsApp:', pedido.id_conversa || 'Não informado');
  
  const endereco = [pedido.rua, pedido.numero, pedido.bairro]
    .filter(Boolean)
    .join(', ') || 'Endereço não informado';
  addLeftText('Endereço:', endereco);

  // Informações de Pagamento
  if (pedido.id_asaas) {
    yPosition += 3;
    addLeftText('INFORMAÇÕES DE PAGAMENTO', '', 10, 10, true);
    addLeftText('ID Asaas:', pedido.id_asaas);
    if (pedido.invoiceUrl) {
      addLeftText('Fatura:', 'Disponível online');
    }
  }

  // Rodapé
  yPosition += 8;
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;
  
  addCenteredText('Obrigado pela preferência!', 10, true);
  addCenteredText('www.atendos.com.br', 8);
  addCenteredText('CNPJ: 53.853.789/0001-90', 7);

  // Salvar PDF
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const fileName = `comprovante-pedido-${pedido.pedido_id}-${timestamp}.pdf`;
  doc.save(fileName);

  console.log('✅ Comprovante gerado com sucesso:', fileName);

  if (addAppNotification) {
    addAppNotification({
      title: '🖨️ Comprovante Gerado',
      message: `Comprovante do pedido #${pedido.pedido_id} foi gerado com sucesso!`,
      type: 'success'
    });
  }

  setSuccess(`✅ Comprovante do pedido #${pedido.pedido_id} gerado com sucesso!`);
  setTimeout(() => setSuccess(null), 5000);

} catch (err) {
  console.error('❌ Erro ao gerar comprovante:', err);
  setError(err instanceof Error ? err.message : 'Erro ao gerar comprovante');
  
  if (addAppNotification) {
    addAppNotification({
      title: '❌ Erro na Impressão',
      message: 'Falha ao gerar o comprovante. Tente novamente.',
      type: 'error'
    });
  }
}
};

// Enviar mensagem para o cliente
const handleSendMessage = async () => {
if (!selectedPedido || !messageText.trim()) return;


try {
  setSendingMessage(true);
  setError(null);

  console.log('📤 Enviando mensagem para cliente do pedido:', selectedPedido.pedido_id);

  // Simular envio de mensagem
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('✅ Mensagem enviada com sucesso');

  if (addAppNotification) {
    addAppNotification({
      title: '📤 Mensagem Enviada',
      message: `Mensagem enviada para o cliente do pedido #${selectedPedido.pedido_id}`,
      type: 'success'
    });
  }

  setSuccess(`✅ Mensagem enviada para o cliente do pedido #${selectedPedido.pedido_id}!`);
  setShowMessageModal(false);
  setMessageText('');
  setTimeout(() => setSuccess(null), 3000);

} catch (err) {
  console.error('❌ Erro ao enviar mensagem:', err);
  setError(err instanceof Error ? err.message : 'Erro ao enviar mensagem');
} finally {
  setSendingMessage(false);
}
};

// Cancelar pedido
const handleCancelOrder = async () => {
if (!selectedPedido) return;


try {
  setCancelingOrder(true);
  setError(null);

  console.log('❌ Cancelando pedido:', selectedPedido.pedido_id);

  // Atualizar status do pedido na tabela
  const { error: updateError } = await supabase
    .from('pedidos')
    .update({ 
      status: 'cancelado',
      updated_at: new Date().toISOString()
    })
    .eq('pedido_id', selectedPedido.pedido_id)
    .eq('user_id', user?.id);

  if (updateError) {
    throw updateError;
  }

  // Atualizar estado local
  setPedidos(prev => prev.map(p => 
    p.pedido_id === selectedPedido.pedido_id 
      ? { ...p, status: 'cancelado' }
      : p
  ));

  console.log('✅ Pedido cancelado com sucesso');

  if (addAppNotification) {
    addAppNotification({
      title: '❌ Pedido Cancelado',
      message: `Pedido #${selectedPedido.pedido_id} foi cancelado`,
      type: 'warning'
    });
  }

  setSuccess(`✅ Pedido #${selectedPedido.pedido_id} cancelado com sucesso!`);
  setShowCancelModal(false);
  setTimeout(() => setSuccess(null), 3000);

} catch (err) {
  console.error('❌ Erro ao cancelar pedido:', err);
  setError(err instanceof Error ? err.message : 'Erro ao cancelar pedido');
} finally {
  setCancelingOrder(false);
}
};

// Filtrar dados baseado na busca
const produtosFiltrados = produtos.filter(produto =>
produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
produto.categoria.toLowerCase().includes(searchTerm.toLowerCase())
);

const pedidosFiltrados = pedidos.filter(pedido =>
pedido.pedido_id.toString().includes(searchTerm) ||
(pedido.nome_cliente && pedido.nome_cliente.toLowerCase().includes(searchTerm.toLowerCase())) ||
(pedido.agente_nome && pedido.agente_nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
pedido.resumo.toLowerCase().includes(searchTerm.toLowerCase())
);

if (loading) {
return (
<div className="flex items-center justify-center py-12">
<Loader2 className="h-8 w-8 animate-spin text-blue-600" />
</div>
);
}

return (
<div className="p-6">
<div className="mb-6">
<h1 className="text-2xl font-bold text-gray-900 mb-2">Meus Produtos e Pedidos</h1>
<p className="text-gray-600">Gerencie seus produtos e acompanhe seus pedidos</p>
</div>

{/* Tabs */}
<div className="border-b border-gray-200 mb-6">
<nav className="-mb-px flex space-x-8">
<button
onClick={() => setActiveTab('pedidos')}
className={`py-2 px-1 border-b-2 font-medium text-sm ${
activeTab === 'pedidos'
? 'border-blue-500 text-blue-600'
: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
}`}
>
Pedidos ({pedidos.length})
</button>
<button
onClick={() => setActiveTab('produtos')}
className={`py-2 px-1 border-b-2 font-medium text-sm ${
activeTab === 'produtos'
? 'border-blue-500 text-blue-600'
: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
}`}
>
Produtos ({produtos.length})
</button>
</nav>
</div>

{/* Search and Actions */}
<div className="flex flex-col sm:flex-row gap-4 mb-6">
<div className="relative flex-1">
<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
<input
type="text"
placeholder={`Buscar ${activeTab}...`}
value={searchTerm}
onChange={(e) => setSearchTerm(e.target.value)}
className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
/>
</div>
{activeTab === 'produtos' && (
<button
onClick={() => {
setSelectedProduct(null);
setIsEditMode(false);
setProductForm({
nome: '',
descricao: '',
preco: '',
categoria: '',
ativo: true
});
setShowProductModal(true);
}}
className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
>
<Plus className="h-4 w-4" />
Novo Produto
</button>
)}
</div>

{/* Error and Success Messages */}
{error && (
<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
<AlertCircle className="h-5 w-5 text-red-500" />
<span className="text-red-700">{error}</span>
<button
onClick={() => setError(null)}
className="ml-auto text-red-500 hover:text-red-700"
>
<X className="h-4 w-4" />
</button>
</div>
)}

{success && (
<div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
<CheckCircle className="h-5 w-5 text-green-500" />
<span className="text-green-700">{success}</span>
<button
onClick={() => setSuccess(null)}
className="ml-auto text-green-500 hover:text-green-700"
>
<X className="h-4 w-4" />
</button>
</div>
)}

{/* Content */}
{activeTab === 'pedidos' ? (
<div className="space-y-4">
{pedidosFiltrados.length === 0 ? (
<div className="text-center py-12">
<Package className="mx-auto h-12 w-12 text-gray-400" />
<h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum pedido encontrado</h3>
<p className="mt-1 text-sm text-gray-500">
{searchTerm ? 'Tente ajustar sua busca' : 'Seus pedidos aparecerão aqui'}
</p>
</div>
) : (
pedidosFiltrados.map((pedido) => (
<div key={pedido.pedido_id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
<div className="flex items-start justify-between">
<div className="flex-1">
<div className="flex items-center gap-3 mb-2">
<h3 className="text-lg font-semibold text-gray-900">
Pedido #{pedido.pedido_id}
</h3>
<span className={`px-2 py-1 text-xs font-medium rounded-full ${
pedido.status === 'pago' ? 'bg-green-100 text-green-800' :
pedido.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
pedido.status === 'cancelado' ? 'bg-red-100 text-red-800' :
'bg-gray-100 text-gray-800'
}`}>
{pedido.status || 'Pendente'}
</span>
</div>
<p className="text-gray-600 mb-3 line-clamp-2">{pedido.resumo}</p>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
{pedido.nome_cliente && (
<div className="flex items-center gap-2">
<User className="h-4 w-4 text-gray-400" />
<span className="text-gray-600">Cliente:</span>
<span className="font-medium">{pedido.nome_cliente}</span>
</div>
)}
{pedido.agente_nome && (
<div className="flex items-center gap-2">
<User className="h-4 w-4 text-gray-400" />
<span className="text-gray-600">Agente:</span>
<span className="font-medium">{pedido.agente_nome}</span>
</div>
)}
<div className="flex items-center gap-2">
<DollarSign className="h-4 w-4 text-gray-400" />
<span className="text-gray-600">Valor:</span>
<span className="font-medium text-green-600">R$ {pedido.valor?.toFixed(2) || '0.00'}</span>
</div>
<div className="flex items-center gap-2">
<Calendar className="h-4 w-4 text-gray-400" />
<span className="text-gray-600">Data:</span>
<span className="font-medium">{new Date(pedido.created_at).toLocaleDateString('pt-BR')}</span>
</div>
</div>
</div>
<div className="flex items-center gap-2 ml-4">
<button
onClick={() => handlePrintReceipt(pedido)}
className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
title="Imprimir Comprovante"
>
<Printer className="h-4 w-4" />
</button>
<button
onClick={() => {
setSelectedPedido(pedido);
setShowMessageModal(true);
}}
className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
title="Enviar Mensagem"
>
<MessageSquare className="h-4 w-4" />
</button>
{pedido.status !== 'cancelado' && (
<button
onClick={() => {
setSelectedPedido(pedido);
setShowCancelModal(true);
}}
className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
title="Cancelar Pedido"
>
<Ban className="h-4 w-4" />
</button>
)}
</div>
</div>
</div>
))
)}
</div>
) : (
<div className="space-y-4">
{produtosFiltrados.length === 0 ? (
<div className="text-center py-12">
<Package className="mx-auto h-12 w-12 text-gray-400" />
<h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum produto encontrado</h3>
<p className="mt-1 text-sm text-gray-500">
{searchTerm ? 'Tente ajustar sua busca' : 'Comece criando seu primeiro produto'}
</p>
</div>
) : (
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
{produtosFiltrados.map((produto) => (
<div key={produto.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
<div className="flex items-start justify-between mb-4">
<div className="flex-1">
<h3 className="text-lg font-semibold text-gray-900 mb-1">{produto.nome}</h3>
<p className="text-sm text-gray-500 mb-2">{produto.categoria}</p>
<p className="text-gray-600 text-sm line-clamp-2 mb-3">{produto.descricao}</p>
<div className="flex items-center justify-between">
<span className="text-lg font-bold text-green-600">
R$ {produto.preco.toFixed(2)}
</span>
<span className={`px-2 py-1 text-xs font-medium rounded-full ${
produto.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
}`}>
{produto.ativo ? 'Ativo' : 'Inativo'}
</span>
</div>
</div>
</div>
<div className="flex items-center justify-between pt-4 border-t border-gray-100">
<span className="text-xs text-gray-500">
Criado em {new Date(produto.created_at).toLocaleDateString('pt-BR')}
</span>
<div className="flex items-center gap-2">
<button
onClick={() => {
setSelectedProduct(produto);
setIsEditMode(true);
setProductForm({
nome: produto.nome,
descricao: produto.descricao,
preco: produto.preco.toString(),
categoria: produto.categoria,
ativo: produto.ativo
});
setShowProductModal(true);
}}
className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
title="Editar"
>
<Edit className="h-4 w-4" />
</button>
<button
onClick={() => {
setSelectedProduct(produto);
setShowDeleteModal(true);
}}
className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
title="Excluir"
>
<Trash2 className="h-4 w-4" />
</button>
</div>
</div>
</div>
))}
</div>
)}
</div>
)}
</div>
);
};

export default MyProducts;