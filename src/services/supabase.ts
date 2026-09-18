import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Song, Playlist, UserSettings, UserProfile } from '../types';
import { toValidUUID, isValidUUID } from '../utils/uuid';

// Read Vite client environment variables (clean surrounding quotes/whitespace)
const rawUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_PUBLIC_SUPABASE_URL ||
  '';
const rawKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY ||
  '';

const supabaseUrl = rawUrl ? String(rawUrl).trim().replace(/^["']|["']$/g, '') : '';
const supabasePublishableKey = rawKey ? String(rawKey).trim().replace(/^["']|["']$/g, '') : '';

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
 * Normalized Schema Types & Interfaces
 */

export interface UserSongRelation {
  userId: string;
  songId: string;
  isFavorite: boolean;
  playCount: number;
  lastPlayedAt?: number;
}

/**
 * 1. SONGS TABLE (Shared / Public song metadata ONLY)
 * Schema: id, youtube_id, title, channel/artist, thumbnail_url, duration, is_public
 * (NO user_id, NO is_favorite, NO play_count, NO last_played_at)
 */

export const formatSongMetadataForSupabase = (song: Song) => {
  return {
    id: toValidUUID(song.id),
    youtube_id: song.youtubeId,
    title: song.title || 'Untitled Track',
    channel: song.channel || 'Artist',
    thumbnail_url: song.thumbnailUrl || '',
    duration: song.duration || 0,
  };
};

export const parseSongMetadataFromSupabase = (row: any): Song => ({
  id: String(row.id),
  youtubeId: String(row.youtube_id || row.youtubeId || ''),
  title: String(row.title || 'Untitled Track'),
  channel: String(row.channel || row.channel_title || row.artist || 'Artist'),
  thumbnailUrl: String(row.thumbnail_url || row.thumbnailUrl || ''),
  duration: Number(row.duration) || 0,
  addedAt: Number(row.added_at || row.created_at ? new Date(row.added_at || row.created_at).getTime() : Date.now()) || Date.now(),
  isFavorite: false,
  playCount: 0,
  lastPlayedAt: undefined,
  userId: undefined,
  isPublic: row.is_public ?? true,
});

// Backward-compatibility alias
export const formatSongForSupabase = formatSongMetadataForSupabase;
export const parseSongFromSupabase = parseSongMetadataFromSupabase;

export async function fetchSongsFromCloud(): Promise<Song[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('songs')
      .select('*');

    if (error) {
      console.error('Supabase: Error fetching shared songs from public.songs:', error.message, error.details || error);
      return null;
    }
    if (!data) return [];
    return data.map(parseSongMetadataFromSupabase);
  } catch (err: any) {
    console.error('Supabase: Network exception fetching songs:', err?.message || err);
    return null;
  }
}

export async function upsertSongToCloud(song: Song): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const row = formatSongMetadataForSupabase(song);
    const { error } = await client.from('songs').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('Supabase: Error upserting song metadata to public.songs:', error.message, error.details || error);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('Supabase: Exception saving song metadata to public.songs:', err?.message || err);
    return false;
  }
}

export async function deleteSongFromCloud(songId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const validSongId = toValidUUID(songId);
    // Delete normalized relations in playlist_items, user_songs, recently_played first
    await Promise.allSettled([
      client.from('playlist_items').delete().eq('song_id', validSongId),
      client.from('user_songs').delete().eq('song_id', validSongId),
      client.from('recently_played').delete().eq('song_id', validSongId),
    ]);

    const { error } = await client.from('songs').delete().eq('id', validSongId);
    if (error) {
      console.error('Supabase: Error deleting song from public.songs:', error.message, error.details || error);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('Supabase: Exception removing song from public.songs:', err?.message || err);
    return false;
  }
}

/**
 * 2. USER_SONGS TABLE (Per-user favorite status, play count & last played)
 * Schema: user_id, song_id, is_favorite, play_count, last_played_at
 */

export async function fetchUserSongsFromCloud(userId: string): Promise<Record<string, UserSongRelation> | null> {
  const client = getSupabaseClient();
  if (!client || !userId) return null;

  try {
    const { data, error } = await client
      .from('user_songs')
      .select('user_id, song_id, is_favorite, play_count, last_played_at')
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase: Error fetching user_songs for user:', userId, error.message, error.details || error);
      return null;
    }

    const map: Record<string, UserSongRelation> = {};
    if (data && Array.isArray(data)) {
      data.forEach((row: any) => {
        const sId = String(row.song_id);
        if (sId) {
          map[sId] = {
            userId: String(row.user_id),
            songId: sId,
            isFavorite: Boolean(row.is_favorite),
            playCount: Number(row.play_count) || 0,
            lastPlayedAt: row.last_played_at ? new Date(row.last_played_at).getTime() || Number(row.last_played_at) : undefined,
          };
        }
      });
    }
    return map;
  } catch (err: any) {
    console.error('Supabase: Exception fetching user_songs:', err?.message || err);
    return null;
  }
}

