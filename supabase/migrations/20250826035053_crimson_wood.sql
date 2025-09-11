/*
  # Adicionar coluna nomeagente à tabela whatsapp_numbers

  1. Alterações na Tabela
    - Adicionar coluna `nomeagente` à tabela `whatsapp_numbers`
    - Tipo: text com valor padrão 'Atendente Imortal'
    - Permite identificar qual agente está ativo para cada número

  2. Atualização de Dados
    - Definir 'Atendente Imortal' como padrão para registros existentes
    - Manter compatibilidade com sistema atual
*/

-- Adicionar coluna nomeagente à tabela whatsapp_numbers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_numbers' AND column_name = 'nomeagente'
  ) THEN
    ALTER TABLE whatsapp_numbers ADD COLUMN nomeagente text DEFAULT 'Atendente Imortal';
  END IF;
END $$;

-- Atualizar registros existentes para usar o agente padrão
UPDATE whatsapp_numbers 
SET nomeagente = 'Atendente Imortal' 
WHERE nomeagente IS NULL;