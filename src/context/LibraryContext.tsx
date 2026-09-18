import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Song, Playlist, ToastMessage, ActivePage, UserSettings } from '../types';
import { storage } from '../services/storage';
import { useAuth } from './AuthContext';
import {
  isSupabaseConfigured,
  fetchSongsFromCloud,
  fetchPlaylistsFromCloud,
  upsertSongToCloud,
  deleteSongFromCloud,
  upsertPlaylistToCloud,
  deletePlaylistFromCloud,
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

  // Cloud Sync state
  cloudSyncStatus: CloudSyncStatus;
  isCloudConnected: boolean;
  syncWithCloud: (manualTrigger?: boolean) => Promise<void>;

  // Modals state
  isAddSongOpen: boolean;
  isCreatePlaylistOpen: boolean;
  playlistToEdit: Playlist | null;
  songToAddToPlaylist: Song | null;
  toasts: ToastMessage[];

  // Ownership & Roles
  canManagePlaylist: (playlist?: Playlist | null) => boolean;
  canManageSong: (song?: Song | null) => boolean;

  // Actions
  setActivePage: (page: ActivePage, playlistId?: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSearchFilter: (filter: 'all' | 'songs' | 'playlists') => void;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  addRecentSearch: (term: string) => void;
  clearRecentSearches: () => void;

  // Song actions
  addSong: (song: Omit<Song, 'id' | 'addedAt' | 'playCount'>, playlistId?: string) => Song;
  updateSong: (id: string, updates: Partial<Song>) => void;
  deleteSong: (id: string) => void;
  toggleFavorite: (id: string) => void;
  recordPlay: (id: string) => void;

  // Playlist actions
  createPlaylist: (name: string, description?: string) => Playlist;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => void;
  deletePlaylist: (id: string) => void;
  addSongToPlaylist: (playlistId: string, songId: string) => void;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
  reorderPlaylistSongs: (playlistId: string, fromIndex: number, toIndex: number) => void;

  // Bulk & Admin
  clearRecentlyPlayed: () => void;
  clearAllData: () => void;
  importLibrary: (jsonString: string) => { success: boolean; message: string };
  exportLibrary: () => void;

  // UI helpers
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

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, isAdmin } = useAuth();

  const [songs, setSongs] = useState<Song[]>(() => storage.getSongs());
  const [playlists, setPlaylists] = useState<Playlist[]>(() => storage.getPlaylists());
  const [recentlyPlayedIds, setRecentlyPlayedIds] = useState<string[]>(() => storage.getRecentlyPlayedIds());
  const [settings, setSettings] = useState<UserSettings>(() => storage.getSettings());
  const [recentSearches, setRecentSearches] = useState<string[]>(() => storage.getRecentSearches());
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>(() =>
    isSupabaseConfigured() ? 'syncing' : 'offline'
  );

  const [activePage, setActivePageInternal] = useState<ActivePage>('home');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'songs' | 'playlists'>('all');

  // Modals
  const [isAddSongOpen, setIsAddSongOpen] = useState<boolean>(false);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState<boolean>(false);
  const [playlistToEdit, setPlaylistToEdit] = useState<Playlist | null>(null);
  const [songToAddToPlaylist, setSongToAddToPlaylist] = useState<Song | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Ownership verification helpers
  const canManagePlaylist = useCallback(
    (playlist?: Playlist | null): boolean => {
      if (!playlist) return false;
      if (isAdmin) return true; // Admin has full access to all playlists
      if (!user) return !playlist.userId; // Local mode when offline
      return playlist.userId === user.id || !playlist.userId;
    },
    [isAdmin, user]
  );

  const canManageSong = useCallback(
    (song?: Song | null): boolean => {
      if (!song) return false;
      if (isAdmin) return true; // Admin has full access to all songs
      if (!user) return !song.userId;
      return song.userId === user.id || !song.userId;
    },
    [isAdmin, user]
  );

  // Apply theme classes to body
  useEffect(() => {
    document.documentElement.classList.remove('theme-graphite', 'theme-midnight', 'theme-oled', 'theme-cyber');
    document.documentElement.classList.add(`theme-${settings.theme || 'graphite'}`);
  }, [settings.theme]);

  // Persist songs and playlists whenever they change to localStorage as fallback
  useEffect(() => {
    storage.saveSongs(songs);
  }, [songs]);

  useEffect(() => {
    storage.savePlaylists(playlists);
  }, [playlists]);

  useEffect(() => {
    storage.saveRecentlyPlayedIds(recentlyPlayedIds);
  }, [recentlyPlayedIds]);

  useEffect(() => {
    storage.saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    storage.saveRecentSearches(recentSearches);
  }, [recentSearches]);

  const addToast = useCallback((title: string, message?: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Cloud Synchronization
  const syncWithCloud = useCallback(
    async (manualTrigger: boolean = false) => {
      if (!isSupabaseConfigured()) {
        setCloudSyncStatus('offline');
        if (manualTrigger) {
          addToast('Supabase Not Configured', 'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable cloud sync.', 'info');
        }
        return;
      }

      setCloudSyncStatus('syncing');
      try {
        const [cloudSongs, cloudPlaylists] = await Promise.all([
          fetchSongsFromCloud(),
          fetchPlaylistsFromCloud(),
        ]);

        if (cloudSongs === null && cloudPlaylists === null) {
          setCloudSyncStatus('error');
          if (manualTrigger) {
            addToast('Cloud Sync Error', 'Could not reach Supabase. Operating with local storage.', 'error');
          }
          return;
        }

        let finalSongs = songs;
        let finalPlaylists = playlists;

        if (cloudSongs && cloudSongs.length > 0) {
          // Merge cloud songs with local storage
          const songMap = new Map<string, Song>();
          cloudSongs.forEach((s) => songMap.set(s.id, s));
          // Add any local-only songs not yet on cloud
          songs.forEach((s) => {
            if (!songMap.has(s.id)) {
              songMap.set(s.id, s);
              upsertSongToCloud(s, user?.id).catch(console.warn);
            }
          });
          finalSongs = Array.from(songMap.values());
          setSongs(finalSongs);
          storage.saveSongs(finalSongs);
        } else if (cloudSongs && cloudSongs.length === 0 && songs.length > 0) {
          // Cloud table is empty, seed cloud with local songs
          bulkSyncToCloud(songs, playlists, user?.id).catch(console.warn);
        }

        if (cloudPlaylists && cloudPlaylists.length > 0) {
          const playlistMap = new Map<string, Playlist>();
          cloudPlaylists.forEach((p) => playlistMap.set(p.id, p));
          playlists.forEach((p) => {
            if (!playlistMap.has(p.id)) {
              playlistMap.set(p.id, p);
              upsertPlaylistToCloud(p, user?.id).catch(console.warn);
            }
          });
          finalPlaylists = Array.from(playlistMap.values());
          setPlaylists(finalPlaylists);
          storage.savePlaylists(finalPlaylists);
        } else if (cloudPlaylists && cloudPlaylists.length === 0 && playlists.length > 0) {
          bulkSyncToCloud([], playlists, user?.id).catch(console.warn);
        }

        setCloudSyncStatus('synced');
        if (manualTrigger) {
          addToast('Cloud Synced', 'Library successfully synced with Supabase!', 'success');
        }
      } catch (err) {
        console.warn('Supabase sync error:', err);
        setCloudSyncStatus('error');
        if (manualTrigger) {
          addToast('Sync Failed', 'Failed to synchronize with Supabase.', 'error');
        }
      }
    },
    [songs, playlists, user, addToast]
  );

  // Initial cloud sync on mount
  useEffect(() => {
    syncWithCloud(false);
  }, []);

  const setActivePage = useCallback((page: ActivePage, playlistId: string | null = null) => {
    setActivePageInternal(page);
    if (playlistId !== undefined) {
      setSelectedPlaylistId(playlistId);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const updateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const addRecentSearch = useCallback((term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setRecentSearches((prev) => [clean, ...prev.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 10));
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
  }, []);

  // Song operations
  const addSong = useCallback(
    (songData: Omit<Song, 'id' | 'addedAt' | 'playCount'>, playlistId?: string): Song => {
      const existing = songs.find((s) => s.youtubeId === songData.youtubeId);
      let targetSong: Song;

      if (existing) {
        targetSong = existing;
        addToast('Song already in library', `"${existing.title}" is ready in your library.`, 'info');
      } else {
        const newSong: Song = {
          ...songData,
          id: `song-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          addedAt: Date.now(),
          playCount: 0,
          userId: user?.id,
          isPublic: true,
        };
        setSongs((prev) => [newSong, ...prev]);
        targetSong = newSong;
        addToast('Song Added', `"${newSong.title}" saved to library.`, 'success');

        // Cloud sync
        upsertSongToCloud(newSong, user?.id).catch(console.warn);
      }

      if (playlistId) {
        setPlaylists((prev) =>
          prev.map((pl) => {
            if (pl.id === playlistId && !pl.songIds.includes(targetSong.id)) {
              if (!canManagePlaylist(pl)) {
                addToast('Permission Denied', 'You cannot add tracks to playlists owned by others.', 'error');
                return pl;
              }
              const updatedPl = {
                ...pl,
                songIds: [...pl.songIds, targetSong.id],
                updatedAt: Date.now(),
              };
              upsertPlaylistToCloud(updatedPl, user?.id).catch(console.warn);
              return updatedPl;
            }
            return pl;
          })
        );
      }

      return targetSong;
    },
    [songs, user, canManagePlaylist, addToast]
  );

  const updateSong = useCallback(
    (id: string, updates: Partial<Song>) => {
      const target = songs.find((s) => s.id === id);
      if (target && !canManageSong(target)) {
        addToast('Permission Denied', 'Only the owner or an admin can update this track.', 'error');
        return;
      }
      setSongs((prev) =>
        prev.map((s) => {
          if (s.id === id) {
            const updated = { ...s, ...updates };
            upsertSongToCloud(updated, user?.id).catch(console.warn);
            return updated;
          }
          return s;
        })
      );
      addToast('Updated', 'Song information updated.', 'info');
    },
    [songs, canManageSong, user, addToast]
  );

  const deleteSong = useCallback(
    (id: string) => {
      const target = songs.find((s) => s.id === id);
      if (target && !canManageSong(target)) {
        // Remove from user's managed playlists and recent history
        setPlaylists((prev) =>
          prev.map((pl) => {
            if (canManagePlaylist(pl) && pl.songIds.includes(id)) {
              const updated = {
                ...pl,
                songIds: pl.songIds.filter((sId) => sId !== id),
                updatedAt: Date.now(),
              };
              upsertPlaylistToCloud(updated, user?.id).catch(console.warn);
              return updated;
            }
            return pl;
          })
        );
        setRecentlyPlayedIds((prev) => prev.filter((sId) => sId !== id));
        addToast('Removed', `"${target.title}" removed from your playlists.`, 'info');
        return;
      }

      setSongs((prev) => prev.filter((s) => s.id !== id));
      setPlaylists((prev) =>
        prev.map((pl) => {
          if (pl.songIds.includes(id)) {
            const updated = {
              ...pl,
              songIds: pl.songIds.filter((sId) => sId !== id),
              updatedAt: Date.now(),
            };
            upsertPlaylistToCloud(updated, user?.id).catch(console.warn);
            return updated;
          }
          return pl;
        })
      );
      setRecentlyPlayedIds((prev) => prev.filter((sId) => sId !== id));

      // Cloud deletion
      deleteSongFromCloud(id).catch(console.warn);

      if (target) {
        addToast('Song Removed', `"${target.title}" was removed from library.`, 'info');
      }
    },
    [songs, canManageSong, canManagePlaylist, user, addToast]
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      let isFav = false;
      let songTitle = '';
      setSongs((prev) =>
        prev.map((s) => {
          if (s.id === id) {
            isFav = !s.isFavorite;
            songTitle = s.title;
            const updated = { ...s, isFavorite: isFav };
            upsertSongToCloud(updated, user?.id).catch(console.warn);
            return updated;
          }
          return s;
        })
      );
      if (songTitle) {
        addToast(isFav ? 'Added to Favorites' : 'Removed from Favorites', `"${songTitle}"`, 'success');
      }
    },
    [user, addToast]
  );

  const recordPlay = useCallback((id: string) => {
    const now = Date.now();
    setSongs((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const updated = { ...s, playCount: (s.playCount || 0) + 1, lastPlayedAt: now };
          upsertSongToCloud(updated, user?.id).catch(console.warn);
          return updated;
        }
        return s;
      })
    );
    setRecentlyPlayedIds((prev) => [id, ...prev.filter((item) => item !== id)].slice(0, 50));
  }, [user]);

  // Playlist operations
  const createPlaylist = useCallback(
    (name: string, description?: string): Playlist => {
      const creatorName =
        profile?.username ||
        profile?.full_name ||
        user?.user_metadata?.username ||
        user?.user_metadata?.full_name ||
        user?.email?.split('@')[0] ||
        'You';

      const newPl: Playlist = {
        id: `pl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        name: name.trim() || 'Untitled Playlist',
        description: description?.trim() || '',
        songIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: user?.id,
        creatorName,
        isPublic: true,
      };
      setPlaylists((prev) => [newPl, ...prev]);
      upsertPlaylistToCloud(newPl, user?.id).catch(console.warn);
      addToast('Playlist Created', `"${newPl.name}" created.`, 'success');
      return newPl;
    },
    [user, profile, addToast]
  );

  const updatePlaylist = useCallback(
    (id: string, updates: Partial<Playlist>) => {
      const target = playlists.find((p) => p.id === id);
      if (target && !canManagePlaylist(target)) {
        addToast('Permission Denied', 'You can only edit playlists you created.', 'error');
        return;
      }

      setPlaylists((prev) =>
        prev.map((pl) => {
          if (pl.id === id) {
            const updated = { ...pl, ...updates, updatedAt: Date.now() };
            upsertPlaylistToCloud(updated, user?.id).catch(console.warn);
            return updated;
          }
          return pl;
        })
      );
      addToast('Playlist Updated', 'Changes saved.', 'info');
    },
    [playlists, canManagePlaylist, user, addToast]
  );

  const deletePlaylist = useCallback(
    (id: string) => {
      const pl = playlists.find((p) => p.id === id);
      if (pl && !canManagePlaylist(pl)) {
        addToast('Permission Denied', 'You can only delete playlists you created.', 'error');
        return;
      }

      setPlaylists((prev) => prev.filter((p) => p.id !== id));
      deletePlaylistFromCloud(id).catch(console.warn);
      if (selectedPlaylistId === id) {
        setActivePage('playlists');
      }
      if (pl) {
        addToast('Playlist Deleted', `"${pl.name}" removed.`, 'info');
      }
    },
    [playlists, canManagePlaylist, selectedPlaylistId, setActivePage, addToast]
  );

  const addSongToPlaylist = useCallback(
    (playlistId: string, songId: string) => {
      const target = playlists.find((p) => p.id === playlistId);
      if (target && !canManagePlaylist(target)) {
        addToast('Permission Denied', 'You can only modify playlists you created.', 'error');
        return;
      }

      let plName = '';
      setPlaylists((prev) =>
        prev.map((pl) => {
          if (pl.id === playlistId) {
            plName = pl.name;
            if (pl.songIds.includes(songId)) return pl;
            const updated = {
              ...pl,
              songIds: [...pl.songIds, songId],
              updatedAt: Date.now(),
            };
            upsertPlaylistToCloud(updated, user?.id).catch(console.warn);
            return updated;
          }
          return pl;
        })
      );
      addToast('Added to Playlist', `Saved to ${plName || 'playlist'}`, 'success');
    },
    [playlists, canManagePlaylist, user, addToast]
  );

  const removeSongFromPlaylist = useCallback(
    (playlistId: string, songId: string) => {
      const target = playlists.find((p) => p.id === playlistId);
      if (target && !canManagePlaylist(target)) {
        addToast('Permission Denied', 'You can only modify playlists you created.', 'error');
        return;
      }

      setPlaylists((prev) =>
        prev.map((pl) => {
          if (pl.id === playlistId) {
            const updated = {
              ...pl,
              songIds: pl.songIds.filter((id) => id !== songId),
              updatedAt: Date.now(),
            };
            upsertPlaylistToCloud(updated, user?.id).catch(console.warn);
            return updated;
          }
          return pl;
        })
      );
      addToast('Removed from Playlist', 'Track removed.', 'info');
    },
    [playlists, canManagePlaylist, user, addToast]
  );

  const reorderPlaylistSongs = useCallback(
    (playlistId: string, fromIndex: number, toIndex: number) => {
      const target = playlists.find((p) => p.id === playlistId);
      if (target && !canManagePlaylist(target)) {
        addToast('Permission Denied', 'You can only reorder your own playlists.', 'error');
        return;
      }

      setPlaylists((prev) =>
        prev.map((pl) => {
          if (pl.id === playlistId) {
            const copy = [...pl.songIds];
            const [moved] = copy.splice(fromIndex, 1);
            copy.splice(toIndex, 0, moved);
            const updated = {
              ...pl,
              songIds: copy,
              updatedAt: Date.now(),
            };
            upsertPlaylistToCloud(updated, user?.id).catch(console.warn);
            return updated;
          }
          return pl;
        })
      );
    },
    [playlists, canManagePlaylist, user, addToast]
  );

  const clearRecentlyPlayed = useCallback(() => {
    setRecentlyPlayedIds([]);
    addToast('History Cleared', 'Recently played tracks cleared.', 'info');
  }, [addToast]);

  const clearAllData = useCallback(() => {
    storage.clearAllData();
    setSongs([]);
    setPlaylists([]);
    setRecentlyPlayedIds([]);
    setRecentSearches([]);
    addToast('All Data Cleared', 'Library reset successfully.', 'info');
  }, [addToast]);

  const exportLibrary = useCallback(() => {
    const jsonStr = storage.exportLibraryJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vibebox-library-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('Export Successful', 'Library backup downloaded.', 'success');
  }, [addToast]);

  const importLibrary = useCallback(
    (jsonString: string) => {
      const res = storage.importLibraryJSON(jsonString);
      if (res.success) {
        const loadedSongs = storage.getSongs();
        const loadedPlaylists = storage.getPlaylists();
        setSongs(loadedSongs);
        setPlaylists(loadedPlaylists);
        setRecentlyPlayedIds(storage.getRecentlyPlayedIds());
        setSettings(storage.getSettings());
        setRecentSearches(storage.getRecentSearches());
        bulkSyncToCloud(loadedSongs, loadedPlaylists, user?.id).catch(console.warn);
        addToast('Import Successful', res.message, 'success');
      } else {
        addToast('Import Failed', res.message, 'error');
      }
      return res;
    },
    [user, addToast]
  );

  const favorites = useMemo(() => songs.filter((s) => s.isFavorite), [songs]);

  const recentlyPlayed = useMemo(() => {
    const songMap = new Map(songs.map((s) => [s.id, s]));
    return recentlyPlayedIds
      .map((id) => songMap.get(id))
      .filter((s): s is Song => Boolean(s));
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
        isCloudConnected: isSupabaseConfigured(),
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
        openAddSongModal: () => setIsAddSongOpen(true),
        closeAddSongModal: () => setIsAddSongOpen(false),
        openCreatePlaylistModal: (pl) => {
          setPlaylistToEdit(pl || null);
          setIsCreatePlaylistOpen(true);
        },
        closeCreatePlaylistModal: () => {
          setPlaylistToEdit(null);
          setIsCreatePlaylistOpen(false);
        },
        openAddToPlaylistModal: (song) => setSongToAddToPlaylist(song),
        closeAddToPlaylistModal: () => setSongToAddToPlaylist(null),
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
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
};
