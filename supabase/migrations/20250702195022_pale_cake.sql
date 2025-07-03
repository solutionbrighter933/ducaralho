/*
  # Fix WhatsApp Conversations Data Display

  1. Problem Analysis
    - Data from mensagens_whatsapp table is not being displayed properly
    - Need to ensure functions return correct data structure
    - Fix any issues with data retrieval

  2. Solution
    - Update functions to ensure proper data return
    - Add debugging and better error handling
    - Create test data insertion function
    - Verify table structure and indexes

  3. Testing
    - Add function to create sample data for testing
    - Ensure all functions work correctly
*/

-- First, let's verify our tables exist and have the right structure
DO $$
BEGIN
  -- Check if tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversas_whatsapp') THEN
    RAISE EXCEPTION 'Table conversas_whatsapp does not exist';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mensagens_whatsapp') THEN
    RAISE EXCEPTION 'Table mensagens_whatsapp does not exist';
  END IF;
END $$;

-- Drop and recreate the search functions with better error handling and debugging
DROP FUNCTION IF EXISTS buscar_conversas_whatsapp(uuid, integer, integer, text);
DROP FUNCTION IF EXISTS buscar_mensagens_conversa(text, integer, integer);
DROP FUNCTION IF EXISTS obter_estatisticas_conversas_whatsapp();

