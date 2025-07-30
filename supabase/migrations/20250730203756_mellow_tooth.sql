/*
  # Create facebook_connections table for Instagram integration

  1. New Tables
    - `facebook_connections`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `organization_id` (uuid, foreign key to organizations)
      - `facebook_user_id` (text, Facebook user ID)
      - `facebook_access_token` (text, encrypted access token)
      - `pages` (jsonb, array of Facebook pages with Instagram accounts)
      - `selected_page_id` (text, selected Facebook page ID)
      - `selected_instagram_account_id` (text, selected Instagram Business account ID)
      - `instagram_username` (text, Instagram username)
      - `status` (text, connection status)
      - `created_at` (timestamptz, creation timestamp)
      - `updated_at` (timestamptz, last update timestamp)

  2. Security
    - Enable RLS on `facebook_connections` table
    - Add policies for users to manage their own connections
    - Add unique constraint on user_id to prevent duplicate connections

  3. Indexes
    - Index on user_id for fast lookups
    - Index on organization_id for organization-based queries
    - Index on status for filtering active connections
*/

-- Create facebook_connections table
CREATE TABLE IF NOT EXISTS facebook_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  facebook_user_id text NOT NULL,
  facebook_access_token text NOT NULL,
  pages jsonb DEFAULT '[]'::jsonb,
  selected_page_id text,
  selected_instagram_account_id text,
  instagram_username text,
  status text DEFAULT 'pending'::text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE facebook_connections ENABLE ROW LEVEL SECURITY;

-- Create unique constraint to prevent duplicate connections per user
CREATE UNIQUE INDEX IF NOT EXISTS facebook_connections_user_id_unique 
ON facebook_connections(user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_facebook_connections_user_id 
ON facebook_connections(user_id);

CREATE INDEX IF NOT EXISTS idx_facebook_connections_organization_id 
ON facebook_connections(organization_id);

CREATE INDEX IF NOT EXISTS idx_facebook_connections_status 
ON facebook_connections(status);

CREATE INDEX IF NOT EXISTS idx_facebook_connections_instagram_account 
ON facebook_connections(selected_instagram_account_id);

-- Create RLS policies
CREATE POLICY "Users can view their own Facebook connections"
  ON facebook_connections
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own Facebook connections"
  ON facebook_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own Facebook connections"
  ON facebook_connections
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own Facebook connections"
  ON facebook_connections
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_facebook_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_facebook_connections_updated_at
  BEFORE UPDATE ON facebook_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_facebook_connections_updated_at();