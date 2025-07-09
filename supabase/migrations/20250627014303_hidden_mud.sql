/*
  # Add missing fields to whatsapp_numbers table

  1. New Columns
    - Add `profile_id` field to link WhatsApp numbers to user profiles
    - Add `ai_prompt` field for AI agent customization
    - Add `is_ai_active` field to control AI responses
    - Add `connection_status` field to track connection state
    - Add `instance_id` field to store Z-API instance ID

  2. Security
    - Update RLS policies to work with profile_id
    - Ensure users can only access their own WhatsApp numbers
*/

-- Add missing columns to whatsapp_numbers table if they don't exist
DO $$
BEGIN
  -- Add profile_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'whatsapp_numbers' AND column_name = 'profile_id'
  ) THEN
    ALTER TABLE whatsapp_numbers ADD COLUMN profile_id uuid REFERENCES profiles(id);
  END IF;

  -- Add ai_prompt column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'whatsapp_numbers' AND column_name = 'ai_prompt'
  ) THEN
    ALTER TABLE whatsapp_numbers ADD COLUMN ai_prompt text DEFAULT 'Você é um assistente virtual.';
  END IF;

  -- Add is_ai_active column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'whatsapp_numbers' AND column_name = 'is_ai_active'
  ) THEN
    ALTER TABLE whatsapp_numbers ADD COLUMN is_ai_active boolean DEFAULT true;
  END IF;

  -- Add connection_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'whatsapp_numbers' AND column_name = 'connection_status'
  ) THEN
    ALTER TABLE whatsapp_numbers ADD COLUMN connection_status text DEFAULT 'DISCONNECTED';
  END IF;

  -- Add instance_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'whatsapp_numbers' AND column_name = 'instance_id'
  ) THEN
    ALTER TABLE whatsapp_numbers ADD COLUMN instance_id text;
  END IF;
END $$;

-- Create unique constraint for instance_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'whatsapp_numbers_instance_id_key' 
    AND table_name = 'whatsapp_numbers'
  ) THEN
    ALTER TABLE whatsapp_numbers ADD CONSTRAINT whatsapp_numbers_instance_id_key UNIQUE (instance_id);
  END IF;
END $$;

-- Update RLS policies for whatsapp_numbers to work with profile_id
DROP POLICY IF EXISTS "Users can manage WhatsApp numbers in their organization" ON whatsapp_numbers;

-- Create new policies based on profile_id
CREATE POLICY "Users can manage their own WhatsApp numbers"
  ON whatsapp_numbers
  FOR ALL
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_profile_id ON whatsapp_numbers(profile_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_instance_id ON whatsapp_numbers(instance_id);

-- Add foreign key constraint for profile_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'whatsapp_numbers_profile_id_fkey' 
    AND table_name = 'whatsapp_numbers'
  ) THEN
    ALTER TABLE whatsapp_numbers ADD CONSTRAINT whatsapp_numbers_profile_id_fkey 
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;