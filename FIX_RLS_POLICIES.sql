-- ============================================================================
-- FIX RLS POLICIES FOR ADMIN FEATURED UPDATES
-- ============================================================================
-- This ensures admins can update is_featured field and see the results
-- Run this in Supabase SQL Editor

BEGIN;

-- Drop and recreate startup_profiles policy to ensure admin can update and select
DROP POLICY IF EXISTS "Startups manage their profile" ON startup_profiles;

CREATE POLICY "Startups manage their profile"
  ON startup_profiles FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id 
    OR public.is_admin(auth.uid())
  );

-- Ensure the is_admin function exists
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = user_id 
      AND is_admin = true
  );
END;
$$;

-- Verify admin can read all startup profiles (for admin dashboard)
-- This should already exist, but let's make sure
DROP POLICY IF EXISTS "Admins can read all startup profiles" ON startup_profiles;
CREATE POLICY "Admins can read all startup profiles"
  ON startup_profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR public.is_admin(auth.uid())
  );

-- Same for investor_profiles
DROP POLICY IF EXISTS "Investors manage their profile" ON investor_profiles;
CREATE POLICY "Investors manage their profile"
  ON investor_profiles FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id 
    OR public.is_admin(auth.uid())
  );

COMMIT;

-- ============================================================================
-- VERIFY: Check if your user is admin
-- ============================================================================
-- Run this to verify you're set as admin:
-- SELECT id, email, role, is_admin FROM profiles WHERE email = 'your-email@example.com';
--
-- If is_admin is false, set it:
-- UPDATE profiles SET is_admin = true WHERE email = 'your-email@example.com';

