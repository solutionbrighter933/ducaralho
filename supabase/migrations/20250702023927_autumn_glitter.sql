/*
  # Create Instagram Connected Accounts Table

  1. New Table
    - `contas_conectadas` - Stores connected Instagram accounts
    - Links to auth.users for user ownership
    - Stores Instagram account details and access tokens

  2. Security
    - Enable RLS on the table
    - Create policies for user data access
    - Users can only access their own connected accounts

  3. Performance
    - Add indexes for better query performance
    - Add unique constraint to prevent duplicate accounts
*/

-- Create contas_conectadas table if it doesn't exist
CREATE TABLE IF NOT EXISTS contas_conectadas (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instagram_account_id text NOT NULL,
  instagram_username text,
  page_id text,
  access_token text NOT NULL,
  status text DEFAULT 'connected',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz
);

-- Enable RLS
ALTER TABLE contas_conectadas ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Usuários podem ver apenas suas próprias contas" ON contas_conectadas;
DROP POLICY IF EXISTS "Usuários podem inserir suas próprias contas" ON contas_conectadas;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias contas" ON contas_conectadas;

-- Create policies
CREATE POLICY "Usuários podem ver apenas suas próprias contas"
  ON contas_conectadas
  FOR SELECT
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias contas"
  ON contas_conectadas
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias contas"
  ON contas_conectadas
  FOR UPDATE
  TO public
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contas_conectadas_instagram_id 
  ON contas_conectadas(instagram_account_id);

-- Add unique constraint to prevent duplicate accounts per user (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_user_instagram_account' 
    AND table_name = 'contas_conectadas'
  ) THEN
    ALTER TABLE contas_conectadas 
    ADD CONSTRAINT unique_user_instagram_account 
    UNIQUE (user_id, instagram_account_id);
  END IF;
END $$;