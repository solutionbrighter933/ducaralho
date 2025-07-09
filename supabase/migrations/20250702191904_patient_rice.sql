/*
  # Tabelas para Histórico de Conversas WhatsApp

  1. Nova Tabela: `conversas_whatsapp`
    - Armazena informações das conversas por número de contato
    - Cada conversa é identificada pelo número do contato
    - Inclui dados do lead e status da conversa

  2. Nova Tabela: `mensagens_whatsapp`
    - Armazena todas as mensagens de cada conversa
    - Referencia a conversa pelo conversa_id
    - Inclui direção da mensagem (enviada/recebida)
    - Timestamp completo de quando a mensagem foi enviada/recebida

  3. Segurança
    - Habilita RLS em ambas as tabelas
    - Políticas para usuários autenticados acessarem apenas suas conversas
    - Índices para melhor performance

  4. Estrutura baseada no webhook recebido:
    {
      "numero": "número do contato",
      "mensagem": "conteúdo da mensagem", 
      "direcao": "sent/received",
      "data_hora": "timestamp",
      "conversa_id": "ID único da conversa",
      "nome_contato": "nome do lead",
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
*/

-- Tabela para armazenar conversas do WhatsApp
CREATE TABLE IF NOT EXISTS conversas_whatsapp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id text UNIQUE NOT NULL, -- ID único da conversa vindo do webhook
  numero_contato text NOT NULL, -- Número do contato que está conversando
  nome_contato text, -- Nome do lead/contato
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- Usuário dono da conversa
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE, -- Organização
  status text DEFAULT 'ativa', -- Status da conversa (ativa, arquivada, finalizada)
  ultima_mensagem text, -- Última mensagem da conversa
  ultima_atividade timestamptz, -- Timestamp da última atividade
  total_mensagens integer DEFAULT 0, -- Contador de mensagens
  nao_lidas integer DEFAULT 0, -- Contador de mensagens não lidas
  metadata jsonb DEFAULT '{}', -- Dados adicionais em JSON
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Tabela para armazenar mensagens individuais
CREATE TABLE IF NOT EXISTS mensagens_whatsapp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id text NOT NULL, -- Referência ao ID da conversa
  numero_contato text NOT NULL, -- Número do contato
  mensagem text NOT NULL, -- Conteúdo da mensagem
  direcao text NOT NULL, -- Direção: 'sent' (enviada) ou 'received' (recebida)
  data_hora timestamptz NOT NULL, -- Timestamp da mensagem
  nome_contato text, -- Nome do contato
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- Usuário dono da mensagem
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE, -- Organização
  tipo_mensagem text DEFAULT 'text', -- Tipo: text, image, audio, document, etc.
  status_entrega text DEFAULT 'pending', -- Status: pending, sent, delivered, read
  metadata jsonb DEFAULT '{}', -- Dados adicionais (IDs do WhatsApp, etc.)
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Referência à conversa
  FOREIGN KEY (conversa_id) REFERENCES conversas_whatsapp(conversa_id) ON DELETE CASCADE
);

