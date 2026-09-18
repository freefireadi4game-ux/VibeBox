import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Song, Playlist, UserSettings, UserProfile } from '../types';

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
 * Data transformation helpers:
 * Support schema column naming so standard Supabase SQL schemas work seamlessly.
 */
export const formatSongForSupabase = (song: Song, userId?: string) => {
  const resolvedUserId = song.userId || userId || null;
  return {
    id: song.id,
    youtube_id: song.youtubeId,
    title: song.title || 'Untitled Track',
    channel: song.channel || 'Artist',
    channel_title: song.channel || 'Artist',
    thumbnail_url: song.thumbnailUrl || '',
    duration: song.duration || 0,
    added_at: song.addedAt || Date.now(),
    is_favorite: Boolean(song.isFavorite),
    play_count: song.playCount || 0,
    last_played_at: song.lastPlayedAt || null,
    user_id: resolvedUserId,
    is_public: song.isPublic ?? true,
  };
};

export const parseSongFromSupabase = (row: any): Song => ({
  id: String(row.id),
  youtubeId: String(row.youtube_id || row.youtubeId || ''),
  title: String(row.title || 'Untitled Track'),
  channel: String(row.channel || row.channel_title || row.artist || 'Artist'),
  thumbnailUrl: String(row.thumbnail_url || row.thumbnailUrl || ''),
  duration: Number(row.duration) || 0,
  addedAt: Number(row.added_at || row.addedAt) || Date.now(),
  isFavorite: Boolean(row.is_favorite ?? row.isFavorite ?? false),
  playCount: Number(row.play_count ?? row.playCount ?? 0),
  lastPlayedAt: row.last_played_at || row.lastPlayedAt ? Number(row.last_played_at || row.lastPlayedAt) : undefined,
  userId: row.user_id || row.userId || undefined,
  isPublic: row.is_public ?? row.isPublic ?? true,
});

export const formatPlaylistForSupabase = (playlist: Playlist, userId?: string) => {
  const resolvedUserId = playlist.userId || userId || null;
  return {
    id: playlist.id,
    name: playlist.name || 'Untitled Playlist',
    description: playlist.description || '',
    song_ids: Array.isArray(playlist.songIds) ? playlist.songIds : [],
    created_at: playlist.createdAt || Date.now(),
    updated_at: playlist.updatedAt || Date.now(),
    cover_url: playlist.coverUrl || null,
    is_system: Boolean(playlist.isSystem),
    user_id: resolvedUserId,
    creator_name: playlist.creatorName || null,
    is_public: playlist.isPublic ?? true,
  };
};

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

export const formatUserSettingsForSupabase = (
  userId: string,
  userData: {
    favorites?: string[];
    recentlyPlayed?: string[];
    settings?: Partial<UserSettings>;
    recentSearches?: string[];
  }
) => {
  const row: Record<string, any> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };
  if (userData.favorites !== undefined) row.favorites = userData.favorites;
  if (userData.recentlyPlayed !== undefined) row.recently_played = userData.recentlyPlayed;
  if (userData.settings !== undefined) {
    row.settings = userData.settings;
    if (userData.settings.theme) row.theme = userData.settings.theme;
  }
  if (userData.recentSearches !== undefined) row.recent_searches = userData.recentSearches;
  return row;
};

// Backward-compatible alias
export const formatUserDataForSupabase = formatUserSettingsForSupabase;

