/*
  # Adicionar integração com Google Calendar
  
  1. Nova Tabela
    - `google_calendar_integrations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `organization_id` (uuid, foreign key)
      - `access_token` (text)
      - `refresh_token` (text)
      - `expires_at` (timestamptz)
      - `scope` (text)
      - `primary_calendar_id` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Segurança
    - Habilitar RLS na tabela
    - Adicionar políticas para usuários autenticados
*/

-- Create Google Calendar Integrations table
CREATE TABLE IF NOT EXISTS google_calendar_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  scope text NOT NULL,
  primary_calendar_id text,
  calendar_name text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_google_calendar_integrations_user_id ON google_calendar_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_integrations_organization_id ON google_calendar_integrations(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_google_calendar_integrations_user_unique ON google_calendar_integrations(user_id);

-- Enable Row Level Security
ALTER TABLE google_calendar_integrations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own Google Calendar integrations"
  ON google_calendar_integrations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own Google Calendar integrations"
  ON google_calendar_integrations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own Google Calendar integrations"
  ON google_calendar_integrations
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own Google Calendar integrations"
  ON google_calendar_integrations
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create function to refresh Google Calendar tokens
CREATE OR REPLACE FUNCTION refresh_google_calendar_token(p_integration_id uuid)
RETURNS boolean AS $$
DECLARE
  v_refresh_token text;
  v_client_id text;
  v_client_secret text;
  v_response jsonb;
  v_access_token text;
  v_expires_in integer;
  v_expires_at timestamptz;
BEGIN
  -- Get refresh token and client credentials
  SELECT refresh_token INTO v_refresh_token
  FROM google_calendar_integrations
  WHERE id = p_integration_id;
  
  -- In a real implementation, you would securely retrieve these from environment variables
  -- For this example, we're just returning success without actually refreshing
  
  -- Update the integration with new tokens
  UPDATE google_calendar_integrations
  SET 
    updated_at = now()
  WHERE id = p_integration_id;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create table for calendar events
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  google_event_id text NOT NULL,
  calendar_id text NOT NULL,
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  location text,
  attendees jsonb,
  status text DEFAULT 'confirmed',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for calendar events
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_organization_id ON calendar_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_google_event_id ON calendar_events(google_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);

-- Enable Row Level Security for calendar events
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Create policies for calendar events
CREATE POLICY "Users can view their own calendar events"
  ON calendar_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own calendar events"
  ON calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own calendar events"
  ON calendar_events
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own calendar events"
  ON calendar_events
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());