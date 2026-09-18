import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Song, Playlist, UserSettings, UserProfile } from '../types';

// Read Vite client environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

// Verify whether valid Supabase configuration is present
export const isSupabaseConfigured = (): boolean => {
  if (!supabaseUrl || !supabasePublishableKey) return false;
  if (supabaseUrl.includes('placeholder') || supabaseUrl === 'MY_SUPABASE_URL') return false;
  try {
    const parsed = new URL(supabaseUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

// Singleton Supabase Client
let clientInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!clientInstance && supabaseUrl && supabasePublishableKey) {
    clientInstance = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return clientInstance;
};

export const supabase = getSupabaseClient();

/**
 * Data transformation helpers:
 * Support both camelCase and snake_case column names so standard Supabase SQL schemas work seamlessly.
 */
export const formatSongForSupabase = (song: Song, userId?: string) => ({
  id: song.id,
  youtube_id: song.youtubeId,
  title: song.title,
  channel: song.channel,
  thumbnail_url: song.thumbnailUrl,
  duration: song.duration,
  added_at: song.addedAt,
  is_favorite: Boolean(song.isFavorite),
  play_count: song.playCount || 0,
  last_played_at: song.lastPlayedAt || null,
  user_id: song.userId || userId || null,
  is_public: song.isPublic ?? true,
});

export const parseSongFromSupabase = (row: any): Song => ({
  id: String(row.id),
  youtubeId: String(row.youtube_id || row.youtubeId || ''),
  title: String(row.title || 'Untitled Track'),
  channel: String(row.channel || 'Artist'),
  thumbnailUrl: String(row.thumbnail_url || row.thumbnailUrl || ''),
  duration: Number(row.duration) || 0,
  addedAt: Number(row.added_at || row.addedAt) || Date.now(),
  isFavorite: Boolean(row.is_favorite ?? row.isFavorite ?? false),
  playCount: Number(row.play_count ?? row.playCount ?? 0),
  lastPlayedAt: row.last_played_at || row.lastPlayedAt ? Number(row.last_played_at || row.lastPlayedAt) : undefined,
  userId: row.user_id || row.userId || undefined,
  isPublic: row.is_public ?? row.isPublic ?? true,
});

export const formatPlaylistForSupabase = (playlist: Playlist, userId?: string) => ({
  id: playlist.id,
  name: playlist.name,
  description: playlist.description || '',
  song_ids: playlist.songIds || [],
  created_at: playlist.createdAt,
  updated_at: playlist.updatedAt,
  cover_url: playlist.coverUrl || null,
  is_system: Boolean(playlist.isSystem),
  user_id: playlist.userId || userId || null,
  creator_name: playlist.creatorName || null,
  is_public: playlist.isPublic ?? true,
});

export const parsePlaylistFromSupabase = (row: any): Playlist => ({
  id: String(row.id),
  name: String(row.name || 'Untitled Playlist'),
  description: row.description ? String(row.description) : undefined,
  songIds: Array.isArray(row.song_ids)
    ? row.song_ids
    : Array.isArray(row.songIds)
    ? row.songIds
    : [],
  createdAt: Number(row.created_at || row.createdAt) || Date.now(),
  updatedAt: Number(row.updated_at || row.updatedAt) || Date.now(),
  coverUrl: row.cover_url || row.coverUrl || undefined,
  isSystem: Boolean(row.is_system ?? row.isSystem ?? false),
  userId: row.user_id || row.userId || undefined,
  creatorName: row.creator_name || row.creatorName || undefined,
  isPublic: row.is_public ?? row.isPublic ?? true,
});

/**
 * Cloud Operations with Graceful Fallback
 */

export async function fetchSongsFromCloud(): Promise<Song[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.from('songs').select('*').order('added_at', { ascending: false });
    if (error) {
      console.warn('Supabase: Error fetching songs:', error.message);
      return null;
    }
    if (!data) return [];
    return data.map(parseSongFromSupabase);
  } catch (err) {
    console.warn('Supabase: Network/API error fetching songs:', err);
    return null;
  }
}

export async function fetchPlaylistsFromCloud(): Promise<Playlist[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.from('playlists').select('*').order('updated_at', { ascending: false });
    if (error) {
      console.warn('Supabase: Error fetching playlists:', error.message);
      return null;
    }
    if (!data) return [];
    return data.map(parsePlaylistFromSupabase);
  } catch (err) {
    console.warn('Supabase: Network/API error fetching playlists:', err);
    return null;
  }
}

export async function upsertSongToCloud(song: Song, userId?: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const row = formatSongForSupabase(song, userId);
    const { error } = await client.from('songs').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase: Error upserting song:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase: Error saving song to cloud:', err);
    return false;
  }
}

export async function deleteSongFromCloud(songId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('songs').delete().eq('id', songId);
    if (error) {
      console.warn('Supabase: Error deleting song:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase: Error removing song from cloud:', err);
    return false;
  }
}

export async function upsertPlaylistToCloud(playlist: Playlist, userId?: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const row = formatPlaylistForSupabase(playlist, userId);
    const { error } = await client.from('playlists').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase: Error upserting playlist:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase: Error saving playlist to cloud:', err);
    return false;
  }
}

export async function deletePlaylistFromCloud(playlistId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('playlists').delete().eq('id', playlistId);
    if (error) {
      console.warn('Supabase: Error deleting playlist:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase: Error removing playlist from cloud:', err);
    return false;
  }
}

export async function bulkSyncToCloud(songs: Song[], playlists: Playlist[], userId?: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    if (songs.length > 0) {
      const songRows = songs.map((s) => formatSongForSupabase(s, userId));
      const { error: songError } = await client.from('songs').upsert(songRows, { onConflict: 'id' });
      if (songError) console.warn('Supabase: Bulk sync songs error:', songError.message);
    }

    if (playlists.length > 0) {
      const playlistRows = playlists.map((p) => formatPlaylistForSupabase(p, userId));
      const { error: plError } = await client.from('playlists').upsert(playlistRows, { onConflict: 'id' });
      if (plError) console.warn('Supabase: Bulk sync playlists error:', plError.message);
    }

    return true;
  } catch (err) {
    console.warn('Supabase: Bulk sync failed:', err);
    return false;
  }
}

/**
 * Profile Operations (public.profiles)
 */
export async function fetchUserProfileFromCloud(userId: string): Promise<UserProfile | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Supabase: Error fetching profile:', error.message);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      email: data.email,
      username: data.username || data.user_name || data.display_name,
      full_name: data.full_name || data.name,
      avatar_url: data.avatar_url || data.avatar,
      website: data.website,
      role: data.role || 'user',
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (err) {
    console.warn('Supabase: Network exception fetching profile:', err);
    return null;
  }
}

export async function upsertUserProfileToCloud(profile: Partial<UserProfile> & { id: string }): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const row: Record<string, any> = {
      id: profile.id,
      updated_at: new Date().toISOString(),
    };
    if (profile.email !== undefined) row.email = profile.email;
    if (profile.username !== undefined) row.username = profile.username;
    if (profile.full_name !== undefined) row.full_name = profile.full_name;
    if (profile.avatar_url !== undefined) row.avatar_url = profile.avatar_url;
    if (profile.website !== undefined) row.website = profile.website;
    if (profile.role !== undefined) row.role = profile.role;

    const { error } = await client.from('profiles').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase: Error upserting profile:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase: Network exception saving profile:', err);
    return false;
  }
}
