/*
  # Add AI Blocked Conversations Table
  
  1. New Table
    - `ai_blocked_conversations` - Stores conversations where AI is disabled
    - Links to users and organizations
    - Tracks which conversations have AI responses disabled
  
  2. Security
    - Enable RLS on the table
    - Create policies for user data access
    - Users can only manage their own blocked conversations
  
  3. Performance
    - Add indexes for better query performance
    - Add unique constraints to prevent duplicates
*/

-- Create ai_blocked_conversations table if it doesn't exist
CREATE TABLE IF NOT EXISTS ai_blocked_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Add comment to table
COMMENT ON TABLE ai_blocked_conversations IS 'Armazena conversas onde a IA está desativada';
COMMENT ON COLUMN ai_blocked_conversations.conversa_id IS 'ID da conversa onde a IA está desativada';
COMMENT ON COLUMN ai_blocked_conversations.user_id IS 'ID do usuário que desativou a IA';
COMMENT ON COLUMN ai_blocked_conversations.organization_id IS 'ID da organização do usuário';

-- Enable RLS
ALTER TABLE ai_blocked_conversations ENABLE ROW LEVEL SECURITY;

-- Create unique constraints only if they don't exist
DO $$
BEGIN
  -- Check if conversa_id constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ai_blocked_conversations_conversa_id_key'
  ) THEN
    ALTER TABLE ai_blocked_conversations 
    ADD CONSTRAINT ai_blocked_conversations_conversa_id_key 
    UNIQUE (conversa_id);
  END IF;
  
  -- Check if user_id + conversa_id constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_user_conversa_id'
  ) THEN
    ALTER TABLE ai_blocked_conversations 
    ADD CONSTRAINT unique_user_conversa_id 
    UNIQUE (user_id, conversa_id);
  END IF;
END $$;

-- Create indexes for better performance (IF NOT EXISTS is implicit for CREATE INDEX)
CREATE INDEX IF NOT EXISTS idx_ai_blocked_conversations_conversa_id ON ai_blocked_conversations(conversa_id);
CREATE INDEX IF NOT EXISTS idx_ai_blocked_conversations_user_id ON ai_blocked_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_blocked_conversations_organization_id ON ai_blocked_conversations(organization_id);

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own blocked conversations" ON ai_blocked_conversations;
DROP POLICY IF EXISTS "Users can insert their own blocked conversations" ON ai_blocked_conversations;
DROP POLICY IF EXISTS "Users can delete their own blocked conversations" ON ai_blocked_conversations;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias conversas bloqueadas" ON ai_blocked_conversations;
DROP POLICY IF EXISTS "Usuários podem inserir suas próprias conversas bloqueadas" ON ai_blocked_conversations;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias conversas bloqueadas" ON ai_blocked_conversations;

-- Create policies for RLS
CREATE POLICY "Users can view their own blocked conversations"
  ON ai_blocked_conversations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own blocked conversations"
  ON ai_blocked_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own blocked conversations"
  ON ai_blocked_conversations
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create duplicate policies with Portuguese names for consistency
CREATE POLICY "Usuários podem ver suas próprias conversas bloqueadas"
  ON ai_blocked_conversations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Usuários podem inserir suas próprias conversas bloqueadas"
  ON ai_blocked_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuários podem deletar suas próprias conversas bloqueadas"
  ON ai_blocked_conversations
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());