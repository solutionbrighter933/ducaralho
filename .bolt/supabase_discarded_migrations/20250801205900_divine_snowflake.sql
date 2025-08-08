/*
  # Adicionar colunas user_id e organization_id à tabela pedidos

  1. Novas Colunas
    - `organization_id` (uuid) - Referência à organização do usuário
    - `user_id` (uuid) - Referência ao usuário que criou o pedido

  2. Chaves Estrangeiras
    - `organization_id` referencia `organizations(id)` com CASCADE
    - `user_id` referencia `auth.users(id)` com CASCADE

  3. Segurança
    - Habilitar RLS na tabela `pedidos`
    - Políticas para usuários autenticados gerenciarem apenas seus próprios pedidos
*/

-- Adicionar as novas colunas
ALTER TABLE public.pedidos
ADD COLUMN IF NOT EXISTS organization_id UUID,
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Adicionar chaves estrangeiras
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_pedidos_organization'
  ) THEN
    ALTER TABLE public.pedidos
    ADD CONSTRAINT fk_pedidos_organization
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_pedidos_user'
  ) THEN
    ALTER TABLE public.pedidos
    ADD CONSTRAINT fk_pedidos_user
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Habilitar RLS
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- Política para visualizar pedidos
CREATE POLICY IF NOT EXISTS "Users can view their own orders"
ON public.pedidos FOR SELECT
TO authenticated
USING (
  (user_id = auth.uid()) AND
  (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()))
);

-- Política para inserir pedidos
CREATE POLICY IF NOT EXISTS "Users can insert their own orders"
ON public.pedidos FOR INSERT
TO authenticated
WITH CHECK (
  (user_id = auth.uid()) AND
  (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()))
);

-- Política para atualizar pedidos
CREATE POLICY IF NOT EXISTS "Users can update their own orders"
ON public.pedidos FOR UPDATE
TO authenticated
USING (
  (user_id = auth.uid()) AND
  (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()))
)
WITH CHECK (
  (user_id = auth.uid()) AND
  (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()))
);

-- Política para deletar pedidos
CREATE POLICY IF NOT EXISTS "Users can delete their own orders"
ON public.pedidos FOR DELETE
TO authenticated
USING (
  (user_id = auth.uid()) AND
  (organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()))
);