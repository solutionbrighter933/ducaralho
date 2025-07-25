/*
  # Create Z-API Configurations Table

  1. New Tables
    - `zapi_configs`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key to organizations)
      - `instance_id` (text, Z-API instance ID)
      - `token` (text, Z-API token)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `zapi_configs` table
    - Add policy for users to manage their organization's Z-API config

  3. Indexes
    - Unique index on organization_id to ensure one config per organization
    - Index on organization_id for fast lookups
*/

-- Create the zapi_configs table
CREATE TABLE IF NOT EXISTS zapi_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  instance_id text NOT NULL,
  token text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique index to ensure one config per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_zapi_configs_organization_unique 
ON zapi_configs(organization_id);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_zapi_configs_organization_id 
ON zapi_configs(organization_id);

-- Enable Row Level Security
ALTER TABLE zapi_configs ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their organization's Z-API config
CREATE POLICY "Users can manage their organization Z-API config"
ON zapi_configs
FOR ALL
TO authenticated
USING (organization_id IN (
  SELECT profiles.organization_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
))
WITH CHECK (organization_id IN (
  SELECT profiles.organization_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_zapi_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_zapi_configs_updated_at
  BEFORE UPDATE ON zapi_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_zapi_configs_updated_at();