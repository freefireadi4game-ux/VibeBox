-- ==============================================================================
-- VIBEBOX SUPABASE SCHEMA & ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- Roles:
--   'admin' : Full access across all tables, songs, playlists, and user profiles.
--   'user'  : Can read/play public songs & playlists. Can insert, update, and delete
--             their own playlists, songs, favorites, recently played & settings.
-- ==============================================================================

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  username text unique,
  avatar_url text,
  website text,
  role text default 'user' check (role in ('admin', 'user')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure all columns exist on existing profiles table
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists website text;
alter table public.profiles add column if not exists role text default 'user';
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Profiles Policies
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
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
  youtube_id text not null,
  title text not null,
  channel text,
  channel_title text,
  artist text,
  thumbnail_url text,
  duration integer default 0,
  added_at bigint default (extract(epoch from now()) * 1000)::bigint,
  is_favorite boolean default false,
  play_count integer default 0,
  last_played_at bigint,
  user_id uuid references auth.users on delete cascade,
  is_public boolean default true,
  creator_name text,
  created_at timestamptz default now()
);

-- Ensure all columns exist on existing songs table
alter table public.songs add column if not exists youtube_id text;
alter table public.songs add column if not exists title text;
alter table public.songs add column if not exists channel text;
alter table public.songs add column if not exists channel_title text;
alter table public.songs add column if not exists artist text;
alter table public.songs add column if not exists thumbnail_url text;
alter table public.songs add column if not exists duration integer default 0;
alter table public.songs add column if not exists added_at bigint default (extract(epoch from now()) * 1000)::bigint;
alter table public.songs add column if not exists is_favorite boolean default false;
alter table public.songs add column if not exists play_count integer default 0;
alter table public.songs add column if not exists last_played_at bigint;
alter table public.songs add column if not exists user_id uuid references auth.users on delete cascade;
alter table public.songs add column if not exists is_public boolean default true;
alter table public.songs add column if not exists creator_name text;
alter table public.songs add column if not exists created_at timestamptz default now();

-- Enable RLS on songs
alter table public.songs enable row level security;

