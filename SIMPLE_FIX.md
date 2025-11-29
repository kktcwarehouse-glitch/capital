# 🎯 Simple 2-Step Fix

You got a permissions error. Here's the easiest way to fix it:

---

## Step 1: Fix the Messages Table (SQL Editor)

1. Go to Supabase Dashboard → **SQL Editor**
2. Click **"New query"**
3. Copy and paste from: **`PART1_MESSAGES_FIX.sql`**
4. Click **"Run"**
5. Should see: ✅ **"Success"**

**This fixes the immediate error you're seeing!**

---

## Step 2: Create Storage Bucket (Dashboard UI)

1. Go to **Storage** (left sidebar)
2. Click **"New bucket"**
3. Fill in:
   - Name: `chat-media`
   - Public: ✅ **CHECK THIS!**
4. Click **"Create bucket"**
5. Click on the `chat-media` bucket you just created
6. Click **"Policies"** tab
7. You'll see a button **"Add policies from template"** or **"New policy"**
8. Select **"Allow public read access"** template (or create manually)

**Simplified Policy Setup:**

Just add ONE simple policy for now:
- Click **"New policy"**
- Name: `Public Access`
- Operation: **All** (SELECT, INSERT, UPDATE, DELETE)
- Target: `authenticated`
- Policy definition: `true`
- Click **Save**

---

## Step 3: Restart & Test

```bash
# In your terminal (Ctrl+C to stop)
npm run dev
```

Then test:
1. Open app
2. Go to Messages
3. Send a text message - should work!
4. Try image upload - should work!

---

## What You Just Did

✅ **Step 1** fixed the database constraint error  
✅ **Step 2** created storage for file uploads  
✅ **Step 3** restarted with new settings  

The "must be owner of table objects" error happens because you can't modify storage tables directly via SQL - you have to use the Dashboard UI instead.

---

## Need More Detailed Instructions?

- For SQL: See **`PART1_MESSAGES_FIX.sql`**
- For Storage: See **`PART2_STORAGE_SETUP.md`**

---

## Quick Test After Fix

Run this in SQL Editor to verify:

```sql
-- Should show the new constraint allows 'document'
SELECT pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'messages_attachment_type_check';

-- Should show your bucket exists
SELECT * FROM storage.buckets WHERE id = 'chat-media';
```

Expected:
- First query shows: `'image', 'video', 'document'` ✅
- Second query shows: 1 row with `public = true` ✅

All done! 🚀

