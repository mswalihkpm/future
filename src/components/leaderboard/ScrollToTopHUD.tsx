'use client';

import React, { useState, useEffect } from 'react';
import { ArrowUp, Trophy } from 'lucide-react';

interface ScrollToTopHUDProps {
  threshold?: number;
  totalStudents?: number;
}

export default function ScrollToTopHUD({
  threshold = 300,
  totalStudents,
}: ScrollToTopHUDProps) {
  const [visible, setVisible] = useState(false);
  const [scrollPercent, setScrollPercent] = useState(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;

      if (docHeight > 0) {
        const percent = Math.min(100, Math.max(0, (scrollY / docHeight) * 100));
        setScrollPercent(percent);
      }

      setVisible(scrollY > threshold);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(handleScroll);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!visible) return null;

  // SVG Circular progress math
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (scrollPercent / 100) * circumference;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 animate-zoom-up print:hidden">
      <button
        onClick={scrollToTop}
        type="button"
        title="Scroll to top podium"
        aria-label="Scroll back to top of leaderboard"
        className="group relative flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-slate-900 shadow-xl border border-slate-200/90 dark:border-slate-700 hover:border-blue-500 hover:shadow-blue-500/20 active:scale-95 transition-all duration-300"
      >
        {/* SVG Progress Ring */}
        <svg
          className="w-12 h-12 -rotate-90 pointer-events-none absolute inset-0"
          viewBox="0 0 44 44"
        >
          <circle
            cx="22"
            cy="22"
            r={radius}
            className="text-slate-100 dark:text-slate-800"
            strokeWidth="3"
            stroke="currentColor"
            fill="transparent"
          />
          <circle
            cx="22"
            cy="22"
            r={radius}
            className="text-blue-600 dark:text-blue-400 transition-all duration-100"
            strokeWidth="3.2"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
          />
        </svg>

        {/* Center Icon: Arrow or Trophy on hover */}
        <div className="relative z-10 text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-transform duration-200 group-hover:-translate-y-0.5">
          <ArrowUp className="w-5 h-5 block group-hover:hidden" />
          <Trophy className="w-5 h-5 hidden group-hover:block text-amber-500" />
        </div>

        {/* Tooltip on Hover */}
        <span className="absolute right-14 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[11px] font-bold py-1 px-2.5 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
          Back to Top ({Math.round(scrollPercent)}%)
        </span>
      </button>
    </div>
  );
}
