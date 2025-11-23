# FundLink Database Setup Guide

This guide will help you set up the FundLink database using Supabase.

## Prerequisites

1. **Supabase Account**: Create a free account at [supabase.com](https://supabase.com)
2. **Supabase CLI**: Install the Supabase CLI for local development (optional)

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `fundlink` (or your preferred name)
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for the project to be created (2-3 minutes)

## Step 2: Get Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

## Step 3: Set Environment Variables

1. Copy `env.example` to `.env`:
   ```bash
   cp env.example .env
   ```

2. Edit `.env` and add your Supabase credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
   EXPO_PUBLIC_ENVIRONMENT=development
   ```

## Step 4: Reset or Prepare the Database

If this project previously pointed at a different Supabase instance, or you simply want to wipe the slate clean, do the following before running the migration:

1. In the Supabase dashboard open **Project Settings → General** and click **Reset Project**.\
   _⚠️ This permanently removes every table, policy, bucket and piece of data in the project._
2. Alternatively, in the SQL editor run:
   ```sql
   drop schema if exists public cascade;
   create schema public;
   ```
3. Re-copy the **Project URL** and **anon** key from **Settings → API** and update both `.env` and `app.json`.

## Step 5: Run the FundLink Migration

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open `supabase/migrations/20251113154500_initialize_fundlink_schema.sql`
4. Copy the entire file into the SQL editor (it is safe to run more than once; it drops stale objects and recreates everything)
5. Click **Run** to execute the migration

### Option B: Using Supabase CLI

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-id
   ```

4. Push the migration:
   ```bash
   supabase db push
   ```

## Step 6: Verify Database Setup

After running migrations, verify these tables exist:

- ✅ `profiles`
- ✅ `startup_profiles`
- ✅ `investor_profiles`
- ✅ `messages`
- ✅ `profile_views`
- ✅ `favorites`
- ✅ `subscriptions`
- ✅ `startup_media`

## Step 7: Configure Storage Buckets and Policies

### Create Storage Buckets

1. Go to **Storage** → **Buckets** in your Supabase dashboard
2. Click **New bucket** and create these three buckets:
   - **Name**: `startup-images`, **Public**: ✅ (checked)
   - **Name**: `startup-videos`, **Public**: ✅ (checked)
   - **Name**: `startup-documents`, **Public**: ❌ (unchecked)

Alternatively, run this SQL in the SQL Editor:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('startup-images', 'startup-images', true),
  ('startup-videos', 'startup-videos', true),
  ('startup-documents', 'startup-documents', false)
ON CONFLICT (id) DO NOTHING;
```

### Set Up Storage Policies

After creating the buckets, you **must** run the storage policies migration:

1. Go to **SQL Editor** in your Supabase dashboard
2. Open `supabase/migrations/20251113154501_setup_storage_policies.sql`
3. Copy the entire file and paste it into the SQL editor
4. Click **Run** to execute

This creates the Row Level Security policies that allow authenticated users to upload files to the buckets. Without these policies, you'll get "row violates row-level security policy" errors when trying to upload media.

## Step 8: Test the Connection

1. Start your development server:
   ```bash
   npm run dev
   ```

2. The app should now connect to your Supabase database
3. Try creating a new account to test the setup

## Troubleshooting

### Migration reruns

- The new `20251113154500_initialize_fundlink_schema.sql` script is idempotent—running it again will drop and recreate the public schema objects so you always end up with a clean copy of the FundLink data model.

### Common Issues

1. **"Missing environment variable" error**:
   - Make sure `.env` file exists and has correct values
   - Restart your development server after adding environment variables

2. **Database connection failed**:
   - Verify your Supabase URL and anon key are correct
   - Check if your Supabase project is active (not paused)

3. **Migration errors**:
   - Make sure you're running migrations in the correct order
   - Check the Supabase logs for detailed error messages

4. **Storage upload fails**:
   - Verify storage buckets exist
   - Check storage policies are correctly set

### Getting Help

- Check Supabase documentation: [docs.supabase.com](https://docs.supabase.com)
- Join Supabase Discord: [discord.supabase.com](https://discord.supabase.com)
- Review Supabase logs in your project dashboard

## Security Notes

- Never commit your `.env` file to version control
- The `anon` key is safe to use in client-side code
- For production, consider using Row Level Security (RLS) policies
- Regularly rotate your database password

## Next Steps

Once your database is set up:

1. Update app configuration (see `app-config.md`)
2. Add error handling improvements
3. Test all features thoroughly
4. Deploy to production

---

**Need help?** Check the troubleshooting section or reach out to the development team.




