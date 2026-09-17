import { FrequencyDataProvider, VisualizerIntensity } from './visualizerTypes';

/**
 * Fast deterministic string hash function to generate seeds per songId.
 */
function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Deterministic pseudo-random number generator using Mulberry32.
 */
function createSeededRandom(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Song Personality Profile derived from video/song ID.
 */
export interface SongPersonality {
  bpm: number;
  beatInterval: number; // in seconds
  bassWeight: number;
  midWeight: number;
  highWeight: number;
  harmonicFreq1: number;
  harmonicFreq2: number;
  harmonicFreq3: number;
  colorHueOffset: number; // -15 to +15 deg
  symmetryMode: 'mirrored' | 'continuous';
}

export function generateSongPersonality(songId: string): SongPersonality {
  const seed = hashString(songId || 'default-song');
  const rng = createSeededRandom(seed);

  // BPM between 95 and 132 for realistic musical pulse
  const bpm = Math.floor(95 + rng() * 37);
  const beatInterval = 60 / bpm;

  return {
    bpm,
    beatInterval,
    bassWeight: 0.8 + rng() * 0.4,
    midWeight: 0.75 + rng() * 0.5,
    highWeight: 0.7 + rng() * 0.5,
    harmonicFreq1: 1.8 + rng() * 0.8,
    harmonicFreq2: 2.9 + rng() * 1.2,
    harmonicFreq3: 4.3 + rng() * 1.5,
    colorHueOffset: (rng() - 0.5) * 24,
    symmetryMode: rng() > 0.25 ? 'mirrored' : 'continuous',
  };
}

/**
 * Procedural Frequency Simulator
 * Generates an organic, musical frequency spectrum and beat-pulse envelope
 * when raw audio stream access is restricted (e.g. YouTube IFrame API).
 */
export class ProceduralFrequencyProvider implements FrequencyDataProvider {
  private personality: SongPersonality;
  private time = 0;
  private lastBeatTime = 0;
  private currentPulse = 0;
  private targetPulse = 0;

  private currentBass = 0.2;
  private currentMid = 0.2;
  private currentHigh = 0.2;

  constructor(songId: string) {
    this.personality = generateSongPersonality(songId);
  }

  public update(deltaTime: number, isPlaying: boolean, isLoading: boolean) {
    if (!isPlaying && !isLoading) {
      // Gracefully decay to resting baseline
      this.currentPulse *= 0.88;
      this.currentBass *= 0.92;
      this.currentMid *= 0.92;
      this.currentHigh *= 0.92;
      return;
    }

    if (isLoading) {
      // Gentle loading breathing
      this.time += deltaTime * 1.5;
      this.currentPulse = (Math.sin(this.time * 3) + 1) * 0.15;
      this.currentBass = 0.15;
      this.currentMid = 0.15;
      this.currentHigh = 0.1;
      return;
    }

    this.time += deltaTime;

    // Simulate 4/4 musical beat timing
    const interval = this.personality.beatInterval;
    const beatPhase = (this.time % interval) / interval;

    // Beat event check: trigger sharp pulse on downbeats
    if (this.time - this.lastBeatTime >= interval) {
      this.lastBeatTime = this.time;
      // Primary downbeat has stronger amplitude; offbeat is slightly softer
      const isDownbeat = Math.floor(this.time / interval) % 2 === 0;
      this.targetPulse = isDownbeat ? 1.0 : 0.65;
    }

    // Exponential beat pulse decay (sharp rise, smooth musical decay)
    this.currentPulse += (this.targetPulse - this.currentPulse) * 0.35;
    this.targetPulse *= 0.82;

    // Simulate Bass Band (macro beat + slow rolling resonance)
    const rawBass =
      Math.sin(this.time * this.personality.harmonicFreq1) * 0.3 +
      Math.cos(this.time * 0.7) * 0.2 +
      this.currentPulse * 0.5 +
      0.35;
    this.currentBass += (Math.max(0.1, Math.min(1.0, rawBass)) - this.currentBass) * 0.2;

    // Simulate Mid Band (harmonic complexity & melodies)
    const rawMid =
      Math.sin(this.time * this.personality.harmonicFreq2 + 1.2) * 0.35 +
      Math.cos(this.time * this.personality.harmonicFreq1 * 1.6) * 0.25 +
      0.4;
    this.currentMid += (Math.max(0.08, Math.min(1.0, rawMid)) - this.currentMid) * 0.25;

    // Simulate High Band (crisp rapid flutter)
    const rawHigh =
      Math.sin(this.time * this.personality.harmonicFreq3 * 2.1) * 0.2 +
      Math.cos(this.time * 6.5) * 0.2 +
      (Math.sin(this.time * 12) > 0.6 ? 0.3 : 0) +
      0.25;
    this.currentHigh += (Math.max(0.05, Math.min(1.0, rawHigh)) - this.currentHigh) * 0.3;
  }

  public getFrequencyBands(): { bass: number; mid: number; high: number } {
    return {
      bass: this.currentBass * this.personality.bassWeight,
      mid: this.currentMid * this.personality.midWeight,
      high: this.currentHigh * this.personality.highWeight,
    };
  }

  public getBeatPulse(): number {
    return Math.min(1.0, this.currentPulse);
  }

  /**
   * Generates a 0..255 simulated frequency array for N bins.
   */
  public getFrequencyData(buffer: Uint8Array): void {
    const len = buffer.length;
    const half = Math.floor(len / 2);
    const { bass, mid, high } = this.getFrequencyBands();

    for (let i = 0; i < len; i++) {
      // Map bin position to normalized radial index
      const norm = this.personality.symmetryMode === 'mirrored'
        ? 1 - Math.abs(i - half) / half
        : i / len;

      // Frequency distribution across the spectrum:
      // Lowest bins = Bass dominant
      // Middle bins = Mid dominant
      // Highest bins = High shimmer dominant
      const bassContrib = Math.max(0, 1 - norm * 1.8) * bass;
      const midContrib = Math.max(0, 1 - Math.abs(norm - 0.45) * 2.2) * mid;
      const highContrib = Math.max(0, (norm - 0.35) * 1.5) * high;

      // Organic ripples per bin
      const ripple = Math.sin(norm * Math.PI * 5 + this.time * 3.5) * 0.15;
      const composite = (bassContrib + midContrib + highContrib + ripple) * 255;

      buffer[i] = Math.max(8, Math.min(255, Math.floor(composite)));
    }
  }

  public setSong(newSongId: string) {
    this.personality = generateSongPersonality(newSongId);
    this.time = 0;
    this.lastBeatTime = 0;
    this.currentPulse = 0;
    this.targetPulse = 0;
  }
}

/**
 * Web Audio API Frequency Provider (for future direct audio stream connection).
 */
export class WebAudioFrequencyProvider implements FrequencyDataProvider {
  private analyser: AnalyserNode | null = null;
  private tempBuffer: Uint8Array | null = null;

  constructor(analyserNode?: AnalyserNode) {
    if (analyserNode) {
      this.setAnalyser(analyserNode);
    }
  }

  public setAnalyser(analyser: AnalyserNode) {
    this.analyser = analyser;
    this.tempBuffer = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
  }

  public getFrequencyData(buffer: Uint8Array): void {
    if (!this.analyser || !this.tempBuffer) {
      buffer.fill(0);
      return;
    }
    this.analyser.getByteFrequencyData(this.tempBuffer as any);
    // Interpolate or downsample to output buffer length
    const step = this.tempBuffer.length / buffer.length;
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = this.tempBuffer[Math.floor(i * step)] || 0;
    }
  }

  public getFrequencyBands(): { bass: number; mid: number; high: number } {
    if (!this.analyser || !this.tempBuffer) {
      return { bass: 0, mid: 0, high: 0 };
    }
    this.analyser.getByteFrequencyData(this.tempBuffer as any);
    const len = this.tempBuffer.length;
    const bassEnd = Math.floor(len * 0.1);
    const midEnd = Math.floor(len * 0.5);

    let bSum = 0, mSum = 0, hSum = 0;
    for (let i = 0; i < bassEnd; i++) bSum += this.tempBuffer[i];
    for (let i = bassEnd; i < midEnd; i++) mSum += this.tempBuffer[i];
    for (let i = midEnd; i < len; i++) hSum += this.tempBuffer[i];

    return {
      bass: (bSum / bassEnd) / 255,
      mid: (mSum / (midEnd - bassEnd)) / 255,
      high: (hSum / (len - midEnd)) / 255,
    };
  }

  public getBeatPulse(): number {
    return this.getFrequencyBands().bass;
  }
}

/**
 * Multiplier factors for VisualizerIntensity.
 */
export function getIntensityFactor(intensity: VisualizerIntensity): number {
  switch (intensity) {
    case 'low':
      return 0.65;
    case 'high':
      return 1.35;
    case 'medium':
    default:
      return 1.0;
  }
}
