'use client';

import React, { useState, useEffect } from 'react';

interface ScrollProgressBarProps {
  className?: string;
  showPercentage?: boolean;
}

export default function ScrollProgressBar({
  className = '',
  showPercentage = false,
}: ScrollProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;

    const updateScrollProgress = () => {
      const scrollY = window.scrollY;
      const totalHeight =
        document.documentElement.scrollHeight - window.innerHeight;

      if (totalHeight > 0) {
        const currentProgress = Math.min(
          100,
          Math.max(0, (scrollY / totalHeight) * 100)
        );
        setProgress(currentProgress);
        setIsScrolled(scrollY > 40);
      }
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollProgress);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    updateScrollProgress();

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 pointer-events-none transition-opacity duration-300 ${
        isScrolled ? 'opacity-100' : 'opacity-0'
      } ${className}`}
      aria-hidden="true"
    >
      <div className="h-1 sm:h-1.5 w-full bg-slate-200/40 dark:bg-slate-800/40 backdrop-blur-xs overflow-hidden">
        {/* CSS Native scroll-timeline bar where supported, fallback with dynamic inline width */}
        <div
          className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-amber-400 shadow-sm shadow-blue-500/40 relative"
          style={{ width: `${progress}%`, transition: 'width 75ms ease-out' }}
        >
          {/* Leading Glow Head */}
          <div className="absolute right-0 top-0 bottom-0 w-3 bg-white/70 blur-2xs" />
        </div>
      </div>

      {showPercentage && progress > 5 && (
        <div className="absolute right-4 top-2 text-[10px] font-black font-mono text-slate-600 dark:text-slate-300 bg-white/90 dark:bg-slate-800/90 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-xs pointer-events-auto">
          {Math.round(progress)}% Scrolled
        </div>
      )}
    </div>
  );
}
