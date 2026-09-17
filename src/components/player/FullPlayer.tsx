import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  Heart,
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  ListMusic,
  Plus,
  Volume2,
  Volume1,
  VolumeX,
  Video,
  Share2,
  Loader2,
  AlertCircle,
  Radio,
} from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { useLibrary } from '../../context/LibraryContext';
import { formatDuration } from '../../services/youtube';
import { RepeatModeSelector } from './RepeatModeSelector';
import { AudioVisualizer } from './AudioVisualizer';
import { CircularVisualizer } from '../visualizer/CircularVisualizer';

export const FullPlayer: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackMode,
    queue,
    showFullPlayer,
    isVideoVisible,
    error,
    setShowFullPlayer,
    setShowQueueModal,
    setIsVideoVisible,
    togglePlay,
    seekTo,
    setVolume,
    toggleMute,
    nextSong,
    prevSong,
    setPlaybackMode,
  } = usePlayer();

  const { toggleFavorite, openAddToPlaylistModal, addToast, settings } = useLibrary();

  if (!showFullPlayer || !currentSong) return null;

  const isShuffleActive = playbackMode === 'shuffle';

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekTo(parseFloat(e.target.value));
  };

  const handleShare = () => {
    const url = `https://www.youtube.com/watch?v=${currentSong.youtubeId}`;
    navigator.clipboard.writeText(url);
    addToast('Link Copied', 'YouTube video link copied to clipboard', 'info');
  };

  const toggleShuffle = () => {
    if (isShuffleActive) {
      setPlaybackMode('normal');
    } else {
      setPlaybackMode('shuffle');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="fixed inset-0 z-50 bg-[#060810] flex flex-col justify-between overflow-hidden select-none"
      >
        {/* Ambient dynamic background glow derived from thumbnail and violet atmospheric mesh */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
          <div
            className="absolute -top-1/4 -left-1/4 w-[150vw] h-[150vh] bg-cover bg-center blur-3xl scale-125 transition-all duration-700"
            style={{ backgroundImage: `url(${currentSong.thumbnailUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#060810]/80 via-[#0a0d1a]/88 to-[#060810]/98 backdrop-blur-2xl" />
        </div>

        {/* Top Navbar */}
        <div className="relative z-10 flex items-center justify-between p-4 sm:p-6">
          <button
            onClick={() => setShowFullPlayer(false)}
            className="p-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white transition-colors border border-white/[0.1] backdrop-blur-md"
            title="Minimize player (Esc)"
            aria-label="Minimize player"
          >
            <ChevronDown className="w-6 h-6" />
          </button>

          <div className="text-center px-4">
            <span className="text-[11px] font-semibold text-violet-400 uppercase tracking-widest block flex items-center justify-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-violet-400" />
              <span>PLAYING FROM VIBEBOX</span>
            </span>
            <span className="text-xs text-zinc-400 font-medium">Atmospheric Glass Sound • AAC HD</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white transition-colors border border-white/[0.1] backdrop-blur-md"
              title="Share link"
              aria-label="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => openAddToPlaylistModal(currentSong)}
              className="p-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white transition-colors border border-white/[0.1] backdrop-blur-md"
              title="Add to playlist"
              aria-label="Add to playlist"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Center Area: Circular Visualizer / Video */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-2 sm:p-6 max-w-lg mx-auto w-full min-h-0">
          <div className="relative w-full aspect-square max-w-[270px] sm:max-w-[320px] max-h-[320px] flex items-center justify-center">
            {isVideoVisible ? (
              <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl shadow-black/90 border border-white/10 bg-zinc-900 group">
                <img
                  src={currentSong.thumbnailUrl}
                  alt={currentSong.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                <CircularVisualizer
                  artworkUrl={currentSong.thumbnailUrl}
                  isPlaying={isPlaying}
                  isLoading={isLoading}
                  currentTime={currentTime}
                  duration={duration}
                  songId={currentSong.youtubeId || currentSong.id}
                  title={currentSong.title}
                  artist={currentSong.channel}
                  config={settings?.visualizer}
                  onSeek={seekTo}
                  interactiveProgress={true}
                  className="w-full h-full"
                />
              </div>
            )}

            {/* Video toggle pill */}
            <button
              onClick={() => setIsVideoVisible(!isVideoVisible)}
              className={`absolute bottom-1 right-1 sm:bottom-2 sm:right-2 z-20 px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xl border transition-all ${
                isVideoVisible
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white border-white/20 shadow-lg shadow-indigo-950/60'
                  : 'bg-black/60 hover:bg-black/80 text-zinc-300 hover:text-white border-white/10'
              }`}
            >
              <Video className={`w-3.5 h-3.5 ${isVideoVisible ? 'text-white' : 'text-violet-400'}`} />
              <span>{isVideoVisible ? 'Visualizer' : 'Watch Video (V)'}</span>
            </button>
          </div>

          {/* Track title & artist */}
          <div className="w-full mt-6 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                {currentSong.title}
              </h2>
              <p className="text-sm text-zinc-400 font-medium truncate mt-1">
                {currentSong.channel}
              </p>
            </div>

            <button
              onClick={() => toggleFavorite(currentSong.id)}
              className="p-3 rounded-2xl hover:bg-white/10 text-zinc-400 hover:text-violet-300 transition-colors shrink-0"
              title={currentSong.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              aria-label="Toggle favorite"
            >
              <Heart
                className={`w-6 h-6 ${
                  currentSong.isFavorite ? 'fill-violet-400 text-violet-400' : ''
                }`}
              />
            </button>
          </div>

          {/* Error notice if any */}
          {error && (
            <div className="w-full mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Audio Spectrum Waveform */}
          <div className="w-full h-8 mt-4 px-2">
            <AudioVisualizer barCount={26} className="h-full" />
          </div>

          {/* Progress Bar */}
          <div className="w-full mt-3">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeekChange}
              className="w-full h-1.5 bg-white/20 rounded-full accent-violet-400 cursor-pointer"
              aria-label="Seek track"
            />
            <div className="flex justify-between text-xs font-mono text-zinc-400 mt-2">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="w-full mt-4 flex items-center justify-between px-2">
            <button
              onClick={toggleShuffle}
              className={`p-3 rounded-2xl transition-all relative ${
                isShuffleActive
                  ? 'text-violet-300 bg-violet-500/20 border border-violet-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
              }`}
              title={`Shuffle: ${isShuffleActive ? 'On' : 'Off'} (S)`}
              aria-label="Toggle shuffle"
            >
              <Shuffle className="w-5 h-5" />
            </button>

            <button
              onClick={prevSong}
              className="p-3 rounded-2xl text-zinc-200 hover:text-white transition-transform active:scale-95 hover:scale-110"
              title="Previous song (P)"
              aria-label="Previous song"
            >
              <SkipBack className="w-7 h-7 fill-current" />
            </button>

            <button
              onClick={togglePlay}
              className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white flex items-center justify-center shadow-xl shadow-indigo-950/80 border border-white/20 transform hover:scale-105 active:scale-95 transition-all"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoading ? (
                <Loader2 className="w-7 h-7 animate-spin text-white" />
              ) : isPlaying ? (
                <Pause className="w-7 h-7 fill-white" />
              ) : (
                <Play className="w-7 h-7 fill-white translate-x-0.5" />
              )}
            </button>

            <button
              onClick={nextSong}
              className="p-3 rounded-2xl text-zinc-200 hover:text-white transition-transform active:scale-95 hover:scale-110"
              title="Next song (N)"
              aria-label="Next song"
            >
              <SkipForward className="w-7 h-7 fill-current" />
            </button>

            {/* Repeat Mode Selector */}
            <RepeatModeSelector variant="compact" />
          </div>

          {/* Detailed Repeat Count Bar in Full Player */}
          <div className="mt-4">
            <RepeatModeSelector variant="full" />
          </div>
        </div>

        {/* Bottom Drawer Actions (Volume & Queue) */}
        <div className="relative z-10 flex items-center justify-between p-4 sm:p-6 border-t border-white/[0.08] max-w-lg mx-auto w-full">
          {/* Volume slider */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="text-zinc-400 hover:text-white transition-colors"
              aria-label="Mute toggle (M)"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <div className="w-24 sm:w-28">
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-full accent-violet-400 cursor-pointer"
                aria-label="Volume"
              />
            </div>
          </div>

          {/* Queue toggle */}
          <button
            onClick={() => setShowQueueModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold text-white transition-all border border-white/[0.1] backdrop-blur-md"
          >
            <ListMusic className="w-4 h-4 text-violet-400" />
            <span>Queue ({queue.length})</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