-- Songs: Anyone can view public songs or songs they own
drop policy if exists "Public songs are viewable by everyone" on public.songs;
create policy "Public songs are viewable by everyone"
  on public.songs for select
  using (
    is_public = true 
    or auth.uid() = user_id 
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Songs: Authenticated users can insert songs
drop policy if exists "Authenticated users can add songs" on public.songs;
create policy "Authenticated users can add songs"
  on public.songs for insert
  with check (
    auth.role() = 'authenticated'
    and (
      user_id is null 
      or auth.uid() = user_id 
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
  );

-- Songs: Song owner, admin, or authenticated user updating play counts can update
drop policy if exists "Owners and admins can update songs" on public.songs;
create policy "Owners and admins can update songs"
  on public.songs for update
  using (
    auth.uid() = user_id 
    or user_id is null
    or auth.role() = 'authenticated'
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Songs: Only song owner or admins can delete songs
drop policy if exists "Owners and admins can delete songs" on public.songs;
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
  creator_name text,
  is_system boolean default false
);

-- Ensure all columns exist on existing playlists table
alter table public.playlists add column if not exists name text;
alter table public.playlists add column if not exists description text default '';
alter table public.playlists add column if not exists cover_url text;
alter table public.playlists add column if not exists song_ids jsonb default '[]'::jsonb;
alter table public.playlists add column if not exists created_at bigint default (extract(epoch from now()) * 1000)::bigint;
alter table public.playlists add column if not exists updated_at bigint default (extract(epoch from now()) * 1000)::bigint;
alter table public.playlists add column if not exists user_id uuid references auth.users on delete cascade;
alter table public.playlists add column if not exists is_public boolean default true;
alter table public.playlists add column if not exists creator_name text;
alter table public.playlists add column if not exists is_system boolean default false;

-- Enable RLS on playlists
alter table public.playlists enable row level security;

-- Playlists: Anyone can view public playlists or playlists they created
drop policy if exists "Public playlists are viewable by everyone" on public.playlists;
create policy "Public playlists are viewable by everyone"
  on public.playlists for select
  using (
    is_public = true 
    or auth.uid() = user_id 
    or user_id is null
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Playlists: Authenticated users can create playlists owned by them
drop policy if exists "Users can create playlists" on public.playlists;
create policy "Users can create playlists"
  on public.playlists for insert
  with check (
    auth.role() = 'authenticated'
    and (
      user_id is null 
      or auth.uid() = user_id 
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
  );

-- Playlists: Users can update ONLY their own playlists (Admins can update any)
drop policy if exists "Users can update only their own playlists" on public.playlists;
create policy "Users can update only their own playlists"
  on public.playlists for update
  using (
    auth.uid() = user_id 
    or user_id is null
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Playlists: Users can delete ONLY their own playlists (Admins can delete any)
drop policy if exists "Users can delete only their own playlists" on public.playlists;
create policy "Users can delete only their own playlists"
  on public.playlists for delete
  using (
    auth.uid() = user_id 
    or user_id is null
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );


-- 4. PLAYLIST_ITEMS TABLE (Individual track associations per playlist)
create table if not exists public.playlist_items (
  id text primary key,
  playlist_id text references public.playlists(id) on delete cascade not null,
  song_id text not null,
  position integer default 0,
  added_at bigint default (extract(epoch from now()) * 1000)::bigint,
  user_id uuid references auth.users on delete cascade,
  created_at timestamptz default now()
);

-- Ensure all columns exist on playlist_items table
alter table public.playlist_items add column if not exists playlist_id text references public.playlists(id) on delete cascade;
alter table public.playlist_items add column if not exists song_id text;
alter table public.playlist_items add column if not exists position integer default 0;
alter table public.playlist_items add column if not exists added_at bigint default (extract(epoch from now()) * 1000)::bigint;
alter table public.playlist_items add column if not exists user_id uuid references auth.users on delete cascade;
alter table public.playlist_items add column if not exists created_at timestamptz default now();

-- Enable RLS on playlist_items
alter table public.playlist_items enable row level security;

-- Playlist Items: Viewable if playlist is viewable
drop policy if exists "Playlist items are viewable by everyone who can view the playlist" on public.playlist_items;
create policy "Playlist items are viewable by everyone who can view the playlist"
  on public.playlist_items for select
  using (
    auth.uid() = user_id
    or user_id is null
    or exists (
      select 1 from public.playlists p
      where p.id = playlist_id
      and (p.is_public = true or p.user_id = auth.uid() or p.user_id is null)
    )
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Playlist Items: Insertable by playlist owner or item owner
drop policy if exists "Users can insert playlist items" on public.playlist_items;
create policy "Users can insert playlist items"
  on public.playlist_items for insert
  with check (
    auth.role() = 'authenticated'
    and (
      auth.uid() = user_id
      or user_id is null
      or exists (
        select 1 from public.playlists p
        where p.id = playlist_id
        and (p.user_id = auth.uid() or p.user_id is null)
      )
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
  );

-- Playlist Items: Updatable by owner
drop policy if exists "Users can update playlist items" on public.playlist_items;
create policy "Users can update playlist items"
  on public.playlist_items for update
  using (
    auth.uid() = user_id
    or user_id is null
    or exists (
      select 1 from public.playlists p
      where p.id = playlist_id
      and (p.user_id = auth.uid() or p.user_id is null)
    )
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Playlist Items: Deletable by owner
drop policy if exists "Users can delete playlist items" on public.playlist_items;
create policy "Users can delete playlist items"
  on public.playlist_items for delete
  using (
    auth.uid() = user_id
    or user_id is null
    or exists (
      select 1 from public.playlists p
      where p.id = playlist_id
      and (p.user_id = auth.uid() or p.user_id is null)
    )
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );


-- 5. USER_SETTINGS TABLE (Favorites, Recently Played, Settings, Recent Searches)
create table if not exists public.user_settings (
  user_id uuid references auth.users on delete cascade primary key,
  favorites jsonb default '[]'::jsonb,
  recently_played jsonb default '[]'::jsonb,
  settings jsonb default '{}'::jsonb,
  recent_searches jsonb default '[]'::jsonb,
  theme text default 'graphite',
  updated_at timestamptz default now()
);

-- Ensure all columns exist on user_settings table
alter table public.user_settings add column if not exists favorites jsonb default '[]'::jsonb;
alter table public.user_settings add column if not exists recently_played jsonb default '[]'::jsonb;
alter table public.user_settings add column if not exists settings jsonb default '{}'::jsonb;
alter table public.user_settings add column if not exists recent_searches jsonb default '[]'::jsonb;
alter table public.user_settings add column if not exists theme text default 'graphite';
alter table public.user_settings add column if not exists updated_at timestamptz default now();

-- Enable RLS on user_settings
alter table public.user_settings enable row level security;

-- User Settings: Users can read ONLY their own user_settings (Admins can read all)
drop policy if exists "Users can view only their own user_settings" on public.user_settings;
create policy "Users can view only their own user_settings"
  on public.user_settings for select
  using (
    auth.uid() = user_id 
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- User Settings: Users can insert/upsert ONLY their own user_settings (Admins can manage all)
drop policy if exists "Users can insert only their own user_settings" on public.user_settings;
create policy "Users can insert only their own user_settings"
  on public.user_settings for insert
  with check (
    auth.uid() = user_id 
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- User Settings: Users can update ONLY their own user_settings (Admins can manage all)
drop policy if exists "Users can update only their own user_settings" on public.user_settings;
create policy "Users can update only their own user_settings"
  on public.user_settings for update
  using (
    auth.uid() = user_id 
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- User Settings: Users can delete ONLY their own user_settings (Admins can delete any)
drop policy if exists "Users can delete only their own user_settings" on public.user_settings;
create policy "Users can delete only their own user_settings"
  on public.user_settings for delete
  using (
    auth.uid() = user_id 
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
