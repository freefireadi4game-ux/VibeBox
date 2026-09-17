import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Heart, MoreVertical, Plus, ListPlus, Trash2, ExternalLink } from 'lucide-react';
import { Song } from '../../types';
import { usePlayer } from '../../context/PlayerContext';
import { useLibrary } from '../../context/LibraryContext';
import { formatDuration } from '../../services/youtube';

interface SongCardProps {
  song: Song;
  contextList?: Song[];
  variant?: 'grid' | 'list' | 'compact';
  index?: number;
  onRemoveFromPlaylist?: () => void;
}

export const SongCard: React.FC<SongCardProps> = ({
  song,
  contextList,
  variant = 'grid',
  index,
  onRemoveFromPlaylist,
}) => {
  const { currentSong, isPlaying, playSong, togglePlay, addToQueue } = usePlayer();
  const { toggleFavorite, deleteSong, openAddToPlaylistModal, addToast } = useLibrary();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isCurrentSong = currentSong?.id === song.id;
  const isCurrentlyPlaying = isCurrentSong && isPlaying;

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrentSong) {
      togglePlay();
    } else {
      playSong(song, contextList);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(song.id);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://www.youtube.com/watch?v=${song.youtubeId}`);
    addToast('Link Copied', 'YouTube video URL copied to clipboard', 'info');
    setMenuOpen(false);
  };

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  if (variant === 'list' || variant === 'compact') {
    return (
      <div
        onClick={handlePlayClick}
        className={`group relative flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl transition-all duration-200 cursor-pointer select-none ${
          isCurrentSong
            ? 'bg-gradient-to-r from-violet-500/20 via-indigo-500/10 to-white/[0.02] border border-violet-500/35 text-violet-200 shadow-lg shadow-violet-950/30 backdrop-blur-md'
            : 'bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/[0.16] text-zinc-100 shadow-sm backdrop-blur-md'
        }`}
      >
        {/* Index number or equalizer */}
        {index !== undefined && (
          <div className="w-5 text-center font-mono text-xs text-zinc-500 shrink-0">
            {isCurrentlyPlaying ? (
              <div className="flex items-end justify-center gap-0.5 h-3">
                <span className="w-0.5 bg-violet-400 rounded-full animate-eq-1" />
                <span className="w-0.5 bg-indigo-400 rounded-full animate-eq-2" />
                <span className="w-0.5 bg-fuchsia-400 rounded-full animate-eq-3" />
              </div>
            ) : (
              <span>{index + 1}</span>
            )}
          </div>
        )}

        {/* Thumbnail & Play button */}
        <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 bg-zinc-800 border border-white/10 shadow-sm">
          <img
            src={song.thumbnailUrl}
            alt={song.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <div
            className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
              isCurrentlyPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            {isCurrentlyPlaying ? (
              <Pause className="w-4 h-4 fill-violet-400 text-violet-400" />
            ) : (
              <Play className="w-4 h-4 fill-white text-white translate-x-0.5" />
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-semibold truncate ${
              isCurrentSong ? 'text-violet-300' : 'text-zinc-100 group-hover:text-white'
            }`}
          >
            {song.title}
          </p>
          <p className="text-xs text-zinc-400 truncate mt-0.5">{song.channel}</p>
        </div>

        {/* Duration */}
        <span className="text-xs font-mono text-zinc-400 hidden sm:block shrink-0">
          {formatDuration(song.duration)}
        </span>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleFavoriteClick}
            className={`p-1.5 rounded-lg transition-colors ${
              song.isFavorite
                ? 'text-violet-400 hover:text-violet-300'
                : 'text-zinc-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100'
            }`}
            title={song.isFavorite ? 'Remove from Favorites (F)' : 'Add to Favorites (F)'}
            aria-label="Toggle favorite"
          >
            <Heart className={`w-4 h-4 ${song.isFavorite ? 'fill-violet-400' : ''}`} />
          </button>

          {/* More options menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-white/[0.08] transition-colors"
              aria-label="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#0d1020]/95 border border-white/[0.12] rounded-2xl shadow-2xl py-1.5 z-30 text-xs text-zinc-200 backdrop-blur-2xl">
                <button
                  onClick={() => {
                    addToQueue(song, true);
                    addToast('Playing Next', `"${song.title}" queued as next`, 'success');
                    setMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-white/[0.08] hover:text-violet-300 transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Play Next</span>
                </button>
                <button
                  onClick={() => {
                    addToQueue(song, false);
                    addToast('Added to Queue', `"${song.title}" added to play queue`, 'success');
                    setMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-white/[0.08] hover:text-violet-300 transition-colors"
                >
                  <ListPlus className="w-3.5 h-3.5" />
                  <span>Add to Queue</span>
                </button>
                <button
                  onClick={() => {
                    openAddToPlaylistModal(song);
                    setMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-white/[0.08] hover:text-violet-300 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Playlist</span>
                </button>
                <button
                  onClick={handleCopyLink}
                  className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-white/[0.08] hover:text-indigo-300 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Copy YouTube URL</span>
                </button>

                {onRemoveFromPlaylist ? (
                  <button
                    onClick={() => {
                      onRemoveFromPlaylist();
                      setMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-rose-500/20 text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove from Playlist</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      deleteSong(song.id);
                      setMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-rose-500/20 text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete from Library</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Grid Card representation
  return (
    <div
      onClick={handlePlayClick}
      className={`group relative p-3.5 rounded-3xl transition-all duration-200 cursor-pointer select-none border backdrop-blur-md ${
        isCurrentSong
          ? 'bg-gradient-to-b from-[#181c34]/90 to-[#0f1224]/95 border-violet-500/40 shadow-2xl shadow-violet-950/40'
          : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.06] hover:border-white/[0.16] hover:shadow-2xl hover:shadow-black/70'
      }`}
    >
      {/* Artwork container */}
      <div className="relative aspect-video sm:aspect-square w-full rounded-2xl overflow-hidden bg-zinc-800 mb-3 border border-white/10 shadow-sm">
        <img
          src={song.thumbnailUrl}
          alt={song.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Equalizer indicator if playing */}
        {isCurrentlyPlaying && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/70 backdrop-blur-md border border-violet-500/40 flex items-center gap-1 shadow-sm">
            <span className="w-1 h-3 bg-violet-400 rounded-full animate-eq-1" />
            <span className="w-1 h-3 bg-indigo-400 rounded-full animate-eq-2" />
            <span className="w-1 h-3 bg-fuchsia-400 rounded-full animate-eq-3" />
          </div>
        )}

        {/* Duration pill badge */}
        {song.duration > 0 && (
          <span className="absolute bottom-2 right-2 px-2 py-0.5 text-[10px] font-mono font-medium rounded-lg bg-black/75 text-zinc-200 backdrop-blur-md border border-white/10">
            {formatDuration(song.duration)}
          </span>
        )}

        {/* Hover play overlay */}
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center transition-all duration-200 ${
            isCurrentlyPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white flex items-center justify-center shadow-xl shadow-indigo-950/70 border border-white/20 transform group-hover:scale-105 transition-transform">
            {isCurrentlyPlaying ? (
              <Pause className="w-5 h-5 fill-white" />
            ) : (
              <Play className="w-5 h-5 fill-white translate-x-0.5" />
            )}
          </div>
        </div>

        {/* Favorite quick toggle button */}
        <button
          onClick={handleFavoriteClick}
          className={`absolute top-2 right-2 p-2 rounded-xl backdrop-blur-md transition-all ${
            song.isFavorite
              ? 'bg-violet-950/90 text-violet-400 border border-violet-500/40 shadow-sm'
              : 'bg-black/60 text-white/80 hover:text-white opacity-0 group-hover:opacity-100 hover:scale-105 border border-white/10'
          }`}
          title={song.isFavorite ? 'Favorited' : 'Favorite (F)'}
        >
          <Heart className={`w-3.5 h-3.5 ${song.isFavorite ? 'fill-violet-400' : ''}`} />
        </button>
      </div>

      {/* Info & Menu */}
      <div className="flex items-start justify-between gap-1.5 px-0.5">
        <div className="min-w-0 flex-1">
          <h3
            className={`text-sm font-semibold truncate leading-snug ${
              isCurrentSong ? 'text-violet-300' : 'text-zinc-100 group-hover:text-white'
            }`}
            title={song.title}
          >
            {song.title}
          </h3>
          <p className="text-xs text-zinc-400 truncate mt-1">{song.channel}</p>
        </div>

        {/* Options trigger */}
        <div className="relative shrink-0" ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-xl hover:bg-white/[0.08] transition-colors"
            aria-label="More options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 bottom-full mb-2 w-48 bg-[#0d1020]/95 border border-white/[0.12] rounded-2xl shadow-2xl py-1.5 z-30 text-xs text-zinc-200 backdrop-blur-2xl">
              <button
                onClick={() => {
                  addToQueue(song, true);
                  addToast('Playing Next', `"${song.title}" queued as next`, 'success');
                  setMenuOpen(false);
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-white/[0.08] hover:text-violet-300 transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Play Next</span>
              </button>
              <button
                onClick={() => {
                  addToQueue(song, false);
                  addToast('Added to Queue', `"${song.title}" added to play queue`, 'success');
                  setMenuOpen(false);
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-white/[0.08] hover:text-violet-300 transition-colors"
              >
                <ListPlus className="w-3.5 h-3.5" />
                <span>Add to Queue</span>
              </button>
              <button
                onClick={() => {
                  openAddToPlaylistModal(song);
                  setMenuOpen(false);
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-white/[0.08] hover:text-violet-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add to Playlist</span>
              </button>
              <button
                onClick={handleCopyLink}
                className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-white/[0.08] hover:text-indigo-300 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Copy YouTube URL</span>
              </button>
              <button
                onClick={() => {
                  deleteSong(song.id);
                  setMenuOpen(false);
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-rose-500/20 text-rose-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete from Library</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
