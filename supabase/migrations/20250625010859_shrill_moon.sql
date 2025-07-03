/*
  # Initial Schema for Atendos IA SaaS

  1. New Tables
    - `profiles` - User profiles and settings
    - `organizations` - Company/organization data
    - `whatsapp_numbers` - WhatsApp Business numbers
    - `conversations` - Chat conversations
    - `messages` - Individual messages
    - `contacts` - Customer contacts
    - `ai_training_data` - AI training datasets
    - `ai_models` - AI model configurations
    - `webhooks` - Webhook configurations
    - `api_keys` - API key management
    - `usage_metrics` - Usage tracking and analytics

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  settings jsonb DEFAULT '{}',
  subscription_tier text DEFAULT 'free',
  subscription_status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  avatar_url text,
  role text DEFAULT 'member',
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint for user_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_user_id_key' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- WhatsApp Numbers table
CREATE TABLE IF NOT EXISTS whatsapp_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  display_name text NOT NULL,
  status text DEFAULT 'disconnected',
  webhook_url text,
  qr_code text,
  session_data jsonb DEFAULT '{}',
  last_activity timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint for phone_number if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'whatsapp_numbers_phone_number_key' 
    AND table_name = 'whatsapp_numbers'
  ) THEN
    ALTER TABLE whatsapp_numbers ADD CONSTRAINT whatsapp_numbers_phone_number_key UNIQUE (phone_number);
  END IF;
END $$;

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  name text,
  email text,
  avatar_url text,
  location text,
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  status text DEFAULT 'active',
  last_contact timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint for organization_id + phone_number if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'contacts_organization_id_phone_number_key' 
    AND table_name = 'contacts'
  ) THEN
    ALTER TABLE contacts ADD CONSTRAINT contacts_organization_id_phone_number_key UNIQUE (organization_id, phone_number);
  END IF;
END $$;

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  whatsapp_number_id uuid REFERENCES whatsapp_numbers(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  status text DEFAULT 'open',
  assigned_to uuid REFERENCES profiles(id),
  metadata jsonb DEFAULT '{}',
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL, -- 'customer', 'ai', 'agent'
  sender_id text,
  content text NOT NULL,
  message_type text DEFAULT 'text', -- 'text', 'image', 'audio', 'document'
  metadata jsonb DEFAULT '{}',
  is_ai_generated boolean DEFAULT false,
  ai_confidence real,
  created_at timestamptz DEFAULT now()
);

-- AI Training Data table
CREATE TABLE IF NOT EXISTS ai_training_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  category text NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  context text,
  confidence real DEFAULT 1.0,
  usage_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- AI Models table
CREATE TABLE IF NOT EXISTS ai_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  model_type text DEFAULT 'gpt-3.5-turbo',
  configuration jsonb DEFAULT '{}',
  training_status text DEFAULT 'idle',
  accuracy_score real DEFAULT 0.0,
  last_trained timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  events text[] DEFAULT '{}',
  secret text,
  is_active boolean DEFAULT true,
  last_triggered timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Usage Metrics table
CREATE TABLE IF NOT EXISTS usage_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  metric_type text NOT NULL, -- 'messages', 'ai_requests', 'api_calls'
  metric_value integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  recorded_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_training_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$
BEGIN
  -- Organizations policies
  DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
  CREATE POLICY "Users can view their organization"
    ON organizations
    FOR SELECT
    TO authenticated
    USING (
      id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    );

  -- Profiles policies
  DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
  CREATE POLICY "Users can view profiles in their organization"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (
      organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    );

  DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
  CREATE POLICY "Users can update their own profile"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

  -- WhatsApp Numbers policies
  DROP POLICY IF EXISTS "Users can manage WhatsApp numbers in their organization" ON whatsapp_numbers;
  CREATE POLICY "Users can manage WhatsApp numbers in their organization"
    ON whatsapp_numbers
    FOR ALL
    TO authenticated
    USING (
      organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    );

  -- Contacts policies
  DROP POLICY IF EXISTS "Users can manage contacts in their organization" ON contacts;
  CREATE POLICY "Users can manage contacts in their organization"
    ON contacts
    FOR ALL
    TO authenticated
    USING (
      organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    );

  -- Conversations policies
  DROP POLICY IF EXISTS "Users can manage conversations in their organization" ON conversations;
  CREATE POLICY "Users can manage conversations in their organization"
    ON conversations
    FOR ALL
    TO authenticated
    USING (
      organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    );

  -- Messages policies
  DROP POLICY IF EXISTS "Users can view messages in their organization conversations" ON messages;
  CREATE POLICY "Users can view messages in their organization conversations"
    ON messages
    FOR SELECT
    TO authenticated
    USING (
      conversation_id IN (
        SELECT c.id FROM conversations c
        JOIN profiles p ON p.organization_id = c.organization_id
        WHERE p.user_id = auth.uid()
      )
    );

  DROP POLICY IF EXISTS "Users can insert messages in their organization conversations" ON messages;
  CREATE POLICY "Users can insert messages in their organization conversations"
    ON messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
      conversation_id IN (
        SELECT c.id FROM conversations c
        JOIN profiles p ON p.organization_id = c.organization_id
        WHERE p.user_id = auth.uid()
      )
    );

  -- AI Training Data policies
  DROP POLICY IF EXISTS "Users can manage AI training data in their organization" ON ai_training_data;
  CREATE POLICY "Users can manage AI training data in their organization"
    ON ai_training_data
    FOR ALL
    TO authenticated
    USING (
      organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    );

  -- AI Models policies
  DROP POLICY IF EXISTS "Users can manage AI models in their organization" ON ai_models;
  CREATE POLICY "Users can manage AI models in their organization"
    ON ai_models
    FOR ALL
    TO authenticated
    USING (
      organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    );

  -- Webhooks policies
  DROP POLICY IF EXISTS "Users can manage webhooks in their organization" ON webhooks;
  CREATE POLICY "Users can manage webhooks in their organization"
    ON webhooks
    FOR ALL
    TO authenticated
    USING (
      organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    );

  -- Usage Metrics policies
  DROP POLICY IF EXISTS "Users can view usage metrics for their organization" ON usage_metrics;
  CREATE POLICY "Users can view usage metrics for their organization"
    ON usage_metrics
    FOR SELECT
    TO authenticated
    USING (
      organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    );
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_organization_id ON whatsapp_numbers(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_organization_id ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone_number ON contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_conversations_organization_id ON conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_training_data_organization_id ON ai_training_data(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_organization_id ON usage_metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_recorded_at ON usage_metrics(recorded_at);