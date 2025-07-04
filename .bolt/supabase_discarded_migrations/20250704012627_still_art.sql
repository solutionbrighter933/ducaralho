/*
  # Criar tabela para conversas com IA bloqueada

  1. Nova Tabela
    - `ai_blocked_conversations` - Armazena conversas onde a IA está desativada
    - Usa `conversa_id` como identificador único da conversa (sender_id para Instagram, numero para WhatsApp)
    - Vincula ao usuário e organização para controle de acesso

  2. Segurança
    - Habilita RLS na tabela
    - Políticas para usuários acessarem apenas seus próprios dados
    - Índices para melhor performance

  3. Estrutura
    - Cada registro representa uma conversa onde a IA está desativada
    - A ausência de registro significa que a IA está ativa para aquela conversa
*/

-- Criar tabela para armazenar conversas com IA bloqueada
CREATE TABLE IF NOT EXISTS ai_blocked_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id text NOT NULL, -- ID da conversa onde a IA está desativada
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- ID do usuário que desativou a IA
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, -- ID da organização do usuário
  created_at timestamptz DEFAULT now()
);

-- Adicionar comentário à tabela
COMMENT ON TABLE ai_blocked_conversations IS 'Armazena conversas onde a IA está desativada';
COMMENT ON COLUMN ai_blocked_conversations.conversa_id IS 'ID da conversa onde a IA está desativada';
COMMENT ON COLUMN ai_blocked_conversations.user_id IS 'ID do usuário que desativou a IA';
COMMENT ON COLUMN ai_blocked_conversations.organization_id IS 'ID da organização do usuário';

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_ai_blocked_conversations_conversa_id ON ai_blocked_conversations(conversa_id);
CREATE INDEX IF NOT EXISTS idx_ai_blocked_conversations_user_id ON ai_blocked_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_blocked_conversations_organization_id ON ai_blocked_conversations(organization_id);

-- Criar constraint de unicidade para evitar duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_conversa_id ON ai_blocked_conversations(user_id, conversa_id);
ALTER TABLE ai_blocked_conversations ADD CONSTRAINT unique_user_conversa_id UNIQUE USING INDEX unique_user_conversa_id;

-- Criar constraint de unicidade para conversa_id
CREATE UNIQUE INDEX IF NOT EXISTS ai_blocked_conversations_conversa_id_key ON ai_blocked_conversations(conversa_id);
ALTER TABLE ai_blocked_conversations ADD CONSTRAINT ai_blocked_conversations_conversa_id_key UNIQUE USING INDEX ai_blocked_conversations_conversa_id_key;

-- Habilitar Row Level Security
ALTER TABLE ai_blocked_conversations ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para ai_blocked_conversations
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

-- Políticas em português (para compatibilidade)
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

-- Conceder permissões para usuários autenticados
GRANT ALL ON ai_blocked_conversations TO authenticated;