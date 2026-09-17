import { VisualizerConfig } from '../components/visualizer/visualizerTypes';

export interface Song {
  id: string;
  youtubeId: string;
  title: string;
  channel: string;
  thumbnailUrl: string;
  duration: number; // in seconds
  addedAt: number;
  isFavorite: boolean;
  playCount: number;
  lastPlayedAt?: number;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  songIds: string[];
  createdAt: number;
  updatedAt: number;
  isSystem?: boolean;
  coverUrl?: string;
}

export type RepeatOption = 'off' | '1' | '2' | '3' | '5' | '10' | '20' | 'inf';

export type PlaybackMode =
  | 'normal'          // Play through queue/playlist then stop
  | 'repeat-song'     // Repeat current song indefinitely
  | 'repeat-count'    // Repeat current song X times then continue
  | 'repeat-playlist' // Repeat entire queue/playlist continuously
  | 'shuffle';        // Shuffle queue randomly without immediate repeats

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0 - 100
  isMuted: boolean;
  playbackMode: PlaybackMode;
  repeatCount: RepeatOption;
  currentRepeatIteration: number;
  queue: Song[];
  queueIndex: number;
  playbackRate: number;
  isLoading: boolean;
  error: string | null;
}

export type ThemeName = 'graphite' | 'midnight' | 'oled' | 'cyber';

export interface UserSettings {
  theme: ThemeName;
  autoplayNext: boolean;
  defaultVolume: number;
  showVideoPlayer: boolean;
  accentColor: 'emerald' | 'cyan' | 'purple' | 'amber';
  defaultPlaybackMode?: PlaybackMode;
  defaultRepeatCount?: RepeatOption;
  recentSearches?: string[];
  visualizer?: VisualizerConfig;
}

export interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  type?: 'success' | 'info' | 'error';
}

export type ActivePage = 'home' | 'search' | 'library' | 'playlists' | 'playlist-detail' | 'settings';
