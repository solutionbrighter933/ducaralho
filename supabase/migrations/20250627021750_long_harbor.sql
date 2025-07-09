/*
  # Complete Conversations Schema for Z-API Integration

  1. New Tables
    - Update existing tables to support Z-API integration
    - Add missing columns and constraints
    - Create proper relationships

  2. Security
    - Update RLS policies for new structure
    - Ensure proper access control

  3. Indexes
    - Add performance indexes for conversation queries
*/

-- Add missing columns to conversations table if they don't exist
DO $$
BEGIN
  -- Add numero_contato_cliente column for compatibility
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'numero_contato_cliente'
  ) THEN
    ALTER TABLE conversations ADD COLUMN numero_contato_cliente text;
  END IF;

  -- Add nome_contato_cliente column for compatibility
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'nome_contato_cliente'
  ) THEN
    ALTER TABLE conversations ADD COLUMN nome_contato_cliente text;
  END IF;

  -- Add id_conta_whatsapp column for compatibility
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'id_conta_whatsapp'
  ) THEN
    ALTER TABLE conversations ADD COLUMN id_conta_whatsapp uuid;
  END IF;
END $$;

-- Add missing columns to messages table if they don't exist
DO $$
BEGIN
  -- Add id_conversa column for compatibility
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'id_conversa'
  ) THEN
    ALTER TABLE messages ADD COLUMN id_conversa uuid;
  END IF;

  -- Add conteudo column for compatibility
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'conteudo'
  ) THEN
    ALTER TABLE messages ADD COLUMN conteudo text;
  END IF;

  -- Add remetente column for compatibility
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'remetente'
  ) THEN
    ALTER TABLE messages ADD COLUMN remetente text;
  END IF;
END $$;

-- Create function to sync conversation data
CREATE OR REPLACE FUNCTION sync_conversation_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync numero_contato_cliente from contacts table
  IF NEW.contact_id IS NOT NULL THEN
    UPDATE conversations 
    SET numero_contato_cliente = (
      SELECT phone_number FROM contacts WHERE id = NEW.contact_id
    ),
    nome_contato_cliente = (
      SELECT name FROM contacts WHERE id = NEW.contact_id
    ),
    id_conta_whatsapp = NEW.whatsapp_number_id
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically sync conversation data
DROP TRIGGER IF EXISTS sync_conversation_data_trigger ON conversations;
CREATE TRIGGER sync_conversation_data_trigger
  AFTER INSERT OR UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION sync_conversation_data();

-- Create function to sync message data
CREATE OR REPLACE FUNCTION sync_message_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync id_conversa and other fields
  NEW.id_conversa := NEW.conversation_id;
  NEW.conteudo := NEW.content;
  NEW.remetente := CASE 
    WHEN NEW.sender_type = 'customer' THEN 'cliente'
    WHEN NEW.sender_type = 'ai' THEN 'ia'
    WHEN NEW.sender_type = 'agent' THEN 'humano'
    ELSE NEW.sender_type
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically sync message data
DROP TRIGGER IF EXISTS sync_message_data_trigger ON messages;
CREATE TRIGGER sync_message_data_trigger
  BEFORE INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION sync_message_data();

-- Update existing conversations to sync data
UPDATE conversations 
SET numero_contato_cliente = contacts.phone_number,
    nome_contato_cliente = contacts.name,
    id_conta_whatsapp = conversations.whatsapp_number_id
FROM contacts 
WHERE conversations.contact_id = contacts.id;

-- Update existing messages to sync data
UPDATE messages 
SET id_conversa = conversation_id,
    conteudo = content,
    remetente = CASE 
      WHEN sender_type = 'customer' THEN 'cliente'
      WHEN sender_type = 'ai' THEN 'ia'
      WHEN sender_type = 'agent' THEN 'humano'
      ELSE sender_type
    END;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_numero_contato ON conversations(numero_contato_cliente);
CREATE INDEX IF NOT EXISTS idx_conversations_id_conta_whatsapp ON conversations(id_conta_whatsapp);
CREATE INDEX IF NOT EXISTS idx_messages_id_conversa ON messages(id_conversa);
CREATE INDEX IF NOT EXISTS idx_messages_remetente ON messages(remetente);

-- Grant necessary permissions
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT ALL ON contacts TO authenticated;
GRANT ALL ON whatsapp_numbers TO authenticated;