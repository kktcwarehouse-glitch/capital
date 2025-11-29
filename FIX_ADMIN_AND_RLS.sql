-- ============================================================================
-- COMPLETE FIX: Admin Featured Updates Not Working
-- ============================================================================
-- Run this entire script in Supabase SQL Editor
-- This fixes both the is_admin check and RLS policies

BEGIN;

-- Step 1: Update is_admin function to check both is_admin flag AND role
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
      AND (is_admin = true OR role = 'admin')
  );
END;
$$;

-- Step 2: Set is_admin = true for users with role = 'admin'
UPDATE profiles 
SET is_admin = true 
WHERE role = 'admin' AND (is_admin IS NULL OR is_admin = false);

-- Step 3: Fix RLS policies to ensure admins can update and see results
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

-- Step 4: Ensure admins can read all startup profiles (for SELECT after UPDATE)
DROP POLICY IF EXISTS "Anyone authenticated can view startups" ON startup_profiles;
CREATE POLICY "Anyone authenticated can view startups"
  ON startup_profiles FOR SELECT
  TO authenticated
  USING (true);

COMMIT;

-- ============================================================================
-- VERIFY: Check your admin status
-- ============================================================================
SELECT 
  id, 
  email, 
  role, 
  is_admin,
  CASE 
    WHEN is_admin = true OR role = 'admin' THEN '✅ IS ADMIN'
    ELSE '❌ NOT ADMIN'
  END as admin_status
FROM profiles 
WHERE email = 'mohamad.uae71@gmail.com';

-- ============================================================================
-- TEST: Try updating a startup manually
-- ============================================================================
-- UPDATE startup_profiles 
-- SET is_featured = true 
-- WHERE id = '0875f453-51b8-4a94-92b7-3d62afb0668b'
-- RETURNING id, company_name, is_featured;
--
-- If this works, the RLS is fixed!

