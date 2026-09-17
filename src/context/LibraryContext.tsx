import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Song, Playlist, ToastMessage, ActivePage, UserSettings } from '../types';
import { storage } from '../services/storage';

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

  // Modals state
  isAddSongOpen: boolean;
  isCreatePlaylistOpen: boolean;
  playlistToEdit: Playlist | null;
  songToAddToPlaylist: Song | null;
  toasts: ToastMessage[];

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
  const [songs, setSongs] = useState<Song[]>(() => storage.getSongs());
  const [playlists, setPlaylists] = useState<Playlist[]>(() => storage.getPlaylists());
  const [recentlyPlayedIds, setRecentlyPlayedIds] = useState<string[]>(() => storage.getRecentlyPlayedIds());
  const [settings, setSettings] = useState<UserSettings>(() => storage.getSettings());
  const [recentSearches, setRecentSearches] = useState<string[]>(() => storage.getRecentSearches());

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

  // Apply theme classes to body
  useEffect(() => {
    document.documentElement.classList.remove('theme-graphite', 'theme-midnight', 'theme-oled', 'theme-cyber');
    document.documentElement.classList.add(`theme-${settings.theme || 'graphite'}`);
  }, [settings.theme]);

  // Persist songs and playlists whenever they change
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
        };
        setSongs((prev) => [newSong, ...prev]);
        targetSong = newSong;
        addToast('Song Added', `"${newSong.title}" saved to library.`, 'success');
      }

      if (playlistId) {
        setPlaylists((prev) =>
          prev.map((pl) => {
            if (pl.id === playlistId && !pl.songIds.includes(targetSong.id)) {
              return {
                ...pl,
                songIds: [...pl.songIds, targetSong.id],
                updatedAt: Date.now(),
              };
            }
            return pl;
          })
        );
      }

      return targetSong;
    },
    [songs, addToast]
  );

  const updateSong = useCallback(
    (id: string, updates: Partial<Song>) => {
      setSongs((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
      addToast('Updated', 'Song information updated.', 'info');
    },
    [addToast]
  );

  const deleteSong = useCallback(
    (id: string) => {
      const target = songs.find((s) => s.id === id);
      setSongs((prev) => prev.filter((s) => s.id !== id));
      setPlaylists((prev) =>
        prev.map((pl) => ({
          ...pl,
          songIds: pl.songIds.filter((sId) => sId !== id),
        }))
      );
      setRecentlyPlayedIds((prev) => prev.filter((sId) => sId !== id));

      if (target) {
        addToast('Song Removed', `"${target.title}" was removed from your library.`, 'info');
      }
    },
    [songs, addToast]
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
            return { ...s, isFavorite: isFav };
          }
          return s;
        })
      );
      if (songTitle) {
        addToast(isFav ? 'Added to Favorites' : 'Removed from Favorites', `"${songTitle}"`, 'success');
      }
    },
    [addToast]
  );

  const recordPlay = useCallback((id: string) => {
    const now = Date.now();
    setSongs((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          return { ...s, playCount: (s.playCount || 0) + 1, lastPlayedAt: now };
        }
        return s;
      })
    );
    setRecentlyPlayedIds((prev) => [id, ...prev.filter((item) => item !== id)].slice(0, 50));
  }, []);

  // Playlist operations
  const createPlaylist = useCallback(
    (name: string, description?: string): Playlist => {
      const newPl: Playlist = {
        id: `pl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        name: name.trim() || 'Untitled Playlist',
        description: description?.trim() || '',
        songIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setPlaylists((prev) => [newPl, ...prev]);
      addToast('Playlist Created', `"${newPl.name}" created.`, 'success');
      return newPl;
    },
    [addToast]
  );

  const updatePlaylist = useCallback(
    (id: string, updates: Partial<Playlist>) => {
      setPlaylists((prev) =>
        prev.map((pl) => (pl.id === id ? { ...pl, ...updates, updatedAt: Date.now() } : pl))
      );
      addToast('Playlist Updated', 'Changes saved.', 'info');
    },
    [addToast]
  );

  const deletePlaylist = useCallback(
    (id: string) => {
      const pl = playlists.find((p) => p.id === id);
      setPlaylists((prev) => prev.filter((p) => p.id !== id));
      if (selectedPlaylistId === id) {
        setActivePage('playlists');
      }
      if (pl) {
        addToast('Playlist Deleted', `"${pl.name}" removed.`, 'info');
      }
    },
    [playlists, selectedPlaylistId, setActivePage, addToast]
  );

  const addSongToPlaylist = useCallback(
    (playlistId: string, songId: string) => {
      let plName = '';
      setPlaylists((prev) =>
        prev.map((pl) => {
          if (pl.id === playlistId) {
            plName = pl.name;
            if (pl.songIds.includes(songId)) return pl;
            return {
              ...pl,
              songIds: [...pl.songIds, songId],
              updatedAt: Date.now(),
            };
          }
          return pl;
        })
      );
      addToast('Added to Playlist', `Saved to ${plName || 'playlist'}`, 'success');
    },
    [addToast]
  );

  const removeSongFromPlaylist = useCallback(
    (playlistId: string, songId: string) => {
      setPlaylists((prev) =>
        prev.map((pl) => {
          if (pl.id === playlistId) {
            return {
              ...pl,
              songIds: pl.songIds.filter((id) => id !== songId),
              updatedAt: Date.now(),
            };
          }
          return pl;
        })
      );
      addToast('Removed from Playlist', 'Track removed.', 'info');
    },
    [addToast]
  );

  const reorderPlaylistSongs = useCallback(
    (playlistId: string, fromIndex: number, toIndex: number) => {
      setPlaylists((prev) =>
        prev.map((pl) => {
          if (pl.id === playlistId) {
            const copy = [...pl.songIds];
            const [moved] = copy.splice(fromIndex, 1);
            copy.splice(toIndex, 0, moved);
            return {
              ...pl,
              songIds: copy,
              updatedAt: Date.now(),
            };
          }
          return pl;
        })
      );
    },
    []
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
        setSongs(storage.getSongs());
        setPlaylists(storage.getPlaylists());
        setRecentlyPlayedIds(storage.getRecentlyPlayedIds());
        setSettings(storage.getSettings());
        setRecentSearches(storage.getRecentSearches());
        addToast('Import Successful', res.message, 'success');
      } else {
        addToast('Import Failed', res.message, 'error');
      }
      return res;
    },
    [addToast]
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
        isAddSongOpen,
        isCreatePlaylistOpen,
        playlistToEdit,
        songToAddToPlaylist,
        toasts,
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