export async function upsertUserSongToCloud(
  userId: string,
  songId: string,
  data: {
    isFavorite?: boolean;
    playCount?: number;
    lastPlayedAt?: number | string;
  }
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !userId || !songId) return false;

  try {
    const row: Record<string, any> = {
      user_id: userId,
      song_id: toValidUUID(songId),
    };
    if (data.isFavorite !== undefined) row.is_favorite = Boolean(data.isFavorite);
    if (data.playCount !== undefined) row.play_count = Number(data.playCount);
    if (data.lastPlayedAt !== undefined) {
      row.last_played_at =
        typeof data.lastPlayedAt === 'number'
          ? new Date(data.lastPlayedAt).toISOString()
          : data.lastPlayedAt;
    }

    const { error } = await client
      .from('user_songs')
      .upsert(row, { onConflict: 'user_id,song_id' });

    if (error) {
      console.error('Supabase: Error upserting user_songs:', error.message, error.details || error);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('Supabase: Exception saving user_songs:', err?.message || err);
    return false;
  }
}

export async function bulkUpsertUserSongsToCloud(
  userId: string,
  userSongs: { songId: string; isFavorite?: boolean; playCount?: number; lastPlayedAt?: number }[]
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !userId || userSongs.length === 0) return false;

  try {
    const rows = userSongs.map((us) => {
      const row: Record<string, any> = {
        user_id: userId,
        song_id: toValidUUID(us.songId),
        is_favorite: Boolean(us.isFavorite),
        play_count: us.playCount || 0,
      };
      if (us.lastPlayedAt) {
        row.last_played_at = new Date(us.lastPlayedAt).toISOString();
      }
      return row;
    });

    const { error } = await client.from('user_songs').upsert(rows, { onConflict: 'user_id,song_id' });
    if (error) {
      console.error('Supabase: Error in bulk upsert user_songs:', error.message, error.details || error);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('Supabase: Exception in bulk upsert user_songs:', err?.message || err);
    return false;
  }
}

/**
 * 3. PLAYLISTS TABLE (Metadata with owner_id) & PLAYLIST_ITEMS TABLE (Normalized items with position)
 * Schema playlists: id, owner_id, name, description, cover_url, is_public
 * Schema playlist_items: playlist_id, song_id, position
 * (NO playlists.user_id, NO playlists.song_ids)
 */

export const formatPlaylistForSupabase = (playlist: Playlist, userId?: string) => {
  const resolvedOwnerId = playlist.userId || userId || null;
  return {
    id: toValidUUID(playlist.id),
    owner_id: resolvedOwnerId,
    name: playlist.name || 'Untitled Playlist',
    description: playlist.description || '',
    cover_url: playlist.coverUrl || null,
    is_public: playlist.isPublic ?? true,
  };
};

export const parsePlaylistFromSupabase = (row: any): Playlist => ({
  id: String(row.id),
  name: String(row.name || 'Untitled Playlist'),
  description: row.description ? String(row.description) : undefined,
  songIds: [], // Populated strictly via public.playlist_items
  createdAt: Number(row.created_at ? new Date(row.created_at).getTime() : Date.now()) || Date.now(),
  updatedAt: Number(row.updated_at ? new Date(row.updated_at).getTime() : Date.now()) || Date.now(),
  coverUrl: row.cover_url || undefined,
  isSystem: false,
  userId: row.owner_id ? String(row.owner_id) : undefined,
  creatorName: undefined,
  isPublic: row.is_public ?? true,
});

