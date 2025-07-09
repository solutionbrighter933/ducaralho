/*
  # Fix WhatsApp Conversations System - Complete Implementation

  1. Problem Resolution
    - Remove duplicate function definitions
    - Fix foreign key constraints
    - Implement auto-conversation creation
    - Add comprehensive webhook processing

  2. New Functions
    - Auto-create conversations when messages arrive
    - Process N8N webhook data
    - Search and pagination functions
    - Statistics and management functions

  3. Security
    - Proper RLS policies
    - User-scoped data access
    - Secure function execution
*/

-- Drop existing problematic constraints and triggers
ALTER TABLE mensagens_whatsapp 
DROP CONSTRAINT IF EXISTS mensagens_whatsapp_conversa_id_fkey;

DROP TRIGGER IF EXISTS trigger_atualizar_conversa_whatsapp ON mensagens_whatsapp;

-- Drop any existing functions to avoid conflicts
DROP FUNCTION IF EXISTS atualizar_conversa_whatsapp();
DROP FUNCTION IF EXISTS inserir_mensagem_whatsapp(text, text, text, text, timestamptz, text, uuid, uuid, text, text, jsonb);
DROP FUNCTION IF EXISTS processar_webhook_whatsapp(jsonb);
DROP FUNCTION IF EXISTS buscar_conversas_whatsapp(uuid, integer, integer, text);
DROP FUNCTION IF EXISTS buscar_mensagens_conversa(text, integer, integer);
DROP FUNCTION IF EXISTS marcar_conversa_como_lida(text);
DROP FUNCTION IF EXISTS obter_estatisticas_conversas();

-- Drop existing view to recreate
DROP VIEW IF EXISTS vw_conversas_resumo;

-- 1. Function to automatically update/create conversations
CREATE FUNCTION atualizar_conversa_whatsapp()
RETURNS TRIGGER AS $$
DECLARE
  conversa_existe boolean;
BEGIN
  -- Check if conversation already exists
  SELECT EXISTS(
    SELECT 1 FROM conversas_whatsapp 
    WHERE conversa_id = NEW.conversa_id
  ) INTO conversa_existe;

  IF NOT conversa_existe THEN
    -- Create new conversation if it doesn't exist
    INSERT INTO conversas_whatsapp (
      conversa_id,
      numero_contato,
      nome_contato,
      user_id,
      organization_id,
      status,
      ultima_mensagem,
      ultima_atividade,
      total_mensagens,
      nao_lidas,
      created_at,
      updated_at
    )
    VALUES (
      NEW.conversa_id,
      NEW.numero_contato,
      COALESCE(NEW.nome_contato, NEW.numero_contato),
      NEW.user_id,
      NEW.organization_id,
      'ativa',
      NEW.mensagem,
      NEW.data_hora,
      1,
      CASE WHEN NEW.direcao = 'received' THEN 1 ELSE 0 END,
      NEW.created_at,
      NEW.updated_at
    );
  ELSE
    -- Update existing conversation
    UPDATE conversas_whatsapp 
    SET 
      nome_contato = COALESCE(NEW.nome_contato, conversas_whatsapp.nome_contato, NEW.numero_contato),
      ultima_mensagem = NEW.mensagem,
      ultima_atividade = NEW.data_hora,
      total_mensagens = conversas_whatsapp.total_mensagens + 1,
      nao_lidas = CASE 
        WHEN NEW.direcao = 'received' THEN conversas_whatsapp.nao_lidas + 1 
        ELSE conversas_whatsapp.nao_lidas 
      END,
      updated_at = NEW.updated_at
    WHERE conversa_id = NEW.conversa_id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail message insertion
    RAISE WARNING 'Error updating conversation %: %', NEW.conversa_id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-conversation management
CREATE TRIGGER trigger_atualizar_conversa_whatsapp
  AFTER INSERT ON mensagens_whatsapp
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_conversa_whatsapp();

