# Part 2: Storage Bucket Setup

**Note:** You can't run storage policies via SQL Editor due to permissions. Instead, use the Supabase Dashboard UI.

## Step 1: Create the Bucket

1. Go to Supabase Dashboard → **Storage**
2. Click **"New bucket"**
3. Settings:
   - **Name:** `chat-media`
   - **Public bucket:** ✅ **CHECK THIS BOX**
   - **File size limit:** 52428800 (50 MB)
   - **Allowed MIME types:** Leave empty (allows all)
4. Click **"Create bucket"**

## Step 2: Set Up Policies via Dashboard

After creating the bucket:

1. In **Storage**, click on the `chat-media` bucket
2. Click the **"Policies"** tab
3. Click **"New policy"**

### Policy 1: Allow Read (SELECT)
- **Policy name:** `Authenticated can read chat media`
- **Allowed operation:** SELECT
- **Target roles:** authenticated
- **USING expression:** `true`
- Click **"Create policy"**

### Policy 2: Allow Upload (INSERT)
- Click **"New policy"** again
- **Policy name:** `Authenticated can upload chat media`
- **Allowed operation:** INSERT
- **Target roles:** authenticated
- **WITH CHECK expression:** `true`
- Click **"Create policy"**

### Policy 3: Allow Update (UPDATE)
- Click **"New policy"** again
- **Policy name:** `Users can update own chat media`
- **Allowed operation:** UPDATE
- **Target roles:** authenticated
- **USING expression:**
  ```sql
  (storage.foldername(name))[1] = auth.uid()::text
  ```
- **WITH CHECK expression:**
  ```sql
  (storage.foldername(name))[1] = auth.uid()::text
  ```
- Click **"Create policy"**

### Policy 4: Allow Delete (DELETE)
- Click **"New policy"** again
- **Policy name:** `Users can delete own chat media`
- **Allowed operation:** DELETE
- **Target roles:** authenticated
- **USING expression:**
  ```sql
  (storage.foldername(name))[1] = auth.uid()::text
  ```
- Click **"Create policy"**

## Alternative: Quick Copy-Paste Method

If the UI method is too tedious, you can use the SQL Editor with the `postgres` role:

1. Go to **SQL Editor**
2. Run this query to check your current role:
   ```sql
   SELECT current_user, current_role;
   ```

3. If it shows `postgres` or `supabase_admin`, you can run this SQL:

```sql
-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated can read chat media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload chat media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own chat media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own chat media" ON storage.objects;

-- Create policies
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
```

## Verification

Run this in SQL Editor to check policies were created:

```sql
SELECT policyname, cmd
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%chat media%'
ORDER BY policyname;
```

Expected: 4 rows showing SELECT, INSERT, UPDATE, DELETE policies.

---

## Done!

Once you've completed both parts:
1. ✅ Messages table updated (PART1)
2. ✅ Storage bucket created with policies (PART2)
3. Restart your app: `npm run dev`
4. Test sending messages with attachments!

