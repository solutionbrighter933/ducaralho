import React from 'react';

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

interface OrderReceiptTemplateProps {
  pedido: Pedido;
  timestamp?: string;
}

const OrderReceiptTemplate: React.FC<OrderReceiptTemplateProps> = ({ pedido, timestamp }) => {
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

  const formatWhatsAppNumber = (numero: string): string => {
    if (!numero) return '';
    
    const clean = numero.replace(/\D/g, '');
    
    if (clean.length >= 10) {
      const countryCode = clean.substring(0, 2);
      const areaCode = clean.substring(2, 4);
      const firstPart = clean.substring(4, clean.length - 4);
      const lastPart = clean.substring(clean.length - 4);
      
      return `+${countryCode} (${areaCode}) ${firstPart}-${lastPart}`;
    }
    
    return numero;
  };

  const currentDateTime = timestamp || new Date().toLocaleString('pt-BR');

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      lineHeight: '1.4',
      color: '#000',
      backgroundColor: '#fff',
      padding: '10px',
      maxWidth: '300px',
      margin: '0 auto'
    }}>
      {/* Cabeçalho */}
      <div style={{
        textAlign: 'center',
        borderBottom: '2px solid #000',
        paddingBottom: '8px',
        marginBottom: '10px'
      }}>
        <h1 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          margin: '0 0 4px 0'
        }}>
          ATENDOS IA
        </h1>
        <p style={{
          fontSize: '10px',
          margin: '0',
          color: '#666'
        }}>
          Comprovante de Pedido
        </p>
      </div>

      {/* Informações do Pedido */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '4px'
        }}>
          <strong>Pedido #:</strong>
          <span>{pedido.pedido_id}</span>
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '4px'
        }}>
          <strong>Data/Hora:</strong>
          <span>{currentDateTime}</span>
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '4px'
        }}>
          <strong>Status:</strong>
          <span style={{
            backgroundColor: pedido.status?.toLowerCase() === 'pago' ? '#10B981' : '#F59E0B',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px'
          }}>
            {pedido.status || 'Pendente'}
          </span>
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '4px'
        }}>
          <strong>Valor:</strong>
          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
            R$ {pedido.valor?.toFixed(2) || '0.00'}
          </span>
        </div>
      </div>

      {/* Descrição do Pedido */}
      <div style={{
        borderTop: '1px solid #ccc',
        paddingTop: '8px',
        marginBottom: '12px'
      }}>
        <strong style={{ display: 'block', marginBottom: '4px' }}>Descrição:</strong>
        <p style={{
          margin: '0',
          padding: '4px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          fontSize: '11px'
        }}>
          {pedido.resumo}
        </p>
      </div>

      {/* Informações do Cliente */}
      <div style={{
        borderTop: '1px solid #ccc',
        paddingTop: '8px',
        marginBottom: '12px'
      }}>
        <strong style={{ display: 'block', marginBottom: '4px' }}>Cliente:</strong>
        <div style={{ fontSize: '11px' }}>
          <div style={{ marginBottom: '2px' }}>
            <strong>WhatsApp:</strong> {formatWhatsAppNumber(pedido.id_conversa)}
          </div>
          <div>
            <strong>Endereço:</strong> {formatCustomerAddress(pedido)}
          </div>
        </div>
      </div>

      {/* Informações de Pagamento */}
      {pedido.id_asaas && (
        <div style={{
          borderTop: '1px solid #ccc',
          paddingTop: '8px',
          marginBottom: '12px'
        }}>
          <strong style={{ display: 'block', marginBottom: '4px' }}>Pagamento:</strong>
          <div style={{ fontSize: '10px' }}>
            <div>ID Asaas: {pedido.id_asaas}</div>
            {pedido.invoiceUrl && (
              <div style={{ marginTop: '2px' }}>
                Fatura disponível online
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rodapé */}
      <div style={{
        borderTop: '2px solid #000',
        paddingTop: '8px',
        textAlign: 'center',
        fontSize: '10px',
        color: '#666'
      }}>
        <p style={{ margin: '0 0 4px 0' }}>
          Obrigado pela preferência!
        </p>
        <p style={{ margin: '0' }}>
          www.atendos.com.br
        </p>
      </div>

      {/* Estilos específicos para impressão */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          
          .receipt-container, .receipt-container * {
            visibility: visible;
          }
          
          .receipt-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          @page {
            size: 80mm auto;
            margin: 5mm;
          }
        }
      `}</style>
    </div>
  );
};

export default OrderReceiptTemplate;