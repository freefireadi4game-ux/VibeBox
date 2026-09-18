-- ==============================================================================
-- VIBEBOX SUPABASE SCHEMA & ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- Roles:
--   'admin' : Full access across all tables, songs, playlists, and user profiles.
--   'user'  : Can read/play public songs & playlists. Can insert, update, and delete
--             ONLY their own playlists, songs, favorites, recently played & settings.
-- ==============================================================================

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  username text unique,
  avatar_url text,
  role text default 'user' check (role in ('admin', 'user')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Profiles: Public can read profiles (usernames, avatars)
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- Profiles: Users can insert/update their own profile
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (
    auth.uid() = id 
    or exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
  );

-- Profiles: Auto-create profile on signup trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, username, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    case 
      when new.email = 'freefireadi4game@gmail.com' then 'admin'
      when new.raw_user_meta_data->>'role' = 'admin' then 'admin'
      else 'user'
    end
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. SONGS TABLE
create table if not exists public.songs (
  id text primary key,
  title text not null,
  artist text not null,
  duration integer default 0,
  thumbnail_url text,
  youtube_id text not null,
  channel_title text,
  added_at bigint default (extract(epoch from now()) * 1000)::bigint,
  user_id uuid references auth.users on delete cascade,
  is_public boolean default true,
  creator_name text,
  created_at timestamptz default now()
);

-- Enable RLS on songs
alter table public.songs enable row level security;

-- Songs: Anyone (authenticated or anon) can view public songs or songs they created
create policy "Public songs are viewable by everyone"
  on public.songs for select
  using (
    is_public = true 
    or auth.uid() = user_id 
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Songs: Authenticated users can insert songs with their own user_id (or admins)
create policy "Authenticated users can add songs"
  on public.songs for insert
  with check (
    auth.uid() = user_id 
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Songs: Only song owner or admins can update songs
create policy "Owners and admins can update songs"
  on public.songs for update
  using (
    auth.uid() = user_id 
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Songs: Only song owner or admins can delete songs
create policy "Owners and admins can delete songs"
  on public.songs for delete
  using (
    auth.uid() = user_id 
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );


-- 3. PLAYLISTS TABLE
create table if not exists public.playlists (
  id text primary key,
  name text not null,
  description text default '',
  cover_url text,
  song_ids jsonb default '[]'::jsonb,
  created_at bigint default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint default (extract(epoch from now()) * 1000)::bigint,
  user_id uuid references auth.users on delete cascade,
  is_public boolean default true,
  creator_name text
);

-- Enable RLS on playlists
alter table public.playlists enable row level security;

-- Playlists: Anyone can view public playlists or playlists they created
create policy "Public playlists are viewable by everyone"
  on public.playlists for select
  using (
    is_public = true 
    or auth.uid() = user_id 
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Playlists: Authenticated users can create playlists owned by them
create policy "Users can create playlists"
  on public.playlists for insert
  with check (
    auth.uid() = user_id 
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Playlists: Users can update ONLY their own playlists (Admins can update any)
create policy "Users can update only their own playlists"
  on public.playlists for update
  using (
    auth.uid() = user_id 
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Playlists: Users can delete ONLY their own playlists (Admins can delete any)
create policy "Users can delete only their own playlists"
  on public.playlists for delete
  using (
    auth.uid() = user_id 
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );


-- 4. USER_DATA TABLE (Favorites, Recently Played, Settings)
create table if not exists public.user_data (
  user_id uuid references auth.users on delete cascade primary key,
  favorites jsonb default '[]'::jsonb,
  recently_played jsonb default '[]'::jsonb,
  settings jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Enable RLS on user_data
alter table public.user_data enable row level security;

-- User Data: Users can read ONLY their own user_data (Admins can read all)
create policy "Users can view only their own user_data"
  on public.user_data for select
  using (
    auth.uid() = user_id 
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- User Data: Users can insert/upsert ONLY their own user_data (Admins can manage all)
create policy "Users can insert only their own user_data"
  on public.user_data for insert
  with check (
    auth.uid() = user_id 
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- User Data: Users can update ONLY their own user_data (Admins can manage all)
create policy "Users can update only their own user_data"
  on public.user_data for update
  using (
    auth.uid() = user_id 
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- User Data: Users can delete ONLY their own user_data (Admins can delete any)
create policy "Users can delete only their own user_data"
  on public.user_data for delete
  using (
    auth.uid() = user_id 
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
