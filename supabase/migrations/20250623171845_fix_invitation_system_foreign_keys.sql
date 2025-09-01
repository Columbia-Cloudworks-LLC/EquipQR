
-- Fix RLS policies on profiles table to allow proper joins with work order notes
-- Remove the conflicting policies and create a proper one

-- First, drop the existing conflicting policies
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create a comprehensive policy that allows viewing profiles for organizational context
-- This allows users to see profile information when it's needed for work order notes, equipment notes, etc.
CREATE POLICY "Users can view profiles in their organization context" 
  ON profiles 
  FOR SELECT 
  USING (
    -- Allow users to see their own profile
    id = auth.uid() 
    OR 
    -- Allow users to see profiles of other users in the same organization
    EXISTS (
      SELECT 1 
      FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid() 
        AND om1.status = 'active'
        AND om2.user_id = profiles.id 
        AND om2.status = 'active'
    )
  );

-- Create policy for updating own profile
CREATE POLICY "Users can update own profile" 
  ON profiles 
  FOR UPDATE 
  USING (id = auth.uid());

-- Create policy for inserting profiles (needed for new user registration)
CREATE POLICY "Users can insert their own profile" 
  ON profiles 
  FOR INSERT 
  WITH CHECK (id = auth.uid());
