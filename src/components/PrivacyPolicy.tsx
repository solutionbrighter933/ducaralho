import React from 'react';
import { Shield, FileText, ExternalLink, Calendar, Mail, Phone, MapPin } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Política de Privacidade</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="prose dark:prose-invert max-w-none">
          
          {/* Introdução */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Shield className="w-6 h-6 text-blue-600 mr-2" />
              1. Introdução
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              A <strong>Atendos IA</strong> ("nós", "nosso" ou "empresa") está comprometida em proteger e respeitar sua privacidade. 
              Esta Política de Privacidade explica como coletamos, usamos, armazenamos e protegemos suas informações pessoais 
              quando você utiliza nossa plataforma de atendimento automatizado com inteligência artificial.
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">
              Nossa plataforma integra-se com WhatsApp Business, Facebook, Instagram e Google Calendar para fornecer 
              soluções completas de atendimento ao cliente. Esta política está em conformidade com a Lei Geral de 
              Proteção de Dados (LGPD), GDPR e todas as políticas das plataformas Meta (Facebook, Instagram, WhatsApp).
            </p>
          </div>

          {/* Informações que Coletamos */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              2. Informações que Coletamos
            </h4>
            
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h5 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">2.1 Informações de Conta</h5>
                <ul className="list-disc list-inside text-blue-800 dark:text-blue-400 space-y-1">
                  <li>Nome completo e informações de perfil</li>
                  <li>Endereço de email e telefone</li>
                  <li>Informações da empresa/organização</li>
                  <li>Credenciais de autenticação (senhas criptografadas)</li>
                </ul>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h5 className="font-semibold text-green-900 dark:text-green-300 mb-2">2.2 Dados de Integração com Plataformas</h5>
                <ul className="list-disc list-inside text-green-800 dark:text-green-400 space-y-1">
                  <li><strong>WhatsApp Business:</strong> Números de telefone, mensagens, contatos, status de entrega</li>
                  <li><strong>Facebook/Instagram:</strong> IDs de página, tokens de acesso, mensagens diretas, perfis públicos</li>
                  <li><strong>Google Calendar:</strong> Eventos, horários, participantes, descrições de reuniões</li>
                  <li><strong>Z-API:</strong> Instâncias, tokens, logs de conexão</li>
                </ul>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <h5 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">2.3 Dados de Conversas e IA</h5>
                <ul className="list-disc list-inside text-purple-800 dark:text-purple-400 space-y-1">
                  <li>Mensagens trocadas entre usuários e clientes</li>
                  <li>Respostas geradas por inteligência artificial</li>
                  <li>Prompts e configurações de treinamento de IA</li>
                  <li>Métricas de performance e confiança das respostas</li>
                  <li>Histórico de conversas e contexto</li>
                </ul>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <h5 className="font-semibold text-orange-900 dark:text-orange-300 mb-2">2.4 Dados Técnicos e de Uso</h5>
                <ul className="list-disc list-inside text-orange-800 dark:text-orange-400 space-y-1">
                  <li>Endereços IP, informações do dispositivo e navegador</li>
                  <li>Logs de acesso, timestamps e atividades na plataforma</li>
                  <li>Cookies e tecnologias similares</li>
                  <li>Métricas de uso e performance da aplicação</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Como Usamos suas Informações */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              3. Como Usamos suas Informações
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Finalidades Principais</h5>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 text-sm space-y-1">
                  <li>Fornecer serviços de atendimento automatizado</li>
                  <li>Processar e responder mensagens via IA</li>
                  <li>Integrar com WhatsApp, Facebook e Instagram</li>
                  <li>Gerenciar calendários e agendamentos</li>
                  <li>Autenticar e autorizar usuários</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Finalidades Secundárias</h5>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 text-sm space-y-1">
                  <li>Melhorar a qualidade dos serviços</li>
                  <li>Treinar e aperfeiçoar modelos de IA</li>
                  <li>Gerar relatórios e análises</li>
                  <li>Fornecer suporte técnico</li>
                  <li>Cumprir obrigações legais</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Base Legal */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              4. Base Legal para Tratamento (LGPD)
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-1">1</div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Consentimento</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Para integração com redes sociais e processamento de mensagens pessoais</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-1">2</div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Execução de Contrato</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Para fornecer os serviços contratados de atendimento automatizado</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-1">3</div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Legítimo Interesse</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Para melhorias do serviço, segurança e prevenção de fraudes</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-1">4</div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Cumprimento de Obrigação Legal</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Para atender requisitos legais e regulatórios</p>
                </div>
              </div>
            </div>
          </div>

          {/* Compartilhamento de Dados */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              5. Compartilhamento de Dados
            </h4>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
              <h5 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">Terceiros Autorizados</h5>
              <ul className="list-disc list-inside text-yellow-800 dark:text-yellow-400 space-y-1">
                <li><strong>Meta (Facebook/Instagram/WhatsApp):</strong> Conforme APIs oficiais e políticas da plataforma</li>
                <li><strong>Google:</strong> Para integração com Google Calendar via APIs oficiais</li>
                <li><strong>OpenAI/Anthropic:</strong> Para processamento de IA (dados anonimizados quando possível)</li>
                <li><strong>Stripe:</strong> Para processamento de pagamentos (dados mínimos necessários)</li>
                <li><strong>Supabase:</strong> Para armazenamento seguro de dados (criptografados)</li>
              </ul>
            </div>
            
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Importante:</strong> Nunca vendemos, alugamos ou comercializamos seus dados pessoais. 
              Compartilhamos apenas o mínimo necessário para fornecer nossos serviços e sempre com 
              empresas que atendem aos mesmos padrões de segurança e privacidade.
            </p>
          </div>

          {/* Segurança */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              6. Segurança e Proteção de Dados
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h5 className="font-semibold text-green-900 dark:text-green-300 mb-2">Medidas Técnicas</h5>
                <ul className="list-disc list-inside text-green-800 dark:text-green-400 text-sm space-y-1">
                  <li>Criptografia TLS/SSL para transmissão</li>
                  <li>Criptografia AES-256 para armazenamento</li>
                  <li>Autenticação multifator (2FA)</li>
                  <li>Tokens de acesso com expiração</li>
                  <li>Monitoramento de segurança 24/7</li>
                </ul>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h5 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Medidas Organizacionais</h5>
                <ul className="list-disc list-inside text-blue-800 dark:text-blue-400 text-sm space-y-1">
                  <li>Acesso restrito por função (RBAC)</li>
                  <li>Treinamento regular da equipe</li>
                  <li>Auditorias de segurança periódicas</li>
                  <li>Políticas internas de privacidade</li>
                  <li>Plano de resposta a incidentes</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Seus Direitos */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              7. Seus Direitos (LGPD/GDPR)
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold">A</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Acesso</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Solicitar cópia dos seus dados pessoais</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold">R</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Retificação</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Corrigir dados incorretos ou incompletos</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold">E</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Eliminação</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Solicitar exclusão dos seus dados</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold">P</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Portabilidade</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Transferir dados para outro fornecedor</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold">O</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Oposição</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Opor-se ao tratamento dos seus dados</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold">R</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Revogação</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Retirar consentimento a qualquer momento</p>
                </div>
              </div>
            </div>
          </div>

          {/* Retenção de Dados */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              8. Retenção de Dados
            </h4>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900 dark:text-white">Dados de Conta:</span>
                  <span className="text-gray-600 dark:text-gray-400">Enquanto a conta estiver ativa + 5 anos</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900 dark:text-white">Mensagens e Conversas:</span>
                  <span className="text-gray-600 dark:text-gray-400">2 anos após última atividade</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900 dark:text-white">Logs de Sistema:</span>
                  <span className="text-gray-600 dark:text-gray-400">1 ano para segurança</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900 dark:text-white">Dados de Pagamento:</span>
                  <span className="text-gray-600 dark:text-gray-400">Conforme exigências fiscais (5-10 anos)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cookies */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              9. Cookies e Tecnologias Similares
            </h4>
            
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Utilizamos cookies e tecnologias similares para melhorar sua experiência, manter sessões 
              ativas e analisar o uso da plataforma. Você pode gerenciar suas preferências de cookies 
              nas configurações do seu navegador.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <h5 className="font-medium text-green-900 dark:text-green-300">Essenciais</h5>
                <p className="text-sm text-green-700 dark:text-green-400">Necessários para funcionamento básico</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <h5 className="font-medium text-blue-900 dark:text-blue-300">Funcionais</h5>
                <p className="text-sm text-blue-700 dark:text-blue-400">Melhoram a experiência do usuário</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                <h5 className="font-medium text-purple-900 dark:text-purple-300">Analíticos</h5>
                <p className="text-sm text-purple-700 dark:text-purple-400">Ajudam a entender o uso da plataforma</p>
              </div>
            </div>
          </div>

          {/* Transferências Internacionais */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              10. Transferências Internacionais
            </h4>
            
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-300 mb-3">
                <strong>Importante:</strong> Alguns de nossos fornecedores de serviços estão localizados fora do Brasil:
              </p>
              <ul className="list-disc list-inside text-red-700 dark:text-red-400 space-y-1">
                <li><strong>OpenAI (EUA):</strong> Processamento de IA com cláusulas contratuais padrão</li>
                <li><strong>Google (EUA):</strong> Google Calendar com Privacy Shield e adequação GDPR</li>
                <li><strong>Meta (EUA):</strong> WhatsApp/Facebook/Instagram com adequação GDPR</li>
                <li><strong>Stripe (EUA):</strong> Pagamentos com certificação PCI DSS</li>
              </ul>
              <p className="text-red-700 dark:text-red-400 mt-3 text-sm">
                Todas as transferências são realizadas com garantias adequadas de proteção conforme LGPD Art. 33.
              </p>
            </div>
          </div>

          {/* Menores de Idade */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              11. Proteção de Menores
            </h4>
            
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <p className="text-orange-800 dark:text-orange-300">
                Nossa plataforma é destinada exclusivamente para uso empresarial por pessoas maiores de 18 anos. 
                Não coletamos intencionalmente dados de menores de idade. Se tomarmos conhecimento de que coletamos 
                dados de menores sem consentimento parental adequado, tomaremos medidas para excluir essas informações.
              </p>
            </div>
          </div>

          {/* Alterações */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              12. Alterações nesta Política
            </h4>
            
            <p className="text-gray-700 dark:text-gray-300">
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre mudanças 
              significativas por email ou através de aviso em nossa plataforma. A data da última atualização 
              sempre estará indicada no topo deste documento.
            </p>
          </div>

          {/* Contato */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              13. Contato e Encarregado de Dados
            </h4>
            
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-3">Atendos IA</h5>
                  <div className="space-y-2 text-indigo-800 dark:text-indigo-400">
                  </div>
                </div>
                
                <div>
                  <h5 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-3">Encarregado de Dados (DPO)</h5>
                  <div className="space-y-2 text-indigo-800 dark:text-indigo-400">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4" />
                      <span>contato@atendos.com.br</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4" />
                      <span>+55 (35) 98707-9368</span>
                    </div>
                    <p className="text-sm mt-2">
                      Para exercer seus direitos ou esclarecer dúvidas sobre privacidade
                    </p>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span>Pouso Alegre, MG - Brasil</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4" />
                      <span>CNPJ: 53.853.789/0001-90</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Autoridades */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              14. Autoridades de Proteção de Dados
            </h4>
            
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Você tem o direito de apresentar reclamações às autoridades competentes:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">Brasil - ANPD</h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Autoridade Nacional de Proteção de Dados<br/>
                  <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    www.gov.br/anpd
                  </a>
                </p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">União Europeia</h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Autoridades de Proteção de Dados locais<br/>
                  <a href="https://edpb.europa.eu" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    edpb.europa.eu
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Links Úteis */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              15. Links Úteis e Referências
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h5 className="font-medium text-gray-900 dark:text-white">Políticas das Plataformas</h5>
                <div className="space-y-1">
                  <a href="https://www.whatsapp.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" 
                     className="flex items-center space-x-2 text-blue-600 hover:underline text-sm">
                    <ExternalLink className="w-3 h-3" />
                    <span>WhatsApp Privacy Policy</span>
                  </a>
                  <a href="https://www.facebook.com/privacy/policy" target="_blank" rel="noopener noreferrer" 
                     className="flex items-center space-x-2 text-blue-600 hover:underline text-sm">
                    <ExternalLink className="w-3 h-3" />
                    <span>Facebook Privacy Policy</span>
                  </a>
                  <a href="https://help.instagram.com/519522125107875" target="_blank" rel="noopener noreferrer" 
                     className="flex items-center space-x-2 text-blue-600 hover:underline text-sm">
                    <ExternalLink className="w-3 h-3" />
                    <span>Instagram Privacy Policy</span>
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
                  <a href="https://gdpr.eu/" target="_blank" rel="noopener noreferrer" 
                     className="flex items-center space-x-2 text-blue-600 hover:underline text-sm">
                    <ExternalLink className="w-3 h-3" />
                    <span>GDPR - General Data Protection Regulation</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;