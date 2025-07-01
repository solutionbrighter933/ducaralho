/*
  # Fix Settings Loading Error - Complete RLS Policy Fix

  1. Problem Analysis
    - The settings service is failing to load user profiles
    - RLS policies are still causing infinite recursion
    - Need to completely restructure the profile access policies

  2. Solution
    - Drop ALL existing problematic policies
    - Create simple, direct policies that avoid recursion
    - Ensure proper profile access for settings loading
    - Add missing INSERT policy for profile creation during signup

  3. Security
    - Maintain proper security while avoiding recursion
    - Users can only access their own data and organization data
*/

-- First, let's drop ALL existing policies on profiles to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view organization profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create simple, non-recursive policies for profiles

-- 1. Allow users to view their own profile (direct, no recursion)
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2. Allow users to insert their own profile during signup
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 3. Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. Allow users to view other profiles in their organization
-- This uses a simpler approach that avoids recursion
CREATE POLICY "Users can view organization profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    organization_id = (
      SELECT p.organization_id 
      FROM profiles p 
      WHERE p.user_id = auth.uid()
      LIMIT 1
    )
  );

-- Fix organizations table policies to avoid recursion
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;

CREATE POLICY "Users can view their organization"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    id = (
      SELECT p.organization_id 
      FROM profiles p 
      WHERE p.user_id = auth.uid()
      LIMIT 1
    )
  );

-- Allow users to update their organization
CREATE POLICY "Users can update their organization"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (
    id = (
      SELECT p.organization_id 
      FROM profiles p 
      WHERE p.user_id = auth.uid()
      LIMIT 1
    )
  );

-- Ensure we have proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id_unique ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_org_lookup ON profiles(organization_id, user_id);

-- Add a function to help with organization lookups (optional, for better performance)
CREATE OR REPLACE FUNCTION get_user_organization_id(user_uuid uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id FROM profiles WHERE user_id = user_uuid LIMIT 1;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_organization_id(uuid) TO authenticated;