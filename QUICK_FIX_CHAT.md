# Quick Fix: Chat Media Upload

## The Problem
You're getting **"Bucket not found"** error because the `chat-media` storage bucket doesn't exist yet in your Supabase project.

## The Solution (5 minutes)

### Step 1: Create the Storage Bucket

1. Open your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **Storage** in the left sidebar
4. Click **"New bucket"** button
5. Fill in:
   - **Name:** `chat-media`
   - **Public bucket:** ✅ **CHECK THIS BOX** (very important!)
6. Click **"Create bucket"**

### Step 2: Apply Database Changes

1. In Supabase Dashboard, click **SQL Editor**
2. Click **"New query"**
3. Copy and paste this SQL:

```sql
-- Add attachment columns to messages
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT CHECK (attachment_type IN ('image', 'video', 'document')),
  ADD COLUMN IF NOT EXISTS attachment_metadata JSONB;

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
```

4. Click **"Run"** (or press Ctrl+Enter)
5. You should see: **"Success. No rows returned"**

### Step 3: Apply Storage Policies

1. Still in **SQL Editor**, click **"New query"**
2. Copy and paste this SQL:

```sql
-- Enable RLS on storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing chat-media policies if they exist
DROP POLICY IF EXISTS "Authenticated can read chat media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload chat media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own chat media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own chat media" ON storage.objects;

-- Allow authenticated users to read chat media
CREATE POLICY "Authenticated can read chat media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'chat-media');

-- Allow authenticated users to upload chat media
CREATE POLICY "Authenticated can upload chat media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-media');

-- Users can update their own chat media
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

-- Users can delete their own chat media
CREATE POLICY "Users can delete own chat media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

3. Click **"Run"**
4. You should see: **"Success. No rows returned"**

### Step 4: Restart Your App

```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
npm run dev
```

## Test It

1. Open your app
2. Go to Messages
3. Open a conversation
4. Tap the **📷 Image** button - should open photo picker
5. Tap the **🎥 Video** button - should open video picker
6. Tap the **📄 Document** button - should open document picker
7. Select a file and send - should upload successfully!

## What You Can Now Do

✅ Send images in chat  
✅ Send videos in chat  
✅ Send documents (PDF, Word) in chat  
✅ Edit your own messages (long-press)  
✅ Delete your own messages (long-press)  
✅ See unread message badge on Messages tab  

## Still Having Issues?

### "Bucket not found" error
- Double-check the bucket name is exactly `chat-media` (lowercase, with hyphen)
- Make sure you marked it as **public** when creating
- Try deleting and recreating the bucket

### "Permission denied" error
- Make sure you ran both SQL scripts (Step 2 and Step 3)
- Check you're logged in to the app
- Try logging out and back in

### "Cannot upload" error
- Check your internet connection
- Try a smaller file (< 5MB for images, < 20MB for videos)
- Make sure the file isn't corrupted

### ImagePicker warning
- The warning about `MediaTypeOptions` is harmless - I've already fixed it in the code
- It won't affect functionality

## Need More Help?

Check the detailed guide: `SETUP_CHAT_STORAGE.md`

