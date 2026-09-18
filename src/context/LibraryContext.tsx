import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Song, Playlist, ToastMessage, ActivePage, UserSettings } from '../types';
import { storage } from '../services/storage';
import { useAuth } from './AuthContext';
import { generateUUID } from '../utils/uuid';
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
      if (isAdmin) return true; // Admin has full access to manage all playlists
      if (!user) return !playlist.userId; // Local mode when offline
      return playlist.userId === user.id || !playlist.userId;
    },
    [isAdmin, user]
  );

  const canManageSong = useCallback(
    (song?: Song | null): boolean => {
      if (!song) return false;
      if (isAdmin) return true; // Admin has full access
      if (!user) return true;
      return true; // Songs metadata is shared
    },
    [isAdmin, user]
  );

  // Apply theme classes to body
  useEffect(() => {
    document.documentElement.classList.remove('theme-graphite', 'theme-midnight', 'theme-oled', 'theme-cyber');
    document.documentElement.classList.add(`theme-${settings.theme || 'graphite'}`);
  }, [settings.theme]);

  // Persist songs, playlists, history and settings to localStorage as offline cache
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

  // Fully automatic cloud sync against normalized schema
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
        const userId = user?.id;

        // Fetch shared songs metadata and playlists
        const [cloudSongs, cloudPlaylists, cloudUserSongs, cloudRecentlyPlayed, cloudUserSettings] = await Promise.all([
          fetchSongsFromCloud(),
          fetchPlaylistsFromCloud(),
          userId ? fetchUserSongsFromCloud(userId) : Promise.resolve(null),
          userId ? fetchRecentlyPlayedFromCloud(userId) : Promise.resolve(null),
          userId ? fetchUserSettingsFromCloud(userId) : Promise.resolve(null),
        ]);

        if (cloudSongs === null && cloudPlaylists === null) {
          setCloudSyncStatus('error');
          if (manualTrigger) {
            addToast('Cloud Sync Error', 'Could not reach Supabase. Operating with local storage cache.', 'error');
          }
          return;
        }

        // 1. Process Shared Songs & User-Song Relations (isFavorite, playCount, lastPlayedAt from user_songs)
        let mergedSongs = songs;
        if (cloudSongs && cloudSongs.length > 0) {
          const songMap = new Map<string, Song>();
          
          cloudSongs.forEach((s: Song) => {
            const userRel = cloudUserSongs ? cloudUserSongs[s.id] : undefined;
            songMap.set(s.id, {
              ...s,
              isFavorite: userRel?.isFavorite ?? false,
              playCount: userRel?.playCount ?? 0,
              lastPlayedAt: userRel?.lastPlayedAt,
            });
          });

          // Upload any local-only songs if authenticated
          if (userId) {
            songs.forEach((s: Song) => {
              if (!songMap.has(s.id)) {
                songMap.set(s.id, s);
                upsertSongToCloud(s).catch(console.warn);
                if (s.isFavorite || (s.playCount && s.playCount > 0)) {
                  upsertUserSongToCloud(userId, s.id, {
                    isFavorite: s.isFavorite,
                    playCount: s.playCount,
                    lastPlayedAt: s.lastPlayedAt,
                  }).catch(console.warn);
                }
              }
            });
          }

          mergedSongs = Array.from(songMap.values());
          setSongs(mergedSongs);
          storage.saveSongs(mergedSongs);
        } else if (cloudSongs && cloudSongs.length === 0 && songs.length > 0) {
          // Cloud songs table is empty - seed from starter library
          bulkSyncToCloud(songs, [], userId).catch(console.warn);
        }

        // 2. Process Playlists (authoritative source of truth: public.playlists & public.playlist_items)
        if (cloudPlaylists !== null) {
          if (cloudPlaylists.length > 0) {
            if (userId) {
              const cloudIds = new Set(cloudPlaylists.map((p: Playlist) => p.id));
              playlists.forEach((localPl: Playlist) => {
                if (!cloudIds.has(localPl.id) && localPl.userId === userId && !localPl.isSystem) {
                  // Push un-synced offline playlist
                  upsertPlaylistToCloud(localPl, userId)
                    .then((ok) => {
                      if (!ok) console.error('Supabase: Failed to migrate offline playlist to cloud:', localPl.id);
                    })
                    .catch((err) => console.error('Supabase: Offline playlist migration error:', err));
                  cloudPlaylists.push(localPl);
                }
              });
            }
            setPlaylists(cloudPlaylists);
            storage.savePlaylists(cloudPlaylists);
          } else if (cloudPlaylists.length === 0) {
            if (playlists.length > 0 && userId) {
              playlists.forEach((p: Playlist) => {
                upsertPlaylistToCloud(p, userId)
                  .then((ok) => {
                    if (!ok) console.error('Supabase: Failed to seed playlist to cloud:', p.id);
                  })
                  .catch((err) => console.error('Supabase: Playlist seed error:', err));
              });
            }
            setPlaylists(playlists);
          }
        }

        // 3. Process Recently Played (public.recently_played)
        if (cloudRecentlyPlayed !== null && cloudRecentlyPlayed.length > 0) {
          setRecentlyPlayedIds(cloudRecentlyPlayed);
          storage.saveRecentlyPlayedIds(cloudRecentlyPlayed);
        }

        // 4. Process User Settings (public.user_settings)
        if (cloudUserSettings !== null) {
          if (cloudUserSettings.recentSearches && cloudUserSettings.recentSearches.length > 0) {
            setRecentSearches(cloudUserSettings.recentSearches);
            storage.saveRecentSearches(cloudUserSettings.recentSearches);
          }
          if (cloudUserSettings.settings && Object.keys(cloudUserSettings.settings).length > 0) {
            setSettings((prev) => {
              const merged = { ...prev, ...cloudUserSettings.settings };
              storage.saveSettings(merged);
              return merged;
            });
          }
        } else if (userId) {
          // Initialize user_settings row for new user
          upsertUserSettingsToCloud(userId, {
            settings,
            recentSearches,
          }).catch(console.warn);
        }

        setCloudSyncStatus('synced');
        if (manualTrigger) {
          addToast('Cloud Synced', 'Library and preferences synchronized with Supabase.', 'success');
        }
      } catch (err) {
        console.error('Supabase sync error:', err);
        setCloudSyncStatus('error');
        if (manualTrigger) {
          addToast('Sync Failed', 'Failed to synchronize with Supabase.', 'error');
        }
      }
    },
    [songs, playlists, settings, recentSearches, user, addToast]
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

  // Cross-device Realtime & Tab Focus synchronization
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    let channel: any = null;
    try {
      channel = client
        .channel('public:vibebox-cross-device-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'playlists' }, () => {
          fetchPlaylistsFromCloud().then((fresh) => {
            if (fresh !== null) {
              setPlaylists(fresh);
              storage.savePlaylists(fresh);
            }
          }).catch((err) => console.error('Supabase: Realtime playlists sync failed:', err));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'playlist_items' }, () => {
          fetchPlaylistsFromCloud().then((fresh) => {
            if (fresh !== null) {
              setPlaylists(fresh);
              storage.savePlaylists(fresh);
            }
          }).catch((err) => console.error('Supabase: Realtime playlist_items sync failed:', err));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_songs' }, () => {
          if (user?.id) {
            fetchUserSongsFromCloud(user.id).then((cloudUserSongs) => {
              if (cloudUserSongs) {
                setSongs((prev) =>
                  prev.map((s) => {
                    const rel = cloudUserSongs[s.id];
                    if (rel) {
                      return {
                        ...s,
                        isFavorite: rel.isFavorite,
                        playCount: rel.playCount,
                        lastPlayedAt: rel.lastPlayedAt,
                      };
                    }
                    return s;
                  })
                );
              }
            }).catch(console.warn);
          }
        })
        .subscribe();
    } catch (e) {
      console.warn('Supabase: Realtime channel init note:', e);
    }

    // Tab focus & visibility sync (ensures instant consistency when switching between Preview & Production tabs)
    const handleFocusSync = () => {
      if (document.visibilityState === 'visible') {
        fetchPlaylistsFromCloud().then((fresh) => {
          if (fresh !== null) {
            setPlaylists(fresh);
            storage.savePlaylists(fresh);
          }
        }).catch((err) => console.error('Supabase: Tab focus playlist sync error:', err));
      }
    };

    window.addEventListener('focus', handleFocusSync);
    document.addEventListener('visibilitychange', handleFocusSync);

    return () => {
      if (channel) {
        client.removeChannel(channel);
      }
      window.removeEventListener('focus', handleFocusSync);
      document.removeEventListener('visibilitychange', handleFocusSync);
    };
  }, [user?.id]);

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
          upsertUserSettingsToCloud(user.id, { settings: merged }).catch(console.warn);
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
          upsertUserSettingsToCloud(user.id, { recentSearches: next }).catch(console.warn);
        }
        return next;
      });
    },
    [user]
  );

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    if (user?.id) {
      upsertUserSettingsToCloud(user.id, { recentSearches: [] }).catch(console.warn);
    }
  }, [user]);

  // Song operations with normalized Supabase writes (public.songs + public.user_songs)
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
          id: generateUUID(),
          addedAt: Date.now(),
          playCount: 0,
          userId: user?.id,
          isPublic: true,
        };
        setSongs((prev) => [newSong, ...prev]);
        targetSong = newSong;
        addToast('Song Added', `"${newSong.title}" saved to library.`, 'success');

        // Write shared song metadata to public.songs
        upsertSongToCloud(newSong).catch(console.warn);

        // If marked favorite, write to public.user_songs
        if (user?.id && newSong.isFavorite) {
          upsertUserSongToCloud(user.id, newSong.id, { isFavorite: true }).catch(console.warn);
        }
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
              // Write to public.playlists & public.playlist_items
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
            // Update shared song metadata in public.songs
            upsertSongToCloud(updated).catch(console.warn);
            return updated;
          }
          return s;
        })
      );
      addToast('Updated', 'Song information updated.', 'info');
    },
    [songs, canManageSong, addToast]
  );

  const deleteSong = useCallback(
    (id: string) => {
      const target = songs.find((s) => s.id === id);
      if (target && !canManageSong(target)) {
        // Remove from user's managed playlists
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

      // Remove from public.songs & relations
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
            return { ...s, isFavorite: isFav };
          }
          return s;
        });
        return nextSongs;
      });

      // Write favorite state strictly to public.user_songs
      if (user?.id) {
        upsertUserSongToCloud(user.id, id, { isFavorite: isFav }).catch(console.warn);
      }

      if (songTitle) {
        addToast(isFav ? 'Added to Favorites' : 'Removed from Favorites', `"${songTitle}"`, 'success');
      }
    },
    [user, addToast]
  );

  const recordPlay = useCallback(
    (id: string) => {
      const now = Date.now();
      let nextPlayCount = 1;
      setSongs((prev) =>
        prev.map((s) => {
          if (s.id === id) {
            nextPlayCount = (s.playCount || 0) + 1;
            return { ...s, playCount: nextPlayCount, lastPlayedAt: now };
          }
          return s;
        })
      );

      setRecentlyPlayedIds((prev) => [id, ...prev.filter((item) => item !== id)].slice(0, 50));

      if (user?.id) {
        // Record in public.user_songs (play count and timestamp)
        upsertUserSongToCloud(user.id, id, {
          playCount: nextPlayCount,
          lastPlayedAt: now,
        }).catch(console.warn);

        // Record stream in public.recently_played
        recordRecentlyPlayedInCloud(user.id, id).catch(console.warn);
      }
    },
    [user]
  );

  // Playlist operations with normalized Supabase writes (public.playlists + public.playlist_items)
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
        id: generateUUID(),
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

      // Write to public.playlists & public.playlist_items using owner_id
      upsertPlaylistToCloud(newPl, user?.id)
        .then((success) => {
          if (!success) {
            console.error('Supabase: Failed to write newly created playlist to cloud:', newPl.id);
          }
        })
        .catch((err) => {
          console.error('Supabase: Playlist creation exception:', err);
        });

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
            // Write to public.playlists & public.playlist_items
            upsertPlaylistToCloud(updated, user?.id)
              .then((success) => {
                if (!success) {
                  console.error('Supabase: Failed to update playlist on cloud:', updated.id);
                }
              })
              .catch((err) => {
                console.error('Supabase: Playlist update exception:', err);
              });
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

      // Remove from public.playlist_items and public.playlists
      deletePlaylistFromCloud(id)
        .then((success) => {
          if (!success) {
            console.error('Supabase: Failed to delete playlist from cloud:', id);
          }
        })
        .catch((err) => {
          console.error('Supabase: Playlist delete exception:', err);
        });

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
            // Sync items in public.playlist_items
            upsertPlaylistToCloud(updated, user?.id)
              .then((success) => {
                if (!success) {
                  console.error('Supabase: Failed to sync playlist addition to cloud:', updated.id);
                }
              })
              .catch((err) => {
                console.error('Supabase: Add song to playlist exception:', err);
              });
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
            // Sync removal in public.playlist_items
            upsertPlaylistToCloud(updated, user?.id)
              .then((success) => {
                if (!success) {
                  console.error('Supabase: Failed to sync playlist item removal to cloud:', updated.id);
                }
              })
              .catch((err) => {
                console.error('Supabase: Remove song from playlist exception:', err);
              });
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
            // Sync reordered items with updated positions in public.playlist_items
            upsertPlaylistToCloud(updated, user?.id)
              .then((success) => {
                if (!success) {
                  console.error('Supabase: Failed to sync reordered playlist to cloud:', updated.id);
                }
              })
              .catch((err) => {
                console.error('Supabase: Reorder playlist songs exception:', err);
              });
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
      clearRecentlyPlayedInCloud(user.id).catch(console.warn);
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
