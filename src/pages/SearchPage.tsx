import React, { useMemo } from 'react';
import { Search, X, Music, Clock, Trash2 } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { SongCard } from '../components/songs/SongCard';
import { PlaylistCard } from '../components/playlists/PlaylistCard';

export const SearchPage: React.FC = () => {
  const {
    songs,
    playlists,
    searchQuery,
    setSearchQuery,
    searchFilter,
    setSearchFilter,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
  } = useLibrary();

  const queryTrimmed = searchQuery.trim().toLowerCase();

  // Filtered songs
  const matchedSongs = useMemo(() => {
    if (!queryTrimmed) return [];
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(queryTrimmed) ||
        s.channel.toLowerCase().includes(queryTrimmed)
    );
  }, [songs, queryTrimmed]);

  // Filtered playlists
  const matchedPlaylists = useMemo(() => {
    if (!queryTrimmed) return [];
    return playlists.filter(
      (p) =>
        p.name.toLowerCase().includes(queryTrimmed) ||
        (p.description && p.description.toLowerCase().includes(queryTrimmed))
    );
  }, [playlists, queryTrimmed]);

  const handleQueryChange = (val: string) => {
    setSearchQuery(val);
    if (val.trim().length > 2) {
      addRecentSearch(val.trim());
    }
  };

  const handleSelectRecent = (term: string) => {
    setSearchQuery(term);
  };

  const quickTags = ['Lofi', 'Chill', 'Synthwave', 'Ambient', 'Jazz', 'Beats', 'Piano'];

  return (
    <div className="space-y-8 pb-28">
      {/* Search Input Bar */}
      <div className="space-y-4">
        <div className="relative flex items-center">
          <div className="absolute left-4 text-zinc-400 pointer-events-none">
            <Search className="w-5 h-5 text-violet-400" />
          </div>
          <input
            id="main-search-input"
            type="text"
            placeholder="Search by song title, artist, YouTube channel, or playlist..."
            value={searchQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.12] rounded-2xl pl-12 pr-12 py-3.5 text-base text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all shadow-xl backdrop-blur-xl"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.08] transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills & Quick Tags */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-white/[0.03] rounded-xl border border-white/[0.08] backdrop-blur-md">
            {(['all', 'songs', 'playlists'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSearchFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  searchFilter === filter
                    ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-950/40 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs text-zinc-400">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold mr-1">
              Suggestions:
            </span>
            {quickTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleSelectRecent(tag)}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] hover:text-violet-300 border border-white/[0.08] transition-colors backdrop-blur-md"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Content */}
      {queryTrimmed ? (
        <div className="space-y-8">
          {/* Matched Songs */}
          {(searchFilter === 'all' || searchFilter === 'songs') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
                  Songs ({matchedSongs.length})
                </h3>
              </div>

              {matchedSongs.length === 0 ? (
                <p className="text-xs text-zinc-500 italic py-2">No matching songs found</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {matchedSongs.map((song, idx) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      contextList={matchedSongs}
                      variant="list"
                      index={idx}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Matched Playlists */}
          {(searchFilter === 'all' || searchFilter === 'playlists') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
                  Playlists ({matchedPlaylists.length})
                </h3>
              </div>

              {matchedPlaylists.length === 0 ? (
                <p className="text-xs text-zinc-500 italic py-2">No matching playlists found</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                  {matchedPlaylists.map((pl) => (
                    <PlaylistCard key={pl.id} playlist={pl} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* If completely empty */}
          {matchedSongs.length === 0 && matchedPlaylists.length === 0 && (
            <div className="py-16 text-center space-y-3">
              <Music className="w-12 h-12 text-zinc-600 mx-auto" />
              <h4 className="text-base font-bold text-white">No results found for "{searchQuery}"</h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Try searching with a different keyword, artist channel name, or check your spelling.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Empty Query State with Recent Searches */
        <div className="space-y-6 pt-4">
          {recentSearches.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                  <Clock className="w-3.5 h-3.5 text-violet-400" />
                  <span>Recent Searches</span>
                </div>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-zinc-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleSelectRecent(term)}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-zinc-200 hover:text-violet-300 border border-white/[0.08] transition-colors backdrop-blur-md"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="py-12 text-center space-y-3 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-3xl bg-white/[0.04] border border-white/[0.1] flex items-center justify-center text-violet-400 mx-auto shadow-xl backdrop-blur-xl">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Search Your Saved Music</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Find any song in your library by title, artist, YouTube channel, or playlist.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