-- 1. Improved function to search conversations
CREATE OR REPLACE FUNCTION buscar_conversas_whatsapp(
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
  debug_info text;
BEGIN
  -- Use provided user_id or current authenticated user
  user_id_final := COALESCE(p_user_id, auth.uid());
  
  -- Debug information
  debug_info := format('Searching conversations for user_id: %s, limit: %s, offset: %s, status: %s', 
                      user_id_final, p_limite, p_offset, p_status);
  RAISE NOTICE '%', debug_info;

  -- Return conversations
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
  ORDER BY c.ultima_atividade DESC NULLS LAST, c.created_at DESC
  LIMIT p_limite
  OFFSET p_offset;
  
  -- Log how many rows were returned
  GET DIAGNOSTICS debug_info = ROW_COUNT;
  RAISE NOTICE 'Returned % conversation rows', debug_info;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Improved function to search messages from a conversation
CREATE OR REPLACE FUNCTION buscar_mensagens_conversa(
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
DECLARE
  debug_info text;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- Debug information
  debug_info := format('Searching messages for conversation: %s, user: %s, limit: %s, offset: %s', 
                      p_conversa_id, current_user_id, p_limite, p_offset);
  RAISE NOTICE '%', debug_info;

  -- Return messages
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
    AND m.user_id = current_user_id
  ORDER BY m.data_hora ASC
  LIMIT p_limite
  OFFSET p_offset;
  
  -- Log how many rows were returned
  GET DIAGNOSTICS debug_info = ROW_COUNT;
  RAISE NOTICE 'Returned % message rows', debug_info;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Improved function to get conversation statistics
CREATE OR REPLACE FUNCTION obter_estatisticas_conversas_whatsapp()
RETURNS TABLE(
  total_conversas bigint,
  conversas_ativas bigint,
  mensagens_nao_lidas bigint,
  ultima_atividade timestamptz
) AS $$
DECLARE
  current_user_id uuid;
  debug_info text;
BEGIN
  current_user_id := auth.uid();
  
  debug_info := format('Getting statistics for user: %s', current_user_id);
  RAISE NOTICE '%', debug_info;

  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_conversas,
    COUNT(*) FILTER (WHERE c.status = 'ativa')::bigint as conversas_ativas,
    COALESCE(SUM(c.nao_lidas), 0)::bigint as mensagens_nao_lidas,
    MAX(c.ultima_atividade) as ultima_atividade
  FROM conversas_whatsapp c
  WHERE c.user_id = current_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to create sample test data
CREATE OR REPLACE FUNCTION criar_dados_teste_whatsapp()
RETURNS jsonb AS $$
DECLARE
  current_user_id uuid;
  current_org_id uuid;
  conversa_id_1 text;
  conversa_id_2 text;
  resultado jsonb;
BEGIN
  current_user_id := auth.uid();
  
  -- Get user's organization
  SELECT organization_id INTO current_org_id
  FROM profiles 
  WHERE user_id = current_user_id
  LIMIT 1;
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'User not authenticated');
  END IF;
  
  -- Generate unique conversation IDs
  conversa_id_1 := 'teste_conversa_' || extract(epoch from now())::text || '_1';
  conversa_id_2 := 'teste_conversa_' || extract(epoch from now())::text || '_2';
  

-- 5. Function to get detailed conversation info for debugging
CREATE OR REPLACE FUNCTION debug_conversas_whatsapp()
RETURNS TABLE(
  table_name text,
  total_rows bigint,
  user_rows bigint,
  sample_data jsonb
) AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- Return debug information
  RETURN QUERY
  SELECT 
    'conversas_whatsapp'::text,
    (SELECT COUNT(*) FROM conversas_whatsapp)::bigint,
    (SELECT COUNT(*) FROM conversas_whatsapp WHERE user_id = current_user_id)::bigint,
    (SELECT jsonb_agg(
      jsonb_build_object(
        'id', id,
        'conversa_id', conversa_id,
        'numero_contato', numero_contato,
        'nome_contato', nome_contato,
        'total_mensagens', total_mensagens,
        'nao_lidas', nao_lidas,
        'user_id', user_id
      )
    ) FROM (SELECT * FROM conversas_whatsapp WHERE user_id = current_user_id LIMIT 3) sub)
  
  UNION ALL
  
  SELECT 
    'mensagens_whatsapp'::text,
    (SELECT COUNT(*) FROM mensagens_whatsapp)::bigint,
    (SELECT COUNT(*) FROM mensagens_whatsapp WHERE user_id = current_user_id)::bigint,
    (SELECT jsonb_agg(
      jsonb_build_object(
        'id', id,
        'conversa_id', conversa_id,
        'mensagem', mensagem,
        'direcao', direcao,
        'data_hora', data_hora,
        'user_id', user_id
      )
    ) FROM (SELECT * FROM mensagens_whatsapp WHERE user_id = current_user_id LIMIT 3) sub);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to all functions
GRANT EXECUTE ON FUNCTION buscar_conversas_whatsapp(uuid, integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION buscar_mensagens_conversa(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION obter_estatisticas_conversas_whatsapp() TO authenticated;
GRANT EXECUTE ON FUNCTION criar_dados_teste_whatsapp() TO authenticated;
GRANT EXECUTE ON FUNCTION debug_conversas_whatsapp() TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION buscar_conversas_whatsapp IS 'Busca conversas do usuário com debug melhorado';
COMMENT ON FUNCTION buscar_mensagens_conversa IS 'Busca mensagens de uma conversa com debug melhorado';
COMMENT ON FUNCTION obter_estatisticas_conversas_whatsapp IS 'Retorna estatísticas das conversas com debug';
COMMENT ON FUNCTION criar_dados_teste_whatsapp IS 'Cria dados de teste para conversas e mensagens';
COMMENT ON FUNCTION debug_conversas_whatsapp IS 'Função de debug para verificar dados das tabelas';

-- Ensure indexes exist for better performance
CREATE INDEX IF NOT EXISTS idx_conversas_whatsapp_user_atividade_created 
  ON conversas_whatsapp(user_id, ultima_atividade DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mensagens_whatsapp_conversa_user_data 
  ON mensagens_whatsapp(conversa_id, user_id, data_hora ASC);

-- Update the test webhook function to be more robust
DROP FUNCTION IF EXISTS testar_webhook_whatsapp();

CREATE OR REPLACE FUNCTION testar_webhook_whatsapp()
RETURNS jsonb AS $$
DECLARE
  current_user_id uuid;
  current_org_id uuid;
  teste_conversa_id text;
  resultado jsonb;
  mensagem_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- Get user's organization
  SELECT organization_id INTO current_org_id
  FROM profiles 
  WHERE user_id = current_user_id
  LIMIT 1;
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'User not authenticated');
  END IF;
  
  -- Generate unique conversation ID
  teste_conversa_id := 'webhook_teste_' || extract(epoch from now())::text;
  
  -- Insert test message using our function
  SELECT inserir_mensagem_whatsapp(
    teste_conversa_id,
    '5511999888777',
    'Esta é uma mensagem de teste do webhook!',
    'received',
    now(),
    'Contato Teste Webhook',
    current_user_id,
    current_org_id,
    'text',
    'delivered',
    jsonb_build_object('teste', true, 'webhook', 'simulado')
  ) INTO mensagem_id;
  
  resultado := jsonb_build_object(
    'success', true,
    'mensagem_id', mensagem_id,
    'conversa_id', teste_conversa_id,
    'user_id', current_user_id,
    'organization_id', current_org_id,
    'timestamp', now()
  );
  
  RETURN resultado;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'user_id', current_user_id,
      'organization_id', current_org_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION testar_webhook_whatsapp() TO authenticated;