/*
  FundLink Storage Policies
  
  Run this after creating the storage buckets in Supabase Dashboard:
  - startup-images (public)
  - startup-videos (public)  
  - startup-documents (private)
  
  This script sets up Row Level Security policies for storage uploads.
*/

-- Enable RLS on storage.objects if not already enabled
alter table storage.objects enable row level security;

-- Drop existing policies if they exist (for re-running)
drop policy if exists "Authenticated can read startup images" on storage.objects;
drop policy if exists "Authenticated can upload startup images" on storage.objects;
drop policy if exists "Users can update own startup images" on storage.objects;
drop policy if exists "Users can delete own startup images" on storage.objects;

drop policy if exists "Authenticated can read startup videos" on storage.objects;
drop policy if exists "Authenticated can upload startup videos" on storage.objects;
drop policy if exists "Users can update own startup videos" on storage.objects;
drop policy if exists "Users can delete own startup videos" on storage.objects;

drop policy if exists "Authenticated can read startup documents" on storage.objects;
drop policy if exists "Authenticated can upload startup documents" on storage.objects;
drop policy if exists "Users can update own startup documents" on storage.objects;
drop policy if exists "Users can delete own startup documents" on storage.objects;

-- ============================================================================
-- startup-images bucket policies (public bucket)
-- ============================================================================

-- Anyone authenticated can read images
create policy "Authenticated can read startup images"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'startup-images');

-- Authenticated users can upload images
create policy "Authenticated can upload startup images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'startup-images');

-- Users can update their own images (where folder prefix = user ID)
create policy "Users can update own startup images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'startup-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'startup-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own images
create policy "Users can delete own startup images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'startup-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- startup-videos bucket policies (public bucket)
-- ============================================================================

-- Anyone authenticated can read videos
create policy "Authenticated can read startup videos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'startup-videos');

-- Authenticated users can upload videos
create policy "Authenticated can upload startup videos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'startup-videos');

-- Users can update their own videos
create policy "Users can update own startup videos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'startup-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'startup-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own videos
create policy "Users can delete own startup videos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'startup-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- startup-documents bucket policies (private bucket)
-- ============================================================================

-- Authenticated users can read documents
create policy "Authenticated can read startup documents"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'startup-documents');

-- Authenticated users can upload documents
create policy "Authenticated can upload startup documents"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'startup-documents');

-- Users can update their own documents
create policy "Users can update own startup documents"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'startup-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'startup-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own documents
create policy "Users can delete own startup documents"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'startup-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );




