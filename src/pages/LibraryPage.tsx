import React, { useState, useMemo } from 'react';
import {
  Play,
  Shuffle,
  Plus,
  Heart,
  Clock,
  Flame,
  LayoutGrid,
  List,
  ArrowUpDown,
  Music,
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { SongCard } from '../components/songs/SongCard';
import { Song } from '../types';

type LibraryTab = 'all' | 'favorites' | 'recent' | 'popular';
type SortOption = 'date-desc' | 'date-asc' | 'title' | 'channel' | 'plays';

export const LibraryPage: React.FC = () => {
  const { songs, favorites, recentlyPlayed, openAddSongModal } = useLibrary();
  const { playSong } = usePlayer();

  const [activeTab, setActiveTab] = useState<LibraryTab>('all');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Filter songs by tab
  const tabSongs = useMemo(() => {
    switch (activeTab) {
      case 'favorites':
        return favorites;
      case 'recent':
        return recentlyPlayed;
      case 'popular':
        return [...songs].sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
      case 'all':
      default:
        return songs;
    }
  }, [activeTab, songs, favorites, recentlyPlayed]);

  // Sort songs
  const sortedSongs = useMemo(() => {
    const list = [...tabSongs];
    switch (sortOption) {
      case 'date-desc':
        return list.sort((a, b) => b.addedAt - a.addedAt);
      case 'date-asc':
        return list.sort((a, b) => a.addedAt - b.addedAt);
      case 'title':
        return list.sort((a, b) => a.title.localeCompare(b.title));
      case 'channel':
        return list.sort((a, b) => a.channel.localeCompare(b.channel));
      case 'plays':
        return list.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
      default:
        return list;
    }
  }, [tabSongs, sortOption]);

  const handlePlayAll = () => {
    if (sortedSongs.length > 0) {
      playSong(sortedSongs[0], sortedSongs, 0);
    }
  };

  const handleShufflePlay = () => {
    if (sortedSongs.length > 0) {
      const randomIndex = Math.floor(Math.random() * sortedSongs.length);
      playSong(sortedSongs[randomIndex], sortedSongs, randomIndex);
    }
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Header & Quick stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Your Music Library</h2>
          <p className="text-xs text-zinc-400 mt-1">
            {songs.length} {songs.length === 1 ? 'song' : 'songs'} saved • {favorites.length} favorites
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {sortedSongs.length > 0 && (
            <>
              <button
                onClick={handlePlayAll}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-950/50 transition-transform active:scale-95 border border-white/15"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Play All</span>
              </button>
              <button
                onClick={handleShufflePlay}
                className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white border border-white/[0.08] transition-colors"
                title="Shuffle play"
              >
                <Shuffle className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            onClick={openAddSongModal}
            className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-violet-300 border border-violet-500/35 text-xs font-semibold flex items-center gap-1.5 transition-colors backdrop-blur-md"
          >
            <Plus className="w-4 h-4" />
            <span>Add Song</span>
          </button>
        </div>
      </div>

      {/* Tabs & Sort Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white/[0.03] rounded-2xl border border-white/[0.08] backdrop-blur-md">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-950/40 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All Songs ({songs.length})
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'favorites'
                ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-950/40 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Heart className="w-3 h-3 fill-current text-violet-300" />
            <span>Favorites ({favorites.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'recent'
                ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-950/40 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Clock className="w-3 h-3 text-violet-300" />
            <span>Recent</span>
          </button>
          <button
            onClick={() => setActiveTab('popular')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'popular'
                ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-950/40 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Flame className="w-3 h-3 text-violet-300" />
            <span>Most Played</span>
          </button>
        </div>

        {/* View mode & Sort controls */}
        <div className="flex items-center gap-2">
          {/* Sort dropdown */}
          <div className="flex items-center gap-1.5 bg-white/[0.04] px-2.5 py-1.5 rounded-xl border border-white/[0.08] text-xs text-zinc-300 backdrop-blur-md">
            <ArrowUpDown className="w-3.5 h-3.5 text-violet-400" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="date-desc" className="bg-[#0e1224]">Recently Added</option>
              <option value="date-asc" className="bg-[#0e1224]">Oldest First</option>
              <option value="title" className="bg-[#0e1224]">Title (A-Z)</option>
              <option value="channel" className="bg-[#0e1224]">Artist/Channel</option>
              <option value="plays" className="bg-[#0e1224]">Most Played</option>
            </select>
          </div>

          {/* View mode toggles */}
          <div className="flex items-center p-1 bg-white/[0.04] rounded-xl border border-white/[0.08] backdrop-blur-md">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-violet-500/20 text-violet-300'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-violet-500/20 text-violet-300'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Songs Display */}
      {sortedSongs.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-white/[0.03] rounded-3xl border border-white/[0.08] backdrop-blur-md">
          <Music className="w-12 h-12 text-violet-400/60 mx-auto" />
          <h3 className="text-base font-bold text-white">No tracks in this view</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {activeTab === 'favorites'
              ? 'Click the heart icon on any song to add it to your favorites list.'
              : 'Add YouTube videos or paste music links to build your collection.'}
          </p>
          <button
            onClick={openAddSongModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-950/50"
          >
            Add Track
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
          {sortedSongs.map((song) => (
            <SongCard key={song.id} song={song} contextList={sortedSongs} variant="grid" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
          {sortedSongs.map((song, idx) => (
            <SongCard
              key={song.id}
              song={song}
              contextList={sortedSongs}
              variant="list"
              index={idx}
            />
          ))}
        </div>
      )}
    </div>
  );
};
