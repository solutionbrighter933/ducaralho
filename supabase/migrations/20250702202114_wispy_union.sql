-- First, let's check and fix the table structure
DO $$
BEGIN
  -- Drop any problematic foreign key constraints
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'mensagens_whatsapp_conversa_id_fkey' 
    AND table_name = 'mensagens_whatsapp'
  ) THEN
    ALTER TABLE mensagens_whatsapp DROP CONSTRAINT mensagens_whatsapp_conversa_id_fkey;
  END IF;

  -- Ensure the numero column exists (not numero_contato)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mensagens_whatsapp' AND column_name = 'numero'
  ) THEN
    -- Add numero column if it doesn't exist
    ALTER TABLE mensagens_whatsapp ADD COLUMN numero text;
    
    -- Copy data from numero_contato if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'mensagens_whatsapp' AND column_name = 'numero_contato'
    ) THEN
      UPDATE mensagens_whatsapp SET numero = numero_contato WHERE numero IS NULL;
    END IF;
  END IF;

  -- Ensure numero is NOT NULL
  UPDATE mensagens_whatsapp SET numero = 'unknown' WHERE numero IS NULL;
  ALTER TABLE mensagens_whatsapp ALTER COLUMN numero SET NOT NULL;
END $$;

-- Drop existing triggers and functions to recreate them properly
DROP TRIGGER IF EXISTS trigger_atualizar_conversa_whatsapp ON mensagens_whatsapp;
DROP FUNCTION IF EXISTS atualizar_conversa_whatsapp();

-- Drop existing functions that might conflict
DROP FUNCTION IF EXISTS inserir_mensagem_whatsapp(text, text, text, text, timestamptz, text, uuid, uuid, text, text, jsonb);
DROP FUNCTION IF EXISTS processar_webhook_whatsapp(jsonb);
DROP FUNCTION IF EXISTS testar_sistema_whatsapp();

-- Create improved function for automatic conversation management
CREATE OR REPLACE FUNCTION atualizar_conversa_whatsapp()
RETURNS TRIGGER AS $$
DECLARE
  conversa_existe boolean := false;
  numero_final text;
BEGIN
  -- Use numero column (not numero_contato)
  numero_final := COALESCE(NEW.numero, 'unknown');
  
  -- Ensure we have required data
  IF NEW.conversa_id IS NULL OR numero_final = 'unknown' THEN
    RAISE WARNING 'Missing required data for conversation update: conversa_id=%, numero=%', NEW.conversa_id, numero_final;
    RETURN NEW;
  END IF;

  -- Check if conversation exists
  SELECT EXISTS(
    SELECT 1 FROM conversas_whatsapp 
    WHERE conversa_id = NEW.conversa_id
  ) INTO conversa_existe;

  IF NOT conversa_existe THEN
    -- Create new conversation
    BEGIN
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
        numero_final,
        COALESCE(NEW.nome_contato, numero_final),
        NEW.user_id,
        NEW.organization_id,
        'ativa',
        NEW.mensagem,
        NEW.data_hora,
        1,
        CASE WHEN NEW.direcao = 'received' THEN 1 ELSE 0 END,
        COALESCE(NEW.created_at, now()),
        COALESCE(NEW.updated_at, now())
      );
      
      RAISE NOTICE 'Created new conversation: %', NEW.conversa_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to create conversation %: %', NEW.conversa_id, SQLERRM;
    END;
  ELSE
    -- Update existing conversation
    BEGIN
      UPDATE conversas_whatsapp 
      SET 
        nome_contato = COALESCE(NEW.nome_contato, conversas_whatsapp.nome_contato, numero_final),
        ultima_mensagem = NEW.mensagem,
        ultima_atividade = NEW.data_hora,
        total_mensagens = conversas_whatsapp.total_mensagens + 1,
        nao_lidas = CASE 
          WHEN NEW.direcao = 'received' THEN conversas_whatsapp.nao_lidas + 1 
          ELSE conversas_whatsapp.nao_lidas 
        END,
        updated_at = COALESCE(NEW.updated_at, now())
      WHERE conversa_id = NEW.conversa_id;
      
      RAISE NOTICE 'Updated conversation: %', NEW.conversa_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to update conversation %: %', NEW.conversa_id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the message insertion
    RAISE WARNING 'Error in conversation trigger for %: %', NEW.conversa_id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_atualizar_conversa_whatsapp
  AFTER INSERT ON mensagens_whatsapp
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_conversa_whatsapp();

-- Create improved function to insert messages with auto-conversation creation
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

  -- Validate required parameters
  IF p_conversa_id IS NULL OR p_numero IS NULL OR p_mensagem IS NULL OR p_direcao IS NULL THEN
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
    p_direcao,
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

  RAISE NOTICE 'Inserted message % for conversation %', nova_mensagem_id, p_conversa_id;
  
  RETURN nova_mensagem_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to process webhook data
