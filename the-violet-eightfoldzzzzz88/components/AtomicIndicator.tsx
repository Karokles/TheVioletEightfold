
import React from 'react';
import { EightfoldMode, GuardedState } from '../types';

interface AtomicIndicatorProps {
  mode: EightfoldMode;
  guardedState: GuardedState;
}

export const AtomicIndicator: React.FC<AtomicIndicatorProps> = ({ mode, guardedState }) => {
  const isOG = mode === 'OG';

  const getColors = () => {
    if (isOG) return 'from-fuchsia-400 via-purple-500 to-indigo-500 shadow-purple-500/40';
    switch (guardedState) {
      case 'STABILIZATION': return 'from-amber-300 via-orange-400 to-red-400 shadow-amber-500/40';
      case 'REFLECTION': return 'from-blue-300 via-indigo-400 to-purple-400 shadow-blue-500/40';
      case 'INTEGRATION': return 'from-emerald-300 via-teal-400 to-cyan-400 shadow-emerald-500/40';
      default: return 'from-purple-400 to-violet-500 shadow-purple-500/40';
    }
  };

  const activeColorClass = getColors();

  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      {/* Soft Ambient Halo */}
      <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${activeColorClass} opacity-10 blur-xl animate-pulse-slow`} />

      <div className={`relative w-full h-full transition-all duration-1000 ${isOG ? 'scale-100' : 'scale-90'} flex items-center justify-center`}>
        
        {/* Outer Organic Orbit */}
        <div 
          className={`absolute inset-0 rounded-full border border-white/10 transition-all duration-1000 
            ${isOG ? 'animate-[spin_15s_linear_infinite]' : 'animate-[spin_25s_linear_infinite] opacity-30'}
          `}
        >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/40 blur-[1px]" />
        </div>

        {/* Inner Counter-Rotating Orbit */}
        <div 
          className={`absolute inset-2 rounded-full border border-white/5 border-t-white/20 transition-all duration-1000 
            ${isOG ? 'animate-[spin_10s_linear_infinite_reverse]' : 'animate-[spin_18s_linear_infinite_reverse] opacity-20'}
          `}
        />

        {/* The Pulsing Heart Core */}
        <div className="relative z-10 w-4 h-4 rounded-full">
            {/* Soft Glow Core */}
            <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${activeColorClass} shadow-[0_0_15px_currentColor] animate-pulse transition-colors duration-700`} />
            
            {/* Center "Spark" */}
            <div className="absolute inset-[30%] rounded-full bg-white opacity-80 blur-[0.5px]" />
            
            {/* Subtle Cross-lines for technical feel without being 'edgy' */}
            <div className="absolute top-1/2 left-[-20%] right-[-20%] h-[0.5px] bg-white/20" />
            <div className="absolute left-1/2 top-[-20%] bottom-[-20%] w-[0.5px] bg-white/20" />
        </div>

        {/* Ethereal light particles */}
        {isOG && (
            <div className="absolute inset-0 animate-spectral opacity-40">
                <div className="absolute top-2 right-2 w-1 h-1 rounded-full bg-white shadow-[0_0_5px_white]" />
                <div className="absolute bottom-2 left-2 w-1 h-1 rounded-full bg-white shadow-[0_0_5px_white]" />
            </div>
        )}
      </div>
    </div>
  );
};
