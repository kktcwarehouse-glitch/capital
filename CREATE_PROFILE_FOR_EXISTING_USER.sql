-- SQL Script to Create Profile for Existing User
-- 
-- If you manually added a user in Supabase and they can't login,
-- run this SQL to create their profile record.
--
-- Replace the values below with the actual user's information:
--   - USER_ID: The UUID from auth.users table
--   - USER_EMAIL: The email address
--   - USER_ROLE: 'startup', 'investor', or 'admin'
--   - IS_ADMIN: true if admin, false otherwise

-- Example for a regular user:
INSERT INTO profiles (id, email, role, is_admin, created_at, updated_at)
VALUES (
  'USER_ID_HERE',  -- Replace with actual user UUID
  'user@example.com',  -- Replace with actual email
  'investor',  -- or 'startup' or 'admin'
  false,  -- true if admin
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  is_admin = EXCLUDED.is_admin,
  updated_at = NOW();

-- To find the user ID, run this query first:
-- SELECT id, email FROM auth.users WHERE email = 'user@example.com';

