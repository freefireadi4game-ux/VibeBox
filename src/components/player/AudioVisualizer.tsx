import React, { useEffect, useRef } from 'react';
import { usePlayer } from '../../context/PlayerContext';

interface AudioVisualizerProps {
  variant?: 'bars' | 'wave' | 'minimal';
  className?: string;
  barCount?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  variant = 'bars',
  className = '',
  barCount = 18,
}) => {
  const { isPlaying } = usePlayer();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    const heights = new Array(barCount).fill(4);
    const targetHeights = new Array(barCount).fill(4);

    const render = () => {
      time += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const gap = 2.5;
      const totalGaps = (barCount - 1) * gap;
      const barWidth = Math.max(2, (width - totalGaps) / barCount);

      // Create gradient
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, '#6366f1'); // indigo-500
      gradient.addColorStop(0.5, '#a855f7'); // violet-500
      gradient.addColorStop(1, '#c084fc'); // lavender-400

      for (let i = 0; i < barCount; i++) {
        if (isPlaying) {
          // Harmonic wave simulation based on sine + cosine combinations
          const freq1 = Math.sin(time * 2.2 + i * 0.45);
          const freq2 = Math.cos(time * 3.4 + i * 0.3);
          const freq3 = Math.sin(time * 1.5 - i * 0.2);
          const raw = (freq1 + freq2 + freq3 + 3) / 6; // normalized 0..1
          // Add rhythmic pulse
          const pulse = Math.sin(time * 4) * 0.15;
          targetHeights[i] = Math.max(4, Math.min(height, (raw + pulse) * height * 0.95));
        } else {
          // Resting baseline
          targetHeights[i] = 3.5;
        }

        // Smooth spring interpolation
        heights[i] += (targetHeights[i] - heights[i]) * 0.22;

        const x = i * (barWidth + gap);
        const barHeight = heights[i];
        const y = height - barHeight;

        ctx.fillStyle = gradient;
        // Rounded bar top
        const radius = Math.min(barWidth / 2, 2.5);
        ctx.beginPath();
        ctx.moveTo(x, height);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.lineTo(x + barWidth - radius, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
        ctx.lineTo(x + barWidth, height);
        ctx.closePath();
        ctx.fill();
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [isPlaying, barCount]);

  if (variant === 'minimal') {
    return (
      <div className={`flex items-end gap-1 h-3.5 ${className}`}>
        <span
          className={`w-1 rounded-full bg-violet-400 transition-all ${
            isPlaying ? 'animate-eq-1' : 'h-1'
          }`}
        />
        <span
          className={`w-1 rounded-full bg-indigo-400 transition-all ${
            isPlaying ? 'animate-eq-2' : 'h-1.5'
          }`}
        />
        <span
          className={`w-1 rounded-full bg-fuchsia-400 transition-all ${
            isPlaying ? 'animate-eq-3' : 'h-1'
          }`}
        />
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        width={variant === 'bars' ? 120 : 220}
        height={32}
        className="w-full h-full"
      />
    </div>
  );
};
