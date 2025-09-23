/*
  # Add custom name column to Instagram conversations

  1. Schema Changes
    - Add `nomepersonalizado` column to `conversas_instagram` table
    - Allow null values for backward compatibility
    - Add index for better performance

  2. Security
    - No RLS changes needed as table inherits existing policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversas_instagram' AND column_name = 'nomepersonalizado'
  ) THEN
    ALTER TABLE conversas_instagram ADD COLUMN nomepersonalizado text;
    
    -- Add index for better performance when searching by custom name
    CREATE INDEX IF NOT EXISTS idx_conversas_instagram_nomepersonalizado 
    ON conversas_instagram (nomepersonalizado);
    
    -- Add comment to document the column purpose
    COMMENT ON COLUMN conversas_instagram.nomepersonalizado IS 'Nome personalizado definido pelo usuário para identificar o contato do Instagram';
  END IF;
END $$;