-- Habilitar Row Level Security
ALTER TABLE conversas_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens_whatsapp ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para conversas_whatsapp
CREATE POLICY "Usuários podem ver suas próprias conversas"
  ON conversas_whatsapp
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Usuários podem inserir suas próprias conversas"
  ON conversas_whatsapp
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuários podem atualizar suas próprias conversas"
  ON conversas_whatsapp
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuários podem deletar suas próprias conversas"
  ON conversas_whatsapp
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Políticas de segurança para mensagens_whatsapp
CREATE POLICY "Usuários podem ver suas próprias mensagens"
  ON mensagens_whatsapp
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Usuários podem inserir suas próprias mensagens"
  ON mensagens_whatsapp
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuários podem atualizar suas próprias mensagens"
  ON mensagens_whatsapp
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuários podem deletar suas próprias mensagens"
  ON mensagens_whatsapp
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_conversas_whatsapp_user_id ON conversas_whatsapp(user_id);
CREATE INDEX IF NOT EXISTS idx_conversas_whatsapp_numero_contato ON conversas_whatsapp(numero_contato);
CREATE INDEX IF NOT EXISTS idx_conversas_whatsapp_conversa_id ON conversas_whatsapp(conversa_id);
CREATE INDEX IF NOT EXISTS idx_conversas_whatsapp_organization_id ON conversas_whatsapp(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversas_whatsapp_status ON conversas_whatsapp(status);
CREATE INDEX IF NOT EXISTS idx_conversas_whatsapp_ultima_atividade ON conversas_whatsapp(ultima_atividade DESC);

CREATE INDEX IF NOT EXISTS idx_mensagens_whatsapp_user_id ON mensagens_whatsapp(user_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_whatsapp_conversa_id ON mensagens_whatsapp(conversa_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_whatsapp_numero_contato ON mensagens_whatsapp(numero_contato);
CREATE INDEX IF NOT EXISTS idx_mensagens_whatsapp_data_hora ON mensagens_whatsapp(data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_mensagens_whatsapp_direcao ON mensagens_whatsapp(direcao);
CREATE INDEX IF NOT EXISTS idx_mensagens_whatsapp_organization_id ON mensagens_whatsapp(organization_id);

-- Função para atualizar automaticamente a conversa quando uma nova mensagem é inserida
CREATE OR REPLACE FUNCTION atualizar_conversa_whatsapp()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar ou inserir conversa
  INSERT INTO conversas_whatsapp (
    conversa_id,
    numero_contato,
    nome_contato,
    user_id,
    organization_id,
    ultima_mensagem,
    ultima_atividade,
    total_mensagens,
    nao_lidas
  )
  VALUES (
    NEW.conversa_id,
    NEW.numero_contato,
    NEW.nome_contato,
    NEW.user_id,
    NEW.organization_id,
    NEW.mensagem,
    NEW.data_hora,
    1,
    CASE WHEN NEW.direcao = 'received' THEN 1 ELSE 0 END
  )
  ON CONFLICT (conversa_id) 
  DO UPDATE SET
    nome_contato = COALESCE(NEW.nome_contato, conversas_whatsapp.nome_contato),
    ultima_mensagem = NEW.mensagem,
    ultima_atividade = NEW.data_hora,
    total_mensagens = conversas_whatsapp.total_mensagens + 1,
    nao_lidas = CASE 
      WHEN NEW.direcao = 'received' THEN conversas_whatsapp.nao_lidas + 1 
      ELSE conversas_whatsapp.nao_lidas 
    END,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar conversa automaticamente
DROP TRIGGER IF EXISTS trigger_atualizar_conversa_whatsapp ON mensagens_whatsapp;
CREATE TRIGGER trigger_atualizar_conversa_whatsapp
  AFTER INSERT ON mensagens_whatsapp
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_conversa_whatsapp();

-- Função para marcar mensagens como lidas
CREATE OR REPLACE FUNCTION marcar_mensagens_como_lidas(conversa_id_param text)
RETURNS void AS $$
BEGIN
  -- Atualizar status das mensagens recebidas para 'read'
  UPDATE mensagens_whatsapp 
  SET status_entrega = 'read', updated_at = now()
  WHERE conversa_id = conversa_id_param 
    AND direcao = 'received' 
    AND status_entrega != 'read'
    AND user_id = auth.uid();
  
  -- Zerar contador de não lidas na conversa
  UPDATE conversas_whatsapp 
  SET nao_lidas = 0, updated_at = now()
  WHERE conversa_id = conversa_id_param 
    AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter estatísticas das conversas
CREATE OR REPLACE FUNCTION obter_estatisticas_conversas(user_id_param uuid)
RETURNS TABLE(
  total_conversas bigint,
  conversas_ativas bigint,
  total_mensagens bigint,
  mensagens_nao_lidas bigint,
  conversas_hoje bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_conversas,
    COUNT(*) FILTER (WHERE status = 'ativa')::bigint as conversas_ativas,
    COALESCE(SUM(total_mensagens), 0)::bigint as total_mensagens,
    COALESCE(SUM(nao_lidas), 0)::bigint as mensagens_nao_lidas,
    COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE)::bigint as conversas_hoje
  FROM conversas_whatsapp 
  WHERE user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissões para usuários autenticados
GRANT ALL ON conversas_whatsapp TO authenticated;
GRANT ALL ON mensagens_whatsapp TO authenticated;
GRANT EXECUTE ON FUNCTION marcar_mensagens_como_lidas(text) TO authenticated;
GRANT EXECUTE ON FUNCTION obter_estatisticas_conversas(uuid) TO authenticated;

-- Comentários para documentação
COMMENT ON TABLE conversas_whatsapp IS 'Armazena conversas do WhatsApp organizadas por número de contato';
COMMENT ON TABLE mensagens_whatsapp IS 'Armazena todas as mensagens individuais de cada conversa';
COMMENT ON COLUMN conversas_whatsapp.conversa_id IS 'ID único da conversa vindo do webhook N8N';
COMMENT ON COLUMN conversas_whatsapp.numero_contato IS 'Número do WhatsApp do contato (identificador principal)';
COMMENT ON COLUMN mensagens_whatsapp.direcao IS 'Direção da mensagem: sent (enviada) ou received (recebida)';
COMMENT ON FUNCTION atualizar_conversa_whatsapp() IS 'Atualiza automaticamente dados da conversa quando nova mensagem é inserida';
COMMENT ON FUNCTION marcar_mensagens_como_lidas(text) IS 'Marca todas as mensagens de uma conversa como lidas';
COMMENT ON FUNCTION obter_estatisticas_conversas(uuid) IS 'Retorna estatísticas das conversas de um usuário';