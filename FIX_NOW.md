# 🚨 URGENT FIX - Do This Now

## The Error
```
Error sending message: new row for relation "messages" violates check constraint "messages_attachment_type_check"
```

**What it means:** Your database doesn't know about the new 'document' attachment type yet.

---

## Fix in 3 Minutes ⏱️

### Step 1: Create Storage Bucket (if you haven't already)

1. Open https://supabase.com/dashboard
2. Select your project
3. Click **Storage** (left sidebar)
4. Click **"New bucket"**
5. Settings:
   - Name: `chat-media`
   - Public: ✅ **CHECK THIS!**
6. Click **"Create bucket"**

### Step 2: Run the SQL Fix

1. In Supabase Dashboard, click **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open the file: `APPLY_CHAT_UPDATES.sql`
4. **Copy ALL the content** (the entire file)
5. **Paste it** into the SQL Editor
6. Click **"Run"** (or press Ctrl+Enter)
7. Wait 2-3 seconds
8. You should see: ✅ **"Success. No rows returned"**

### Step 3: Restart Your App

In your terminal where the app is running:
1. Press **Ctrl+C** to stop
2. Run: `npm run dev`
3. Wait for QR code to appear
4. Open app on your phone

---

## ✅ Test It Works

1. Open the app
2. Go to **Messages**
3. Open any conversation
4. Try sending a text message - should work!
5. Try the 📷 Image button - should open photo picker
6. Try the 🎥 Video button - should open video picker  
7. Try the 📄 Document button - should open file picker

---

## Still Getting Errors?

### "Bucket not found"
➜ You forgot Step 1. Create the `chat-media` bucket.

### "Permission denied"
➜ Make sure you ran the ENTIRE SQL script from `APPLY_CHAT_UPDATES.sql`

### Same constraint error
➜ The SQL didn't run properly. Try again:
1. Delete everything in SQL Editor
2. Re-copy from `APPLY_CHAT_UPDATES.sql`
3. Make sure you copied the ENTIRE file
4. Run it again

### Can't see the document button
➜ Restart the app completely:
```bash
# Kill the terminal (Ctrl+C)
# Clear cache:
npm run dev:clear
```

---

## What the SQL Does

✅ Adds `attachment_url`, `attachment_type`, `attachment_metadata` columns  
✅ Updates constraint to allow 'image', 'video', **'document'**  
✅ Allows media-only messages (no text required)  
✅ Lets senders edit/delete their own messages  
✅ Sets up storage permissions for `chat-media` bucket  

---

## Verify It Worked

After running the SQL, run these verification queries:

```sql
-- Should return 1 row showing chat-media bucket as public
SELECT id, name, public FROM storage.buckets WHERE id = 'chat-media';

-- Should return 3 rows (the new columns)
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name IN ('attachment_url', 'attachment_type', 'attachment_metadata');

-- Should show constraint allowing 'document'
SELECT pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'messages_attachment_type_check';
```

Expected result for last query:
```
CHECK ((attachment_type = ANY (ARRAY['image'::text, 'video'::text, 'document'::text])) OR (attachment_type IS NULL))
```

---

## Quick Checklist

- [ ] Created `chat-media` bucket (marked as public)
- [ ] Ran `APPLY_CHAT_UPDATES.sql` in SQL Editor
- [ ] Saw "Success. No rows returned"
- [ ] Restarted the app (Ctrl+C then `npm run dev`)
- [ ] Opened app and tested sending a message

All done? You should now be able to send messages with attachments! 🎉

