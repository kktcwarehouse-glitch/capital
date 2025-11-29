-- ============================================================================
-- FIX: Set is_admin = true for admin users
-- ============================================================================
-- Run this to ensure your admin user has is_admin = true
-- Replace the email with your actual admin email

-- First, check your current admin status
SELECT id, email, role, is_admin 
FROM profiles 
WHERE email = 'mohamad.uae71@gmail.com';

-- Set is_admin = true for admin role users
UPDATE profiles 
SET is_admin = true 
WHERE role = 'admin' OR email = 'mohamad.uae71@gmail.com';

-- Verify it worked
SELECT id, email, role, is_admin 
FROM profiles 
WHERE email = 'mohamad.uae71@gmail.com';

-- You should see: is_admin = true

