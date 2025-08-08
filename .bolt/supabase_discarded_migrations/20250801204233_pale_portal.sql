/*
  # Adicionar colunas user_id e organization_id à tabela produtos

  1. Modificações na Tabela
    - Adicionar coluna `organization_id` (UUID) à tabela `produtos`
    - Adicionar coluna `user_id` (UUID) à tabela `produtos`
    - Criar chaves estrangeiras para `organizations` e `users`
  
  2. Segurança
    - Habilitar RLS na tabela `produtos`
    - Adicionar políticas para usuários autenticados gerenciarem seus próprios produtos
    - Garantir isolamento por organização
*/

-- Adicionar colunas à tabela produtos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'produtos' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.produtos ADD COLUMN organization_id UUID;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'produtos' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.produtos ADD COLUMN user_id UUID;
  END IF;
END $$;

-- Adicionar chaves estrangeiras
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'produtos_organization_id_fkey'
  ) THEN
    ALTER TABLE public.produtos
    ADD CONSTRAINT produtos_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'produtos_user_id_fkey'
  ) THEN
    ALTER TABLE public.produtos
    ADD CONSTRAINT produtos_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Habilitar RLS
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- Política para visualizar produtos próprios
CREATE POLICY IF NOT EXISTS "Users can view their own products"
ON public.produtos FOR SELECT
TO authenticated
USING (
  (user_id = auth.uid()) AND
  (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()))
);

-- Política para inserir produtos próprios
CREATE POLICY IF NOT EXISTS "Users can insert their own products"
ON public.produtos FOR INSERT
TO authenticated
WITH CHECK (
  (user_id = auth.uid()) AND
  (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()))
);

-- Política para atualizar produtos próprios
CREATE POLICY IF NOT EXISTS "Users can update their own products"
ON public.produtos FOR UPDATE
TO authenticated
USING (
  (user_id = auth.uid()) AND
  (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()))
)
WITH CHECK (
  (user_id = auth.uid()) AND
  (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()))
);

-- Política para deletar produtos próprios
CREATE POLICY IF NOT EXISTS "Users can delete their own products"
ON public.produtos FOR DELETE
TO authenticated
USING (
  (user_id = auth.uid()) AND
  (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()))
);