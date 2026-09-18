import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Song, Playlist, ToastMessage, ActivePage, UserSettings } from '../types';
import { storage } from '../services/storage';
import { useAuth } from './AuthContext';
import {
  isSupabaseConfigured,
  fetchSongsFromCloud,
  fetchPlaylistsFromCloud,
  fetchUserDataFromCloud,
  upsertSongToCloud,
  deleteSongFromCloud,
  upsertPlaylistToCloud,
  deletePlaylistFromCloud,
  upsertUserDataToCloud,
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
  const { user, profile, isAdmin, isLoading: isAuthLoading } = useAuth();

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

  // Ref to track last synced user to prevent redundant full sync loops
  const lastSyncedUserIdRef = useRef<string | null | undefined>(undefined);

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

  // Persist songs and playlists whenever they change to localStorage as fallback cache
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

  // Fully automatic cloud sync
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
        const fetchUserDataPromise = user?.id ? fetchUserDataFromCloud(user.id) : Promise.resolve(null);
        const [cloudSongs, cloudPlaylists, cloudUserData] = await Promise.all([
          fetchSongsFromCloud(),
          fetchPlaylistsFromCloud(),
          fetchUserDataPromise,
        ]);

        if (cloudSongs === null && cloudPlaylists === null) {
          setCloudSyncStatus('error');
          if (manualTrigger) {
            addToast('Cloud Sync Error', 'Could not reach Supabase. Operating with local storage cache.', 'error');
          }
          return;
        }

        // 1. Process Songs
        let activeSongs = songs;
        if (cloudSongs && cloudSongs.length > 0) {
          // Cloud songs exist, merge with local cache
          const songMap = new Map<string, Song>();
          cloudSongs.forEach((s) => songMap.set(s.id, s));

          // If user favorited songs in user_data, apply favorites
          if (cloudUserData?.favorites && cloudUserData.favorites.length > 0) {
            const favSet = new Set(cloudUserData.favorites);
            songMap.forEach((s) => {
              if (favSet.has(s.id)) {
                s.isFavorite = true;
              }
            });
          }

          // If there are local songs not yet on cloud and user is authenticated, upload them
          if (user?.id) {
            songs.forEach((s) => {
              if (!songMap.has(s.id)) {
                songMap.set(s.id, s);
                upsertSongToCloud(s, user.id).catch(console.warn);
              }
            });
          }

          activeSongs = Array.from(songMap.values());
          setSongs(activeSongs);
          storage.saveSongs(activeSongs);
        } else if (cloudSongs && cloudSongs.length === 0 && songs.length > 0) {
          // Cloud songs table is empty - automatically seed from local starter library
          bulkSyncToCloud(songs, [], user?.id).catch(console.warn);
        }

        // 2. Process Playlists
        let activePlaylists = playlists;
        if (cloudPlaylists && cloudPlaylists.length > 0) {
          const playlistMap = new Map<string, Playlist>();
          cloudPlaylists.forEach((p) => playlistMap.set(p.id, p));

          if (user?.id) {
            playlists.forEach((p) => {
              if (!playlistMap.has(p.id)) {
                playlistMap.set(p.id, p);
                upsertPlaylistToCloud(p, user.id).catch(console.warn);
              }
            });
          }

          activePlaylists = Array.from(playlistMap.values());
          setPlaylists(activePlaylists);
          storage.savePlaylists(activePlaylists);
        } else if (cloudPlaylists && cloudPlaylists.length === 0 && playlists.length > 0) {
          // Cloud playlists table is empty - automatically seed from local playlists
          bulkSyncToCloud([], playlists, user?.id).catch(console.warn);
        }

        // 3. Process User Data (favorites, recently played, settings, searches)
        if (user?.id) {
          if (cloudUserData) {
            if (cloudUserData.recentlyPlayed && cloudUserData.recentlyPlayed.length > 0) {
              setRecentlyPlayedIds(cloudUserData.recentlyPlayed);
              storage.saveRecentlyPlayedIds(cloudUserData.recentlyPlayed);
            }
            if (cloudUserData.recentSearches && cloudUserData.recentSearches.length > 0) {
              setRecentSearches(cloudUserData.recentSearches);
              storage.saveRecentSearches(cloudUserData.recentSearches);
            }
            if (cloudUserData.settings && Object.keys(cloudUserData.settings).length > 0) {
              setSettings((prev) => {
                const merged = { ...prev, ...cloudUserData.settings };
                storage.saveSettings(merged);
                return merged;
              });
            }
          } else {
            // First time user_data row init for this user
            const currentFavIds = activeSongs.filter((s) => s.isFavorite).map((s) => s.id);
            upsertUserDataToCloud(user.id, {
              favorites: currentFavIds,
              recentlyPlayed: recentlyPlayedIds,
              settings,
              recentSearches,
            }).catch(console.warn);
          }
        }

        setCloudSyncStatus('synced');
        if (manualTrigger) {
          addToast('Cloud Synced', 'Library and preferences synchronized with Supabase.', 'success');
        }
      } catch (err) {
        console.warn('Supabase sync error:', err);
        setCloudSyncStatus('error');
        if (manualTrigger) {
          addToast('Sync Failed', 'Failed to synchronize with Supabase.', 'error');
        }
      }
    },
    [songs, playlists, recentlyPlayedIds, settings, recentSearches, user, addToast]
  );

  // Automatic sync whenever user authentication state loads or changes
  useEffect(() => {
    if (isAuthLoading) return;

    const currentUserId = user?.id || null;
    if (lastSyncedUserIdRef.current !== currentUserId) {
      lastSyncedUserIdRef.current = currentUserId;
      syncWithCloud(false);
    }
  }, [user?.id, isAuthLoading, syncWithCloud]);

  const setActivePage = useCallback((page: ActivePage, playlistId: string | null = null) => {
    setActivePageInternal(page);
    if (playlistId !== undefined) {
      setSelectedPlaylistId(playlistId);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const updateSettings = useCallback(
    (newSettings: Partial<UserSettings>) => {
      setSettings((prev) => {
        const merged = { ...prev, ...newSettings };
        if (user?.id) {
          upsertUserDataToCloud(user.id, { settings: merged }).catch(console.warn);
        }
        return merged;
      });
    },
    [user]
  );

  const addRecentSearch = useCallback(
    (term: string) => {
      const clean = term.trim();
      if (!clean) return;
      setRecentSearches((prev) => {
        const next = [clean, ...prev.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 10);
        if (user?.id) {
          upsertUserDataToCloud(user.id, { recentSearches: next }).catch(console.warn);
        }
        return next;
      });
    },
    [user]
  );

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    if (user?.id) {
      upsertUserDataToCloud(user.id, { recentSearches: [] }).catch(console.warn);
    }
  }, [user]);

  // Song operations with automatic Supabase write
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

        // Automatic Supabase INSERT
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
              // Automatic Supabase UPDATE
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
            // Automatic Supabase UPDATE
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
        setRecentlyPlayedIds((prev) => {
          const next = prev.filter((sId) => sId !== id);
          if (user?.id) {
            upsertUserDataToCloud(user.id, { recentlyPlayed: next }).catch(console.warn);
          }
          return next;
        });
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
      setRecentlyPlayedIds((prev) => {
        const next = prev.filter((sId) => sId !== id);
        if (user?.id) {
          upsertUserDataToCloud(user.id, { recentlyPlayed: next }).catch(console.warn);
        }
        return next;
      });

      // Automatic Supabase DELETE
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
      setSongs((prev) => {
        const nextSongs = prev.map((s) => {
          if (s.id === id) {
            isFav = !s.isFavorite;
            songTitle = s.title;
            const updated = { ...s, isFavorite: isFav };
            // Automatic Supabase song UPDATE
            upsertSongToCloud(updated, user?.id).catch(console.warn);
            return updated;
          }
          return s;
        });

        // Update user_data.favorites in Supabase
        if (user?.id) {
          const favIds = nextSongs.filter((s) => s.isFavorite).map((s) => s.id);
          upsertUserDataToCloud(user.id, { favorites: favIds }).catch(console.warn);
        }

        return nextSongs;
      });

      if (songTitle) {
        addToast(isFav ? 'Added to Favorites' : 'Removed from Favorites', `"${songTitle}"`, 'success');
      }
    },
    [user, addToast]
  );

  const recordPlay = useCallback(
    (id: string) => {
      const now = Date.now();
      setSongs((prev) =>
        prev.map((s) => {
          if (s.id === id) {
            const updated = { ...s, playCount: (s.playCount || 0) + 1, lastPlayedAt: now };
            // Automatic Supabase song play_count UPDATE
            upsertSongToCloud(updated, user?.id).catch(console.warn);
            return updated;
          }
          return s;
        })
      );

      setRecentlyPlayedIds((prev) => {
        const next = [id, ...prev.filter((item) => item !== id)].slice(0, 50);
        if (user?.id) {
          upsertUserDataToCloud(user.id, { recentlyPlayed: next }).catch(console.warn);
        }
        return next;
      });
    },
    [user]
  );

  // Playlist operations with automatic Supabase write
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

      // Automatic Supabase INSERT
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
            // Automatic Supabase UPDATE
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

      // Automatic Supabase DELETE
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
            // Automatic Supabase UPDATE
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
            // Automatic Supabase UPDATE
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
            // Automatic Supabase UPDATE
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
    if (user?.id) {
      upsertUserDataToCloud(user.id, { recentlyPlayed: [] }).catch(console.warn);
    }
    addToast('History Cleared', 'Recently played tracks cleared.', 'info');
  }, [user, addToast]);

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
