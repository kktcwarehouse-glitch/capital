/*
  FundLink Core Schema (2025-11-13)

  This migration resets the public schema for a clean FundLink deployment.
  It drops legacy objects, recreates core tables, installs row level security
  policies, configures helper triggers, and provisions storage policies/buckets.
*/

begin;

-- Drop legacy tables so this migration can be re-run safely
drop table if exists startup_media cascade;
drop table if exists favorites cascade;
drop table if exists profile_views cascade;
drop table if exists messages cascade;
drop table if exists subscriptions cascade;
drop table if exists investor_profiles cascade;
drop table if exists startup_profiles cascade;
drop table if exists profiles cascade;

-- Drop helper functions so they can be recreated
drop function if exists public.set_updated_at cascade;

-- Ensure UUID helpers are present
create extension if not exists "pgcrypto";

-- Timestamp helper (keeps updated_at fresh)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles (one-to-one with auth.users)
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null check (role in ('startup', 'investor')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger trg_profiles_updated_at
before update on profiles
for each row
execute function public.set_updated_at();

alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Startup profiles
-- ---------------------------------------------------------------------------
create table startup_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  company_name text not null,
  sector text not null,
  location text not null,
  stage text not null,
  funding_goal numeric default 0 check (funding_goal >= 0),
  description text default '',
  logo_url text,
  pitch_deck_url text,
  website text,
  team_size integer check (team_size is null or team_size >= 0),
  founded_year integer check (founded_year is null or founded_year between 1900 and extract(year from now())::integer),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id)
);

create trigger trg_startup_profiles_updated_at
before update on startup_profiles
for each row
execute function public.set_updated_at();

alter table startup_profiles enable row level security;

create policy "Anyone authenticated can view startups"
  on startup_profiles for select
  to authenticated
  using (true);

create policy "Startups manage their profile"
  on startup_profiles for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_startup_profiles_sector on startup_profiles(sector);
create index idx_startup_profiles_stage on startup_profiles(stage);
create index idx_startup_profiles_created on startup_profiles(created_at desc);

-- ---------------------------------------------------------------------------
-- Investor profiles
-- ---------------------------------------------------------------------------
create table investor_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  company text,
  investor_type text not null,
  location text not null,
  investment_range_min numeric check (investment_range_min is null or investment_range_min >= 0),
  investment_range_max numeric check (investment_range_max is null or investment_range_max >= 0),
  sectors_of_interest text[] not null default '{}',
  bio text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id)
);

create trigger trg_investor_profiles_updated_at
before update on investor_profiles
for each row
execute function public.set_updated_at();

alter table investor_profiles enable row level security;

create policy "Anyone authenticated can view investors"
  on investor_profiles for select
  to authenticated
  using (true);

create policy "Investors manage their profile"
  on investor_profiles for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_investor_profiles_location on investor_profiles(location);
create index idx_investor_profiles_type on investor_profiles(investor_type);
create index idx_investor_profiles_sectors on investor_profiles using gin (sectors_of_interest);

-- ---------------------------------------------------------------------------
-- Messages
-- ---------------------------------------------------------------------------
create table messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

alter table messages enable row level security;

create policy "Participants can read messages"
  on messages for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "Senders can create messages"
  on messages for insert
  to authenticated
  with check (auth.uid() = sender_id);

create policy "Recipients can mark messages read"
  on messages for update
  to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

create index idx_messages_sender on messages(sender_id);
create index idx_messages_recipient on messages(recipient_id);
create index idx_messages_created_at on messages(created_at desc);

-- ---------------------------------------------------------------------------
-- Profile views
-- ---------------------------------------------------------------------------
create table profile_views (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references startup_profiles(id) on delete cascade,
  viewer_id uuid not null references profiles(id) on delete cascade,
  viewed_at timestamptz not null default timezone('utc', now())
);

alter table profile_views enable row level security;

create policy "Startup owners can view analytics"
  on profile_views for select
  to authenticated
  using (
    exists (
      select 1
      from startup_profiles
      where startup_profiles.id = profile_views.startup_id
        and startup_profiles.user_id = auth.uid()
    )
  );

create policy "Investors record their views"
  on profile_views for insert
  to authenticated
  with check (auth.uid() = viewer_id);

create index idx_profile_views_startup on profile_views(startup_id);
create index idx_profile_views_viewer on profile_views(viewer_id);

-- ---------------------------------------------------------------------------
-- Favorites
-- ---------------------------------------------------------------------------
create table favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  startup_id uuid not null references startup_profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, startup_id)
);

alter table favorites enable row level security;

create policy "Users manage their favorites"
  on favorites for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Startup owners can view favorite counts"
  on favorites for select
  to authenticated
  using (
    exists (
      select 1
      from startup_profiles
      where startup_profiles.id = favorites.startup_id
        and startup_profiles.user_id = auth.uid()
    )
  );

create index idx_favorites_startup on favorites(startup_id);

-- ---------------------------------------------------------------------------
-- Subscriptions
-- ---------------------------------------------------------------------------
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  tier text not null check (tier in ('basic', 'pro', 'premium')),
  status text not null check (status in ('active', 'cancelled', 'expired')),
  started_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id)
);

create trigger trg_subscriptions_updated_at
before update on subscriptions
for each row
execute function public.set_updated_at();

alter table subscriptions enable row level security;

create policy "Users can manage their subscription"
  on subscriptions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_subscriptions_user on subscriptions(user_id);

-- ---------------------------------------------------------------------------
-- Startup media & storage
-- ---------------------------------------------------------------------------
create table startup_media (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references startup_profiles(id) on delete cascade,
  media_type text not null check (media_type in ('image', 'video', 'document')),
  file_url text not null,
  file_name text not null,
  file_size bigint check (file_size is null or file_size >= 0),
  mime_type text,
  display_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger trg_startup_media_updated_at
before update on startup_media
for each row
execute function public.set_updated_at();

alter table startup_media enable row level security;

create policy "Anyone authenticated can view media"
  on startup_media for select
  to authenticated
  using (true);

create policy "Startup owners manage media"
  on startup_media for all
  to authenticated
  using (
    exists (
      select 1
      from startup_profiles
      where startup_profiles.id = startup_media.startup_id
        and startup_profiles.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from startup_profiles
      where startup_profiles.id = startup_media.startup_id
        and startup_profiles.user_id = auth.uid()
    )
  );

create index idx_startup_media_startup on startup_media(startup_id);
create index idx_startup_media_type on startup_media(media_type);
create unique index idx_startup_media_primary on startup_media(startup_id) where is_primary;

-- Storage configuration must be applied using the Supabase Storage UI or CLI.
-- Manual steps (post migration):
-- 1. Create buckets:
--      - startup-images (public)
--      - startup-videos (public)
--      - startup-documents (private)
-- 2. Add policies equivalent to:
--      a. Authenticated read/upload for each bucket
--      b. Owners (folder prefix = auth.uid()) can update/delete their files
-- 3. Ensure row level security remains enabled on storage.objects.

commit;

