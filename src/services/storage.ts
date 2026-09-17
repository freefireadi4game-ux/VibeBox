import { Song, Playlist, UserSettings, PlaybackMode, RepeatOption } from '../types';

const STORAGE_KEYS = {
  SONGS: 'vibebox_songs_v1',
  PLAYLISTS: 'vibebox_playlists_v1',
  RECENTLY_PLAYED: 'vibebox_recently_played_v1',
  SETTINGS: 'vibebox_settings_v1',
  PLAYER_PREFS: 'vibebox_player_prefs_v2',
  RECENT_SEARCHES: 'vibebox_recent_searches_v1',
};

// Curated starter songs
export const DEFAULT_SEED_SONGS: Song[] = [
  {
    id: 'seed-1',
    youtubeId: 'jfKfPfyJRdk', // lofi hip hop radio - beats to relax/study to
    title: 'Lofi Hip Hop Radio — Beats to Relax/Study to',
    channel: 'Lofi Girl',
    thumbnailUrl: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
    duration: 3600,
    addedAt: Date.now() - 86400000 * 3,
    isFavorite: true,
    playCount: 14,
    lastPlayedAt: Date.now() - 3600000,
  },
  {
    id: 'seed-2',
    youtubeId: '4xDzrJKXOOY', // Synthwave Radio - Chill synth / retro
    title: 'Synthwave Radio — Chill Synth / Retro Beats',
    channel: 'Lofi Girl Synthwave',
    thumbnailUrl: 'https://i.ytimg.com/vi/4xDzrJKXOOY/hqdefault.jpg',
    duration: 3600,
    addedAt: Date.now() - 86400000 * 2,
    isFavorite: true,
    playCount: 9,
    lastPlayedAt: Date.now() - 7200000,
  },
  {
    id: 'seed-3',
    youtubeId: '5qap5aO4i9A', // lofi hip hop radio - beats to sleep/chill to
    title: 'Beats to Sleep / Chill to',
    channel: 'Lofi Girl',
    thumbnailUrl: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg',
    duration: 3600,
    addedAt: Date.now() - 86400000 * 4,
    isFavorite: false,
    playCount: 5,
  },
  {
    id: 'seed-4',
    youtubeId: 'turpeP_c6yI', // Endless Journey - Ambient Space Music
    title: 'Endless Journey — Deep Ambient Chill',
    channel: 'Ambient Realm',
    thumbnailUrl: 'https://i.ytimg.com/vi/turpeP_c6yI/hqdefault.jpg',
    duration: 1845,
    addedAt: Date.now() - 86400000 * 5,
    isFavorite: false,
    playCount: 7,
  },
  {
    id: 'seed-5',
    youtubeId: 'DWcJFNfaw9c', // Coffee Shop Ambience & Smooth Jazz Beats
    title: 'Coffee Shop Ambience & Smooth Jazz Beats',
    channel: 'Coffee Chill Records',
    thumbnailUrl: 'https://i.ytimg.com/vi/DWcJFNfaw9c/hqdefault.jpg',
    duration: 2400,
    addedAt: Date.now() - 86400000 * 1,
    isFavorite: true,
    playCount: 18,
    lastPlayedAt: Date.now() - 1800000,
  },
  {
    id: 'seed-6',
    youtubeId: 'rPjez8z61rI', // Midnight City Drive Synthwave
    title: 'Midnight City Drive — Cyberpunk Night Cruise',
    channel: 'Neon Wave',
    thumbnailUrl: 'https://i.ytimg.com/vi/rPjez8z61rI/hqdefault.jpg',
    duration: 2120,
    addedAt: Date.now() - 86400000 * 6,
    isFavorite: false,
    playCount: 3,
  },
];

export const DEFAULT_PLAYLISTS: Playlist[] = [
  {
    id: 'pl-chill-vibes',
    name: 'Midnight Chill Vibes',
    description: 'Relaxed beats for late night focus, coding, and unwinding.',
    songIds: ['seed-1', 'seed-2', 'seed-5'],
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 86400000 * 1,
    coverUrl: 'https://i.ytimg.com/vi/4xDzrJKXOOY/hqdefault.jpg',
  },
  {
    id: 'pl-retro-synth',
    name: 'Retro Synthwave & Neon',
    description: '80s inspired futuristic cyber rhythms and deep basslines.',
    songIds: ['seed-2', 'seed-6'],
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 2,
    coverUrl: 'https://i.ytimg.com/vi/rPjez8z61rI/hqdefault.jpg',
  },
];

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'graphite',
  autoplayNext: true,
  defaultVolume: 80,
  showVideoPlayer: true,
  accentColor: 'emerald',
  defaultPlaybackMode: 'normal',
  defaultRepeatCount: 'off',
  recentSearches: ['Lofi Girl', 'Synthwave', 'Ambient', 'Jazz'],
  visualizer: {
    enabled: true,
    style: 'spectrum',
    intensity: 'medium',
    spikeCount: 'auto',
    ambientGlow: 'dynamic',
  },
};

export interface StoredPlayerPrefs {
  volume: number;
  isMuted: boolean;
  playbackMode: PlaybackMode;
  repeatCount: RepeatOption;
}

