# Configuração do Portal do Cliente Stripe

## Configuração do Webhook

Para garantir que as assinaturas sejam processadas corretamente, configure o webhook do Stripe:

1. Acesse o [Dashboard do Stripe](https://dashboard.stripe.com/)
2. Navegue até **Desenvolvedores > Webhooks**
3. Clique em **Adicionar endpoint**
4. Adicione a URL do webhook: `https://gzlxgqcoodjioxnipzrc.supabase.co/functions/v1/stripe-webhook`
5. Selecione os eventos:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
6. Clique em **Adicionar endpoint**
7. Copie a **Chave secreta de assinatura** e adicione-a ao seu arquivo `.env` como `STRIPE_WEBHOOK_SECRET`

Para configurar o Portal do Cliente do Stripe e resolver o erro de "No configuration provided", siga estas etapas:

## 1. Acesse o Painel do Stripe

1. Faça login no [Dashboard do Stripe](https://dashboard.stripe.com/)
2. Certifique-se de que está no modo de teste (Test mode)

## 2. Configure o Portal do Cliente

1. Navegue até **Configurações > Portal do Cliente** ou acesse diretamente:
   [https://dashboard.stripe.com/test/settings/billing/portal](https://dashboard.stripe.com/test/settings/billing/portal)

2. Clique em **Configurar** ou **Editar configurações**

3. Configure as seguintes opções:
   - **Informações da empresa**: Adicione o nome e logotipo da sua empresa
   - **Recursos do cliente**: Selecione quais ações os clientes podem realizar:
     - ✅ Atualizar método de pagamento
     - ✅ Atualizar endereço de cobrança
     - ✅ Visualizar histórico de pagamentos
     - ✅ Cancelar assinaturas
     - ✅ Atualizar assinaturas (opcional)
   - **Produtos disponíveis**: Selecione quais produtos os clientes podem mudar
   - **Domínios permitidos**: Adicione os domínios que podem incorporar o portal

4. Clique em **Salvar**

## 3. Testar o Portal

Após configurar o Portal do Cliente, você pode testar a funcionalidade "Gerenciar Assinatura" na sua aplicação:

1. Faça login na sua aplicação
2. Navegue até a seção de Assinatura
3. Clique em "Gerenciar Assinatura"
4. Você deve ser redirecionado para o Portal do Cliente do Stripe

## Nota Importante

O link para o portal do cliente que você compartilhou:
```
billing.stripe.com/p/login/test_9B6cMXcrs8af6xVaPr2Nq00
```

É um link específico para um cliente de teste. O sistema gera links únicos para cada cliente. Não compartilhe este link específico com outros usuários, pois cada um terá seu próprio link gerado pelo sistema.

## Solução de Problemas

Se você continuar enfrentando problemas após configurar o Portal do Cliente:

1. Verifique se o webhook do Stripe está configurado corretamente
2. Confirme que as chaves de API do Stripe estão configuradas no arquivo `.env`
3. Verifique se o cliente tem uma assinatura ativa no Stripe