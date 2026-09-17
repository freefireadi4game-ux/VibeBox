export type VisualizerStyle = 'spectrum' | 'ring' | 'ambient';
export type VisualizerIntensity = 'low' | 'medium' | 'high';
export type VisualizerSpikeCount = 'auto' | 'low' | 'high';
export type VisualizerAmbientGlow = 'off' | 'subtle' | 'dynamic';

export interface VisualizerConfig {
  enabled: boolean;
  style: VisualizerStyle;
  intensity: VisualizerIntensity;
  spikeCount: VisualizerSpikeCount;
  ambientGlow: VisualizerAmbientGlow;
}

export const DEFAULT_VISUALIZER_CONFIG: VisualizerConfig = {
  enabled: true,
  style: 'spectrum',
  intensity: 'medium',
  spikeCount: 'auto',
  ambientGlow: 'dynamic',
};

/**
 * Standard interface for frequency data providers.
 * Supports both procedural simulation (for YouTube IFrame player)
 * and real Web Audio API AnalyserNode frequency data (for local/direct audio).
 */
export interface FrequencyDataProvider {
  /** Fill an existing buffer with 0-255 frequency values */
  getFrequencyData: (buffer: Uint8Array) => void;
  /** Normalized 0..1 values for core frequency bands */
  getFrequencyBands: () => { bass: number; mid: number; high: number };
  /** Normalized 0..1 instantaneous pulse magnitude */
  getBeatPulse: () => number;
  /** Cleanup resources if any */
  destroy?: () => void;
}

export interface CircularVisualizerProps {
  artworkUrl: string;
  isPlaying: boolean;
  isLoading?: boolean;
  currentTime: number;
  duration: number;
  songId: string;
  title?: string;
  artist?: string;
  config?: Partial<VisualizerConfig>;
  onSeek?: (timeInSeconds: number) => void;
  className?: string;
  size?: number;
  interactiveProgress?: boolean;
}