export async function fetchPlaylistsFromCloud(): Promise<Playlist[] | null> {
  const client = getSupabaseClient();
  if (!client) {
    console.error('Supabase: Supabase client is not configured or offline.');
    return null;
  }

  try {
    // 1. Query public.playlists (id, owner_id, name, description, cover_url, is_public)
    const { data: playlistsData, error: playlistsError } = await client
      .from('playlists')
      .select('id, owner_id, name, description, cover_url, is_public, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (playlistsError) {
      console.error('Supabase: Error fetching playlists from public.playlists:', playlistsError.message, playlistsError.details || playlistsError);
      return null;
    }

    if (!playlistsData || !Array.isArray(playlistsData)) return [];

    // 2. Query public.playlist_items (playlist_id, song_id, position)
    const itemsByPlaylist: Record<string, { songId: string; position: number }[]> = {};
    try {
      const { data: itemsData, error: itemsError } = await client
        .from('playlist_items')
        .select('playlist_id, song_id, position')
        .order('position', { ascending: true });

      if (itemsError) {
        console.error('Supabase: Error querying public.playlist_items:', itemsError.message, itemsError.details || itemsError);
      } else if (itemsData && Array.isArray(itemsData)) {
        itemsData.forEach((item: any) => {
          const plId = String(item.playlist_id);
          const sId = String(item.song_id);
          if (plId && sId) {
            if (!itemsByPlaylist[plId]) itemsByPlaylist[plId] = [];
            itemsByPlaylist[plId].push({
              songId: sId,
              position: typeof item.position === 'number' ? item.position : 0,
            });
          }
        });
      }
    } catch (itemsErr: any) {
      console.error('Supabase: Exception querying public.playlist_items:', itemsErr?.message || itemsErr);
    }

    // 3. Assemble complete Playlists with ordered songIds
    return playlistsData.map((row: any) => {
      const pl = parsePlaylistFromSupabase(row);
      if (itemsByPlaylist[pl.id] && itemsByPlaylist[pl.id].length > 0) {
        const sorted = [...itemsByPlaylist[pl.id]].sort((a, b) => a.position - b.position);
        pl.songIds = sorted.map((item) => item.songId);
      }
      return pl;
    });
  } catch (err: any) {
    console.error('Supabase: Network exception fetching playlists:', err?.message || err);
    return null;
  }
}

export async function upsertPlaylistToCloud(playlist: Playlist, userId?: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) {
    console.error('Supabase: Cannot upsert playlist - client not configured.');
    return false;
  }

  try {
    const validPlaylistId = toValidUUID(playlist.id);
    const row = formatPlaylistForSupabase(playlist, userId);

    // 1. Upsert playlist metadata into public.playlists
    const { error: plError } = await client.from('playlists').upsert(row, { onConflict: 'id' });
    if (plError) {
      console.error('Supabase: Error upserting playlist to public.playlists:', plError.message, plError.details || plError);
      return false;
    }

    // 2. Synchronize track items in public.playlist_items
    try {
      // Clear previous items for this playlist
      const { error: delError } = await client
        .from('playlist_items')
        .delete()
        .eq('playlist_id', validPlaylistId);

      if (delError) {
        console.error('Supabase: Error clearing old playlist_items for playlist:', validPlaylistId, delError.message);
      }

      // Insert fresh playlist items with position order
      if (Array.isArray(playlist.songIds) && playlist.songIds.length > 0) {
        const itemRows = playlist.songIds.map((songId, index) => ({
          playlist_id: validPlaylistId,
          song_id: toValidUUID(songId),
          position: index,
        }));

        const { error: itemsError } = await client.from('playlist_items').insert(itemRows);
        if (itemsError) {
          console.error('Supabase: Error inserting playlist_items:', itemsError.message, itemsError.details || itemsError);
          return false;
        }
      }
    } catch (itemsErr: any) {
      console.error('Supabase: Exception syncing playlist_items:', itemsErr?.message || itemsErr);
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('Supabase: Exception saving playlist to cloud:', err?.message || err);
    return false;
  }
}