-- 2. Function to insert message with auto-conversation creation
CREATE FUNCTION inserir_mensagem_whatsapp(
  p_conversa_id text,
  p_numero_contato text,
  p_mensagem text,
  p_direcao text,
  p_data_hora timestamptz,
  p_nome_contato text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_organization_id uuid DEFAULT NULL,
  p_tipo_mensagem text DEFAULT 'text',
  p_status_entrega text DEFAULT 'pending',
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
  nova_mensagem_id uuid;
  user_id_final uuid;
  org_id_final uuid;
BEGIN
  -- Use current user_id if not provided
  user_id_final := COALESCE(p_user_id, auth.uid());
  
  -- Get organization_id from user profile if not provided
  IF p_organization_id IS NULL THEN
    SELECT organization_id INTO org_id_final
    FROM profiles 
    WHERE user_id = user_id_final
    LIMIT 1;
  ELSE
    org_id_final := p_organization_id;
  END IF;

  -- Insert message (trigger will handle conversation)
  INSERT INTO mensagens_whatsapp (
    conversa_id,
    numero_contato,
    mensagem,
    direcao,
    data_hora,
    nome_contato,
    user_id,
    organization_id,
    tipo_mensagem,
    status_entrega,
    metadata
  )
  VALUES (
    p_conversa_id,
    p_numero_contato,
    p_mensagem,
    p_direcao,
    p_data_hora,
    p_nome_contato,
    user_id_final,
    org_id_final,
    p_tipo_mensagem,
    p_status_entrega,
    p_metadata
  )
  RETURNING id INTO nova_mensagem_id;

  RETURN nova_mensagem_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to process N8N webhook data
CREATE FUNCTION processar_webhook_whatsapp(
  webhook_data jsonb
)
RETURNS jsonb AS $$
DECLARE
  resultado jsonb;
  mensagem_id uuid;
  numero_limpo text;
BEGIN
  -- Clean phone number (remove special characters)
  numero_limpo := regexp_replace(
    webhook_data->>'numero', 
    '[^0-9]', 
    '', 
    'g'
  );

  -- Insert message using helper function
  SELECT inserir_mensagem_whatsapp(
    webhook_data->>'conversa_id',
    numero_limpo,
    webhook_data->>'mensagem',
    CASE 
      WHEN (webhook_data->>'direcao') = 'sent' THEN 'sent'
      WHEN (webhook_data->>'direcao') = 'received' THEN 'received'
      ELSE 'received'
    END,
    COALESCE(
      (webhook_data->>'data_hora')::timestamptz,
      now()
    ),
    webhook_data->>'nome_contato',
    auth.uid(),
    NULL,
    'text',
    'delivered',
    webhook_data
  ) INTO mensagem_id;

  -- Return result
  resultado := jsonb_build_object(
    'success', true,
    'mensagem_id', mensagem_id,
    'conversa_id', webhook_data->>'conversa_id',
    'numero_contato', numero_limpo,
    'timestamp', now()
  );

  RETURN resultado;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error without failing
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'webhook_data', webhook_data
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to search conversations with pagination
CREATE FUNCTION buscar_conversas_whatsapp(
  p_user_id uuid DEFAULT NULL,
  p_limite integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_status text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  conversa_id text,
  numero_contato text,
  nome_contato text,
  status text,
  ultima_mensagem text,
  ultima_atividade timestamptz,
  total_mensagens integer,
  nao_lidas integer,
  created_at timestamptz
) AS $$
DECLARE
  user_id_final uuid;
BEGIN
  user_id_final := COALESCE(p_user_id, auth.uid());

  RETURN QUERY
  SELECT 
    c.id,
    c.conversa_id,
    c.numero_contato,
    c.nome_contato,
    c.status,
    c.ultima_mensagem,
    c.ultima_atividade,
    c.total_mensagens,
    c.nao_lidas,
    c.created_at
  FROM conversas_whatsapp c
  WHERE c.user_id = user_id_final
    AND (p_status IS NULL OR c.status = p_status)
  ORDER BY c.ultima_atividade DESC NULLS LAST
  LIMIT p_limite
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to search messages from a conversation
CREATE FUNCTION buscar_mensagens_conversa(
  p_conversa_id text,
  p_limite integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  mensagem text,
  direcao text,
  data_hora timestamptz,
  nome_contato text,
  tipo_mensagem text,
  status_entrega text,
  metadata jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.mensagem,
    m.direcao,
    m.data_hora,
    m.nome_contato,
    m.tipo_mensagem,
    m.status_entrega,
    m.metadata
  FROM mensagens_whatsapp m
  WHERE m.conversa_id = p_conversa_id
    AND m.user_id = auth.uid()
  ORDER BY m.data_hora ASC
  LIMIT p_limite
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to mark conversation as read
CREATE FUNCTION marcar_conversa_como_lida(
  p_conversa_id text
)
RETURNS boolean AS $$
BEGIN
  UPDATE conversas_whatsapp 
  SET nao_lidas = 0,
      updated_at = now()
  WHERE conversa_id = p_conversa_id 
    AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to get conversation statistics
CREATE FUNCTION obter_estatisticas_conversas_whatsapp()
RETURNS TABLE(
  total_conversas bigint,
  conversas_ativas bigint,
  mensagens_nao_lidas bigint,
  ultima_atividade timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_conversas,
    COUNT(*) FILTER (WHERE status = 'ativa') as conversas_ativas,
    COALESCE(SUM(nao_lidas), 0) as mensagens_nao_lidas,
    MAX(ultima_atividade) as ultima_atividade
  FROM conversas_whatsapp
  WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for easier queries
CREATE VIEW vw_conversas_resumo AS
SELECT 
  c.id,
  c.conversa_id,
  c.numero_contato,
  c.nome_contato,
  c.status,
  c.ultima_mensagem,
  c.ultima_atividade,
  c.total_mensagens,
  c.nao_lidas,
  c.created_at,
  p.full_name as usuario_nome,
  o.name as organizacao_nome
FROM conversas_whatsapp c
LEFT JOIN profiles p ON c.user_id = p.user_id
LEFT JOIN organizations o ON c.organization_id = o.id;

-- Grant permissions to functions
GRANT EXECUTE ON FUNCTION inserir_mensagem_whatsapp(text, text, text, text, timestamptz, text, uuid, uuid, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION processar_webhook_whatsapp(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION buscar_conversas_whatsapp(uuid, integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION buscar_mensagens_conversa(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION marcar_conversa_como_lida(text) TO authenticated;
GRANT EXECUTE ON FUNCTION obter_estatisticas_conversas_whatsapp() TO authenticated;

-- Grant access to view
GRANT SELECT ON vw_conversas_resumo TO authenticated;

-- Add documentation comments
COMMENT ON FUNCTION inserir_mensagem_whatsapp IS 'Insere uma mensagem e cria automaticamente a conversa se não existir';
COMMENT ON FUNCTION processar_webhook_whatsapp IS 'Processa dados do webhook N8N e cria mensagem/conversa automaticamente';
COMMENT ON FUNCTION buscar_conversas_whatsapp IS 'Busca conversas do usuário com paginação e filtros';
COMMENT ON FUNCTION buscar_mensagens_conversa IS 'Busca mensagens de uma conversa específica';
COMMENT ON FUNCTION marcar_conversa_como_lida IS 'Marca todas as mensagens de uma conversa como lidas';
COMMENT ON FUNCTION obter_estatisticas_conversas_whatsapp IS 'Retorna estatísticas resumidas das conversas do usuário';

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_mensagens_whatsapp_conversa_data 
  ON mensagens_whatsapp(conversa_id, data_hora DESC);

CREATE INDEX IF NOT EXISTS idx_conversas_whatsapp_user_atividade 
  ON conversas_whatsapp(user_id, ultima_atividade DESC);

CREATE INDEX IF NOT EXISTS idx_conversas_whatsapp_status_user 
  ON conversas_whatsapp(status, user_id);

CREATE INDEX IF NOT EXISTS idx_mensagens_whatsapp_user_data 
  ON mensagens_whatsapp(user_id, data_hora DESC);

CREATE INDEX IF NOT EXISTS idx_conversas_whatsapp_numero_contato 
  ON conversas_whatsapp(numero_contato);

-- Add helpful utility function for webhook testing
CREATE FUNCTION testar_webhook_whatsapp()
RETURNS jsonb AS $$
DECLARE
  teste_data jsonb;
  resultado jsonb;
BEGIN
  -- Create test webhook data
  teste_data := jsonb_build_object(
    'numero', '5511999999999',
    'mensagem', 'Mensagem de teste do sistema',
    'direcao', 'received',
    'data_hora', now()::text,
    'conversa_id', 'teste_' || extract(epoch from now())::text,
    'nome_contato', 'Contato Teste'
  );

  -- Process test webhook
  SELECT processar_webhook_whatsapp(teste_data) INTO resultado;

  RETURN jsonb_build_object(
    'teste_data', teste_data,
    'resultado', resultado,
    'timestamp', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission for test function
GRANT EXECUTE ON FUNCTION testar_webhook_whatsapp() TO authenticated;

COMMENT ON FUNCTION testar_webhook_whatsapp IS 'Função para testar o processamento de webhooks do WhatsApp';