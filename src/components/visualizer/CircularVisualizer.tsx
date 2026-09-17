import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  CircularVisualizerProps,
  DEFAULT_VISUALIZER_CONFIG,
  VisualizerConfig,
} from './visualizerTypes';
import {
  ProceduralFrequencyProvider,
  getIntensityFactor,
} from './visualizerEngine';

export const CircularVisualizer: React.FC<CircularVisualizerProps> = ({
  artworkUrl,
  isPlaying,
  isLoading = false,
  currentTime,
  duration,
  songId,
  title,
  artist,
  config: userConfig,
  onSeek,
  className = '',
  size,
  interactiveProgress = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const config: VisualizerConfig = {
    ...DEFAULT_VISUALIZER_CONFIG,
    ...userConfig,
  };

  // Check user preference for reduced motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Procedural engine instance ref
  const engineRef = useRef<ProceduralFrequencyProvider>(new ProceduralFrequencyProvider(songId));
  useEffect(() => {
    engineRef.current.setSong(songId);
  }, [songId]);

  // Image caching & cross-fade management
  const currentImgRef = useRef<HTMLImageElement | null>(null);
  const prevImgRef = useRef<HTMLImageElement | null>(null);
  const crossfadeAlphaRef = useRef<number>(1); // 1 = fully transitioned to current

  useEffect(() => {
    if (!artworkUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = artworkUrl;
    img.onload = () => {
      if (currentImgRef.current && currentImgRef.current.src !== img.src) {
        prevImgRef.current = currentImgRef.current;
        crossfadeAlphaRef.current = 0; // begin crossfade
      }
      currentImgRef.current = img;
    };
  }, [artworkUrl]);

  // Smoothed bar heights buffer & rotation state
  const smoothedBarsRef = useRef<Float32Array>(new Float32Array(180));
  const rawFreqBufferRef = useRef<Uint8Array>(new Uint8Array(180));
  const rotationAngleRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const rafIdRef = useRef<number | null>(null);

  // Click / tap to seek on the progress ring
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!interactiveProgress || !onSeek || !duration || duration <= 0) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const dx = clickX - centerX;
      const dy = clickY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Check if click is near the circumference region
      const minRadius = rect.width * 0.22;
      const maxRadius = rect.width * 0.48;

      if (dist >= minRadius && dist <= maxRadius) {
        // Calculate angle from 12 o'clock (-PI/2) clockwise
        let angle = Math.atan2(dy, dx) + Math.PI / 2;
        if (angle < 0) angle += Math.PI * 2;

        const fraction = angle / (Math.PI * 2);
        const targetTime = Math.max(0, Math.min(duration, fraction * duration));
        onSeek(targetTime);
      }
    },
    [interactiveProgress, onSeek, duration]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isVisible = true;
    const handleVisibility = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const render = (now: number) => {
      rafIdRef.current = requestAnimationFrame(render);
      if (!isVisible) return;

      const deltaTime = Math.min(0.1, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      // Update procedural rhythm engine
      const engine = engineRef.current;
      engine.update(deltaTime, isPlaying, isLoading);

      // Determine spike count based on config & canvas size
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const minDimension = Math.min(width, height);

      // Sizing geometry
      const outerMaxRadius = minDimension * 0.46;
      const artworkRadius = minDimension * 0.28;
      const ringRadius = artworkRadius + 3;

      // Handle crossfade alpha increment
      if (crossfadeAlphaRef.current < 1) {
        crossfadeAlphaRef.current = Math.min(1, crossfadeAlphaRef.current + deltaTime * 2.5);
      }

      // Read simulated frequencies & beat pulse
      const intensityFactor = getIntensityFactor(config.intensity);
      const beatPulse = prefersReducedMotion ? 0 : engine.getBeatPulse();
      const { bass, mid, high } = engine.getFrequencyBands();

      // Determine spikes to render
      let spikeCount = 128;
      if (config.spikeCount === 'low') spikeCount = 96;
      else if (config.spikeCount === 'high') spikeCount = 160;
      else spikeCount = minDimension < 280 ? 96 : 144;

      if (rawFreqBufferRef.current.length !== spikeCount) {
        rawFreqBufferRef.current = new Uint8Array(spikeCount);
        smoothedBarsRef.current = new Float32Array(spikeCount);
      }

      engine.getFrequencyData(rawFreqBufferRef.current);
      const rawData = rawFreqBufferRef.current;
      const smoothed = smoothedBarsRef.current;

      // Smooth bar values with spring lerping
      const lerpSpeed = isPlaying ? 16 * deltaTime : 8 * deltaTime;
      for (let i = 0; i < spikeCount; i++) {
        let target = (rawData[i] / 255) * intensityFactor;
        if (!isPlaying && !isLoading) {
          target = 0.04; // calm resting state
        } else if (isLoading) {
          target = 0.08 + Math.sin(now * 0.005 + i * 0.15) * 0.04;
        }
        smoothed[i] += (target - smoothed[i]) * Math.min(1, lerpSpeed);
      }

      // Rotate slowly for living motion
      if (isPlaying && !prefersReducedMotion) {
        rotationAngleRef.current += deltaTime * 0.06;
      }

      // ==========================================
      // 1. AMBIENT GLOW BACKDROP
      // ==========================================
      if (config.ambientGlow !== 'off') {
        const glowOpacity = config.ambientGlow === 'dynamic'
          ? (0.12 + beatPulse * 0.16 + bass * 0.1) * intensityFactor
          : 0.12;

        const glowRadius = outerMaxRadius * (1 + beatPulse * 0.05);
        const radialGrad = ctx.createRadialGradient(
          centerX,
          centerY,
          artworkRadius * 0.6,
          centerX,
          centerY,
          glowRadius
        );
        radialGrad.addColorStop(0, `rgba(168, 85, 247, ${glowOpacity * 1.3})`);
        radialGrad.addColorStop(0.5, `rgba(99, 102, 241, ${glowOpacity * 0.7})`);
        radialGrad.addColorStop(1, 'rgba(8, 10, 16, 0)');

        ctx.fillStyle = radialGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // ==========================================
      // 2. RADIAL SPIKES / BARS
      // ==========================================
      if (config.enabled && config.style !== 'ring') {
        const angleStep = (Math.PI * 2) / spikeCount;
        const baseBarRadius = ringRadius + 4;
        const maxBarLength = (outerMaxRadius - baseBarRadius) * 0.95;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotationAngleRef.current);

        for (let i = 0; i < spikeCount; i++) {
          const angle = i * angleStep;
          const barVal = Math.max(0.02, smoothed[i]);
          const barLength = Math.min(maxBarLength, barVal * maxBarLength);

          const cos = Math.cos(angle);
          const sin = Math.sin(angle);

          const x1 = cos * baseBarRadius;
          const y1 = sin * baseBarRadius;
          const x2 = cos * (baseBarRadius + barLength);
          const y2 = sin * (baseBarRadius + barLength);

          // Dynamic gradient for bars
          const barGrad = ctx.createLinearGradient(x1, y1, x2, y2);
          const isHighlight = i % 8 === 0;
          if (isHighlight) {
            barGrad.addColorStop(0, 'rgba(232, 121, 249, 0.95)');
            barGrad.addColorStop(1, 'rgba(129, 140, 248, 0.9)');
          } else {
            barGrad.addColorStop(0, 'rgba(168, 85, 247, 0.75)');
            barGrad.addColorStop(0.6, 'rgba(99, 102, 241, 0.6)');
            barGrad.addColorStop(1, 'rgba(56, 189, 248, 0.25)');
          }

          ctx.strokeStyle = barGrad;
          ctx.lineWidth = Math.max(1.5, Math.min(3.5, (minDimension / 140)));
          ctx.lineCap = 'round';

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // ==========================================
      // 3. PROGRESS RING & ACCENT RINGS
      // ==========================================
      const progressFraction = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

      // Base Track Ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Active Progress Arc
      if (progressFraction > 0) {
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + Math.PI * 2 * progressFraction;

        const progressGrad = ctx.createLinearGradient(
          centerX - ringRadius,
          centerY - ringRadius,
          centerX + ringRadius,
          centerY + ringRadius
        );
        progressGrad.addColorStop(0, '#818cf8');
        progressGrad.addColorStop(0.5, '#a855f7');
        progressGrad.addColorStop(1, '#c084fc');

        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, startAngle, endAngle);
        ctx.strokeStyle = progressGrad;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Glowing Playhead Bead
        const beadX = centerX + Math.cos(endAngle) * ringRadius;
        const beadY = centerY + Math.sin(endAngle) * ringRadius;

        ctx.beginPath();
        ctx.arc(beadX, beadY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      // Subtle Outer Secondary Ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, ringRadius + 3.5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(168, 85, 247, ${0.15 + beatPulse * 0.2})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // ==========================================
      // 4. CENTER ALBUM ARTWORK (CIRCULAR CROP)
      // ==========================================
      // Artwork micro-scale pulse (1-2.5% max)
      const scaleMultiplier = prefersReducedMotion ? 1 : 1 + beatPulse * 0.02 * intensityFactor;
      const effectiveArtRadius = artworkRadius * scaleMultiplier;

      // Drop shadow underneath artwork
      ctx.beginPath();
      ctx.arc(centerX, centerY, effectiveArtRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#0f121a';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 4;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Clip circular region for album art
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, effectiveArtRadius - 1, 0, Math.PI * 2);
      ctx.clip();

      const drawImageCover = (img: HTMLImageElement, alpha = 1) => {
        if (!img || !img.complete || img.naturalWidth === 0) return;
        ctx.globalAlpha = alpha;
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        const artDiameter = effectiveArtRadius * 2;
        const scale = Math.max(artDiameter / iw, artDiameter / ih);
        const sw = artDiameter / scale;
        const sh = artDiameter / scale;
        const sx = (iw - sw) / 2;
        const sy = (ih - sh) / 2;

        ctx.drawImage(
          img,
          sx,
          sy,
          sw,
          sh,
          centerX - effectiveArtRadius,
          centerY - effectiveArtRadius,
          artDiameter,
          artDiameter
        );
      };

      // Handle cross-fading when active song changed
      if (prevImgRef.current && crossfadeAlphaRef.current < 1) {
        drawImageCover(prevImgRef.current, 1);
        if (currentImgRef.current) {
          drawImageCover(currentImgRef.current, crossfadeAlphaRef.current);
        }
      } else if (currentImgRef.current) {
        drawImageCover(currentImgRef.current, 1);
      } else {
        // Fallback placeholder pattern if image is still loading
        ctx.fillStyle = '#161a26';
        ctx.fillRect(
          centerX - effectiveArtRadius,
          centerY - effectiveArtRadius,
          effectiveArtRadius * 2,
          effectiveArtRadius * 2
        );
      }
      ctx.restore();

      // Subtle inner rim vignette for depth
      const rimGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        effectiveArtRadius * 0.75,
        centerX,
        centerY,
        effectiveArtRadius
      );
      rimGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      rimGrad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
      ctx.beginPath();
      ctx.arc(centerX, centerY, effectiveArtRadius - 1, 0, Math.PI * 2);
      ctx.fillStyle = rimGrad;
      ctx.fill();

      // Center Spindle Accent (subtle modern disc hub)
      ctx.beginPath();
      ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0c10';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    };

    rafIdRef.current = requestAnimationFrame(render);

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isPlaying, isLoading, currentTime, duration, songId, config, prefersReducedMotion]);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center select-none ${className}`}
      style={size ? { width: size, height: size } : { width: '100%', height: '100%' }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className={`w-full h-full ${interactiveProgress ? 'cursor-pointer' : ''}`}
        title={interactiveProgress ? 'Tap progress ring to seek' : undefined}
      />
    </div>
  );
};