export async function deletePlaylistFromCloud(playlistId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) {
    console.error('Supabase: Cannot delete playlist - client not configured.');
    return false;
  }

  try {
    const validPlaylistId = toValidUUID(playlistId);
    // Delete playlist items first
    try {
      const { error: itemsError } = await client
        .from('playlist_items')
        .delete()
        .eq('playlist_id', validPlaylistId);
      if (itemsError) {
        console.error('Supabase: Error deleting playlist_items for playlist:', validPlaylistId, itemsError.message);
      }
    } catch (itemErr: any) {
      console.error('Supabase: Exception deleting playlist_items:', itemErr?.message || itemErr);
    }

    // Delete playlist from public.playlists
    const { error: plError } = await client.from('playlists').delete().eq('id', validPlaylistId);
    if (plError) {
      console.error('Supabase: Error deleting playlist from public.playlists:', plError.message, plError.details || plError);
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('Supabase: Exception removing playlist from cloud:', err?.message || err);
    return false;
  }
}

export async function addPlaylistItemToCloud(
  playlistId: string,
  songId: string,
  position: number = 0
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('playlist_items').insert({
      playlist_id: toValidUUID(playlistId),
      song_id: toValidUUID(songId),
      position,
    });
    if (error) {
      console.error('Supabase: Error adding item to public.playlist_items:', error.message, error.details || error);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('Supabase: Exception adding item to public.playlist_items:', err?.message || err);
    return false;
  }
}

export async function removePlaylistItemFromCloud(playlistId: string, songId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('playlist_items')
      .delete()
      .eq('playlist_id', toValidUUID(playlistId))
      .eq('song_id', toValidUUID(songId));

    if (error) {
      console.error('Supabase: Error removing item from public.playlist_items:', error.message, error.details || error);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('Supabase: Exception removing item from public.playlist_items:', err?.message || err);
    return false;
  }
}

/**
 * 4. RECENTLY_PLAYED TABLE (User playback stream)
 * Schema: user_id, song_id, played_at
 */

export async function fetchRecentlyPlayedFromCloud(userId: string): Promise<string[] | null> {
  const client = getSupabaseClient();
  if (!client || !userId) return null;

  try {
    const { data, error } = await client
      .from('recently_played')
      .select('song_id, played_at')
      .eq('user_id', userId)
      .order('played_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Supabase: Error fetching recently_played for user:', userId, error.message, error.details || error);
      return null;
    }

    if (!data || !Array.isArray(data)) return [];
    // Deduplicate in order of most recent
    const seen = new Set<string>();
    const songIds: string[] = [];
    data.forEach((row: any) => {
      const sId = String(row.song_id);
      if (sId && !seen.has(sId)) {
        seen.add(sId);
        songIds.push(sId);
      }
    });
    return songIds;
  } catch (err: any) {
    console.error('Supabase: Exception fetching recently_played:', err?.message || err);
    return null;
  }
}

export async function recordRecentlyPlayedInCloud(userId: string, songId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !userId || !songId) return false;

  try {
    const { error } = await client.from('recently_played').insert({
      user_id: userId,
      song_id: toValidUUID(songId),
      played_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Supabase: Error inserting into public.recently_played:', error.message, error.details || error);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('Supabase: Exception inserting into public.recently_played:', err?.message || err);
    return false;
  }
}

export async function clearRecentlyPlayedInCloud(userId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !userId) return false;

  try {
    const { error } = await client.from('recently_played').delete().eq('user_id', userId);
    if (error) {
      console.error('Supabase: Error clearing public.recently_played:', error.message, error.details || error);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('Supabase: Exception clearing public.recently_played:', err?.message || err);
    return false;
  }
}

/**
 * 5. USER_SETTINGS TABLE (User preferences & recent searches)
 * Schema: user_id, theme, recent_searches, updated_at
 */

export const formatUserSettingsForSupabase = (
  userId: string,
  userData: {
    settings?: Partial<UserSettings>;
    recentSearches?: string[];
  }
) => {
  const row: Record<string, any> = {
    user_id: userId,
  };
  if (userData.settings?.theme !== undefined) {
    row.theme = userData.settings.theme;
  }
  if (userData.recentSearches !== undefined) {
    row.recent_searches = userData.recentSearches;
  }
  return row;
};

export async function fetchUserSettingsFromCloud(userId: string): Promise<{
  settings: Partial<UserSettings> | null;
  recentSearches: string[];
} | null> {
  const client = getSupabaseClient();
  if (!client || !userId) return null;

  try {
    const { data, error } = await client
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Supabase: Note fetching user_settings:', error.message);
      return null;
    }

    if (!data) return null;

    let parsedSettings: Partial<UserSettings> = {};
    if (typeof data.settings === 'object' && data.settings !== null && !Array.isArray(data.settings)) {
      parsedSettings = { ...data.settings };
    } else if (typeof data.settings === 'string') {
      try {
        parsedSettings = JSON.parse(data.settings);
      } catch {}
    }

    if (data.theme && typeof data.theme === 'string') {
      parsedSettings.theme = data.theme as any;
    }

    return {
      settings: Object.keys(parsedSettings).length > 0 ? parsedSettings : null,
      recentSearches: Array.isArray(data.recent_searches) ? data.recent_searches : [],
    };
  } catch (err: any) {
    console.warn('Supabase: Exception fetching user_settings:', err?.message || err);
    return null;
  }
}

