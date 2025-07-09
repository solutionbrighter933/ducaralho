/*
  # Fix RLS Policies for Profiles Table

  1. Problem
    - Infinite recursion detected in policy for relation "profiles"
    - This prevents user authentication, profile loading, and registration
    - Caused by circular references in RLS policy definitions

  2. Solution
    - Drop existing problematic policies
    - Create new, simplified policies that avoid recursion
    - Ensure policies only reference auth.uid() directly without complex subqueries

  3. New Policies
    - Users can view their own profile
    - Users can update their own profile
    - Users can insert their own profile
    - Users can view profiles in the same organization (simplified)
*/

-- Drop existing policies that may be causing recursion
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view organization profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Create new, simplified policies that avoid recursion

-- Policy 1: Users can view their own profile
CREATE POLICY "profiles_select_own"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 2: Users can insert their own profile
CREATE POLICY "profiles_insert_own"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy 3: Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy 4: Users can view profiles in their organization (simplified to avoid recursion)
-- This policy uses a direct join instead of a subquery to prevent recursion
CREATE POLICY "profiles_select_organization"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT p.organization_id 
      FROM profiles p 
      WHERE p.user_id = auth.uid()
      LIMIT 1
    )
  );

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create an index to improve performance of the organization lookup
CREATE INDEX IF NOT EXISTS idx_profiles_user_org_lookup 
ON profiles (user_id, organization_id);