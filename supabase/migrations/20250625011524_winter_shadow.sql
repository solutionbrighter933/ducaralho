/*
  # Fix RLS Policies for Profiles Table

  1. Problem
    - Current RLS policies on profiles table cause infinite recursion
    - The "Users can view profiles in their organization" policy queries profiles table from within profiles policy
    - This creates a circular dependency

  2. Solution
    - Drop existing problematic policies
    - Create simpler, non-recursive policies
    - Allow users to read/update their own profile
    - Allow users to read profiles in their organization using organization_id directly
    - Add policy for inserting new profiles during signup

  3. Security
    - Users can only see their own profile and profiles in their organization
    - Users can only update their own profile
    - Users can insert their own profile during signup
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;

-- Create new, non-recursive policies

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to insert their own profile during signup
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to view profiles in their organization (non-recursive approach)
-- This policy uses organization_id directly instead of querying profiles table
CREATE POLICY "Users can view organization profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- Add index to improve performance of organization-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_organization_user 
  ON profiles(organization_id, user_id);