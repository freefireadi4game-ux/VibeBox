import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Song, PlaybackMode, RepeatOption } from '../types';
import { storage } from '../services/storage';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface PlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackMode: PlaybackMode;
  repeatCount: RepeatOption;
  currentRepeatIteration: number;
  queue: Song[];
  queueIndex: number;
  showFullPlayer: boolean;
  showQueueModal: boolean;
  isVideoVisible: boolean;
  error: string | null;

  // Actions
  playSong: (song: Song, contextQueue?: Song[], startIndex?: number) => void;
  togglePlay: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  nextSong: () => void;
  prevSong: () => void;
  setPlaybackMode: (mode: PlaybackMode) => void;
  cyclePlaybackMode: () => void;
  setRepeatCount: (count: RepeatOption) => void;
  addToQueue: (song: Song, playNext?: boolean) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  setShowFullPlayer: (show: boolean) => void;
  setShowQueueModal: (show: boolean) => void;
  setIsVideoVisible: (visible: boolean) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

const DEFAULT_PREFS = storage.getPlayerPrefs();

// Silent audio base64 data URI to keep mobile Media Session & Dynamic Island / Notification Pill active in background
const SILENT_AUDIO_URI = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(DEFAULT_PREFS.volume ?? 80);
  const [isMuted, setIsMuted] = useState<boolean>(DEFAULT_PREFS.isMuted ?? false);

  // Playback mode & Repeat system
  const [playbackMode, setPlaybackModeState] = useState<PlaybackMode>(DEFAULT_PREFS.playbackMode ?? 'normal');
  const [repeatCount, setRepeatCountState] = useState<RepeatOption>(DEFAULT_PREFS.repeatCount ?? 'off');
  const [currentRepeatIteration, setCurrentRepeatIteration] = useState<number>(1);

  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(0);
  const [showFullPlayer, setShowFullPlayer] = useState<boolean>(false);
  const [showQueueModal, setShowQueueModal] = useState<boolean>(false);
  const [isVideoVisible, setIsVideoVisible] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // HTML5 Audio Keep-Alive for Android / iOS background audio focus and Dynamic Island persistence
  const keepAliveAudioRef = useRef<HTMLAudioElement | null>(null);

  // Synchronized refs to avoid stale closure issues in YouTube event listeners
  const playerRef = useRef<any>(null);
  const playerReadyRef = useRef<boolean>(false);
  const currentSongRef = useRef<Song | null>(null);
  const queueRef = useRef<Song[]>([]);
  const queueIndexRef = useRef<number>(0);
  const playbackModeRef = useRef<PlaybackMode>(playbackMode);
  const repeatCountRef = useRef<RepeatOption>(repeatCount);
  const currentRepeatIterationRef = useRef<number>(1);
  const isPlayingRef = useRef<boolean>(false);
  const isSkippingRef = useRef<boolean>(false);
  const intendedPlayingRef = useRef<boolean>(false);

  // Initialize keep-alive audio element once
  useEffect(() => {
    try {
      const audio = new Audio(SILENT_AUDIO_URI);
      audio.loop = true;
      audio.volume = 0.05;
      audio.preload = 'auto';
      keepAliveAudioRef.current = audio;
    } catch (e) {
      console.warn('Could not initialize keep-alive audio:', e);
    }

    return () => {
      if (keepAliveAudioRef.current) {
        try {
          keepAliveAudioRef.current.pause();
          keepAliveAudioRef.current.src = '';
        } catch {}
      }
    };
  }, []);

  const startKeepAlive = useCallback(() => {
    if (keepAliveAudioRef.current) {
      keepAliveAudioRef.current.play().catch(() => {
        // May wait for first gesture, which is normal
      });
    }
  }, []);

  const stopKeepAlive = useCallback(() => {
    if (keepAliveAudioRef.current) {
      try {
        keepAliveAudioRef.current.pause();
      } catch {}
    }
  }, []);

  // Keep refs in sync
  currentSongRef.current = currentSong;
  queueRef.current = queue;
  queueIndexRef.current = queueIndex;
  playbackModeRef.current = playbackMode;
  repeatCountRef.current = repeatCount;
  currentRepeatIterationRef.current = currentRepeatIteration;
  isPlayingRef.current = isPlaying;

  // Persist prefs whenever changed
  useEffect(() => {
    storage.savePlayerPrefs({
      volume,
      isMuted,
      playbackMode,
      repeatCount,
    });
  }, [volume, isMuted, playbackMode, repeatCount]);

  // Restart current video helper
  const restartCurrentSong = useCallback(() => {
    if (playerRef.current && playerReadyRef.current) {
      try {
        playerRef.current.seekTo(0, true);
        playerRef.current.playVideo();
        setIsPlaying(true);
        setIsLoading(false);
      } catch (e) {
        console.error('Error restarting song', e);
      }
    }
  }, []);

  // Internal function to load and play a track by index in queue
  const playTrackAtIndex = useCallback((idx: number) => {
    const q = queueRef.current;
    if (!q || q.length === 0 || idx < 0 || idx >= q.length) {
      setIsPlaying(false);
      setIsLoading(false);
      return;
    }

    const nextTrack = q[idx];
    setQueueIndex(idx);
    queueIndexRef.current = idx;
    setCurrentSong(nextTrack);
    currentSongRef.current = nextTrack;
    setCurrentTime(0);
    setIsLoading(true);
    setError(null);

    // Reset repeat counter whenever track changes
    setCurrentRepeatIteration(1);
    currentRepeatIterationRef.current = 1;
    intendedPlayingRef.current = true;
    startKeepAlive();

    if (playerRef.current && playerReadyRef.current) {
      try {
        playerRef.current.loadVideoById({
          videoId: nextTrack.youtubeId,
          suggestedQuality: 'default',
        });
        playerRef.current.playVideo();
      } catch (e) {
        console.error('Error loading video', e);
      }
    }
  }, [startKeepAlive]);

  // Next song handler
  const nextSong = useCallback(() => {
    const q = queueRef.current;
    if (!q || q.length === 0) return;

    // Reset repeat iteration on manual next
    setCurrentRepeatIteration(1);
    currentRepeatIterationRef.current = 1;

    let nextIdx = queueIndexRef.current + 1;
    if (nextIdx >= q.length) {
      if (playbackModeRef.current === 'repeat-playlist') {
        nextIdx = 0;
      } else {
        // In normal mode, if reached end, pause
        setIsPlaying(false);
        return;
      }
    }

    playTrackAtIndex(nextIdx);
  }, [playTrackAtIndex]);

  // Handle Track Ended (CRITICAL: Called when YouTube API reports state === 0)
  const handleTrackEnded = useCallback(() => {
    if (isSkippingRef.current) return;

    const mode = playbackModeRef.current;
    const targetRepeat = repeatCountRef.current;

    // 1. Check if repeating current song indefinitely
    if (mode === 'repeat-song' || targetRepeat === 'inf') {
      restartCurrentSong();
      return;
    }

    // 2. Check if repeating custom count
    if (mode === 'repeat-count' && targetRepeat !== 'off') {
      const maxCount = parseInt(targetRepeat, 10);
      const currentIter = currentRepeatIterationRef.current;

      if (!isNaN(maxCount) && currentIter < maxCount) {
        // Increment repeat counter and loop same song
        const nextIter = currentIter + 1;
        setCurrentRepeatIteration(nextIter);
        currentRepeatIterationRef.current = nextIter;
        restartCurrentSong();
        return;
      } else {
        // Repeat limit reached, reset counter
        setCurrentRepeatIteration(1);
        currentRepeatIterationRef.current = 1;
      }
    }

    // 3. Move to next song according to queue & playbackMode
    const q = queueRef.current;
    if (!q || q.length === 0) {
      setIsPlaying(false);
      return;
    }

    let nextIdx = queueIndexRef.current + 1;

    if (nextIdx >= q.length) {
      if (mode === 'repeat-playlist') {
        nextIdx = 0;
      } else if (mode === 'shuffle') {
        // Reshuffle queue excluding current song
        const current = currentSongRef.current;
        const others = q.filter((s) => s.id !== current?.id);
        for (let i = others.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [others[i], others[j]] = [others[j], others[i]];
        }
        const newShuffled = current ? [current, ...others] : others;
        setQueue(newShuffled);
        queueRef.current = newShuffled;
        nextIdx = newShuffled.length > 1 ? 1 : 0;
      } else {
        // Queue finished in normal mode
        setIsPlaying(false);
        return;
      }
    }

    playTrackAtIndex(nextIdx);
  }, [restartCurrentSong, playTrackAtIndex]);

  // Previous song handler
  const prevSong = useCallback(() => {
    // If more than 3 seconds in, restart current song
    if (currentTime > 3) {
      seekTo(0);
      return;
    }

    const q = queueRef.current;
    if (!q || q.length === 0) return;

    // Reset repeat iteration
    setCurrentRepeatIteration(1);
    currentRepeatIterationRef.current = 1;

    let prevIdx = queueIndexRef.current - 1;
    if (prevIdx < 0) {
      prevIdx = playbackModeRef.current === 'repeat-playlist' ? q.length - 1 : 0;
    }

    playTrackAtIndex(prevIdx);
  }, [currentTime, playTrackAtIndex]);

  // Seek handler
  const seekTo = useCallback((seconds: number) => {
    setCurrentTime(seconds);
    if (playerRef.current && playerReadyRef.current) {
      try {
        playerRef.current.seekTo(seconds, true);
      } catch (e) {
        console.error('Seek error', e);
      }
    }
  }, []);

  // Initialize YouTube IFrame Player
  const initPlayer = useCallback(() => {
    if (playerRef.current) return;

    try {
      playerRef.current = new window.YT.Player('vibebox-yt-iframe-host', {
        height: '100%',
        width: '100%',
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
          modestbranding: 1,
          fs: 1,
          iv_load_policy: 3,
        },
        events: {
          onReady: (event: any) => {
            playerReadyRef.current = true;
            event.target.setVolume(volume);
            if (isMuted) event.target.mute();

            // If a song was queued before player finished booting
            if (currentSongRef.current) {
              event.target.loadVideoById({
                videoId: currentSongRef.current.youtubeId,
                suggestedQuality: 'default',
              });
            }
          },
          onStateChange: (event: any) => {
            const state = event.data;
            // -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
            if (state === 1) {
              setIsPlaying(true);
              setIsLoading(false);
              setError(null);
              intendedPlayingRef.current = true;
              startKeepAlive();
              if ('mediaSession' in navigator) {
                try {
                  navigator.mediaSession.playbackState = 'playing';
                } catch {}
              }
              if (playerRef.current?.getDuration) {
                const dur = playerRef.current.getDuration() || 0;
                if (dur > 0) setDuration(dur);
              }
            } else if (state === 2) {
              // Video was paused. If hidden and playback was intended, don't destroy session
              if (document.hidden && intendedPlayingRef.current) {
                // Keep background MediaSession alive on Android
                startKeepAlive();
                if ('mediaSession' in navigator) {
                  try {
                    navigator.mediaSession.playbackState = 'playing';
                  } catch {}
                }
              } else {
                setIsPlaying(false);
                setIsLoading(false);
                stopKeepAlive();
                if ('mediaSession' in navigator) {
                  try {
                    navigator.mediaSession.playbackState = 'paused';
                  } catch {}
                }
              }
            } else if (state === 3) {
              setIsLoading(true);
            } else if (state === 0) {
              // VIDEO ENDED: Call auto-next handler with small timeout
              setTimeout(() => {
                handleTrackEnded();
              }, 60);
            }
          },
          onError: (event: any) => {
            setIsLoading(false);
            const errCode = event.data;
            let errMsg = 'Playback error occurred.';
            if (errCode === 101 || errCode === 150) {
              errMsg = 'This video cannot be played in embedded mode by request of owner.';
            } else if (errCode === 100) {
              errMsg = 'Video was deleted or marked private.';
            } else if (errCode === 2) {
              errMsg = 'Invalid YouTube video ID parameter.';
            }
            setError(errMsg);

            // Gracefully advance to next song after short delay if available
            isSkippingRef.current = true;
            setTimeout(() => {
              isSkippingRef.current = false;
              if (queueRef.current.length > 1) {
                nextSong();
              }
            }, 2000);
          },
        },
      });
    } catch (e) {
      console.warn('Could not initialize YouTube Player yet:', e);
    }
  }, [volume, isMuted, handleTrackEnded, nextSong]);

  // Load YouTube script once
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      initPlayer();
    };
  }, [initPlayer]);

  // Polling current playback time & duration
  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current && playerReadyRef.current && isPlayingRef.current) {
        try {
          const time = playerRef.current.getCurrentTime() || 0;
          const dur = playerRef.current.getDuration() || 0;
          setCurrentTime(time);
          if (dur > 0 && dur !== duration) {
            setDuration(dur);
          }
        } catch {
          // Player attaching
        }
      }
    }, 400);

    return () => clearInterval(interval);
  }, [duration]);

  // Play a specific song with optional context queue
  const playSong = useCallback(
    (song: Song, contextQueue?: Song[], startIndex?: number) => {
      let newQueue = contextQueue ? [...contextQueue] : [song];
      let newIndex = 0;

      if (contextQueue && startIndex !== undefined) {
        newIndex = startIndex;
      } else if (contextQueue) {
        const idx = contextQueue.findIndex((s) => s.id === song.id);
        newIndex = idx !== -1 ? idx : 0;
      }

      // If shuffle mode is on and contextQueue has items, maintain proper shuffled queue
      if (playbackModeRef.current === 'shuffle' && contextQueue && contextQueue.length > 1) {
        const remaining = contextQueue.filter((s) => s.id !== song.id);
        for (let i = remaining.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
        }
        newQueue = [song, ...remaining];
        newIndex = 0;
      }

      setQueue(newQueue);
      queueRef.current = newQueue;
      setQueueIndex(newIndex);
      queueIndexRef.current = newIndex;
      setCurrentSong(song);
      currentSongRef.current = song;
      setIsLoading(true);
      setError(null);
      setCurrentTime(0);

      // Reset repeat counter
      setCurrentRepeatIteration(1);
      currentRepeatIterationRef.current = 1;
      intendedPlayingRef.current = true;
      startKeepAlive();

      if (playerRef.current && playerReadyRef.current) {
        try {
          playerRef.current.loadVideoById({
            videoId: song.youtubeId,
            suggestedQuality: 'default',
          });
          playerRef.current.playVideo();
        } catch (e) {
          console.error('Error loading video', e);
        }
      }
    },
    [startKeepAlive]
  );

  const togglePlay = useCallback(() => {
    if (!currentSong) {
      if (queue.length > 0) {
        playSong(queue[0], queue, 0);
      }
      return;
    }

    if (!playerRef.current || !playerReadyRef.current) return;

    try {
      if (isPlaying) {
        intendedPlayingRef.current = false;
        playerRef.current.pauseVideo();
        stopKeepAlive();
        setIsPlaying(false);
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'paused';
        }
      } else {
        intendedPlayingRef.current = true;
        playerRef.current.playVideo();
        startKeepAlive();
        setIsPlaying(true);
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
        }
      }
    } catch (e) {
      console.error('Error toggling play state', e);
    }
  }, [currentSong, isPlaying, playSong, queue, startKeepAlive, stopKeepAlive]);

  const setVolume = useCallback(
    (newVol: number) => {
      const clamped = Math.max(0, Math.min(100, Math.round(newVol)));
      setVolumeState(clamped);
      if (clamped > 0 && isMuted) {
        setIsMuted(false);
      }
      if (playerRef.current && playerReadyRef.current) {
        try {
          playerRef.current.setVolume(clamped);
          if (clamped === 0) {
            playerRef.current.mute();
          } else {
            playerRef.current.unMute();
          }
        } catch (e) {
          console.error('Set volume error', e);
        }
      }
    },
    [isMuted]
  );

  const toggleMute = useCallback(() => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (playerRef.current && playerReadyRef.current) {
      try {
        if (nextMute) {
          playerRef.current.mute();
        } else {
          playerRef.current.unMute();
          playerRef.current.setVolume(volume || 50);
        }
      } catch (e) {
        console.error('Toggle mute error', e);
      }
    }
  }, [isMuted, volume]);

  // Set playback mode
  const setPlaybackMode = useCallback((mode: PlaybackMode) => {
    setPlaybackModeState(mode);
    playbackModeRef.current = mode;

    if (mode === 'repeat-song') {
      setRepeatCountState('inf');
      repeatCountRef.current = 'inf';
    } else if (mode === 'normal' || mode === 'repeat-playlist') {
      setRepeatCountState('off');
      repeatCountRef.current = 'off';
    }
  }, []);

  // Cycle playback modes: normal -> repeat-playlist -> repeat-song -> shuffle -> normal
  const cyclePlaybackMode = useCallback(() => {
    setPlaybackModeState((prev) => {
      let next: PlaybackMode = 'normal';
      if (prev === 'normal') next = 'repeat-playlist';
      else if (prev === 'repeat-playlist') next = 'repeat-song';
      else if (prev === 'repeat-song') next = 'shuffle';
      else if (prev === 'shuffle') next = 'normal';
      else next = 'normal';

      playbackModeRef.current = next;
      if (next === 'repeat-song') {
        setRepeatCountState('inf');
        repeatCountRef.current = 'inf';
      } else {
        setRepeatCountState('off');
        repeatCountRef.current = 'off';
      }
      return next;
    });
  }, []);

  // Set repeat count
  const setRepeatCount = useCallback((option: RepeatOption) => {
    setRepeatCountState(option);
    repeatCountRef.current = option;
    setCurrentRepeatIteration(1);
    currentRepeatIterationRef.current = 1;

    if (option === 'off') {
      if (playbackModeRef.current === 'repeat-count' || playbackModeRef.current === 'repeat-song') {
        setPlaybackModeState('normal');
        playbackModeRef.current = 'normal';
      }
    } else if (option === 'inf') {
      setPlaybackModeState('repeat-song');
      playbackModeRef.current = 'repeat-song';
    } else {
      setPlaybackModeState('repeat-count');
      playbackModeRef.current = 'repeat-count';
    }
  }, []);

  const addToQueue = useCallback((song: Song, playNext: boolean = false) => {
    setQueue((prev) => {
      if (prev.length === 0) {
        return [song];
      }
      if (playNext) {
        const insertIdx = queueIndexRef.current + 1;
        const copy = [...prev];
        copy.splice(insertIdx, 0, song);
        return copy;
      }
      return [...prev, song];
    });
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => {
      const nextQ = prev.filter((_, i) => i !== index);
      if (index < queueIndexRef.current) {
        setQueueIndex((idx) => Math.max(0, idx - 1));
      }
      return nextQ;
    });
  }, []);

  const clearQueue = useCallback(() => {
    if (currentSong) {
      setQueue([currentSong]);
      setQueueIndex(0);
    } else {
      setQueue([]);
      setQueueIndex(0);
    }
  }, [currentSong]);

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    setQueue((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);

      if (queueIndexRef.current === fromIndex) {
        setQueueIndex(toIndex);
      } else if (fromIndex < queueIndexRef.current && toIndex >= queueIndexRef.current) {
        setQueueIndex((idx) => idx - 1);
      } else if (fromIndex > queueIndexRef.current && toIndex <= queueIndexRef.current) {
        setQueueIndex((idx) => idx + 1);
      }
      return copy;
    });
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        nextSong();
      } else if (e.code === 'ArrowLeft' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        prevSong();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekTo(Math.min(duration, currentTime + 5));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekTo(Math.max(0, currentTime - 5));
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, nextSong, prevSong, seekTo, toggleMute, duration, currentTime]);

  // MediaSession API Integration (Lock Screen, Notification Shade & Hardware Media Keys)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (currentSong) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentSong.title,
          artist: currentSong.channel || 'VIBEBOX Artist',
          album: 'VIBEBOX Music',
          artwork: [
            { src: currentSong.thumbnailUrl, sizes: '96x96', type: 'image/jpeg' },
            { src: currentSong.thumbnailUrl, sizes: '128x128', type: 'image/jpeg' },
            { src: currentSong.thumbnailUrl, sizes: '256x256', type: 'image/jpeg' },
            { src: currentSong.thumbnailUrl, sizes: '512x512', type: 'image/jpeg' },
          ],
        });
      } catch (e) {
        console.warn('MediaSession metadata error', e);
      }
    } else {
      navigator.mediaSession.metadata = null;
    }

    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch {}
  }, [currentSong, isPlaying]);

  // MediaSession Action Handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const setHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Action not supported in browser
      }
    };

    setHandler('play', () => {
      intendedPlayingRef.current = true;
      startKeepAlive();
      if (playerRef.current && playerReadyRef.current) {
        try {
          playerRef.current.playVideo();
        } catch {}
      }
      setIsPlaying(true);
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = 'playing';
        } catch {}
      }
    });

    setHandler('pause', () => {
      intendedPlayingRef.current = false;
      stopKeepAlive();
      if (playerRef.current && playerReadyRef.current) {
        try {
          playerRef.current.pauseVideo();
        } catch {}
      }
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = 'paused';
        } catch {}
      }
    });

    setHandler('previoustrack', () => {
      prevSong();
    });

    setHandler('nexttrack', () => {
      nextSong();
    });

    setHandler('seekto', (details) => {
      if (details.seekTime !== undefined && details.seekTime !== null) {
        seekTo(details.seekTime);
      }
    });

    setHandler('seekbackward', (details) => {
      seekTo(Math.max(0, currentTime - (details.seekOffset || 10)));
    });

    setHandler('seekforward', (details) => {
      seekTo(Math.min(duration, currentTime + (details.seekOffset || 10)));
    });

    setHandler('stop', () => {
      intendedPlayingRef.current = false;
      stopKeepAlive();
      if (playerRef.current && playerReadyRef.current) {
        try {
          playerRef.current.pauseVideo();
        } catch {}
      }
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = 'paused';
        } catch {}
      }
    });

    return () => {
      const actions: MediaSessionAction[] = [
        'play',
        'pause',
        'previoustrack',
        'nexttrack',
        'seekto',
        'seekbackward',
        'seekforward',
        'stop',
      ];
      actions.forEach((a) => setHandler(a, null));
    };
  }, [togglePlay, prevSong, nextSong, seekTo, currentTime, duration, startKeepAlive, stopKeepAlive]);

  // MediaSession Position State sync
  useEffect(() => {
    if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;
    if (duration > 0 && currentTime >= 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, duration),
          playbackRate: 1,
          position: Math.min(duration, Math.max(0, currentTime)),
        });
      } catch {}
    }
  }, [currentTime, duration]);

  // Automatic Tab Visibility and Focus Auto-Resume Listener
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (!document.hidden) {
        // App returned to foreground / user came back to the tab
        if (intendedPlayingRef.current && playerRef.current && playerReadyRef.current) {
          try {
            const playerState = playerRef.current.getPlayerState ? playerRef.current.getPlayerState() : -1;
            // 1 = playing, 3 = buffering. If paused (2) or cued (5) or unstarted (-1), resume
            if (playerState !== 1 && playerState !== 3) {
              playerRef.current.playVideo();
              setIsPlaying(true);
            }
          } catch (e) {
            console.warn('Visibility resume error:', e);
          }
        }
      } else {
        // When going into the background, make sure the silent keep-alive is active
        if (intendedPlayingRef.current) {
          startKeepAlive();
          if ('mediaSession' in navigator) {
            try {
              navigator.mediaSession.playbackState = 'playing';
            } catch {}
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [startKeepAlive]);

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        isLoading,
        currentTime,
        duration,
        volume,
        isMuted,
        playbackMode,
        repeatCount,
        currentRepeatIteration,
        queue,
        queueIndex,
        showFullPlayer,
        showQueueModal,
        isVideoVisible,
        error,
        playSong,
        togglePlay,
        seekTo,
        setVolume,
        toggleMute,
        nextSong,
        prevSong,
        setPlaybackMode,
        cyclePlaybackMode,
        setRepeatCount,
        addToQueue,
        removeFromQueue,
        clearQueue,
        reorderQueue,
        setShowFullPlayer,
        setShowQueueModal,
        setIsVideoVisible,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