export async function upsertUserSettingsToCloud(
  userId: string,
  data: {
    settings?: Partial<UserSettings>;
    recentSearches?: string[];
  }
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !userId) return false;

  try {
    const row = formatUserSettingsForSupabase(userId, data);
    const { error } = await client.from('user_settings').upsert(row, { onConflict: 'user_id' });
    if (error) {
      console.warn('Supabase: Note upserting user_settings:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('Supabase: Exception saving user_settings:', err?.message || err);
    return false;
  }
}

/**
 * 6. BULK SYNC OPERATION (Normalized multi-table synchronization)
 */

export async function bulkSyncToCloud(
  songs: Song[],
  playlists: Playlist[],
  userId?: string,
  userData?: {
    settings?: Partial<UserSettings>;
    recentSearches?: string[];
  }
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const operations: Promise<any>[] = [];

    // 1. Sync shared songs metadata
    if (songs.length > 0) {
      const songRows = songs.map(formatSongMetadataForSupabase);
      operations.push(
        (async () => {
          const { error } = await client.from('songs').upsert(songRows, { onConflict: 'id' });
          if (error) console.error('Supabase: Bulk sync songs error:', error.message, error.details || error);
        })()
      );
    }

    // 2. Sync playlists and playlist_items
    if (playlists.length > 0) {
      operations.push(
        (async () => {
          await Promise.all(playlists.map((p) => upsertPlaylistToCloud(p, userId)));
        })()
      );
    }

    // 3. Sync user-specific song relations (favorites, play stats)
    if (userId && songs.length > 0) {
      const userSongRows = songs.map((s) => ({
        songId: s.id,
        isFavorite: Boolean(s.isFavorite),
        playCount: s.playCount || 0,
        lastPlayedAt: s.lastPlayedAt,
      }));
      operations.push(bulkUpsertUserSongsToCloud(userId, userSongRows));
    }

    // 4. Sync user settings & searches
    if (userId && userData) {
      operations.push(upsertUserSettingsToCloud(userId, userData));
    }

    await Promise.all(operations);
    return true;
  } catch (err: any) {
    console.error('Supabase: Exception during bulk sync:', err?.message || err);
    return false;
  }
}

/**
 * 7. PROFILES TABLE (public.profiles)
 * Schema: id, username, full_name, avatar_url, website, role, created_at, updated_at
 */

export async function fetchUserProfileFromCloud(userId: string): Promise<UserProfile | null> {
  const client = getSupabaseClient();
  if (!client || !userId) return null;

  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Supabase: Error fetching profile for user:', userId, error.message);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      email: data.email,
      username: data.username || data.full_name?.split(' ')[0] || 'User',
      full_name: data.full_name || '',
      avatar_url: data.avatar_url || '',
      website: data.website,
      role: data.role || 'user',
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (err: any) {
    console.warn('Supabase: Exception fetching profile:', err?.message || err);
    return null;
  }
}

export async function upsertUserProfileToCloud(profile: Partial<UserProfile> & { id: string }): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !profile.id) return false;

  try {
    const row: Record<string, any> = {
      id: profile.id,
    };
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
  } catch (err: any) {
    console.warn('Supabase: Exception saving profile:', err?.message || err);
    return false;
  }
}
