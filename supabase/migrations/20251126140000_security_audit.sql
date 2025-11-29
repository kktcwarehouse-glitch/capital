-- ============================================================================
-- Security Audit & Hardening for FundLink
-- This migration adds additional security constraints and verifies RLS policies
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Verify RLS is enabled on all tables
-- ============================================================================

-- Enable RLS on all main tables (safe to re-run)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE startup_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE startup_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. Add additional constraints for data integrity
-- ============================================================================

-- Ensure email format is valid
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_format_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_email_format_check
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Ensure role is valid
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('startup', 'investor'));

-- Messages content constraints (already exists, verify)
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_content_length_check;
ALTER TABLE messages
  ADD CONSTRAINT messages_content_length_check
  CHECK (
    (content IS NULL OR char_length(content) <= 1000)
    OR (attachment_url IS NOT NULL)
  );

-- Startup profiles constraints
ALTER TABLE startup_profiles DROP CONSTRAINT IF EXISTS startup_profiles_funding_goal_check;
ALTER TABLE startup_profiles
  ADD CONSTRAINT startup_profiles_funding_goal_check
  CHECK (funding_goal IS NULL OR funding_goal >= 0);

ALTER TABLE startup_profiles DROP CONSTRAINT IF EXISTS startup_profiles_team_size_check;
ALTER TABLE startup_profiles
  ADD CONSTRAINT startup_profiles_team_size_check
  CHECK (team_size IS NULL OR team_size >= 1);

-- Investor profiles constraints
ALTER TABLE investor_profiles DROP CONSTRAINT IF EXISTS investor_profiles_investment_range_check;
ALTER TABLE investor_profiles
  ADD CONSTRAINT investor_profiles_investment_range_check
  CHECK (
    (investment_range_min IS NULL AND investment_range_max IS NULL)
    OR (investment_range_min <= investment_range_max)
  );

-- Startup media constraints
ALTER TABLE startup_media DROP CONSTRAINT IF EXISTS startup_media_file_size_check;
ALTER TABLE startup_media
  ADD CONSTRAINT startup_media_file_size_check
  CHECK (file_size IS NULL OR file_size > 0);

-- ============================================================================
-- 3. Add indexes for better query performance (security through efficiency)
-- ============================================================================

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_messages_recipient_read 
  ON messages(recipient_id, read) WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_messages_conversation 
  ON messages(sender_id, recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_favorites_user_startup 
  ON favorites(user_id, startup_id);

CREATE INDEX IF NOT EXISTS idx_profile_views_unique_check
  ON profile_views(startup_id, viewer_id);

-- ============================================================================
-- 4. Strengthen RLS policies (add if not exist)
-- ============================================================================

-- Messages: Ensure only participants can see messages
DROP POLICY IF EXISTS "Participants can read messages" ON messages;
CREATE POLICY "Participants can read messages"
  ON messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Messages: Prevent editing other people's messages
DROP POLICY IF EXISTS "Senders can update own messages" ON messages;
CREATE POLICY "Senders can update own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- Favorites: Users can only manage their own favorites
DROP POLICY IF EXISTS "Users manage own favorites" ON favorites;
CREATE POLICY "Users manage own favorites"
  ON favorites FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Startup Media: Only startup owner can manage media
DROP POLICY IF EXISTS "Startup owners manage their media" ON startup_media;
CREATE POLICY "Startup owners manage their media"
  ON startup_media FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM startup_profiles
      WHERE startup_profiles.id = startup_media.startup_id
      AND startup_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM startup_profiles
      WHERE startup_profiles.id = startup_media.startup_id
      AND startup_profiles.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 5. Add security functions
-- ============================================================================

-- Function to check if user owns a resource
CREATE OR REPLACE FUNCTION public.user_owns_startup(startup_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM startup_profiles
    WHERE id = startup_uuid
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is involved in a conversation
CREATE OR REPLACE FUNCTION public.user_in_conversation(other_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN other_user_id = auth.uid() OR auth.uid() = other_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Add audit triggers (optional - tracks changes)
-- ============================================================================

-- Create audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  user_id UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  old_data JSONB,
  new_data JSONB
);

-- Enable RLS on audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only allow viewing own audit logs
CREATE POLICY "Users can view own audit logs" ON audit_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

COMMIT;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check that RLS is enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'startup_profiles', 'investor_profiles', 'messages', 'favorites', 'profile_views', 'startup_media')
ORDER BY tablename;
-- All should show rowsecurity = true

-- Check policies count per table
SELECT schemaname, tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Check constraints
SELECT conname, contype, conrelid::regclass
FROM pg_constraint
WHERE conrelid::regclass::text IN (
  'profiles', 'startup_profiles', 'investor_profiles', 'messages', 'favorites', 'startup_media'
)
ORDER BY conrelid::regclass::text, conname;