/**
 * Cloud Operations with Direct PostgREST Writes
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

export async function upsertSongToCloud(song: Song, userId?: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const row = formatSongForSupabase(song, userId);
    const { error } = await client.from('songs').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('Supabase: Error upserting song:', error.message, error.details);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase: Error saving song to cloud:', err);
    return false;
  }
}

export async function deleteSongFromCloud(songId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('songs').delete().eq('id', songId);
    if (error) {
      console.error('Supabase: Error deleting song:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase: Error removing song from cloud:', err);
    return false;
  }
}

export async function fetchUserSettingsFromCloud(userId: string): Promise<{
  favorites: string[];
  recentlyPlayed: string[];
  settings: Partial<UserSettings> | null;
  recentSearches: string[];
} | null> {
  const client = getSupabaseClient();
  if (!client || !userId) return null;

  try {
    // Primary query by user_id
    let res = await client
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Fallback if schema uses id instead of user_id
    if (!res.data && res.error) {
      const altRes = await client
        .from('user_settings')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (altRes.data) {
        res = altRes;
      }
    }

    if (res.error) {
      console.warn('Supabase: Error fetching user_settings:', res.error.message);
      return null;
    }

    if (!res.data) return null;
    const data = res.data;

    let parsedSettings: Partial<UserSettings> | null = null;
    if (typeof data.settings === 'object' && data.settings !== null && !Array.isArray(data.settings)) {
      parsedSettings = data.settings;
    } else if (typeof data.settings === 'string') {
      try {
        parsedSettings = JSON.parse(data.settings);
      } catch {
        parsedSettings = null;
      }
    }

    if (!parsedSettings) {
      parsedSettings = {};
    }
    if (data.theme && !parsedSettings.theme) {
      parsedSettings.theme = data.theme;
    }
    if (data.default_volume !== undefined && parsedSettings.defaultVolume === undefined) {
      parsedSettings.defaultVolume = Number(data.default_volume);
    }
    if (data.autoplay_next !== undefined && parsedSettings.autoplayNext === undefined) {
      parsedSettings.autoplayNext = Boolean(data.autoplay_next);
    }

    return {
      favorites: Array.isArray(data.favorites) ? data.favorites : [],
      recentlyPlayed: Array.isArray(data.recently_played) ? data.recently_played : [],
      settings: Object.keys(parsedSettings).length > 0 ? parsedSettings : null,
      recentSearches: Array.isArray(data.recent_searches) ? data.recent_searches : [],
    };
  } catch (err) {
    console.warn('Supabase: Network error fetching user_settings:', err);
    return null;
  }
}

// Backward-compatible alias
export const fetchUserDataFromCloud = fetchUserSettingsFromCloud;

export async function fetchPlaylistsFromCloud(): Promise<Playlist[] | null> {
  const client = getSupabaseClient();
  if (!client) {
    console.error('Supabase: Supabase client is not configured or offline.');
    return null;
  }

  try {
    const { data: playlistsData, error: playlistsError } = await client
      .from('playlists')
      .select('*')
      .order('updated_at', { ascending: false });

    if (playlistsError) {
      console.error('Supabase: Error fetching playlists from public.playlists:', playlistsError.message, playlistsError.details || playlistsError);
      return null;
    }

    if (!playlistsData) return [];

    // Fetch normalized playlist items from public.playlist_items
    const itemsByPlaylist: Record<string, { songId: string; position: number; addedAt: number }[]> = {};
    try {
      const { data: itemsData, error: itemsError } = await client
        .from('playlist_items')
        .select('*')
        .order('position', { ascending: true })
        .order('added_at', { ascending: true });

      if (itemsError) {
        console.warn('Supabase: Notice querying playlist_items (falling back to playlist.song_ids):', itemsError.message);
      } else if (itemsData && Array.isArray(itemsData)) {
        itemsData.forEach((item: any) => {
          const plId = String(item.playlist_id);
          const sId = String(item.song_id);
          if (plId && sId) {
            if (!itemsByPlaylist[plId]) itemsByPlaylist[plId] = [];
            itemsByPlaylist[plId].push({
              songId: sId,
              position: typeof item.position === 'number' ? item.position : 0,
              addedAt: Number(item.added_at) || Date.now(),
            });
          }
        });
      }
    } catch (itemsErr) {
      console.warn('Supabase: Exception querying playlist_items:', itemsErr);
    }

    return playlistsData.map((row: any) => {
      const pl = parsePlaylistFromSupabase(row);
      // If playlist_items has entries for this playlist, use ordered track IDs
      if (itemsByPlaylist[pl.id] && itemsByPlaylist[pl.id].length > 0) {
        const sorted = [...itemsByPlaylist[pl.id]].sort(
          (a, b) => a.position - b.position || a.addedAt - b.addedAt
        );
        pl.songIds = sorted.map((item) => item.songId);
      }
      return pl;
    });
  } catch (err: any) {
    console.error('Supabase: Network/API exception fetching playlists:', err?.message || err);
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
    const row = formatPlaylistForSupabase(playlist, userId);
    
    // 1. Upsert playlist in public.playlists
    const { error: plError } = await client.from('playlists').upsert(row, { onConflict: 'id' });
    if (plError) {
      console.error('Supabase: Error upserting playlist to public.playlists:', plError.message, plError.details || plError);
      return false;
    }

    // 2. Synchronize track items in public.playlist_items
    try {
      // Clear existing playlist items for this playlist
      const { error: delError } = await client
        .from('playlist_items')
        .delete()
        .eq('playlist_id', playlist.id);

      if (delError) {
        console.warn('Supabase: Note while clearing old playlist_items for playlist:', playlist.id, delError.message);
      }

      // Insert fresh playlist items
      if (Array.isArray(playlist.songIds) && playlist.songIds.length > 0) {
        const itemRows = playlist.songIds.map((songId, index) => ({
          id: `${playlist.id}_${songId}_${index}`,
          playlist_id: playlist.id,
          song_id: songId,
          position: index,
          added_at: Date.now(),
          user_id: row.user_id,
        }));

        const { error: itemsError } = await client
          .from('playlist_items')
          .upsert(itemRows, { onConflict: 'id' });

        if (itemsError) {
          console.warn('Supabase: Warning upserting playlist_items:', itemsError.message, itemsError.details || itemsError);
        }
      }
    } catch (itemsErr) {
      console.warn('Supabase: Exception syncing playlist_items:', itemsErr);
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
    // Delete playlist items first
    try {
      const { error: itemsError } = await client
        .from('playlist_items')
        .delete()
        .eq('playlist_id', playlistId);
      if (itemsError) {
        console.warn('Supabase: Note on deleting playlist_items for playlist:', playlistId, itemsError.message);
      }
    } catch (itemErr) {
      console.warn('Supabase: Exception deleting playlist_items:', itemErr);
    }

    // Delete playlist from public.playlists
    const { error: plError } = await client.from('playlists').delete().eq('id', playlistId);
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
  userId?: string,
  position: number = 0
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const itemId = `${playlistId}_${songId}_${Date.now()}`;
    const { error } = await client.from('playlist_items').upsert(
      {
        id: itemId,
        playlist_id: playlistId,
        song_id: songId,
        position,
        added_at: Date.now(),
        user_id: userId || null,
      },
      { onConflict: 'id' }
    );
    if (error) {
      console.warn('Supabase: Warning inserting playlist_item:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('Supabase: Exception adding playlist_item:', err);
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
      .eq('playlist_id', playlistId)
      .eq('song_id', songId);
    if (error) {
      console.warn('Supabase: Warning removing playlist_item:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('Supabase: Exception deleting playlist_item:', err);
    return false;
  }
}

export async function upsertUserSettingsToCloud(
  userId: string,
  data: {
    favorites?: string[];
    recentlyPlayed?: string[];
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
      console.warn('Supabase: Error upserting user_settings:', error.message, error.details);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase: Network error saving user_settings:', err);
    return false;
  }
}

// Backward-compatible alias
export const upsertUserDataToCloud = upsertUserSettingsToCloud;

export async function bulkSyncToCloud(
  songs: Song[],
  playlists: Playlist[],
  userId?: string,
  userData?: {
    favorites?: string[];
    recentlyPlayed?: string[];
    settings?: Partial<UserSettings>;
    recentSearches?: string[];
  }
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const promises: Promise<any>[] = [];

    if (songs.length > 0) {
      const songRows = songs.map((s) => formatSongForSupabase(s, userId));
      promises.push(
        (async () => {
          const { error } = await client.from('songs').upsert(songRows, { onConflict: 'id' });
          if (error) console.warn('Supabase: Bulk sync songs error:', error.message);
        })()
      );
    }

    if (playlists.length > 0) {
      promises.push(
        (async () => {
          await Promise.all(playlists.map((p) => upsertPlaylistToCloud(p, userId)));
        })()
      );
    }

    if (userId && userData) {
      const userRow = formatUserSettingsForSupabase(userId, userData);
      promises.push(
        (async () => {
          const { error } = await client.from('user_settings').upsert(userRow, { onConflict: 'user_id' });
          if (error) console.warn('Supabase: Bulk sync user_settings error:', error.message);
        })()
      );
    }

    await Promise.all(promises);
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
