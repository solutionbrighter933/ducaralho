export interface Product {
  priceId: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  mode: 'payment' | 'subscription';
  trialDays?: number;
  popular?: boolean;
}

export const products: Product[] = [
  {
    priceId: 'price_1Ri0FK09PxhT9skqmRPwZNCa',
    name: 'Atendos IA Starter',
    price: 'R$ 398,00/mês',
    description: 'Starter - Plano ideal para começar com automação de atendimento',
    features: [
      'Atendimento automatizado com IA',
      'Integração com WhatsApp',
      'Dashboard completo',
      'Suporte técnico',
      'Treinamento personalizado da IA',
      'Até 1.000 mensagens/mês'
    ],
    mode: 'subscription',
    trialDays: 7
  },
  {
    priceId: 'price_1RiGAe09PxhT9skqHniqlBBc',
    name: 'Atendos IA Plus',
    price: 'R$ 596,00/mês',
    description: 'Plus - A Máquina de Conversão no Bolso',
    features: [
      '2.000 mensagens mensais com IA ativa 24h no automático',
      'Atendimento completo no Instagram Direct + WhatsApp',
      'Respostas adaptativas inteligentes que se moldam ao tom do cliente',
      'Monitoramento de leads em tempo real',
      'Funil de vendas invisível — o lead nem percebe que foi conduzido pro checkout',
      'Análise de intenção de compra automática'
    ],
    mode: 'subscription',
    trialDays: 7,
    popular: true
  },
  {
    priceId: 'price_1RiGGY09PxhT9skqaPZTme7v',
    name: 'Atendos IA Pro',
    price: 'R$ 789,00/mês',
    description: 'Dominação Digital com Estilo Brutal',
    features: [
      '3.000 mensagens mensais com IA customizada',
      'Atendimento total: WhatsApp + Instagram Direct, sem limites',
      'Integração automática com Google Sheets via IA',
      'Acesso prioritário ao suporte',
      'Personalização insana da IA — treine ela do seu jeito',
      'Agente SDR com follow-up automático',
      'Agente de voz que liga, qualifica e marca reunião sozinho',
      'Agente de agendamento via Google Calendar integrado',
      'Agente vendedor com carrinho de compras embutido (Pix, boleto, crédito)'
    ],
    mode: 'subscription',
    trialDays: 7
  }
];