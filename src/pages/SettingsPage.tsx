import React, { useState, useRef } from 'react';
import {
  Moon,
  Volume2,
  Download,
  Upload,
  Trash2,
  Clock,
  ShieldCheck,
  Palette,
  PlaySquare,
  AlertTriangle,
  FileJson,
  Check,
  Repeat,
  Activity,
  Smartphone,
  Radio,
  Cloud,
  RefreshCw,
  CheckCircle2,
  WifiOff,
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { PWAInstallButton } from '../components/common/PWAInstallButton';
import { ThemeName } from '../types';
import { DEFAULT_VISUALIZER_CONFIG } from '../components/visualizer/visualizerTypes';

export const SettingsPage: React.FC = () => {
  const {
    settings,
    updateSettings,
    clearRecentlyPlayed,
    clearAllData,
    exportLibrary,
    importLibrary,
    songs,
    playlists,
    cloudSyncStatus,
    isCloudConnected,
    syncWithCloud,
  } = useLibrary();

  const { isVideoVisible, setIsVideoVisible, playbackMode, setPlaybackMode } = usePlayer();

  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await syncWithCloud(true);
    setIsSyncing(false);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        importLibrary(content);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const themes: { id: ThemeName; label: string; bg: string; border: string }[] = [
    { id: 'graphite', label: 'Obsidian Graphite', bg: 'bg-[#121622]', border: 'border-violet-500' },
    { id: 'midnight', label: 'Midnight Blue', bg: 'bg-[#070b14]', border: 'border-blue-500' },
    { id: 'oled', label: 'Pure OLED Black', bg: 'bg-black', border: 'border-zinc-500' },
    { id: 'cyber', label: 'Cyber Violet', bg: 'bg-[#0d0714]', border: 'border-purple-500' },
  ];

  return (
    <div className="max-w-3xl space-y-8 pb-32">
      {/* Header */}
      <div className="pb-4 border-b border-white/[0.08]">
        <h2 className="text-2xl font-bold text-white tracking-tight">App Settings</h2>
        <p className="text-xs text-zinc-400 mt-1">
          Customize your playback, theme aesthetics, and backup your personal music library.
        </p>
      </div>

      {/* 1. Theme Preferences */}
      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/[0.08] space-y-4 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/15 text-violet-300 border border-violet-500/20">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Appearance & Atmosphere</h3>
            <p className="text-xs text-zinc-400">Select your preferred dark visual theme.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {themes.map((t) => {
            const isSelected = settings.theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => updateSettings({ theme: t.id })}
                className={`p-4 rounded-2xl border text-left transition-all relative ${t.bg} ${
                  isSelected
                    ? 'border-violet-500 ring-2 ring-violet-500/30 shadow-lg shadow-violet-950/40'
                    : 'border-white/[0.06] hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-4 h-4 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center">
                    {isSelected && <div className="w-2 h-2 rounded-full bg-violet-400" />}
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-violet-400" />}
                </div>
                <p className="text-xs font-semibold text-zinc-200">{t.label}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Playback Behavior */}
      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/[0.08] space-y-5 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
            <PlaySquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Playback Settings</h3>
            <p className="text-xs text-zinc-400">Configure queue transition and video preferences.</p>
          </div>
        </div>

        <div className="space-y-4 pt-1">
          {/* Autoplay Next */}
          <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
            <div>
              <p className="text-xs font-semibold text-zinc-200">Continuous Queue Playback</p>
              <p className="text-[11px] text-zinc-400">
                Automatically proceed to the next track when a song finishes.
              </p>
            </div>
            <button
              onClick={() => updateSettings({ autoplayNext: !settings.autoplayNext })}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                settings.autoplayNext ? 'bg-gradient-to-r from-indigo-500 to-violet-600 shadow-md shadow-indigo-950/50' : 'bg-white/10'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.autoplayNext ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Show Video Dock */}
          <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
            <div>
              <p className="text-xs font-semibold text-zinc-200">YouTube Video Picture-in-Picture</p>
              <p className="text-[11px] text-zinc-400">
                Show official YouTube video window alongside audio playback.
              </p>
            </div>
            <button
              onClick={() => setIsVideoVisible(!isVideoVisible)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                isVideoVisible ? 'bg-gradient-to-r from-indigo-500 to-violet-600 shadow-md shadow-indigo-950/50' : 'bg-white/10'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  isVideoVisible ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Current Playback Mode Quick Select */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-xs font-semibold text-zinc-200">Default Playback Mode</p>
              <p className="text-[11px] text-zinc-400">
                Current active playback engine behavior.
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-violet-500/20 text-violet-300 font-bold text-xs uppercase tracking-wider border border-violet-500/30">
              {playbackMode}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Circular Visualizer Settings */}
      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/[0.08] space-y-5 shadow-xl backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Circular Music Visualizer</h3>
              <p className="text-xs text-zinc-400">
                Configure radial audio spectrum bars and rhythm animations.
              </p>
            </div>
          </div>

          {/* Master Visualizer ON / OFF Toggle */}
          <button
            onClick={() =>
              updateSettings({
                visualizer: {
                  ...DEFAULT_VISUALIZER_CONFIG,
                  ...settings.visualizer,
                  enabled: !(settings.visualizer?.enabled ?? true),
                },
              })
            }
            className={`w-11 h-6 rounded-full transition-colors relative ${
              (settings.visualizer?.enabled ?? true) ? 'bg-gradient-to-r from-indigo-500 to-violet-600 shadow-md shadow-indigo-950/50' : 'bg-white/10'
            }`}
            title="Toggle Visualizer"
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                (settings.visualizer?.enabled ?? true) ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {(settings.visualizer?.enabled ?? true) && (
          <div className="space-y-4 pt-1">
            {/* Visualizer Style */}
            <div className="py-2 border-b border-white/[0.06]">
              <label className="text-xs font-semibold text-zinc-200 block mb-2">Visualizer Style</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'spectrum', label: 'Circular Spectrum' },
                  { id: 'ring', label: 'Minimal Ring' },
                  { id: 'ambient', label: 'Ambient Pulse' },
                ].map((st) => {
                  const isSelected = (settings.visualizer?.style ?? 'spectrum') === st.id;
                  return (
                    <button
                      key={st.id}
                      onClick={() =>
                        updateSettings({
                          visualizer: {
                            ...DEFAULT_VISUALIZER_CONFIG,
                            ...settings.visualizer,
                            style: st.id as any,
                          },
                        })
                      }
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-violet-500/25 text-violet-200 border border-violet-500/40 shadow-sm'
                          : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/[0.06]'
                      }`}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Intensity */}
            <div className="py-2 border-b border-white/[0.06]">
              <label className="text-xs font-semibold text-zinc-200 block mb-2">Intensity</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'low', label: 'Low' },
                  { id: 'medium', label: 'Medium' },
                  { id: 'high', label: 'High' },
                ].map((int) => {
                  const isSelected = (settings.visualizer?.intensity ?? 'medium') === int.id;
                  return (
                    <button
                      key={int.id}
                      onClick={() =>
                        updateSettings({
                          visualizer: {
                            ...DEFAULT_VISUALIZER_CONFIG,
                            ...settings.visualizer,
                            intensity: int.id as any,
                          },
                        })
                      }
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-violet-500/25 text-violet-200 border border-violet-500/40 shadow-sm'
                          : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/[0.06]'
                      }`}
                    >
                      {int.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Spike Count */}
            <div className="py-2 border-b border-white/[0.06]">
              <label className="text-xs font-semibold text-zinc-200 block mb-2">Spike Count</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'auto', label: 'Auto' },
                  { id: 'low', label: 'Low (96)' },
                  { id: 'high', label: 'High (160)' },
                ].map((sp) => {
                  const isSelected = (settings.visualizer?.spikeCount ?? 'auto') === sp.id;
                  return (
                    <button
                      key={sp.id}
                      onClick={() =>
                        updateSettings({
                          visualizer: {
                            ...DEFAULT_VISUALIZER_CONFIG,
                            ...settings.visualizer,
                            spikeCount: sp.id as any,
                          },
                        })
                      }
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-violet-500/25 text-violet-200 border border-violet-500/40 shadow-sm'
                          : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/[0.06]'
                      }`}
                    >
                      {sp.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ambient Glow */}
            <div className="py-2">
              <label className="text-xs font-semibold text-zinc-200 block mb-2">Ambient Glow</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'off', label: 'Off' },
                  { id: 'subtle', label: 'Subtle' },
                  { id: 'dynamic', label: 'Dynamic' },
                ].map((gl) => {
                  const isSelected = (settings.visualizer?.ambientGlow ?? 'dynamic') === gl.id;
                  return (
                    <button
                      key={gl.id}
                      onClick={() =>
                        updateSettings({
                          visualizer: {
                            ...DEFAULT_VISUALIZER_CONFIG,
                            ...settings.visualizer,
                            ambientGlow: gl.id as any,
                          },
                        })
                      }
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-violet-500/25 text-violet-200 border border-violet-500/40 shadow-sm'
                          : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/[0.06]'
                      }`}
                    >
                      {gl.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cloud Sync with Supabase */}
      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/[0.08] space-y-4 shadow-xl backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-300 border border-blue-500/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Cloud Database Sync (Supabase)</h3>
              <p className="text-xs text-zinc-400">
                Synchronize your songs, playlists, and favorites across devices in real time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cloudSyncStatus === 'synced' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Synced
              </span>
            )}
            {cloudSyncStatus === 'syncing' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                Syncing...
              </span>
            )}
            {cloudSyncStatus === 'offline' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-800 text-zinc-400 border border-white/10">
                <WifiOff className="w-3.5 h-3.5 text-zinc-400" />
                Local Storage
              </span>
            )}
            {cloudSyncStatus === 'error' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Offline Fallback
              </span>
            )}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-black/30 border border-white/[0.05] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <p className="text-zinc-300 font-medium">
                {isCloudConnected
                  ? 'Supabase connection established via public environment keys.'
                  : 'Supabase URL / Publishable Key not detected in environment. Using browser local storage.'}
              </p>
              <p className="text-[11px] text-zinc-500">
                Seamless hybrid storage: instant offline caching with background cloud replication.
              </p>
            </div>

            <button
              onClick={handleManualSync}
              disabled={isSyncing || cloudSyncStatus === 'syncing'}
              className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 hover:text-white border border-white/[0.08] text-xs font-semibold flex items-center justify-center gap-2 transition-all shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Library Backup & Export / Import */}
      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/[0.08] space-y-5 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/15 text-violet-300 border border-violet-500/20">
            <FileJson className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Library Backup (Export & Import)</h3>
            <p className="text-xs text-zinc-400">
              Export your songs and playlists as JSON, or import on any other device.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Export button */}
          <button
            onClick={exportLibrary}
            className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/50 text-left transition-all group flex items-center justify-between shadow-sm hover:bg-white/[0.04]"
          >
            <div>
              <p className="text-xs font-semibold text-zinc-200 group-hover:text-violet-300 transition-colors">
                Export Library as JSON
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Download {songs.length} songs & {playlists.length} playlists
              </p>
            </div>
            <Download className="w-4 h-4 text-zinc-400 group-hover:text-violet-300 transition-colors" />
          </button>

          {/* Import file upload */}
          <label className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/50 text-left transition-all group flex items-center justify-between cursor-pointer shadow-sm hover:bg-white/[0.04]">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div>
              <p className="text-xs font-semibold text-zinc-200 group-hover:text-violet-300 transition-colors">
                Import JSON Backup File
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Select a previously saved .json file</p>
            </div>
            <Upload className="w-4 h-4 text-zinc-400 group-hover:text-violet-300 transition-colors" />
          </label>
        </div>
      </div>

      {/* 4. Data Management & Clean Up */}
      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/[0.08] space-y-4 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/20">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Storage Management</h3>
            <p className="text-xs text-zinc-400">Clear recently played history or reset all data.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={() => setConfirmClearHistory(true)}
            className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors border border-white/[0.08]"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Clear Recently Played</span>
          </button>

          <button
            onClick={() => setConfirmClearAll(true)}
            className="px-4 py-2.5 rounded-xl bg-rose-950/30 hover:bg-rose-900/50 border border-rose-800/40 text-rose-300 text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Clear All Local Data</span>
          </button>
        </div>
      </div>

      {/* 5. Install App as Standalone PWA */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-violet-950/40 via-indigo-950/20 to-black/40 border border-violet-500/20 space-y-4 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/15 text-violet-300 border border-violet-500/20">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Install VIBEBOX App (PWA)</h3>
            <p className="text-xs text-zinc-400">Install as standalone app on Android, iOS, or Desktop.</p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <p className="text-xs text-zinc-300 leading-relaxed">
            Install VIBEBOX on your home screen to launch in true full-screen standalone mode with no browser address bars and fast offline shell caching.
          </p>
          <div className="pt-2">
            <PWAInstallButton variant="full" />
          </div>
        </div>
      </div>

      {/* 6. Background Playback & Lock Screen Controls */}
      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/[0.08] space-y-4 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Media Session & Background Playback</h3>
            <p className="text-xs text-zinc-400">Lock screen controls, hardware keys & Android background playback</p>
          </div>
        </div>

        <div className="space-y-2 text-xs text-zinc-300 leading-relaxed bg-black/20 p-4 rounded-2xl border border-white/[0.05]">
          <div className="flex items-start gap-2">
            <Smartphone className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-white">Persistent Media Controller Features:</p>
              <ul className="list-disc pl-4 space-y-1 text-zinc-400 mt-1">
                <li><strong>MediaSession API</strong>: Real-time track metadata (song title, channel/artist, high-res artwork) with Play, Pause, Next, Prev, and Seek controls on your notification shade and lock screen.</li>
                <li><strong>Hardware Media Keys</strong>: Use Bluetooth headphones or car stereo buttons to play, pause, or skip tracks effortlessly.</li>
                <li><strong>Uninterrupted Android Background Playback</strong>: To prevent Android Chrome from pausing media when you switch apps, turn on <em>&quot;Desktop site&quot;</em> in Chrome menu (⋮) or enable Picture-in-Picture mode.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Official YouTube Compliance Notice */}
      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-zinc-500 space-y-2 backdrop-blur-md">
        <div className="flex items-center gap-2 text-zinc-300 font-semibold">
          <ShieldCheck className="w-4 h-4 text-violet-400" />
          <span>YouTube API Policy & Terms Compliance</span>
        </div>
        <p className="leading-relaxed">
          VIBEBOX is a personal client-side music bookmarking and playback tool that utilizes the official YouTube IFrame Player API.
          Audio and video streams come directly from YouTube servers.
          This application complies strictly with YouTube terms and does not download, scrape, re-host, or convert YouTube content.
        </p>
      </div>

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={confirmClearHistory}
        title="Clear Recently Played?"
        message="This will reset your recently played tracks history. Your saved songs and playlists will remain safe."
        confirmLabel="Clear History"
        isDestructive={false}
        onConfirm={() => {
          clearRecentlyPlayed();
          setConfirmClearHistory(false);
        }}
        onCancel={() => setConfirmClearHistory(false)}
      />

      <ConfirmationModal
        isOpen={confirmClearAll}
        title="Reset All Local Data?"
        message="Warning: This will permanently delete all your saved songs, playlists, favorites, and preferences from this browser. Consider exporting a backup first."
        confirmLabel="Clear All Data"
        isDestructive={true}
        onConfirm={() => {
          clearAllData();
          setConfirmClearAll(false);
        }}
        onCancel={() => setConfirmClearAll(false)}
      />
    </div>
  );
};
