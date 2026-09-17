import React from 'react';
import {
  Play,
  Pause,
  Sparkles,
  Plus,
  Heart,
  Clock,
  ListMusic,
  ArrowRight,
  Music2,
  Radio,
  Maximize2,
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { SongCard } from '../components/songs/SongCard';
import { PlaylistCard } from '../components/playlists/PlaylistCard';

export const HomePage: React.FC = () => {
  const {
    songs,
    playlists,
    recentlyPlayed,
    favorites,
    setActivePage,
    openAddSongModal,
    openCreatePlaylistModal,
  } = useLibrary();

  const {
    currentSong,
    isPlaying,
    togglePlay,
    playSong,
    setShowFullPlayer,
  } = usePlayer();

  // Sort songs by addedAt descending for "Recently Added"
  const recentlyAdded = [...songs].sort((a, b) => b.addedAt - a.addedAt).slice(0, 6);

  // Determine top song to show in "Continue Listening / Active Track" banner
  const heroTrack = currentSong || (recentlyPlayed.length > 0 ? recentlyPlayed[0] : songs[0]);

  // Time of day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handlePlayAllFavorites = () => {
    if (favorites.length > 0) {
      playSong(favorites[0], favorites, 0);
    }
  };

  const handlePlayAllRecentlyPlayed = () => {
    if (recentlyPlayed.length > 0) {
      playSong(recentlyPlayed[0], recentlyPlayed, 0);
    }
  };

  return (
    <div className="space-y-10 pb-28 md:pb-28">
      {/* Hero Welcome Banner & Continue Listening Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Welcome Section */}
        <div className="lg:col-span-2 relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#131730]/90 via-[#0e1226]/90 to-[#090b18]/95 border border-white/[0.10] p-6 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col justify-between">
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span>Personal YouTube Music Hub</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {getGreeting()}, welcome to <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-violet-300 bg-clip-text text-transparent">VIBEBOX</span>
            </h2>

            <p className="text-sm text-zinc-300 leading-relaxed max-w-xl font-normal">
              Your personal audio oasis. Add your favorite YouTube songs, lofi streams, and OSTs,
              organize custom playlists, and enjoy seamless playback.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-3 pt-6">
            <button
              onClick={openAddSongModal}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-950/60 transition-transform active:scale-95 border border-white/20"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add YouTube Track</span>
            </button>

            {favorites.length > 0 && (
              <button
                onClick={handlePlayAllFavorites}
                className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 hover:text-white font-semibold text-xs flex items-center gap-2 border border-white/[0.10] transition-colors backdrop-blur-md"
              >
                <Play className="w-3.5 h-3.5 fill-current text-violet-400" />
                <span>Play Favorites ({favorites.length})</span>
              </button>
            )}
          </div>

          {/* Ambient subtle glow */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Dynamic Now Playing / Continue Listening Card */}
        {heroTrack && (
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#161a35]/90 to-[#0e1124]/95 border border-white/[0.10] p-5 sm:p-6 shadow-2xl backdrop-blur-xl flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  {currentSong ? 'Now Playing' : 'Continue Listening'}
                </span>
                {currentSong && isPlaying && (
                  <div className="flex items-end gap-1 h-3.5">
                    <span className="w-1 bg-violet-400 rounded-full animate-eq-1" />
                    <span className="w-1 bg-indigo-400 rounded-full animate-eq-2" />
                    <span className="w-1 bg-fuchsia-400 rounded-full animate-eq-3" />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3.5">
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 shadow-md bg-zinc-800 border border-white/10">
                  <img
                    src={heroTrack.thumbnailUrl}
                    alt={heroTrack.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {currentSong && (
                    <div
                      onClick={() => setShowFullPlayer(true)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity"
                      title="Expand Player"
                    >
                      <Maximize2 className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h4
                    onClick={() => {
                      if (currentSong) setShowFullPlayer(true);
                      else playSong(heroTrack, recentlyPlayed.length > 0 ? recentlyPlayed : songs);
                    }}
                    className="text-sm font-bold text-white truncate cursor-pointer hover:text-violet-300 transition-colors"
                  >
                    {heroTrack.title}
                  </h4>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">{heroTrack.channel}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-5 border-t border-white/[0.08] mt-4">
              <button
                onClick={() => {
                  if (currentSong?.id === heroTrack.id) {
                    togglePlay();
                  } else {
                    playSong(heroTrack, recentlyPlayed.length > 0 ? recentlyPlayed : songs);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50 transition-all active:scale-95 border border-white/15"
              >
                {currentSong?.id === heroTrack.id && isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current translate-x-0.5" />
                    <span>{currentSong?.id === heroTrack.id ? 'Resume' : 'Play Track'}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setActivePage('library')}
                className="px-3.5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-zinc-300 hover:text-white border border-white/[0.08] transition-colors"
              >
                Library
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 1. Recently Played Section */}
      {recentlyPlayed.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-violet-400" />
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Recently Played
              </h3>
            </div>
            {recentlyPlayed.length > 1 && (
              <button
                onClick={handlePlayAllRecentlyPlayed}
                className="text-xs font-semibold text-zinc-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
              >
                <span>Play All</span>
                <Play className="w-3 h-3 fill-current" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {recentlyPlayed.slice(0, 6).map((song) => (
              <SongCard key={`recent-${song.id}`} song={song} contextList={recentlyPlayed} />
            ))}
          </div>
        </section>
      )}

      {/* 2. Your Favorites Section */}
      {favorites.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Heart className="w-4 h-4 text-violet-400 fill-violet-400/20" />
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Your Favorites
              </h3>
            </div>
            <button
              onClick={() => setActivePage('library')}
              className="text-xs font-semibold text-zinc-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
            >
              <span>See All ({favorites.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            {favorites.slice(0, 6).map((song, idx) => (
              <SongCard
                key={`fav-${song.id}`}
                song={song}
                contextList={favorites}
                variant="list"
                index={idx}
              />
            ))}
          </div>
        </section>
      )}

      {/* 3. Your Playlists Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ListMusic className="w-4 h-4 text-violet-400" />
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Your Playlists
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => openCreatePlaylistModal()}
              className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Playlist</span>
            </button>
            <button
              onClick={() => setActivePage('playlists')}
              className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {playlists.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/[0.08] text-center space-y-2 backdrop-blur-md">
            <p className="text-sm font-medium text-zinc-300">No playlists yet</p>
            <p className="text-xs text-zinc-500">
              Create your first playlist to organize your favorite tracks.
            </p>
            <button
              onClick={() => openCreatePlaylistModal()}
              className="mt-2 px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold text-white transition-colors inline-flex items-center gap-1.5 border border-white/10"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Playlist</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {playlists.slice(0, 5).map((pl) => (
              <PlaylistCard key={pl.id} playlist={pl} />
            ))}
          </div>
        )}
      </section>

      {/* 4. Recently Added Songs Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Music2 className="w-4 h-4 text-violet-400" />
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Recently Added
            </h3>
          </div>
          <button
            onClick={() => setActivePage('library')}
            className="text-xs font-semibold text-zinc-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
          >
            <span>All Songs ({songs.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {songs.length === 0 ? (
          <div className="p-10 rounded-3xl bg-white/[0.03] border border-white/[0.08] text-center space-y-3 backdrop-blur-md">
            <Music2 className="w-10 h-10 text-violet-400/60 mx-auto" />
            <h4 className="text-sm font-bold text-white">No songs yet</h4>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Add your first YouTube song to start building your library.
            </p>
            <button
              onClick={openAddSongModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-950/50"
            >
              Add First Song
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            {recentlyAdded.map((song, idx) => (
              <SongCard
                key={`recent-add-${song.id}`}
                song={song}
                contextList={recentlyAdded}
                variant="list"
                index={idx}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
