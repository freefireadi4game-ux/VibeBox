import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Song, Playlist, ToastMessage, ActivePage, UserSettings } from '../types';
import { storage } from '../services/storage';
import { useAuth } from './AuthContext';
import { generateUUID, toValidUUID } from '../utils/uuid';
import {
  isSupabaseConfigured,
  getSupabaseClient,
  fetchSongsFromCloud,
  fetchPlaylistsFromCloud,
  fetchUserSongsFromCloud,
  fetchRecentlyPlayedFromCloud,
  fetchUserSettingsFromCloud,
  upsertSongToCloud,
  deleteSongFromCloud,
  upsertUserSongToCloud,
  recordRecentlyPlayedInCloud,
  clearRecentlyPlayedInCloud,
  upsertPlaylistToCloud,
  deletePlaylistFromCloud,
  upsertUserSettingsToCloud,
  bulkSyncToCloud,
} from '../services/supabase';

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

interface LibraryContextType {
  songs: Song[];
  playlists: Playlist[];
  recentlyPlayed: Song[];
  favorites: Song[];
  activePage: ActivePage;
  selectedPlaylistId: string | null;
  searchQuery: string;
  searchFilter: 'all' | 'songs' | 'playlists';
  settings: UserSettings;
  recentSearches: string[];
  cloudSyncStatus: CloudSyncStatus;
  isCloudConnected: boolean;
  syncWithCloud: (manualTrigger?: boolean) => Promise<void>;
  isAddSongOpen: boolean;
  isCreatePlaylistOpen: boolean;
  playlistToEdit: Playlist | null;
  songToAddToPlaylist: Song | null;
  toasts: ToastMessage[];
  canManagePlaylist: (playlist?: Playlist | null) => boolean;
  canManageSong: (song?: Song | null) => boolean;
  setActivePage: (page: ActivePage, playlistId?: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSearchFilter: (filter: 'all' | 'songs' | 'playlists') => void;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  addRecentSearch: (term: string) => void;
  clearRecentSearches: () => void;
  addSong: (song: Omit<Song, 'id' | 'addedAt' | 'playCount'>, playlistId?: string) => Song;
  updateSong: (id: string, updates: Partial<Song>) => void;
  deleteSong: (id: string) => void;
  toggleFavorite: (id: string) => void;
  recordPlay: (id: string) => void;
  createPlaylist: (name: string, description?: string) => Playlist;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => void;
  deletePlaylist: (id: string) => void;
  addSongToPlaylist: (playlistId: string, songId: string) => void;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
  reorderPlaylistSongs: (playlistId: string, fromIndex: number, toIndex: number) => void;
  clearRecentlyPlayed: () => void;
  clearAllData: () => void;
  importLibrary: (jsonString: string) => { success: boolean; message: string };
  exportLibrary: () => void;
  openAddSongModal: () => void;
  closeAddSongModal: () => void;
  openCreatePlaylistModal: (playlist?: Playlist | null) => void;
  closeCreatePlaylistModal: () => void;
  openAddToPlaylistModal: (song: Song) => void;
  closeAddToPlaylistModal: () => void;
  addToast: (title: string, message?: string, type?: 'success' | 'info' | 'error') => void;
  removeToast: (id: string) => void;
}

const LibraryContext = createContext<LibraryContextType | null>(null);

const normalizeSongIds = (songs: Song[]): Song[] => songs.map((song) => ({ ...song, id: toValidUUID(song.id) }));
const normalizePlaylistIds = (playlists: Playlist[]): Playlist[] => playlists.map((playlist) => ({
  ...playlist,
  id: toValidUUID(playlist.id),
  songIds: playlist.songIds.map((id) => toValidUUID(id)),
}));

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, isAdmin, isLoading: isAuthLoading } = useAuth();
  const [songs, setSongs] = useState<Song[]>(() => normalizeSongIds(storage.getSongs()));
  const [playlists, setPlaylists] = useState<Playlist[]>(() => normalizePlaylistIds(storage.getPlaylists()));
  const [recentlyPlayedIds, setRecentlyPlayedIds] = useState<string[]>(() => storage.getRecentlyPlayedIds().map(toValidUUID));
  const [settings, setSettings] = useState<UserSettings>(() => storage.getSettings());
  const [recentSearches, setRecentSearches] = useState<string[]>(() => storage.getRecentSearches());
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>(() => (isSupabaseConfigured() ? 'syncing' : 'offline'));
  const [activePage, setActivePageInternal] = useState<ActivePage>('home');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'songs' | 'playlists'>('all');
  const [isAddSongOpen, setIsAddSongOpen] = useState(false);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [playlistToEdit, setPlaylistToEdit] = useState<Playlist | null>(null);
  const [songToAddToPlaylist, setSongToAddToPlaylist] = useState<Song | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const lastSyncedUserIdRef = useRef<string | null | undefined>(undefined);

  const canManagePlaylist = useCallback((playlist?: Playlist | null) => {
    if (!playlist) return false;
    if (isAdmin) return true;
    if (!user) return !playlist.userId;
    return playlist.userId === user.id || !playlist.userId;
  }, [isAdmin, user]);

  const canManageSong = useCallback((song?: Song | null) => Boolean(song), []);

  useEffect(() => {
    document.documentElement.classList.remove('theme-graphite', 'theme-midnight', 'theme-oled', 'theme-cyber');
    document.documentElement.classList.add(`theme-${settings.theme || 'graphite'}`);
  }, [settings.theme]);

  useEffect(() => { storage.saveSongs(songs); }, [songs]);
  useEffect(() => { storage.savePlaylists(playlists); }, [playlists]);
  useEffect(() => { storage.saveRecentlyPlayedIds(recentlyPlayedIds); }, [recentlyPlayedIds]);
  useEffect(() => { storage.saveSettings(settings); }, [settings]);
  useEffect(() => { storage.saveRecentSearches(recentSearches); }, [recentSearches]);

  const addToast = useCallback((title: string, message?: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id: string) => setToasts((prev) => prev.filter((toast) => toast.id !== id)), []);

  const syncWithCloud = useCallback(async (manualTrigger = false) => {
    if (!isSupabaseConfigured()) {
      setCloudSyncStatus('offline');
      if (manualTrigger) addToast('Supabase Not Configured', 'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable cloud sync.', 'error');
      return;
    }

    setCloudSyncStatus('syncing');
    try {
      const userId = user?.id;
      const [cloudSongs, cloudPlaylists, cloudUserSongs, cloudRecentlyPlayed, cloudUserSettings] = await Promise.all([
        fetchSongsFromCloud(),
        fetchPlaylistsFromCloud(),
        userId ? fetchUserSongsFromCloud(userId) : Promise.resolve(null),
        userId ? fetchRecentlyPlayedFromCloud(userId) : Promise.resolve(null),
        userId ? fetchUserSettingsFromCloud(userId) : Promise.resolve(null),
      ]);

      if (cloudSongs === null && cloudPlaylists === null) {
        setCloudSyncStatus('error');
        if (manualTrigger) addToast('Cloud Sync Error', 'Could not reach Supabase. Operating with local storage cache.', 'error');
        return;
      }

      if (cloudSongs && cloudSongs.length > 0) {
        const songMap = new Map<string, Song>();
        cloudSongs.forEach((song: Song) => {
          const rel = cloudUserSongs ? cloudUserSongs[song.id] : undefined;
          songMap.set(song.id, { ...song, isFavorite: rel?.isFavorite ?? false, playCount: rel?.playCount ?? song.playCount ?? 0 });
        });

        if (userId) {
          songs.forEach((song) => {
            if (!songMap.has(song.id)) {
              songMap.set(song.id, song);
              upsertSongToCloud(song).catch(console.warn);
            }
          });
        }

        const merged = Array.from(songMap.values());
        setSongs(merged);
        storage.saveSongs(merged);
      } else if (cloudSongs && cloudSongs.length === 0 && songs.length > 0) {
        bulkSyncToCloud(songs, [], userId).catch(console.warn);
      }

      if (cloudPlaylists !== null) {
        if (cloudPlaylists.length > 0) {
          if (userId) {
            const ids = new Set(cloudPlaylists.map((p: Playlist) => p.id));
            playlists.forEach((pl) => {
              if (!ids.has(pl.id) && pl.userId === userId && !pl.isSystem) {
                upsertPlaylistToCloud(pl, userId).catch(console.warn);
              }
            });
          }
          setPlaylists(cloudPlaylists);
          storage.savePlaylists(cloudPlaylists);
        } else if (playlists.length > 0 && userId) {
          playlists.forEach((pl) => upsertPlaylistToCloud(pl, userId).catch(console.warn));
          setPlaylists(playlists);
        }
      }

      if (cloudRecentlyPlayed !== null && cloudRecentlyPlayed.length > 0) {
        setRecentlyPlayedIds(cloudRecentlyPlayed);
        storage.saveRecentlyPlayedIds(cloudRecentlyPlayed);
      }

      if (cloudUserSettings !== null) {
        if (cloudUserSettings.recentSearches && cloudUserSettings.recentSearches.length > 0) {
          setRecentSearches(cloudUserSettings.recentSearches);
          storage.saveRecentSearches(cloudUserSettings.recentSearches);
        }
        if (cloudUserSettings.settings && Object.keys(cloudUserSettings.settings).length > 0) {
          setSettings((prev) => ({ ...prev, ...cloudUserSettings.settings }));
        }
      } else if (userId) {
        upsertUserSettingsToCloud(userId, { settings, recentSearches }).catch(console.warn);
      }

      setCloudSyncStatus('synced');
      if (manualTrigger) addToast('Cloud Synced', 'Library and preferences synchronized with Supabase.', 'success');
    } catch (err) {
      console.error('Supabase sync error:', err);
      setCloudSyncStatus('error');
      if (manualTrigger) addToast('Sync Failed', 'Failed to synchronize with Supabase.', 'error');
    }
  }, [songs, playlists, settings, recentSearches, user, addToast]);

  useEffect(() => {
    if (!isAuthLoading) {
      const id = user?.id || null;
      if (lastSyncedUserIdRef.current !== id) {
        lastSyncedUserIdRef.current = id;
        syncWithCloud(false);
      }
    }
  }, [user?.id, isAuthLoading, syncWithCloud]);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    let channel: any = null;
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        fetchPlaylistsFromCloud().then((fresh) => {
          if (fresh !== null) {
            setPlaylists(fresh);
            storage.savePlaylists(fresh);
          }
        }).catch(console.warn);
      }
    };

    try {
      channel = client.channel('public:vibebox-cross-device-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'playlists' }, refresh)
        .subscribe();
    } catch {
      // no-op
    }

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      if (channel) client.removeChannel(channel);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [user?.id]);

  const setActivePage = useCallback((page: ActivePage, playlistId: string | null = null) => {
    setActivePageInternal(page);
    setSelectedPlaylistId(playlistId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const updateSettings = useCallback((updates: Partial<UserSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      if (user?.id) {
        upsertUserSettingsToCloud(user.id, { settings: next, recentSearches }).catch(console.warn);
      }
      return next;
    });
  }, [user, recentSearches]);

  const addRecentSearch = useCallback((term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setRecentSearches((prev) => {
      const next = [clean, ...prev.filter((item) => item.toLowerCase() !== clean.toLowerCase())];
      if (user?.id) {
        upsertUserSettingsToCloud(user.id, { settings, recentSearches: next }).catch(console.warn);
      }
      return next.slice(0, 10);
    });
  }, [settings, user]);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    if (user?.id) upsertUserSettingsToCloud(user.id, { recentSearches: [] }).catch(console.warn);
  }, [user]);

  const addSong = useCallback((songData: Omit<Song, 'id' | 'addedAt' | 'playCount'>, playlistId?: string): Song => {
    const existing = songs.find((song) => song.youtubeId === songData.youtubeId);
    if (existing) {
      addToast('Song already in library', `"${existing.title}" is ready in your library.`, 'info');
      if (playlistId) {
        setPlaylists((prev) => prev.map((pl) => {
          if (pl.id !== playlistId || pl.songIds.includes(existing.id)) return pl;
          if (!canManagePlaylist(pl)) {
            addToast('Permission Denied', 'You cannot add tracks to playlists owned by others.', 'error');
            return pl;
          }
          const updated = { ...pl, songIds: [...pl.songIds, existing.id], updatedAt: Date.now() };
          upsertPlaylistToCloud(updated, user?.id).catch(console.warn);
          return updated;
        }));
      }
      return existing;
    }

    const newSong: Song = {
      ...songData,
      id: generateUUID(),
      addedAt: Date.now(),
      playCount: 0,
      userId: user?.id,
      isPublic: true,
    };

    setSongs((prev) => [newSong, ...prev]);
    addToast('Song Added', `"${newSong.title}" saved to library.`, 'success');
    upsertSongToCloud(newSong).catch((err) => {
      console.error('Supabase: Song save exception:', err);
      addToast('Cloud Save Failed', 'The song could not be saved to the cloud.', 'error');
    });

    if (playlistId) {
      setPlaylists((prev) => prev.map((pl) => {
        if (pl.id !== playlistId || pl.songIds.includes(newSong.id)) return pl;
        if (!canManagePlaylist(pl)) {
          addToast('Permission Denied', 'You cannot add tracks to playlists owned by others.', 'error');
          return pl;
        }
        const updated = { ...pl, songIds: [...pl.songIds, newSong.id], updatedAt: Date.now() };
        upsertPlaylistToCloud(updated, user?.id).catch(console.warn);
        return updated;
      }));
    }

    return newSong;
  }, [songs, user, canManagePlaylist, addToast]);

  const updateSong = useCallback((id: string, updates: Partial<Song>) => {
    setSongs((prev) => prev.map((song) => (song.id === id ? { ...song, ...updates } : song)));
  }, []);

  const deleteSong = useCallback((id: string) => {
    setSongs((prev) => prev.filter((song) => song.id !== id));
    setPlaylists((prev) => prev.map((pl) => ({ ...pl, songIds: pl.songIds.filter((songId) => songId !== id) })));
    deleteSongFromCloud(id).catch(console.warn);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    let didFavorite = false;
    setSongs((prev) => prev.map((song) => {
      if (song.id !== id) return song;
      didFavorite = !song.isFavorite;
      return { ...song, isFavorite: didFavorite };
    }));

    if (user?.id) {
      const target = songs.find((song) => song.id === id);
      if (target) upsertUserSongToCloud(user.id, id, { isFavorite: didFavorite }).catch(console.warn);
    }
  }, [songs, user]);

  const recordPlay = useCallback((id: string) => {
    if (!id) return;

    setSongs((prev) => prev.map((song) => {
      if (song.id !== id) return song;
      return {
        ...song,
        playCount: (song.playCount || 0) + 1,
      };
    }));

    setRecentlyPlayedIds((prev) => {
      const withoutCurrent = prev.filter((songId) => songId !== id);
      return [id, ...withoutCurrent].slice(0, 20);
    });

    if (user?.id) {
      recordRecentlyPlayedInCloud(user.id, id).catch(console.warn);
    }
  }, [user]);

  const createPlaylist = useCallback((name: string, description?: string): Playlist => {
    const newPlaylist: Playlist = {
      id: generateUUID(),
      name,
      description: description || '',
      songIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userId: user?.id,
      isSystem: false,
    };
    setPlaylists((prev) => [newPlaylist, ...prev]);
    if (user?.id) upsertPlaylistToCloud(newPlaylist, user.id).catch(console.warn);
    return newPlaylist;
  }, [user]);

  const updatePlaylist = useCallback((id: string, updates: Partial<Playlist>) => {
    setPlaylists((prev) => prev.map((pl) => {
      if (pl.id !== id) return pl;
      const updated = { ...pl, ...updates, updatedAt: Date.now() };
      if (user?.id) upsertPlaylistToCloud(updated, user.id).catch(console.warn);
      return updated;
    }));
  }, [user]);

  const deletePlaylist = useCallback((id: string) => {
    setPlaylists((prev) => prev.filter((pl) => pl.id !== id));
    if (user?.id) deletePlaylistFromCloud(id, user.id).catch(console.warn);
  }, [user]);

  const addSongToPlaylist = useCallback((playlistId: string, songId: string) => {
    const target = playlists.find((pl) => pl.id === playlistId);
    if (target && !canManagePlaylist(target)) {
      addToast('Permission Denied', 'You can only modify playlists you created.', 'error');
      return;
    }

    setPlaylists((prev) => prev.map((pl) => {
      if (pl.id !== playlistId || pl.songIds.includes(songId)) return pl;
      const updated = { ...pl, songIds: [...pl.songIds, songId], updatedAt: Date.now() };
      if (user?.id) upsertPlaylistToCloud(updated, user.id).catch(console.warn);
      return updated;
    }));
  }, [playlists, canManagePlaylist, user, addToast]);

  const removeSongFromPlaylist = useCallback((playlistId: string, songId: string) => {
    setPlaylists((prev) => prev.map((pl) => {
      if (pl.id !== playlistId) return pl;
      const updated = { ...pl, songIds: pl.songIds.filter((id) => id !== songId), updatedAt: Date.now() };
      if (user?.id) upsertPlaylistToCloud(updated, user.id).catch(console.warn);
      return updated;
    }));
  }, [user]);

  const reorderPlaylistSongs = useCallback((playlistId: string, fromIndex: number, toIndex: number) => {
    setPlaylists((prev) => prev.map((pl) => {
      if (pl.id !== playlistId) return pl;
      const ids = [...pl.songIds];
      const [moved] = ids.splice(fromIndex, 1);
      ids.splice(toIndex, 0, moved);
      const updated = { ...pl, songIds: ids, updatedAt: Date.now() };
      if (user?.id) upsertPlaylistToCloud(updated, user.id).catch(console.warn);
      return updated;
    }));
  }, [user]);

  const clearRecentlyPlayed = useCallback(() => {
    setRecentlyPlayedIds([]);
    if (user?.id) clearRecentlyPlayedInCloud(user.id).catch(console.warn);
  }, [user]);

  const clearAllData = useCallback(() => {
    storage.clearAllData();
    setSongs([]);
    setPlaylists([]);
    setRecentlyPlayedIds([]);
    setRecentSearches([]);
  }, []);

  const importLibrary = useCallback((jsonString: string) => {
    const result = storage.importLibraryJSON(jsonString);
    if (!result.success) {
      return { success: false, message: result.message || 'Import failed.' };
    }

    const importedSongs = normalizeSongIds(storage.getSongs());
    const importedPlaylists = normalizePlaylistIds(storage.getPlaylists());
    setSongs(importedSongs);
    setPlaylists(importedPlaylists);
    setRecentlyPlayedIds(storage.getRecentlyPlayedIds().map(toValidUUID));
    setRecentSearches(storage.getRecentSearches());

    return { success: true, message: 'Library imported successfully.' };
  }, []);

  const exportLibrary = useCallback(() => {
    const blob = new Blob([storage.exportLibraryJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vibebox-library.json';
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const openAddSongModal = useCallback(() => setIsAddSongOpen(true), []);
  const closeAddSongModal = useCallback(() => setIsAddSongOpen(false), []);
  const openCreatePlaylistModal = useCallback((playlist?: Playlist | null) => {
    setPlaylistToEdit(playlist || null);
    setIsCreatePlaylistOpen(true);
  }, []);
  const closeCreatePlaylistModal = useCallback(() => {
    setIsCreatePlaylistOpen(false);
    setPlaylistToEdit(null);
  }, []);
  const openAddToPlaylistModal = useCallback((song: Song) => {
    setSongToAddToPlaylist(song);
  }, []);
  const closeAddToPlaylistModal = useCallback(() => setSongToAddToPlaylist(null), []);

  const favorites = useMemo(() => songs.filter((song) => song.isFavorite), [songs]);
  const recentlyPlayed = useMemo(() => {
    const songMap = new Map(songs.map((song) => [song.id, song]));
    return recentlyPlayedIds.map((id) => songMap.get(id)).filter((song): song is Song => Boolean(song));
  }, [songs, recentlyPlayedIds]);

  return (
    <LibraryContext.Provider
      value={{
        songs,
        playlists,
        recentlyPlayed,
        favorites,
        activePage,
        selectedPlaylistId,
        searchQuery,
        searchFilter,
        settings,
        recentSearches,
        cloudSyncStatus,
        isCloudConnected: cloudSyncStatus === 'synced' || cloudSyncStatus === 'syncing',
        syncWithCloud,
        isAddSongOpen,
        isCreatePlaylistOpen,
        playlistToEdit,
        songToAddToPlaylist,
        toasts,
        canManagePlaylist,
        canManageSong,
        setActivePage,
        setSearchQuery,
        setSearchFilter,
        updateSettings,
        addRecentSearch,
        clearRecentSearches,
        addSong,
        updateSong,
        deleteSong,
        toggleFavorite,
        recordPlay,
        createPlaylist,
        updatePlaylist,
        deletePlaylist,
        addSongToPlaylist,
        removeSongFromPlaylist,
        reorderPlaylistSongs,
        clearRecentlyPlayed,
        clearAllData,
        importLibrary,
        exportLibrary,
        openAddSongModal,
        closeAddSongModal,
        openCreatePlaylistModal,
        closeCreatePlaylistModal,
        openAddToPlaylistModal,
        closeAddToPlaylistModal,
        addToast,
        removeToast,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (!context) throw new Error('useLibrary must be used within a LibraryProvider');
  return context;
};
