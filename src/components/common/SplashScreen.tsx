import React, { useEffect } from 'react';
import { motion } from 'motion/react';

const SPIKES = Array.from({ length: 32 }, (_, index) => index);

export const SplashScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 1250);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="vibebox-splash fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#06070a]"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="relative flex h-56 w-56 items-center justify-center">
        <div className="absolute inset-8 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="vibebox-splash-spikes absolute inset-0" aria-hidden="true">
          {SPIKES.map((spike) => (
            <span key={spike} style={{ transform: `rotate(${spike * 11.25}deg) translateY(-78px)` }} />
          ))}
        </div>
        <div className="relative text-center">
          <div className="text-3xl font-black tracking-[0.22em] text-white">VIBEBOX</div>
          <div className="mt-2 text-[9px] font-semibold uppercase tracking-[0.42em] text-violet-300/80">just listen</div>
        </div>
      </div>
    </motion.div>
  );
};
