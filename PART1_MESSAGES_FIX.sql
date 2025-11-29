-- ============================================================================
-- PART 1: Fix Messages Table (Run this FIRST)
-- This fixes the immediate error you're seeing
-- ============================================================================

BEGIN;

-- Drop old constraint if it exists
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_attachment_type_check;

-- Add new columns (safe to re-run)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT,
  ADD COLUMN IF NOT EXISTS attachment_metadata JSONB;

-- Add NEW constraint that includes 'document'
ALTER TABLE messages
  ADD CONSTRAINT messages_attachment_type_check
  CHECK (attachment_type IN ('image', 'video', 'document') OR attachment_type IS NULL);

-- Update content constraint to allow media-only messages
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_content_check;
ALTER TABLE messages
  ADD CONSTRAINT messages_content_check
  CHECK (
    (char_length(content) BETWEEN 1 AND 1000)
    OR (attachment_url IS NOT NULL AND char_length(content) <= 1000)
  );

-- Allow senders to edit their messages
DROP POLICY IF EXISTS "Senders can update messages" ON messages;
CREATE POLICY "Senders can update messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- Allow senders to delete their messages
DROP POLICY IF EXISTS "Senders can delete messages" ON messages;
CREATE POLICY "Senders can delete messages"
  ON messages FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================

-- Check that constraint now allows 'document'
SELECT pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'messages_attachment_type_check';

-- Should see: CHECK ((attachment_type = ANY (ARRAY['image'::text, 'video'::text, 'document'::text])) OR (attachment_type IS NULL))

