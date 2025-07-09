/*
  # Update signup trigger to handle WhatsApp number

  1. Changes
    - Update the handle_new_user trigger function to extract and save WhatsApp number from user metadata
    - Create WhatsApp number record during user signup if provided
    - Ensure proper organization and profile creation flow

  2. Security
    - Maintain existing RLS policies
    - Ensure proper data validation
*/

-- Update the handle_new_user function to handle WhatsApp number
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  profile_id UUID;
  whatsapp_num TEXT;
BEGIN
  -- Extract WhatsApp number from user metadata
  whatsapp_num := NEW.raw_user_meta_data->>'whatsapp_number';
  
  -- Create organization
  INSERT INTO organizations (name, slug)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'organization_name', 'My Organization'),
    'org-' || EXTRACT(EPOCH FROM NOW())::TEXT
  )
  RETURNING id INTO org_id;

  -- Create profile
  INSERT INTO profiles (
    user_id,
    organization_id,
    email,
    full_name,
    role
  )
  VALUES (
    NEW.id,
    org_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'admin'
  )
  RETURNING id INTO profile_id;

  -- Create WhatsApp number record if provided
  IF whatsapp_num IS NOT NULL AND whatsapp_num != '' THEN
    INSERT INTO whatsapp_numbers (
      profile_id,
      organization_id,
      phone_number,
      display_name,
      connection_status,
      instance_id,
      is_ai_active,
      ai_prompt
    )
    VALUES (
      profile_id,
      org_id,
      whatsapp_num,
      'WhatsApp Business',
      'DISCONNECTED',
      'pending',
      true,
      'Você é um assistente virtual prestativo e profissional. Responda sempre de forma clara, objetiva e amigável. Ajude os clientes com suas dúvidas e necessidades da melhor forma possível.'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();