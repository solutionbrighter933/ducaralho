/*
  # Fix Profile Creation and Stripe Integration

  1. Problem
    - Duplicate profile creation causing constraint violation
    - Need to ensure profile creation happens only once
    - Need to add Stripe subscription check to profile creation

  2. Solution
    - Update handle_new_user trigger function to be more robust
    - Add error handling to prevent failures
    - Ensure organization creation works properly
    - Add default settings for new profiles

  3. Security
    - Maintain existing security policies
    - Ensure proper error handling
*/

-- Drop and recreate the handle_new_user function with improved error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  org_id uuid;
  profile_exists boolean;
BEGIN
  -- Check if profile already exists to prevent duplicate creation
  SELECT EXISTS(
    SELECT 1 FROM public.profiles WHERE user_id = new.id
  ) INTO profile_exists;
  
  -- Only proceed if profile doesn't exist
  IF NOT profile_exists THEN
    -- Create organization with proper error handling
    BEGIN
      INSERT INTO public.organizations (
        name, 
        slug,
        settings,
        subscription_tier,
        subscription_status
      )
      VALUES (
        COALESCE(new.raw_user_meta_data->>'organization_name', 'Minha Empresa'),
        COALESCE(
          lower(regexp_replace(new.raw_user_meta_data->>'organization_name', '[^a-zA-Z0-9]', '-', 'g')), 
          'empresa'
        ) || '-' || extract(epoch from now())::text,
        jsonb_build_object(
          'general', jsonb_build_object(
            'company_name', COALESCE(new.raw_user_meta_data->>'organization_name', 'Minha Empresa'),
            'timezone', 'America/Sao_Paulo',
            'language', 'pt-BR'
          )
        ),
        'free',
        'active'
      )
      RETURNING id INTO org_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to create organization for user %: %', new.id, SQLERRM;
        -- Create a fallback organization
        INSERT INTO public.organizations (
          name, 
          slug,
          subscription_tier,
          subscription_status
        )
        VALUES (
          'Empresa ' || substr(new.id::text, 1, 8),
          'empresa-' || extract(epoch from now())::text,
          'free',
          'active'
        )
        RETURNING id INTO org_id;
    END;

    -- Create profile with proper error handling
    BEGIN
      INSERT INTO public.profiles (
        user_id,
        organization_id,
        email,
        full_name,
        role,
        settings
      )
      VALUES (
        new.id,
        org_id,
        new.email,
        COALESCE(
          new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'organization_name',
          split_part(new.email, '@', 1)
        ),
        'admin',
        jsonb_build_object(
          'general', jsonb_build_object(
            'company_name', COALESCE(new.raw_user_meta_data->>'organization_name', 'Minha Empresa'),
            'timezone', 'America/Sao_Paulo',
            'language', 'pt-BR'
          ),
          'notifications', jsonb_build_object(
            'new_messages', true,
            'system_alerts', true,
            'weekly_reports', false,
            'email_notifications', true
          ),
          'appearance', jsonb_build_object(
            'theme', 'auto',
            'language', 'pt-BR',
            'compact_mode', false
          ),
          'security', jsonb_build_object(
            'two_factor_enabled', false,
            'session_timeout', 30,
            'password_requirements', jsonb_build_object(
              'min_length', 8,
              'require_uppercase', true,
              'require_numbers', true,
              'require_symbols', true
            )
          ),
          'ai_models', jsonb_build_object(
            'selected_model', 'gpt-4o',
            'model_config', '{}'
          )
        )
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to create profile for user %: %', new.id, SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'Profile already exists for user %, skipping creation', new.id;
  END IF;

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Unexpected error in handle_new_user for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create a function to check if a user has an active subscription
CREATE OR REPLACE FUNCTION public.user_has_active_subscription(user_id uuid)
RETURNS boolean AS $$
DECLARE
  has_subscription boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM stripe_customers c
    JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
    WHERE c.user_id = user_id
    AND s.status IN ('active', 'trialing')
    AND c.deleted_at IS NULL
    AND s.deleted_at IS NULL
  ) INTO has_subscription;
  
  RETURN has_subscription;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to the function
GRANT EXECUTE ON FUNCTION public.user_has_active_subscription(uuid) TO authenticated;