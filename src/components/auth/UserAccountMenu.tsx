import React, { useState, useRef, useEffect } from 'react';
import { User as UserIcon, LogIn, LogOut, Settings, Sparkles, ShieldCheck, Crown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLibrary } from '../../context/LibraryContext';

interface UserAccountMenuProps {
  variant?: 'compact' | 'full';
}

export const UserAccountMenu: React.FC<UserAccountMenuProps> = ({ variant = 'compact' }) => {
  const { user, profile, role, isAdmin, signOut, openAuthModal, isLoading } = useAuth();
  const { setActivePage, addToast } = useLibrary();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    addToast('Signed Out', 'You have been signed out.', 'info');
  };

  const displayName =
    profile?.full_name ||
    profile?.username ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.username ||
    user?.email?.split('@')[0] ||
    'Listener';

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const initial = displayName.charAt(0).toUpperCase() || 'U';

  if (isLoading) {
    return (
      <div className="w-8 h-8 rounded-xl bg-white/[0.05] animate-pulse border border-white/[0.08]" />
    );
  }

  // Not logged in state
  if (!user) {
    if (variant === 'full') {
      return (
        <button
          onClick={() => openAuthModal('login')}
          className="w-full py-2.5 px-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 hover:text-white border border-white/[0.08] text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <LogIn className="w-3.5 h-3.5 text-violet-400" />
          <span>Sign In / Join</span>
        </button>
      );
    }

    return (
      <button
        onClick={() => openAuthModal('login')}
        className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 hover:text-white border border-white/[0.1] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
      >
        <LogIn className="w-3.5 h-3.5 text-violet-400" />
        <span className="hidden sm:inline">Sign In</span>
      </button>
    );
  }

  // Logged in state
  return (
    <div className="relative" ref={menuRef}>
      {variant === 'full' ? (
        <div
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-full flex items-center gap-2.5 p-2 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] cursor-pointer transition-all group"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-8 h-8 rounded-xl object-cover border border-white/20"
            />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-xs shadow-md border border-white/20">
              {initial}
            </div>
          )}
          <div className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold text-white truncate group-hover:text-violet-300 transition-colors">
                {displayName}
              </p>
              {isAdmin ? (
                <span className="px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-extrabold uppercase">
                  Admin
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[9px] font-semibold uppercase">
                  User
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
          </div>
          <Sparkles className="w-3.5 h-3.5 text-violet-400/70 shrink-0" />
        </div>
      ) : (
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center gap-2 transition-all"
          title={`Signed in as ${displayName} (${isAdmin ? 'Admin' : 'User'})`}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-7 h-7 rounded-lg object-cover border border-white/20"
            />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-xs shadow-md border border-white/20">
              {initial}
            </div>
          )}
          <span className="hidden md:inline text-xs font-semibold text-zinc-200 pr-1.5 max-w-[100px] truncate">
            {displayName}
          </span>
          {isAdmin && (
            <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0 hidden sm:block mr-1" />
          )}
        </button>
      )}

      {/* Dropdown Menu */}
      {menuOpen && (
        <div className="absolute right-0 bottom-full md:bottom-auto md:top-full mt-2 mb-2 w-60 p-1.5 rounded-2xl bg-[#0e101a] border border-white/[0.12] shadow-2xl shadow-black/80 backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2.5 border-b border-white/[0.06] mb-1 space-y-1">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-xs font-bold text-white truncate">{displayName}</span>
              {isAdmin ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Crown className="w-2.5 h-2.5" />
                  ADMIN
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  USER
                </span>
              )}
            </div>
            {profile?.username && (
              <p className="text-[11px] text-violet-400 font-mono">@{profile.username}</p>
            )}
            <p className="text-[10px] text-zinc-400 truncate">{user.email}</p>
          </div>

          <button
            onClick={() => {
              setMenuOpen(false);
              setActivePage('settings');
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-zinc-400" />
            <span>Account & Sync Settings</span>
          </button>

          <div className="h-px bg-white/[0.06] my-1" />

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      )}
    </div>
  );
};
