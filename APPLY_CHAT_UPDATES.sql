-- ============================================================================
-- Complete Chat Media Updates
-- Run this entire script in Supabase SQL Editor
-- ============================================================================

BEGIN;

-- Step 1: Drop old constraint if it exists
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_attachment_type_check;

-- Step 2: Add new columns (safe to re-run)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT,
  ADD COLUMN IF NOT EXISTS attachment_metadata JSONB;

-- Step 3: Add NEW constraint that includes 'document'
ALTER TABLE messages
  ADD CONSTRAINT messages_attachment_type_check
  CHECK (attachment_type IN ('image', 'video', 'document') OR attachment_type IS NULL);

-- Step 4: Update content constraint to allow media-only messages
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_content_check;
ALTER TABLE messages
  ADD CONSTRAINT messages_content_check
  CHECK (
    (char_length(content) BETWEEN 1 AND 1000)
    OR (attachment_url IS NOT NULL AND char_length(content) <= 1000)
  );

-- Step 5: Allow senders to edit their messages
DROP POLICY IF EXISTS "Senders can update messages" ON messages;
CREATE POLICY "Senders can update messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- Step 6: Allow senders to delete their messages
DROP POLICY IF EXISTS "Senders can delete messages" ON messages;
CREATE POLICY "Senders can delete messages"
  ON messages FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);

-- Step 7: Storage policies for chat-media bucket
-- (Make sure you created the 'chat-media' bucket first!)

-- Enable RLS on storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing chat-media policies
DROP POLICY IF EXISTS "Authenticated can read chat media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload chat media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own chat media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own chat media" ON storage.objects;

-- Create new policies
CREATE POLICY "Authenticated can read chat media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'chat-media');

CREATE POLICY "Authenticated can upload chat media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-media');

CREATE POLICY "Users can update own chat media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own chat media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

COMMIT;

-- ============================================================================
-- Verification Queries (run these after to confirm)
-- ============================================================================

-- Check bucket exists
SELECT id, name, public FROM storage.buckets WHERE id = 'chat-media';
-- Expected: 1 row with public = true

-- Check message columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND column_name IN ('attachment_url', 'attachment_type', 'attachment_metadata');
-- Expected: 3 rows

-- Check constraints
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname LIKE '%messages%attachment%';
-- Expected: Should show constraint allowing 'image', 'video', 'document'

-- Check storage policies
SELECT policyname, cmd
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%chat media%';
-- Expected: 4 rows (SELECT, INSERT, UPDATE, DELETE)

