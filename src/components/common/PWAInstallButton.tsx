import React, { useState } from 'react';
import { Download, Share, PlusSquare, Smartphone, CheckCircle, X, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full' | 'header';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header', className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already running as an installed PWA, hide
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      try {
        await install();
      } finally {
        setIsInstalling(false);
      }
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      {variant === 'header' ? (
        <button
          onClick={handleInstallClick}
          className={`px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 hover:from-violet-600/50 hover:to-fuchsia-600/50 border border-violet-500/40 text-violet-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ${className}`}
          title="Install VIBEBOX App"
        >
          <Download className="w-3.5 h-3.5 text-violet-400 animate-bounce" />
          <span className="hidden sm:inline">Install App</span>
        </button>
      ) : (
        <button
          onClick={handleInstallClick}
          className={`w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/60 border border-white/20 transition-all active:scale-95 ${className}`}
        >
          <Download className="w-4 h-4" />
          <span>Install VIBEBOX as Standalone App</span>
        </button>
      )}

      {/* Installation Instructions Modal (for Android Chrome / iOS / Desktop) */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0e1224] border border-white/15 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-purple-950/50 flex items-center justify-center">
                <img src="/icon.svg" alt="VIBEBOX" className="w-full h-full rounded-2xl" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Install VIBEBOX
                  <Sparkles className="w-4 h-4 text-purple-400" />
                </h3>
                <p className="text-xs text-zinc-400">Install as native full-screen PWA</p>
              </div>
            </div>

            {isIOS ? (
              <div className="space-y-3 my-4 bg-white/[0.03] p-4 rounded-2xl border border-white/5 text-sm text-zinc-300">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">iOS Safari Steps:</p>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-violet-600/30 text-violet-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                  <div className="flex items-center gap-2">
                    <span>Tap the Safari <strong>Share</strong> button</span>
                    <Share className="w-4 h-4 text-blue-400" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-violet-600/30 text-violet-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                  <div className="flex items-center gap-2">
                    <span>Scroll down and tap <strong>Add to Home Screen</strong></span>
                    <PlusSquare className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-violet-600/30 text-violet-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                  <span>Tap <strong>Add</strong> in top right. VIBEBOX is now an installed app!</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 my-4 bg-white/[0.03] p-4 rounded-2xl border border-white/5 text-sm text-zinc-300">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Chrome / Android Steps:</p>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-violet-600/30 text-violet-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                  <span>In Chrome, tap the <strong>three dots menu (⋮)</strong> in the top-right corner.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-violet-600/30 text-violet-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>Tap</span>
                    <span className="px-2 py-0.5 bg-violet-500/20 text-violet-300 rounded font-semibold text-xs border border-violet-500/30">
                      Install app
                    </span>
                    <span>(or "Add to Home screen")</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-violet-600/30 text-violet-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                  <span>Tap <strong>Install</strong>. VIBEBOX will open with its own app icon on your home screen!</span>
                </div>
              </div>
            )}

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowGuide(false)}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors shadow-md"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
