import React from 'react';
import { Scale, FileText, ExternalLink, AlertTriangle, Shield, Zap, Users, MessageSquare } from 'lucide-react';

const TermsOfService: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Termos de Serviço</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="prose dark:prose-invert max-w-none">
          
          {/* Introdução */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Scale className="w-6 h-6 text-green-600 mr-2" />
              1. Aceitação dos Termos
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Bem-vindo ao <strong>Atendos IA</strong>. Estes Termos de Serviço ("Termos") regem o uso da nossa 
              plataforma de atendimento automatizado com inteligência artificial. Ao acessar ou usar nossos 
              serviços, você concorda em ficar vinculado a estes Termos.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
              <p className="text-blue-800 dark:text-blue-300">
                <strong>Importante:</strong> Se você não concordar com qualquer parte destes Termos, 
                não deve usar nossos serviços. Estes Termos constituem um acordo legal vinculativo entre 
                você e a Atendos IA.
              </p>
            </div>
          </div>

          {/* Definições */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              2. Definições
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="font-medium text-gray-900 dark:text-white">Plataforma</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">O sistema Atendos IA, incluindo website, aplicações e APIs</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="font-medium text-gray-900 dark:text-white">Usuário</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pessoa física ou jurídica que utiliza nossos serviços</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="font-medium text-gray-900 dark:text-white">Conteúdo</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Mensagens, dados, arquivos e informações processadas</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="font-medium text-gray-900 dark:text-white">IA</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Sistemas de inteligência artificial para atendimento automatizado</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="font-medium text-gray-900 dark:text-white">Integrações</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Conexões com WhatsApp, Facebook, Instagram e Google Calendar</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="font-medium text-gray-900 dark:text-white">Dados</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Informações pessoais e empresariais processadas pela plataforma</p>
                </div>
              </div>
            </div>
          </div>

          {/* Descrição dos Serviços */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              3. Descrição dos Serviços
            </h4>
            
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              O Atendos IA oferece uma plataforma completa de atendimento automatizado que inclui:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  <h5 className="font-semibold text-green-900 dark:text-green-300">Atendimento Automatizado</h5>
                </div>
                <ul className="list-disc list-inside text-green-800 dark:text-green-400 text-sm space-y-1">
                  <li>Respostas automáticas via IA</li>
                  <li>Processamento de linguagem natural</li>
                  <li>Treinamento personalizado de agentes</li>
                  <li>Escalação para atendimento humano</li>
                </ul>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h5 className="font-semibold text-blue-900 dark:text-blue-300">Integrações Sociais</h5>
                </div>
                <ul className="list-disc list-inside text-blue-800 dark:text-blue-400 text-sm space-y-1">
                  <li>WhatsApp Business API</li>
                  <li>Facebook Messenger</li>
                  <li>Instagram Direct Messages</li>
                  <li>Google Calendar</li>
                </ul>
              </div>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Zap className="w-5 h-5 text-purple-600" />
                  <h5 className="font-semibold text-purple-900 dark:text-purple-300">Recursos Avançados</h5>
                </div>
                <ul className="list-disc list-inside text-purple-800 dark:text-purple-400 text-sm space-y-1">
                  <li>Dashboard de métricas</li>
                  <li>Relatórios de performance</li>
                  <li>Gerenciamento de conversas</li>
                  <li>Configurações personalizáveis</li>
                </ul>
              </div>
              
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Shield className="w-5 h-5 text-orange-600" />
                  <h5 className="font-semibold text-orange-900 dark:text-orange-300">Segurança e Compliance</h5>
                </div>
                <ul className="list-disc list-inside text-orange-800 dark:text-orange-400 text-sm space-y-1">
                  <li>Conformidade LGPD/GDPR</li>
                  <li>Criptografia de dados</li>
                  <li>Autenticação segura</li>
                  <li>Backup e recuperação</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Elegibilidade e Registro */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              4. Elegibilidade e Registro
            </h4>
            
            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h5 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">Requisitos de Elegibilidade</h5>
                <ul className="list-disc list-inside text-yellow-800 dark:text-yellow-400 space-y-1">
                  <li>Ser maior de 18 anos ou ter autorização legal para contratar</li>
                  <li>Representar uma empresa ou organização legalmente constituída</li>
                  <li>Ter autoridade para vincular sua organização a estes Termos</li>
                  <li>Não estar em lista de sanções ou restrições comerciais</li>
                </ul>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h5 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Responsabilidades do Registro</h5>
                <ul className="list-disc list-inside text-blue-800 dark:text-blue-400 space-y-1">
                  <li>Fornecer informações precisas e atualizadas</li>
                  <li>Manter a segurança das credenciais de acesso</li>
                  <li>Notificar sobre uso não autorizado da conta</li>
                  <li>Ser responsável por todas as atividades da conta</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Uso Aceitável */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              5. Política de Uso Aceitável
            </h4>
            
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h5 className="font-semibold text-green-900 dark:text-green-300 mb-2">✅ Usos Permitidos</h5>
                <ul className="list-disc list-inside text-green-800 dark:text-green-400 space-y-1">
                  <li>Atendimento legítimo ao cliente</li>
                  <li>Comunicação comercial autorizada</li>
                  <li>Suporte técnico e pós-venda</li>
                  <li>Agendamento e confirmações</li>
                  <li>Pesquisas de satisfação</li>
                </ul>
              </div>
              
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h5 className="font-semibold text-red-900 dark:text-red-300 mb-2">❌ Usos Proibidos</h5>
                <ul className="list-disc list-inside text-red-800 dark:text-red-400 space-y-1">
                  <li>Spam, mensagens não solicitadas ou marketing agressivo</li>
                  <li>Conteúdo ilegal, ofensivo, discriminatório ou prejudicial</li>
                  <li>Violação de direitos autorais ou propriedade intelectual</li>
                  <li>Tentativas de fraude, phishing ou engenharia social</li>
                  <li>Interferência com sistemas ou redes de terceiros</li>
                  <li>Uso para fins políticos ou religiosos sem consentimento</li>
                  <li>Coleta não autorizada de dados pessoais</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Conformidade com Plataformas */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              6. Conformidade com Políticas de Plataformas
            </h4>
            
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h5 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Meta Platforms (WhatsApp, Facebook, Instagram)</h5>
                <p className="text-blue-800 dark:text-blue-400 text-sm mb-2">
                  Você concorda em cumprir todas as políticas aplicáveis:
                </p>
                <ul className="list-disc list-inside text-blue-700 dark:text-blue-400 text-sm space-y-1">
                  <li><a href="https://www.whatsapp.com/legal/business-policy" target="_blank" rel="noopener noreferrer" className="hover:underline">WhatsApp Business Policy</a></li>
                  <li><a href="https://developers.facebook.com/policy" target="_blank" rel="noopener noreferrer" className="hover:underline">Facebook Platform Policy</a></li>
                  <li><a href="https://help.instagram.com/581066165581870" target="_blank" rel="noopener noreferrer" className="hover:underline">Instagram Platform Policy</a></li>
                  <li><a href="https://www.facebook.com/policies/commercial_terms" target="_blank" rel="noopener noreferrer" className="hover:underline">Meta Commercial Terms</a></li>
                </ul>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h5 className="font-semibold text-green-900 dark:text-green-300 mb-2">Google Services</h5>
                <p className="text-green-800 dark:text-green-400 text-sm mb-2">
                  Para integração com Google Calendar:
                </p>
                <ul className="list-disc list-inside text-green-700 dark:text-green-400 text-sm space-y-1">
                  <li><a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="hover:underline">Google Terms of Service</a></li>
                  <li><a href="https://developers.google.com/terms" target="_blank" rel="noopener noreferrer" className="hover:underline">Google APIs Terms of Service</a></li>
                  <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline">Google Privacy Policy</a></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Inteligência Artificial */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              7. Uso de Inteligência Artificial
            </h4>
            
            <div className="space-y-4">
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <h5 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">Funcionamento da IA</h5>
                <ul className="list-disc list-inside text-purple-800 dark:text-purple-400 space-y-1">
                  <li>A IA processa mensagens para gerar respostas automáticas</li>
                  <li>Utiliza modelos de linguagem avançados (GPT-4, Claude, etc.)</li>
                  <li>Aprende com interações para melhorar respostas</li>
                  <li>Pode ser personalizada com prompts específicos</li>
                </ul>
              </div>
              
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <h5 className="font-semibold text-orange-900 dark:text-orange-300 mb-2">Limitações e Responsabilidades</h5>
                <ul className="list-disc list-inside text-orange-800 dark:text-orange-400 space-y-1">
                  <li>A IA pode gerar respostas imprecisas ou inadequadas</li>
                  <li>Supervisão humana é recomendada para casos sensíveis</li>
                  <li>Você é responsável pelo conteúdo gerado pela IA</li>
                  <li>Deve revisar e aprovar respostas críticas</li>
                </ul>
              </div>
              
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h5 className="font-semibold text-red-900 dark:text-red-300 mb-2">⚠️ Uso Ético da IA</h5>
                <ul className="list-disc list-inside text-red-800 dark:text-red-400 space-y-1">
                  <li>Não use a IA para enganar ou manipular usuários</li>
                  <li>Identifique claramente quando respostas são automatizadas</li>
                  <li>Não treine a IA com conteúdo discriminatório ou ofensivo</li>
                  <li>Respeite os direitos e dignidade dos usuários finais</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Propriedade Intelectual */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              8. Propriedade Intelectual
            </h4>
            
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h5 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Propriedade da Atendos IA</h5>
                <ul className="list-disc list-inside text-blue-800 dark:text-blue-400 space-y-1">
                  <li>Código-fonte, algoritmos e tecnologia da plataforma</li>
                  <li>Interface, design e experiência do usuário</li>
                  <li>Marca "Atendos IA", logotipos e materiais de marketing</li>
                  <li>Documentação, tutoriais e conteúdo educacional</li>
                </ul>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h5 className="font-semibold text-green-900 dark:text-green-300 mb-2">Seus Direitos sobre Conteúdo</h5>
                <ul className="list-disc list-inside text-green-800 dark:text-green-400 space-y-1">
                  <li>Você mantém propriedade sobre seus dados e conteúdo</li>
                  <li>Mensagens, contatos e configurações permanecem seus</li>
                  <li>Pode exportar seus dados a qualquer momento</li>
                  <li>Licencia uso apenas para operação dos serviços</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Pagamentos e Assinaturas */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              9. Pagamentos e Assinaturas
            </h4>
            
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h5 className="font-semibold text-green-900 dark:text-green-300 mb-2">Planos e Preços</h5>
                <ul className="list-disc list-inside text-green-800 dark:text-green-400 space-y-1">
                  <li>Preços são exibidos em reais brasileiros (BRL)</li>
                  <li>Incluem todos os impostos aplicáveis</li>
                  <li>Podem ser alterados com aviso prévio de 30 dias</li>
                  <li>Período de teste gratuito conforme plano escolhido</li>
                </ul>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h5 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Cobrança e Renovação</h5>
                <ul className="list-disc list-inside text-blue-800 dark:text-blue-400 space-y-1">
                  <li>Cobrança automática via Stripe</li>
                  <li>Renovação automática até cancelamento</li>
                  <li>Falhas de pagamento podem suspender o serviço</li>
                  <li>Reembolsos conforme política específica</li>
                </ul>
              </div>
              
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <h5 className="font-semibold text-orange-900 dark:text-orange-300 mb-2">Cancelamento</h5>
                <ul className="list-disc list-inside text-orange-800 dark:text-orange-400 space-y-1">
                  <li>Pode cancelar a qualquer momento</li>
                  <li>Acesso mantido até o final do período pago</li>
                  <li>Dados preservados por 30 dias após cancelamento</li>
                  <li>Sem multas ou taxas de cancelamento</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Limitações de Responsabilidade */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              10. Limitações de Responsabilidade
            </h4>
            
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
                <div>
                  <h5 className="font-semibold text-red-900 dark:text-red-300 mb-2">Isenções Importantes</h5>
                  <ul className="list-disc list-inside text-red-800 dark:text-red-400 space-y-1">
                    <li>Serviços fornecidos "como estão" sem garantias expressas</li>
                    <li>Não garantimos disponibilidade 100% ou ausência de erros</li>
                    <li>Não somos responsáveis por conteúdo gerado por IA</li>
                    <li>Limitamos responsabilidade ao valor pago nos últimos 12 meses</li>
                    <li>Não respondemos por danos indiretos ou lucros cessantes</li>
                    <li>Usuário responsável por backup e segurança de dados</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
              <h5 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Força Maior</h5>
              <p className="text-blue-800 dark:text-blue-400 text-sm">
                Não seremos responsáveis por falhas causadas por eventos fora do nosso controle, incluindo 
                mas não limitado a: desastres naturais, ataques cibernéticos, falhas de terceiros (Meta, Google, etc.), 
                mudanças regulatórias ou interrupções de infraestrutura.
              </p>
            </div>
          </div>

          {/* Suspensão e Rescisão */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              11. Suspensão e Rescisão
            </h4>
            
            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h5 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">Motivos para Suspensão</h5>
                <ul className="list-disc list-inside text-yellow-800 dark:text-yellow-400 space-y-1">
                  <li>Violação destes Termos ou políticas de uso</li>
                  <li>Atividades fraudulentas ou ilegais</li>
                  <li>Falha no pagamento por mais de 7 dias</li>
                  <li>Uso que prejudique outros usuários ou sistemas</li>
                  <li>Violação de políticas de plataformas integradas</li>
                </ul>
              </div>
              
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h5 className="font-semibold text-red-900 dark:text-red-300 mb-2">Processo de Rescisão</h5>
                <ul className="list-disc list-inside text-red-800 dark:text-red-400 space-y-1">
                  <li>Notificação prévia sempre que possível</li>
                  <li>Oportunidade de correção para violações menores</li>
                  <li>Rescisão imediata para violações graves</li>
                  <li>Preservação de dados por 30 dias para recuperação</li>
                  <li>Exclusão permanente após período de graça</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Conformidade Legal */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              12. Conformidade Legal e Regulatória
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h5 className="font-semibold text-green-900 dark:text-green-300 mb-2">Brasil</h5>
                <ul className="list-disc list-inside text-green-800 dark:text-green-400 text-sm space-y-1">
                  <li>Lei Geral de Proteção de Dados (LGPD)</li>
                  <li>Código de Defesa do Consumidor (CDC)</li>
                  <li>Marco Civil da Internet</li>
                  <li>Regulamentações da ANATEL</li>
                </ul>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h5 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Internacional</h5>
                <ul className="list-disc list-inside text-blue-800 dark:text-blue-400 text-sm space-y-1">
                  <li>GDPR (União Europeia)</li>
                  <li>CCPA (Califórnia, EUA)</li>
                  <li>Políticas do Meta/Facebook</li>
                  <li>Termos do Google</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Resolução de Disputas */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              13. Resolução de Disputas
            </h4>
            
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h5 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Processo de Resolução</h5>
                <ol className="list-decimal list-inside text-blue-800 dark:text-blue-400 space-y-1">
                  <li>Tentativa de resolução amigável via suporte</li>
                  <li>Mediação através de câmara de mediação</li>
                  <li>Arbitragem conforme regulamento da CAM-CCBC</li>
                  <li>Foro da Comarca de São Paulo, SP como última instância</li>
                </ol>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Lei Aplicável</h5>
                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  Estes Termos são regidos pelas leis da República Federativa do Brasil. 
                  Disputas serão resolvidas preferencialmente no foro da Comarca de São Paulo, SP.
                </p>
              </div>
            </div>
          </div>

          {/* Alterações nos Termos */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              14. Alterações nos Termos
            </h4>
            
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <p className="text-orange-800 dark:text-orange-300 mb-3">
                Podemos modificar estes Termos periodicamente. Mudanças significativas serão comunicadas com:
              </p>
              <ul className="list-disc list-inside text-orange-700 dark:text-orange-400 space-y-1">
                <li>Aviso por email com 30 dias de antecedência</li>
                <li>Notificação na plataforma</li>
                <li>Atualização da data no topo do documento</li>
                <li>Oportunidade de cancelar se não concordar</li>
              </ul>
            </div>
          </div>

          {/* Disposições Gerais */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              15. Disposições Gerais
            </h4>
            
            <div className="space-y-3">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <p className="font-medium text-gray-900 dark:text-white mb-1">Integralidade</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Estes Termos constituem o acordo completo entre as partes
                </p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <p className="font-medium text-gray-900 dark:text-white mb-1">Divisibilidade</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Se alguma cláusula for inválida, as demais permanecem em vigor
                </p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <p className="font-medium text-gray-900 dark:text-white mb-1">Renúncia</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Não exercer um direito não constitui renúncia ao mesmo
                </p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <p className="font-medium text-gray-900 dark:text-white mb-1">Cessão</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Usuário não pode ceder direitos sem autorização prévia
                </p>
              </div>
            </div>
          </div>

          {/* Contato */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              16. Informações de Contato
            </h4>
            
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-3">Atendos IA</h5>
                  <div className="space-y-2 text-indigo-800 dark:text-indigo-400 text-sm">
                    <p><strong>Razão Social:</strong> Atendos Tecnologia Ltda.</p>
                    <p><strong>CNPJ:</strong> 53.853.789/0001-90</p>
                    <p><strong>Endereço:</strong> Pouso Alegre, MG - Brasil</p>
                    <p><strong>Email:</strong> contato@atendos.com.br</p>
                    <p><strong>Telefone:</strong> +55 (35) 98707-9368</p>
                  </div>
                </div>
                
                <div>
                  <h5 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-3">Departamentos Especializados</h5>
                  <div className="space-y-2 text-indigo-800 dark:text-indigo-400 text-sm">
                    <p><strong>Jurídico:</strong> juridico@atendos.com.br</p>
                    <p><strong>Privacidade:</strong> dpo@atendos.com.br</p>
                    <p><strong>Suporte:</strong> suporte@atendos.com.br</p>
                    <p><strong>Comercial:</strong> vendas@atendos.com.br</p>
                    <p><strong>Técnico:</strong> dev@atendos.com.br</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Links de Referência */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              17. Links de Referência e Políticas Relacionadas
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h5 className="font-medium text-gray-900 dark:text-white">Políticas das Plataformas</h5>
                <div className="space-y-1">
                  <a href="https://www.whatsapp.com/legal/business-policy" target="_blank" rel="noopener noreferrer" 
                     className="flex items-center space-x-2 text-blue-600 hover:underline text-sm">
                    <ExternalLink className="w-3 h-3" />
                    <span>WhatsApp Business Policy</span>
                  </a>
                  <a href="https://developers.facebook.com/policy" target="_blank" rel="noopener noreferrer" 
                     className="flex items-center space-x-2 text-blue-600 hover:underline text-sm">
                    <ExternalLink className="w-3 h-3" />
                    <span>Facebook Platform Policy</span>
                  </a>
                  <a href="https://help.instagram.com/581066165581870" target="_blank" rel="noopener noreferrer" 
                     className="flex items-center space-x-2 text-blue-600 hover:underline text-sm">
                    <ExternalLink className="w-3 h-3" />
                    <span>Instagram Platform Policy</span>
                  </a>
                  <a href="https://developers.google.com/terms" target="_blank" rel="noopener noreferrer" 
                     className="flex items-center space-x-2 text-blue-600 hover:underline text-sm">
                    <ExternalLink className="w-3 h-3" />
                    <span>Google APIs Terms</span>
                  </a>
                </div>
              </div>
              
              <div className="space-y-2">
                <h5 className="font-medium text-gray-900 dark:text-white">Regulamentações</h5>
                <div className="space-y-1">
                  <a href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm" target="_blank" rel="noopener noreferrer" 
                     className="flex items-center space-x-2 text-blue-600 hover:underline text-sm">
                    <ExternalLink className="w-3 h-3" />
                    <span>LGPD - Lei 13.709/2018</span>
                  </a>
                  <a href="https://www.planalto.gov.br/ccivil_03/leis/l8078.htm" target="_blank" rel="noopener noreferrer" 
                     className="flex items-center space-x-2 text-blue-600 hover:underline text-sm">
                    <ExternalLink className="w-3 h-3" />
                    <span>Código de Defesa do Consumidor</span>
                  </a>
                  <a href="https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm" target="_blank" rel="noopener noreferrer" 
                     className="flex items-center space-x-2 text-blue-600 hover:underline text-sm">
                    <ExternalLink className="w-3 h-3" />
                    <span>Marco Civil da Internet</span>
                  </a>
                  <a href="https://gdpr.eu/" target="_blank" rel="noopener noreferrer" 
                     className="flex items-center space-x-2 text-blue-600 hover:underline text-sm">
                    <ExternalLink className="w-3 h-3" />
                    <span>GDPR - General Data Protection Regulation</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Aceitação */}
          <div className="mb-8">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
              <Scale className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h4 className="text-xl font-semibold text-green-900 dark:text-green-300 mb-2">
                Aceitação dos Termos
              </h4>
              <p className="text-green-800 dark:text-green-400">
                Ao usar o Atendos IA, você confirma que leu, compreendeu e concorda em ficar vinculado 
                a estes Termos de Serviço e nossa Política de Privacidade.
              </p>
              <p className="text-green-700 dark:text-green-400 text-sm mt-3">
                <strong>Data de vigência:</strong> {new Date().toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TermsOfService;