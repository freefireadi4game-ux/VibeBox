import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Song, Playlist, ToastMessage, ActivePage, UserSettings } from '../types';
import { storage } from '../services/storage';
import { useAuth } from './AuthContext';
import { generateUUID, toValidUUID } from '../utils/uuid';
import {
  isSupabaseConfigured, getSupabaseClient, fetchSongsFromCloud, fetchPlaylistsFromCloud,
  fetchUserSongsFromCloud, fetchRecentlyPlayedFromCloud, fetchUserSettingsFromCloud,
  upsertSongToCloud, deleteSongFromCloud, upsertUserSongToCloud, recordRecentlyPlayedInCloud,
  clearRecentlyPlayedInCloud, upsertPlaylistToCloud, deletePlaylistFromCloud,
  upsertUserSettingsToCloud, bulkSyncToCloud,
} from '../services/supabase';

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';
interface LibraryContextType {
  songs: Song[]; playlists: Playlist[]; recentlyPlayed: Song[]; favorites: Song[];
  activePage: ActivePage; selectedPlaylistId: string | null; searchQuery: string;
  searchFilter: 'all' | 'songs' | 'playlists'; settings: UserSettings; recentSearches: string[];
  cloudSyncStatus: CloudSyncStatus; isCloudConnected: boolean;
  syncWithCloud: (manualTrigger?: boolean) => Promise<void>;
  isAddSongOpen: boolean; isCreatePlaylistOpen: boolean; playlistToEdit: Playlist | null;
  songToAddToPlaylist: Song | null; toasts: ToastMessage[];
  canManagePlaylist: (playlist?: Playlist | null) => boolean;
  canManageSong: (song?: Song | null) => boolean;
  setActivePage: (page: ActivePage, playlistId?: string | null) => void;
  setSearchQuery: (query: string) => void; setSearchFilter: (filter: 'all' | 'songs' | 'playlists') => void;
  updateSettings: (newSettings: Partial<UserSettings>) => void; addRecentSearch: (term: string) => void;
  clearRecentSearches: () => void;
  addSong: (song: Omit<Song, 'id' | 'addedAt' | 'playCount'>, playlistId?: string) => Song;
  updateSong: (id: string, updates: Partial<Song>) => void; deleteSong: (id: string) => void;
  toggleFavorite: (id: string) => void; recordPlay: (id: string) => void;
  createPlaylist: (name: string, description?: string) => Playlist;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => void; deletePlaylist: (id: string) => void;
  addSongToPlaylist: (playlistId: string, songId: string) => void;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
  reorderPlaylistSongs: (playlistId: string, fromIndex: number, toIndex: number) => void;
  clearRecentlyPlayed: () => void; clearAllData: () => void;
  importLibrary: (jsonString: string) => { success: boolean; message: string }; exportLibrary: () => void;
  openAddSongModal: () => void; closeAddSongModal: () => void;
  openCreatePlaylistModal: (playlist?: Playlist | null) => void; closeCreatePlaylistModal: () => void;
  openAddToPlaylistModal: (song: Song) => void; closeAddToPlaylistModal: () => void;
  addToast: (title: string, message?: string, type?: 'success' | 'info' | 'error') => void;
  removeToast: (id: string) => void;
}
const LibraryContext = createContext<LibraryContextType | null>(null);
const normalizeSongIds = (songs: Song[]): Song[] => songs.map((song) => ({ ...song, id: toValidUUID(song.id) }));
const normalizePlaylistIds = (playlists: Playlist[]): Playlist[] => playlists.map((playlist) => ({ ...playlist, id: toValidUUID(playlist.id), songIds: playlist.songIds.map((id) => toValidUUID(id)) }));

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, isAdmin, isLoading: isAuthLoading } = useAuth();
  const [songs, setSongs] = useState<Song[]>(() => normalizeSongIds(storage.getSongs()));
  const [playlists, setPlaylists] = useState<Playlist[]>(() => normalizePlaylistIds(storage.getPlaylists()));
  const [recentlyPlayedIds, setRecentlyPlayedIds] = useState<string[]>(() => storage.getRecentlyPlayedIds().map(toValidUUID));
  const [settings, setSettings] = useState<UserSettings>(() => storage.getSettings());
  const [recentSearches, setRecentSearches] = useState<string[]>(() => storage.getRecentSearches());
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>(() => isSupabaseConfigured() ? 'syncing' : 'offline');
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

  useEffect(() => { document.documentElement.classList.remove('theme-graphite', 'theme-midnight', 'theme-oled', 'theme-cyber'); document.documentElement.classList.add(`theme-${settings.theme || 'graphite'}`); }, [settings.theme]);
  useEffect(() => { storage.saveSongs(songs); }, [songs]);
  useEffect(() => { storage.savePlaylists(playlists); }, [playlists]);
  useEffect(() => { storage.saveRecentlyPlayedIds(recentlyPlayedIds); }, [recentlyPlayedIds]);
  useEffect(() => { storage.saveSettings(settings); }, [settings]);
  useEffect(() => { storage.saveRecentSearches(recentSearches); }, [recentSearches]);

  const addToast = useCallback((title: string, message?: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 4000);
  }, []);
  const removeToast = useCallback((id: string) => setToasts((prev) => prev.filter((toast) => toast.id !== id)), []);

  const syncWithCloud = useCallback(async (manualTrigger = false) => {
    if (!isSupabaseConfigured()) { setCloudSyncStatus('offline'); if (manualTrigger) addToast('Supabase Not Configured', 'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable cloud sync.', 'info'); return; }
    setCloudSyncStatus('syncing');
    try {
      const userId = user?.id;
      const [cloudSongs, cloudPlaylists, cloudUserSongs, cloudRecentlyPlayed, cloudUserSettings] = await Promise.all([
        fetchSongsFromCloud(), fetchPlaylistsFromCloud(), userId ? fetchUserSongsFromCloud(userId) : Promise.resolve(null),
        userId ? fetchRecentlyPlayedFromCloud(userId) : Promise.resolve(null), userId ? fetchUserSettingsFromCloud(userId) : Promise.resolve(null),
      ]);
      if (cloudSongs === null && cloudPlaylists === null) { setCloudSyncStatus('error'); if (manualTrigger) addToast('Cloud Sync Error', 'Could not reach Supabase. Operating with local storage cache.', 'error'); return; }
      if (cloudSongs && cloudSongs.length > 0) {
        const songMap = new Map<string, Song>();
        cloudSongs.forEach((song: Song) => { const rel = cloudUserSongs ? cloudUserSongs[song.id] : undefined; songMap.set(song.id, { ...song, isFavorite: rel?.isFavorite ?? false, playCount: rel?.playCount ?? 0, lastPlayedAt: rel?.lastPlayedAt }); });
        if (userId) songs.forEach((song) => { if (!songMap.has(song.id)) { songMap.set(song.id, song); upsertSongToCloud(song).catch(console.warn); if (song.isFavorite || (song.playCount && song.playCount > 0)) upsertUserSongToCloud(userId, song.id, { isFavorite: song.isFavorite, playCount: song.playCount, lastPlayedAt: song.lastPlayedAt }).catch(console.warn); } });
        const merged = Array.from(songMap.values()); setSongs(merged); storage.saveSongs(merged);
      } else if (cloudSongs && cloudSongs.length === 0 && songs.length > 0) bulkSyncToCloud(songs, [], userId).catch(console.warn);
      if (cloudPlaylists !== null) {
        if (cloudPlaylists.length > 0) {
          if (userId) { const ids = new Set(cloudPlaylists.map((p: Playlist) => p.id)); playlists.forEach((pl) => { if (!ids.has(pl.id) && pl.userId === userId && !pl.isSystem) { upsertPlaylistToCloud(pl, userId).catch((err) => console.error('Supabase: Offline playlist migration error:', err)); cloudPlaylists.push(pl); } }); }
          setPlaylists(cloudPlaylists); storage.savePlaylists(cloudPlaylists);
        } else { if (playlists.length > 0 && userId) playlists.forEach((pl) => upsertPlaylistToCloud(pl, userId).catch(console.warn)); setPlaylists(playlists); }
      }
      if (cloudRecentlyPlayed !== null && cloudRecentlyPlayed.length > 0) { setRecentlyPlayedIds(cloudRecentlyPlayed); storage.saveRecentlyPlayedIds(cloudRecentlyPlayed); }
      if (cloudUserSettings !== null) {
        if (cloudUserSettings.recentSearches && cloudUserSettings.recentSearches.length > 0) { setRecentSearches(cloudUserSettings.recentSearches); storage.saveRecentSearches(cloudUserSettings.recentSearches); }
        if (cloudUserSettings.settings && Object.keys(cloudUserSettings.settings).length > 0) setSettings((prev) => ({ ...prev, ...cloudUserSettings.settings }));
      } else if (userId) upsertUserSettingsToCloud(userId, { settings, recentSearches }).catch(console.warn);
      setCloudSyncStatus('synced'); if (manualTrigger) addToast('Cloud Synced', 'Library and preferences synchronized with Supabase.', 'success');
    } catch (err) { console.error('Supabase sync error:', err); setCloudSyncStatus('error'); if (manualTrigger) addToast('Sync Failed', 'Failed to synchronize with Supabase.', 'error'); }
  }, [songs, playlists, settings, recentSearches, user, addToast]);

  useEffect(() => { if (!isAuthLoading) { const id = user?.id || null; if (lastSyncedUserIdRef.current !== id) { lastSyncedUserIdRef.current = id; syncWithCloud(false); } } }, [user?.id, isAuthLoading, syncWithCloud]);
  useEffect(() => {
    const client = getSupabaseClient(); if (!client) return; let channel: any = null;
    const refresh = () => { if (document.visibilityState === 'visible') fetchPlaylistsFromCloud().then((fresh) => { if (fresh !== null) { setPlaylists(fresh); storage.savePlaylists(fresh); } }).catch(console.warn); };
    try { channel = client.channel('public:vibebox-cross-device-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'playlists' }, refresh).on('postgres_changes', { event: '*', schema: 'public', table: 'playlist_items' }, refresh).on('postgres_changes', { event: '*', schema: 'public', table: 'user_songs' }, () => { if (user?.id) fetchUserSongsFromCloud(user.id).then((rels) => { if (rels) setSongs((prev) => prev.map((song) => rels[song.id] ? { ...song, ...rels[song.id] } : song)); }).catch(console.warn); }).subscribe(); } catch (err) { console.warn('Supabase: Realtime channel init note:', err); }
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { if (channel) client.removeChannel(channel); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [user?.id]);

  const setActivePage = useCallback((page: ActivePage, playlistId: string | null = null) => { setActivePageInternal(page); setSelectedPlaylistId(playlistId); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
  const updateSettings = useCallback((updates: Partial<UserSettings>) => setSettings((prev) => { const next = { ...prev, ...updates }; if (user?.id) upsertUserSettingsToCloud(user.id, { settings: next }).catch(console.warn); return next; }), [user]);
  const addRecentSearch = useCallback((term: string) => { const clean = term.trim(); if (!clean) return; setRecentSearches((prev) => { const next = [clean, ...prev.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 10); if (user?.id) upsertUserSettingsToCloud(user.id, { recentSearches: next }).catch(console.warn); return next; }); }, [user]);
  const clearRecentSearches = useCallback(() => { setRecentSearches([]); if (user?.id) upsertUserSettingsToCloud(user.id, { recentSearches: [] }).catch(console.warn); }, [user]);

  const addSong = useCallback((songData: Omit<Song, 'id' | 'addedAt' | 'playCount'>, playlistId?: string): Song => {
    const existing = songs.find((song) => song.youtubeId === songData.youtubeId);
    if (existing) {
      addToast('Song already in library', `"${existing.title}" is ready in your library.`, 'info');
      if (playlistId) setPlaylists((prev) => prev.map((pl) => {
        if (pl.id !== playlistId || pl.songIds.includes(existing.id)) return pl;
        if (!canManagePlaylist(pl)) { addToast('Permission Denied', 'You cannot add tracks to playlists owned by others.', 'error'); return pl; }
        const updatedPl = { ...pl, songIds: [...pl.songIds, existing.id], updatedAt: Date.now() };
        upsertPlaylistToCloud(updatedPl, user?.id).then((success) => { if (!success) addToast('Playlist Save Failed', 'The song could not be added to the cloud playlist.', 'error'); }).catch((err) => { console.error('Supabase: Add existing song to playlist exception:', err); addToast('Playlist Save Failed', 'The song could not be added to the cloud playlist.', 'error'); });
        return updatedPl;
      }));
      return existing;
    }

    const newSong: Song = { ...songData, id: generateUUID(), addedAt: Date.now(), playCount: 0, userId: user?.id, isPublic: true };
    setSongs((prev) => [newSong, ...prev]);
    addToast('Song Added', `"${newSong.title}" saved to library.`, 'success');
    // The playlist write must wait for the referenced public.songs row to exist.
    upsertSongToCloud(newSong).then((songSaved) => {
      if (!songSaved) { addToast('Cloud Save Failed', 'The song could not be saved to the cloud, so it was not added to the playlist.', 'error'); return; }
      if (user?.id && newSong.isFavorite) upsertUserSongToCloud(user.id, newSong.id, { isFavorite: true }).catch(console.warn);
      if (playlistId) setPlaylists((prev) => prev.map((pl) => {
        if (pl.id !== playlistId || pl.songIds.includes(newSong.id)) return pl;
        if (!canManagePlaylist(pl)) { addToast('Permission Denied', 'You cannot add tracks to playlists owned by others.', 'error'); return pl; }
        const updatedPl = { ...pl, songIds: [...pl.songIds, newSong.id], updatedAt: Date.now() };
        upsertPlaylistToCloud(updatedPl, user?.id).then((success) => { if (!success) addToast('Playlist Save Failed', 'The song is in your library, but could not be added to the cloud playlist.', 'error'); }).catch((err) => { console.error('Supabase: Add new song to playlist exception:', err); addToast('Playlist Save Failed', 'The song is in your library, but could not be added to the cloud playlist.', 'error'); });
        return updatedPl;
      }));
    }).catch((err) => { console.error('Supabase: Song save exception:', err); addToast('Cloud Save Failed', 'The song could not be saved to the cloud, so it was not added to the playlist.', 'error'); });
    return newSong;
  }, [songs, user, canManagePlaylist, addToast]);

  const updateSong = useCallback((id: string, updates: Partial<Song>) => { const target = songs.find((s) => s.id === id); if (target && !canManageSong(target)) { addToast('Permission Denied', 'Only the owner or an admin can update this track.', 'error'); return; } setSongs((prev) => prev.map((s) => { if (s.id !== id) return s; const updated = { ...s, ...updates }; upsertSongToCloud(updated).catch(console.warn); return updated; })); addToast('Updated', 'Song information updated.', 'info'); }, [songs, canManageSong, addToast]);
  const deleteSong = useCallback((id: string) => { const target = songs.find((s) => s.id === id); if (target && !canManageSong(target)) { setPlaylists((prev) => prev.map((pl) => canManagePlaylist(pl) && pl.songIds.includes(id) ? { ...pl, songIds: pl.songIds.filter((songId) => songId !== id), updatedAt: Date.now() } : pl)); addToast('Removed', `"${target.title}" removed from your playlists.`, 'info'); return; } setSongs((prev) => prev.filter((s) => s.id !== id)); setPlaylists((prev) => prev.map((pl) => pl.songIds.includes(id) ? { ...pl, songIds: pl.songIds.filter((songId) => songId !== id), updatedAt: Date.now() } : pl)); setRecentlyPlayedIds((prev) => prev.filter((songId) => songId !== id)); deleteSongFromCloud(id).catch(console.warn); if (target) addToast('Song Removed', `"${target.title}" was removed from library.`, 'info'); }, [songs, canManageSong, canManagePlaylist, addToast]);
  const toggleFavorite = useCallback((id: string) => { let favorite = false; let title = ''; setSongs((prev) => prev.map((song) => { if (song.id !== id) return song; favorite = !song.isFavorite; title = song.title; return { ...song, isFavorite: favorite }; })); if (user?.id) upsertUserSongToCloud(user.id, id, { isFavorite: favorite }).catch(console.warn); if (title) addToast(favorite ? 'Added to Favorites' : 'Removed from Favorites', `"${title}"`, 'success'); }, [user, addToast]);
  const recordPlay = useCallback((id: string) => { const now = Date.now(); let count = 1; setSongs((prev) => prev.map((song) => { if (song.id !== id) return song; count = (song.playCount || 0) + 1; return { ...song, playCount: count, lastPlayedAt: now }; })); setRecentlyPlayedIds((prev) => [id, ...prev.filter((item) => item !== id)].slice(0, 50)); if (user?.id) { upsertUserSongToCloud(user.id, id, { playCount: count, lastPlayedAt: now }).catch(console.warn); recordRecentlyPlayedInCloud(user.id, id).catch(console.warn); } }, [user]);

  const createPlaylist = useCallback((name: string, description?: string): Playlist => { const creatorName = profile?.username || profile?.full_name || user?.user_metadata?.username || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You'; const playlist: Playlist = { id: generateUUID(), name: name.trim() || 'Untitled Playlist', description: description?.trim() || '', songIds: [], createdAt: Date.now(), updatedAt: Date.now(), userId: user?.id, creatorName, isPublic: true }; setPlaylists((prev) => [playlist, ...prev]); upsertPlaylistToCloud(playlist, user?.id).catch(console.warn); addToast('Playlist Created', `"${playlist.name}" created.`, 'success'); return playlist; }, [user, profile, addToast]);
  const updatePlaylist = useCallback((id: string, updates: Partial<Playlist>) => { const target = playlists.find((p) => p.id === id); if (target && !canManagePlaylist(target)) { addToast('Permission Denied', 'You can only edit playlists you created.', 'error'); return; } setPlaylists((prev) => prev.map((pl) => { if (pl.id !== id) return pl; const updated = { ...pl, ...updates, updatedAt: Date.now() }; upsertPlaylistToCloud(updated, user?.id).catch(console.warn); return updated; })); addToast('Playlist Updated', 'Changes saved.', 'info'); }, [playlists, canManagePlaylist, user, addToast]);
  const deletePlaylist = useCallback((id: string) => { const pl = playlists.find((p) => p.id === id); if (pl && !canManagePlaylist(pl)) { addToast('Permission Denied', 'You can only delete playlists you created.', 'error'); return; } setPlaylists((prev) => prev.filter((p) => p.id !== id)); deletePlaylistFromCloud(id).catch(console.warn); if (selectedPlaylistId === id) setActivePage('playlists'); if (pl) addToast('Playlist Deleted', `"${pl.name}" removed.`, 'info'); }, [playlists, canManagePlaylist, selectedPlaylistId, setActivePage, addToast]);
  const addSongToPlaylist = useCallback((playlistId: string, songId: string) => { const target = playlists.find((p) => p.id === playlistId); if (target && !canManagePlaylist(target)) { addToast('Permission Denied', 'You can only modify playlists you created.', 'error'); return; } let name = ''; setPlaylists((prev) => prev.map((pl) => { if (pl.id !== playlistId) return pl; name = pl.name; if (pl.songIds.includes(songId)) return pl; const updated = { ...pl, songIds: [...pl.songIds, songId], updatedAt: Date.now() }; upsertPlaylistToCloud(updated, user?.id).catch(console.warn); return updated; })); addToast('Added to Playlist', `Saved to ${name || 'playlist'}`, 'success'); }, [playlists, canManagePlaylist, user, addToast]);
  const removeSongFromPlaylist = useCallback((playlistId: string, songId: string) => { const target = playlists.find((p) => p.id === playlistId); if (target && !canManagePlaylist(target)) { addToast('Permission Denied', 'You can only modify playlists you created.', 'error'); return; } setPlaylists((prev) => prev.map((pl) => { if (pl.id !== playlistId) return pl; const updated = { ...pl, songIds: pl.songIds.filter((id) => id !== songId), updatedAt: Date.now() }; upsertPlaylistToCloud(updated, user?.id).catch(console.warn); return updated; })); addToast('Removed from Playlist', 'Track removed.', 'info'); }, [playlists, canManagePlaylist, user, addToast]);
  const reorderPlaylistSongs = useCallback((playlistId: string, fromIndex: number, toIndex: number) => { const target = playlists.find((p) => p.id === playlistId); if (target && !canManagePlaylist(target)) { addToast('Permission Denied', 'You can only reorder your own playlists.', 'error'); return; } setPlaylists((prev) => prev.map((pl) => { if (pl.id !== playlistId) return pl; const ids = [...pl.songIds]; const [moved] = ids.splice(fromIndex, 1); ids.splice(toIndex, 0, moved); const updated = { ...pl, songIds: ids, updatedAt: Date.now() }; upsertPlaylistToCloud(updated, user?.id).catch(console.warn); return updated; })); }, [playlists, canManagePlaylist, user, addToast]);

  const clearRecentlyPlayed = useCallback(() => { setRecentlyPlayedIds([]); if (user?.id) clearRecentlyPlayedInCloud(user.id).catch(console.warn); addToast('History Cleared', 'Recently played tracks cleared.', 'info'); }, [user, addToast]);
  const clearAllData = useCallback(() => { storage.clearAllData(); setSongs([]); setPlaylists([]); setRecentlyPlayedIds([]); setRecentSearches([]); addToast('All Data Cleared', 'Library reset successfully.', 'info'); }, [addToast]);
  const exportLibrary = useCallback(() => { const blob = new Blob([storage.exportLibraryJSON()], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `vibebox-library-${new Date().toISOString().slice(0, 10)}.json`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); addToast('Export Successful', 'Library backup downloaded.', 'success'); }, [addToast]);
  const importLibrary = useCallback((jsonString: string) => { const result = storage.importLibraryJSON(jsonString); if (result.success) { const loadedSongs = normalizeSongIds(storage.getSongs()); const loadedPlaylists = normalizePlaylistIds(storage.getPlaylists()); setSongs(loadedSongs); setPlaylists(loadedPlaylists); setRecentlyPlayedIds(storage.getRecentlyPlayedIds().map(toValidUUID)); setSettings(storage.getSettings()); setRecentSearches(storage.getRecentSearches()); bulkSyncToCloud(loadedSongs, loadedPlaylists, user?.id).catch(console.warn); addToast('Import Successful', result.message, 'success'); } else addToast('Import Failed', result.message, 'error'); return result; }, [user, addToast]);
  const favorites = useMemo(() => songs.filter((song) => song.isFavorite), [songs]);
  const recentlyPlayed = useMemo(() => { const map = new Map(songs.map((song) => [song.id, song])); return recentlyPlayedIds.map((id) => map.get(id)).filter((song): song is Song => Boolean(song)); }, [songs, recentlyPlayedIds]);

  return <LibraryContext.Provider value={{ songs, playlists, recentlyPlayed, favorites, activePage, selectedPlaylistId, searchQuery, searchFilter, settings, recentSearches, cloudSyncStatus, isCloudConnected: isSupabaseConfigured(), syncWithCloud, isAddSongOpen, isCreatePlaylistOpen, playlistToEdit, songToAddToPlaylist, toasts, canManagePlaylist, canManageSong, setActivePage, setSearchQuery, setSearchFilter, updateSettings, addRecentSearch, clearRecentSearches, addSong, updateSong, deleteSong, toggleFavorite, recordPlay, createPlaylist, updatePlaylist, deletePlaylist, addSongToPlaylist, removeSongFromPlaylist, reorderPlaylistSongs, clearRecentlyPlayed, clearAllData, importLibrary, exportLibrary, openAddSongModal: () => setIsAddSongOpen(true), closeAddSongModal: () => setIsAddSongOpen(false), openCreatePlaylistModal: (playlist) => { setPlaylistToEdit(playlist || null); setIsCreatePlaylistOpen(true); }, closeCreatePlaylistModal: () => { setPlaylistToEdit(null); setIsCreatePlaylistOpen(false); }, openAddToPlaylistModal: (song) => setSongToAddToPlaylist(song), closeAddToPlaylistModal: () => setSongToAddToPlaylist(null), addToast, removeToast }}>{children}</LibraryContext.Provider>;
};
export const useLibrary = () => { const context = useContext(LibraryContext); if (!context) throw new Error('useLibrary must be used within a LibraryProvider'); return context; };
