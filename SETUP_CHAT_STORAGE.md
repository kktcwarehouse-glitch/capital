# Chat Storage Setup Guide

## Quick Setup (5 minutes)

### Step 1: Create Storage Bucket

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **Storage** in the left sidebar
4. Click **New bucket**
5. Create bucket with these settings:
   - **Name:** `chat-media`
   - **Public bucket:** ✅ **YES** (check this box)
   - Click **Create bucket**

### Step 2: Run Storage Policies

After creating the bucket, run the storage policies migration:

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to **SQL Editor** in your Supabase Dashboard
2. Click **New query**
3. Copy and paste the contents of: `supabase/migrations/20251113154501_setup_storage_policies.sql`
4. Click **Run** (or press Ctrl+Enter)
5. You should see: "Success. No rows returned"

**Option B: Using Node Script**

```bash
# Make sure you have the database connection string in .env
# SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres

node run-storage-policies.js
```

### Step 3: Run Messages Enhancement Migration

1. Go to **SQL Editor** in your Supabase Dashboard
2. Click **New query**
3. Copy and paste the contents of: `supabase/migrations/20251126120000_enhance_messages_with_media.sql`
4. Click **Run**
5. You should see: "Success. No rows returned"

### Step 4: Verify Setup

Run this query in SQL Editor to verify:

```sql
-- Check if bucket exists
SELECT * FROM storage.buckets WHERE id = 'chat-media';

-- Check if policies exist
SELECT policyname 
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%chat media%';

-- Check if message columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND column_name IN ('attachment_url', 'attachment_type', 'attachment_metadata');
```

You should see:
- 1 bucket named `chat-media` (public)
- 4 policies for chat media
- 3 new columns in messages table

---

## Troubleshooting

### "Bucket not found" error
- Make sure the bucket name is exactly `chat-media` (lowercase, with hyphen)
- Verify it's marked as **public**
- Restart your app after creating the bucket

### "Permission denied" error
- Run the storage policies SQL script
- Make sure you're logged in (authenticated)
- Check that RLS is enabled on storage.objects

### "Cannot upload" error
- Check file size (keep images < 5MB, videos < 50MB for better performance)
- Verify your internet connection
- Try a different file

---

## What Gets Created

### Storage Bucket
- **Name:** `chat-media`
- **Type:** Public (anyone authenticated can read)
- **Purpose:** Stores images and videos sent in chat

### Database Changes
- `messages.attachment_url` - URL to the uploaded file
- `messages.attachment_type` - Either 'image' or 'video'
- `messages.attachment_metadata` - JSON with file info (name, size, mime type)

### Policies
- Authenticated users can read all chat media
- Authenticated users can upload to chat-media
- Users can only update/delete their own uploads

---

## File Upload Limits

Current limits in the app:
- **Text messages:** 500 characters max
- **Images:** Recommended < 5MB
- **Videos:** Recommended < 50MB
- **Formats:** 
  - Images: JPG, PNG, GIF, WebP
  - Videos: MP4, MOV, WebM

You can adjust these in Supabase Dashboard > Storage > chat-media > Settings

---

## Need Help?

If you're still having issues:

1. Check the browser console for detailed error messages
2. Verify all steps above were completed
3. Try logging out and back in
4. Clear app cache and restart

**Common mistake:** Forgetting to mark the bucket as **public** when creating it. If you did this, delete the bucket and recreate it with public access enabled.

