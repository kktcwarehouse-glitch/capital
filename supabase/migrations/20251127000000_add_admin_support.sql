/*
  Add Admin Support and Featured Profiles
  
  This migration adds:
  1. is_admin boolean field to profiles table
  2. is_featured boolean field to startup_profiles and investor_profiles
  3. Updates role constraint to allow 'admin' role
  4. Adds RLS policies for admin access
*/

begin;

-- Add is_admin field to profiles
alter table profiles 
  add column if not exists is_admin boolean not null default false;

-- Update role constraint to allow 'admin'
alter table profiles 
  drop constraint if exists profiles_role_check;

alter table profiles 
  add constraint profiles_role_check 
  check (role in ('startup', 'investor', 'admin'));

-- Add is_featured field to startup_profiles
alter table startup_profiles 
  add column if not exists is_featured boolean not null default false;

-- Add is_featured field to investor_profiles
alter table investor_profiles 
  add column if not exists is_featured boolean not null default false;

-- Create index for featured startups
create index if not exists idx_startup_profiles_featured 
  on startup_profiles(is_featured) 
  where is_featured = true;

-- Create index for featured investors
create index if not exists idx_investor_profiles_featured 
  on investor_profiles(is_featured) 
  where is_featured = true;

-- Helper function to check if user is admin
create or replace function public.is_admin(user_id uuid)
returns boolean
language plpgsql
security definer
stable
as $$
begin
  return exists (
    select 1 
    from profiles 
    where id = user_id 
      and (is_admin = true or role = 'admin')
  );
end;
$$;

-- RLS Policies for Admin Access

-- Update existing profile policies to allow admin access
drop policy if exists "Users can read own profile" on profiles;
create policy "Users can read own profile"
  on profiles for select
  to authenticated
  using (
    auth.uid() = id 
    or public.is_admin(auth.uid())
  );

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update
  to authenticated
  using (
    auth.uid() = id 
    or public.is_admin(auth.uid())
  )
  with check (
    auth.uid() = id 
    or public.is_admin(auth.uid())
  );

-- Update startup profiles policies to allow admin access
drop policy if exists "Startups manage their profile" on startup_profiles;
create policy "Startups manage their profile"
  on startup_profiles for all
  to authenticated
  using (
    auth.uid() = user_id 
    or public.is_admin(auth.uid())
  )
  with check (
    auth.uid() = user_id 
    or public.is_admin(auth.uid())
  );

-- Update investor profiles policies to allow admin access
drop policy if exists "Investors manage their profile" on investor_profiles;
create policy "Investors manage their profile"
  on investor_profiles for all
  to authenticated
  using (
    auth.uid() = user_id 
    or public.is_admin(auth.uid())
  )
  with check (
    auth.uid() = user_id 
    or public.is_admin(auth.uid())
  );

commit;

