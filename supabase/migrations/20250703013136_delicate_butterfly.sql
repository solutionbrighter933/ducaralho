-- Adicionar a coluna direcao se ela não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mensagens_whatsapp' AND column_name = 'direcao'
  ) THEN
    -- Adicionar a coluna como nullable primeiro
    ALTER TABLE mensagens_whatsapp ADD COLUMN direcao text;
    
    -- Atualizar registros existentes baseado em outras colunas
    -- Se temos a coluna 'remetente', usar ela para determinar direção
    UPDATE mensagens_whatsapp 
    SET direcao = CASE 
      WHEN remetente = 'humano' OR remetente = 'ia' OR remetente = 'agent' THEN 'sent'
      WHEN remetente = 'cliente' OR remetente = 'customer' THEN 'received'
      ELSE 'received' -- Default para received se não conseguir determinar
    END
    WHERE direcao IS NULL;
    
    -- Se ainda temos registros sem direção, usar sender_type da tabela messages
    UPDATE mensagens_whatsapp 
    SET direcao = CASE 
      WHEN EXISTS (
        SELECT 1 FROM messages m 
        WHERE m.id_conversa::text = mensagens_whatsapp.conversa_id 
        AND m.content = mensagens_whatsapp.mensagem
        AND m.sender_type IN ('agent', 'ai')
      ) THEN 'sent'
      ELSE 'received'
    END
    WHERE direcao IS NULL;
    
    -- Para qualquer registro ainda sem direção, assumir como received
    UPDATE mensagens_whatsapp 
    SET direcao = 'received' 
    WHERE direcao IS NULL;
    
    -- Agora tornar a coluna NOT NULL
    ALTER TABLE mensagens_whatsapp ALTER COLUMN direcao SET NOT NULL;
    
    -- Adicionar constraint para garantir valores válidos
    ALTER TABLE mensagens_whatsapp 
    ADD CONSTRAINT check_direcao_valid 
    CHECK (direcao IN ('sent', 'received'));
    
    RAISE NOTICE 'Coluna direcao adicionada com sucesso à tabela mensagens_whatsapp';
  ELSE
    RAISE NOTICE 'Coluna direcao já existe na tabela mensagens_whatsapp';
  END IF;
END $$;

-- Atualizar a função de inserção para garantir que sempre inclua direção
CREATE OR REPLACE FUNCTION inserir_mensagem_whatsapp(
  p_conversa_id text,
  p_numero text,
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
  direcao_final text;
BEGIN
  -- Use current user_id if not provided
  user_id_final := COALESCE(p_user_id, auth.uid());
  
  -- Get organization_id from user profile if not provided
  IF p_organization_id IS NULL AND user_id_final IS NOT NULL THEN
    SELECT organization_id INTO org_id_final
    FROM profiles 
    WHERE user_id = user_id_final
    LIMIT 1;
  ELSE
    org_id_final := p_organization_id;
  END IF;

  -- Validate and normalize direction
  direcao_final := CASE 
    WHEN p_direcao = 'sent' THEN 'sent'
    WHEN p_direcao = 'received' THEN 'received'
    WHEN p_direcao = 'enviada' THEN 'sent'
    WHEN p_direcao = 'recebida' THEN 'received'
    ELSE 'received' -- Default to received if invalid
  END;

  -- Validate required parameters
  IF p_conversa_id IS NULL OR p_numero IS NULL OR p_mensagem IS NULL THEN
    RAISE EXCEPTION 'Missing required parameters for message insertion';
  END IF;

  -- Insert message (trigger will handle conversation)
  INSERT INTO mensagens_whatsapp (
    conversa_id,
    numero,
    mensagem,
    direcao,
    data_hora,
    nome_contato,
    user_id,
    organization_id,
    tipo_mensagem,
    status_entrega,
    metadata,
    created_at,
    updated_at
  )
  VALUES (
    p_conversa_id,
    p_numero,
    p_mensagem,
    direcao_final,
    p_data_hora,
    p_nome_contato,
    user_id_final,
    org_id_final,
    p_tipo_mensagem,
    p_status_entrega,
    p_metadata,
    now(),
    now()
  )
  RETURNING id INTO nova_mensagem_id;

  RAISE NOTICE 'Inserted message % with direction % for conversation %', nova_mensagem_id, direcao_final, p_conversa_id;
  
  RETURN nova_mensagem_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar função de teste para usar direção correta
CREATE OR REPLACE FUNCTION testar_sistema_whatsapp()
RETURNS jsonb AS $$
DECLARE
  current_user_id uuid;
  current_org_id uuid;
  conversa_id_1 text;
  conversa_id_2 text;
  resultado jsonb;
  mensagens_criadas integer := 0;
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
  conversa_id_1 := 'teste_' || extract(epoch from now())::text || '_1';
  conversa_id_2 := 'teste_' || extract(epoch from now())::text || '_2';
  


-- Verificar se a coluna foi adicionada corretamente
DO $$
DECLARE
  col_exists boolean;
  sample_count integer;
BEGIN
  -- Check if column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mensagens_whatsapp' AND column_name = 'direcao'
  ) INTO col_exists;
  
  IF col_exists THEN
    -- Count messages with each direction
    SELECT COUNT(*) INTO sample_count FROM mensagens_whatsapp WHERE direcao = 'sent';
    RAISE NOTICE 'Coluna direcao existe. Mensagens enviadas: %', sample_count;
    
    SELECT COUNT(*) INTO sample_count FROM mensagens_whatsapp WHERE direcao = 'received';
    RAISE NOTICE 'Mensagens recebidas: %', sample_count;
  ELSE
    RAISE WARNING 'Coluna direcao ainda não existe!';
  END IF;
END $$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION inserir_mensagem_whatsapp(text, text, text, text, timestamptz, text, uuid, uuid, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION testar_sistema_whatsapp() TO authenticated;

-- Add helpful comment
COMMENT ON COLUMN mensagens_whatsapp.direcao IS 'Direção da mensagem: sent (enviada pelo usuário, lado direito) ou received (recebida do contato, lado esquerdo)';