class StorageService {
  getSongs(): Song[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SONGS);
      if (!data) {
        this.saveSongs(DEFAULT_SEED_SONGS);
        return DEFAULT_SEED_SONGS;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load songs from storage', e);
      return DEFAULT_SEED_SONGS;
    }
  }

  saveSongs(songs: Song[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(songs));
    } catch (e) {
      console.error('Failed to save songs to storage', e);
    }
  }

  getPlaylists(): Playlist[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PLAYLISTS);
      if (!data) {
        this.savePlaylists(DEFAULT_PLAYLISTS);
        return DEFAULT_PLAYLISTS;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load playlists from storage', e);
      return DEFAULT_PLAYLISTS;
    }
  }

  savePlaylists(playlists: Playlist[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
    } catch (e) {
      console.error('Failed to save playlists to storage', e);
    }
  }

  getRecentlyPlayedIds(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECENTLY_PLAYED);
      if (!data) {
        return ['seed-5', 'seed-1', 'seed-2'];
      }
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }

  saveRecentlyPlayedIds(ids: string[]): void {
    try {
      const trimmed = Array.from(new Set(ids)).slice(0, 50);
      localStorage.setItem(STORAGE_KEYS.RECENTLY_PLAYED, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Failed to save recently played IDs', e);
    }
  }

  getSettings(): UserSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(data);
      // Migrate old 'dark' theme to 'graphite'
      if (parsed.theme === 'dark') {
        parsed.theme = 'graphite';
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  }

  saveSettings(settings: UserSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }

  getPlayerPrefs(): StoredPlayerPrefs {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PLAYER_PREFS);
      if (!data) {
        // Check if v1 prefs exist
        const oldData = localStorage.getItem('vibebox_player_prefs_v1');
        if (oldData) {
          const old = JSON.parse(oldData);
          const mode: PlaybackMode = old.shuffle ? 'shuffle' : old.repeat === 'all' ? 'repeat-playlist' : old.repeat === 'one' ? 'repeat-song' : 'normal';
          return {
            volume: typeof old.volume === 'number' ? old.volume : 80,
            isMuted: Boolean(old.isMuted),
            playbackMode: mode,
            repeatCount: old.repeat === 'one' ? 'inf' : 'off',
          };
        }
        return { volume: 80, isMuted: false, playbackMode: 'normal', repeatCount: 'off' };
      }
      return JSON.parse(data);
    } catch {
      return { volume: 80, isMuted: false, playbackMode: 'normal', repeatCount: 'off' };
    }
  }

  savePlayerPrefs(prefs: StoredPlayerPrefs): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PLAYER_PREFS, JSON.stringify(prefs));
    } catch (e) {
      console.error('Failed to save player prefs', e);
    }
  }

  getRecentSearches(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES);
      if (!data) return DEFAULT_SETTINGS.recentSearches || [];
      return JSON.parse(data);
    } catch {
      return DEFAULT_SETTINGS.recentSearches || [];
    }
  }

  saveRecentSearches(searches: string[]): void {
    try {
      const trimmed = Array.from(new Set(searches.filter(Boolean))).slice(0, 10);
      localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Failed to save recent searches', e);
    }
  }

  exportLibraryJSON(): string {
    const data = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      appName: 'VIBEBOX',
      songs: this.getSongs(),
      playlists: this.getPlaylists(),
      recentlyPlayed: this.getRecentlyPlayedIds(),
      settings: this.getSettings(),
      playerPrefs: this.getPlayerPrefs(),
    };
    return JSON.stringify(data, null, 2);
  }

  importLibraryJSON(jsonString: string): { success: boolean; message: string; count?: number } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !Array.isArray(parsed.songs)) {
        return { success: false, message: 'Invalid format: Missing songs list' };
      }

      const validSongs: Song[] = parsed.songs.filter(
        (s: any) => s && typeof s.youtubeId === 'string' && typeof s.title === 'string'
      );

      const validPlaylists: Playlist[] = Array.isArray(parsed.playlists)
        ? parsed.playlists.filter((p: any) => p && typeof p.name === 'string')
        : [];

      this.saveSongs(validSongs);
      this.savePlaylists(validPlaylists);

      if (Array.isArray(parsed.recentlyPlayed)) {
        this.saveRecentlyPlayedIds(parsed.recentlyPlayed);
      }

      if (parsed.settings && typeof parsed.settings === 'object') {
        this.saveSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
      }

      if (parsed.playerPrefs && typeof parsed.playerPrefs === 'object') {
        this.savePlayerPrefs({
          volume: 80,
          isMuted: false,
          playbackMode: 'normal',
          repeatCount: 'off',
          ...parsed.playerPrefs,
        });
      }

      return {
        success: true,
        message: `Imported ${validSongs.length} songs and ${validPlaylists.length} playlists successfully!`,
        count: validSongs.length,
      };
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to parse JSON file' };
    }
  }

  clearAllData(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.SONGS);
      localStorage.removeItem(STORAGE_KEYS.PLAYLISTS);
      localStorage.removeItem(STORAGE_KEYS.RECENTLY_PLAYED);
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
      localStorage.removeItem(STORAGE_KEYS.PLAYER_PREFS);
      localStorage.removeItem(STORAGE_KEYS.RECENT_SEARCHES);
    } catch (e) {
      console.error('Error clearing storage', e);
    }
  }
}

export const storage = new StorageService();