CREATE OR REPLACE FUNCTION processar_webhook_whatsapp(
  webhook_data jsonb
)
RETURNS jsonb AS $$
DECLARE
  resultado jsonb;
  mensagem_id uuid;
  numero_limpo text;
  conversa_id_final text;
  current_user_id uuid;
  current_org_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- Get organization from user profile
  SELECT organization_id INTO current_org_id
  FROM profiles 
  WHERE user_id = current_user_id
  LIMIT 1;

  -- Clean phone number (remove special characters)
  numero_limpo := regexp_replace(
    COALESCE(webhook_data->>'numero', webhook_data->>'numero_contato', ''), 
    '[^0-9]', 
    '', 
    'g'
  );
  
  -- Generate conversation ID if not provided
  conversa_id_final := COALESCE(
    webhook_data->>'conversa_id',
    'auto_' || numero_limpo || '_' || extract(epoch from now())::text
  );

  -- Validate required data
  IF numero_limpo = '' OR (webhook_data->>'mensagem') IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Missing required fields: numero and mensagem',
      'webhook_data', webhook_data
    );
  END IF;

  -- Insert message using helper function
  SELECT inserir_mensagem_whatsapp(
    conversa_id_final,
    numero_limpo,
    webhook_data->>'mensagem',
    CASE 
      WHEN (webhook_data->>'direcao') = 'sent' THEN 'sent'
      WHEN (webhook_data->>'direcao') = 'received' THEN 'received'
      ELSE 'received' -- Default to received
    END,
    COALESCE(
      (webhook_data->>'data_hora')::timestamptz,
      now()
    ),
    webhook_data->>'nome_contato',
    current_user_id,
    current_org_id,
    COALESCE(webhook_data->>'tipo_mensagem', 'text'),
    COALESCE(webhook_data->>'status_entrega', 'delivered'),
    webhook_data
  ) INTO mensagem_id;

  -- Return success result
  resultado := jsonb_build_object(
    'success', true,
    'mensagem_id', mensagem_id,
    'conversa_id', conversa_id_final,
    'numero_contato', numero_limpo,
    'user_id', current_user_id,
    'organization_id', current_org_id,
    'timestamp', now()
  );

  RETURN resultado;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error without failing
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'webhook_data', webhook_data,
      'user_id', current_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to test the system with sample data
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
  
 
-- Grant permissions to all functions
GRANT EXECUTE ON FUNCTION inserir_mensagem_whatsapp(text, text, text, text, timestamptz, text, uuid, uuid, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION processar_webhook_whatsapp(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION testar_sistema_whatsapp() TO authenticated;

-- Ensure proper indexes exist
CREATE INDEX IF NOT EXISTS idx_mensagens_whatsapp_numero ON mensagens_whatsapp(numero);
CREATE INDEX IF NOT EXISTS idx_mensagens_whatsapp_conversa_user ON mensagens_whatsapp(conversa_id, user_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_whatsapp_user_data ON mensagens_whatsapp(user_id, data_hora DESC);

-- Add helpful comments
COMMENT ON FUNCTION inserir_mensagem_whatsapp IS 'Insere mensagem e cria conversa automaticamente se necessário';
COMMENT ON FUNCTION processar_webhook_whatsapp IS 'Processa webhook do N8N e cria mensagem/conversa automaticamente';
COMMENT ON FUNCTION testar_sistema_whatsapp IS 'Cria dados de teste para verificar funcionamento do sistema';
COMMENT ON FUNCTION atualizar_conversa_whatsapp IS 'Trigger function para atualizar/criar conversas automaticamente';

-- Ensure RLS is properly configured
ALTER TABLE conversas_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens_whatsapp ENABLE ROW LEVEL SECURITY;

-- Verify and recreate RLS policies if needed
DO $$
BEGIN
  -- Drop existing policies to recreate them
  DROP POLICY IF EXISTS "Usuários podem ver suas próprias conversas" ON conversas_whatsapp;
  DROP POLICY IF EXISTS "Usuários podem inserir suas próprias conversas" ON conversas_whatsapp;
  DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias conversas" ON conversas_whatsapp;
  DROP POLICY IF EXISTS "Usuários podem deletar suas próprias conversas" ON conversas_whatsapp;
  
  DROP POLICY IF EXISTS "Usuários podem ver suas próprias mensagens" ON mensagens_whatsapp;
  DROP POLICY IF EXISTS "Usuários podem inserir suas próprias mensagens" ON mensagens_whatsapp;
  DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias mensagens" ON mensagens_whatsapp;
  DROP POLICY IF EXISTS "Usuários podem deletar suas próprias mensagens" ON mensagens_whatsapp;

  -- Create policies for conversas_whatsapp
  CREATE POLICY "Usuários podem ver suas próprias conversas"
    ON conversas_whatsapp FOR SELECT TO authenticated
    USING (user_id = auth.uid());

  CREATE POLICY "Usuários podem inserir suas próprias conversas"
    ON conversas_whatsapp FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

  CREATE POLICY "Usuários podem atualizar suas próprias conversas"
    ON conversas_whatsapp FOR UPDATE TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

  CREATE POLICY "Usuários podem deletar suas próprias conversas"
    ON conversas_whatsapp FOR DELETE TO authenticated
    USING (user_id = auth.uid());

  -- Create policies for mensagens_whatsapp
  CREATE POLICY "Usuários podem ver suas próprias mensagens"
    ON mensagens_whatsapp FOR SELECT TO authenticated
    USING (user_id = auth.uid());

  CREATE POLICY "Usuários podem inserir suas próprias mensagens"
    ON mensagens_whatsapp FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

  CREATE POLICY "Usuários podem atualizar suas próprias mensagens"
    ON mensagens_whatsapp FOR UPDATE TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

  CREATE POLICY "Usuários podem deletar suas próprias mensagens"
    ON mensagens_whatsapp FOR DELETE TO authenticated
    USING (user_id = auth.uid());
END $$;

-- Final verification and cleanup
DO $$
DECLARE
  conversas_count integer;
  mensagens_count integer;
BEGIN
  -- Count existing data
  SELECT COUNT(*) INTO conversas_count FROM conversas_whatsapp;
  SELECT COUNT(*) INTO mensagens_count FROM mensagens_whatsapp;
  
  RAISE NOTICE 'Migration completed. Existing data: % conversas, % mensagens', conversas_count, mensagens_count;
  RAISE NOTICE 'System is ready for automatic conversation creation when messages are received';
END $$;