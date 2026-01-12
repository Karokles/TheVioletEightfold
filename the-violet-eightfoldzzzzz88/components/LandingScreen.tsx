
import React, { useEffect, useState, useRef } from 'react';

interface LandingScreenProps {
  onEnter: () => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({ onEnter }) => {
  const [mounted, setMounted] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [charge, setCharge] = useState(0); // 0 to 100
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleMouseDown = () => {
      if (exiting) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      const animate = () => {
          setCharge(prev => {
              const next = prev + 1.2; 
              if (next >= 100) {
                  triggerExit();
                  return 100;
              }
              rafRef.current = requestAnimationFrame(animate);
              return next;
          });
      };
      rafRef.current = requestAnimationFrame(animate);
  };

  const handleMouseUp = () => {
      if (exiting) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      
      const decay = () => {
          setCharge(prev => {
              const next = prev - 3; 
              if (next <= 0) return 0;
              rafRef.current = requestAnimationFrame(decay);
              return next;
          });
      };
      rafRef.current = requestAnimationFrame(decay);
  };

  const triggerExit = () => {
      setExiting(true);
      setTimeout(onEnter, 1500); 
  };

  const rings = Array.from({ length: 14 }).map((_, i) => i);

  const shakeIntensity = charge > 50 ? (charge - 50) / 10 : 0;
  const shakeStyle = charge > 50 && !exiting ? {
      transform: `translate(${Math.random() * shakeIntensity - shakeIntensity/2}px, ${Math.random() * shakeIntensity - shakeIntensity/2}px)`
  } : {};

  return (
    <div 
        className={`fixed inset-0 z-[200] bg-[#05020a] flex items-center justify-center overflow-hidden transition-all duration-1000 ${exiting ? 'pointer-events-none' : ''}`}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
    >
      {/* Mystic Background Nebula Glow - Makes it visible but not bright */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(88,28,135,0.08)_0%,transparent_60%)] pointer-events-none" />
      <div className={`absolute inset-0 bg-white z-[150] transition-opacity duration-[1500ms] ease-out pointer-events-none ${exiting ? 'opacity-100' : 'opacity-0'}`} />

      <div 
        className="relative w-full h-full flex flex-col items-center justify-center cursor-pointer select-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        <div 
            className={`relative flex items-center justify-center transition-all duration-300 ${exiting ? 'scale-[5] opacity-0 blur-md' : 'scale-100'}`}
            style={shakeStyle}
        >
            {/* Ambient Core Light (Persistent) */}
            <div className="absolute w-64 h-64 rounded-full bg-purple-500/5 blur-3xl animate-pulse-slow" />

            {rings.map((i) => {
                const baseSize = (i + 1) * 28;
                const duration = 20 + i * 2.5;
                const speedMult = 1 + (charge / 8);
                // Increased base opacity to 0.25 for mystic visibility
                const opacity = 0.25 + (charge/150);

                return (
                    <div
                        key={i}
                        className="absolute rounded-full border border-purple-400/20 pointer-events-none transition-all duration-200"
                        style={{
                            width: `${baseSize}px`,
                            height: `${baseSize}px`,
                            transform: `rotateX(${charge * 1.2}deg) rotateY(${charge * 1.2}deg)`, 
                            opacity: opacity,
                            animation: `spin-gyro ${duration / speedMult}s linear infinite`,
                        }}
                    />
                );
            })}

            {/* Central Soul Hub */}
            <div 
                className={`relative z-20 rounded-full transition-all duration-300`}
                style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: charge > 90 ? '#ffffff' : '#9333ea',
                    boxShadow: `0 0 ${30 + charge * 4}px ${15 + charge * 2}px rgba(168, 85, 247, ${0.4 + charge/100})`,
                    transform: `scale(${1 + charge / 40})`,
                }}
            />
            
            {/* PROGRESS RING - Perfectly Centered using inset-0 flex */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                <div className="relative w-64 h-64 flex items-center justify-center">
                    <svg 
                        viewBox="0 0 256 256"
                        className="w-full h-full rotate-[-90deg] origin-center" 
                        style={{ transform: `scale(${1 + charge/80}) rotate(-90deg)` }}
                    >
                        <circle
                            cx="128" cy="128" r="50"
                            fill="none"
                            stroke="rgba(255,255,255,0.9)"
                            strokeWidth={2 + (charge/25)}
                            strokeDasharray="314.159"
                            strokeDashoffset={314.159 - (314.159 * charge) / 100}
                            className="transition-[stroke-dashoffset] duration-75"
                            style={{ opacity: charge > 0 ? 1 : 0 }}
                        />
                    </svg>
                </div>
            </div>
        </div>

        {/* --- INSTRUCTION TEXT --- */}
        <div className={`mt-28 text-center transition-all duration-700 ${exiting ? 'opacity-0' : 'opacity-100'}`}>
            <p className={`text-[11px] uppercase tracking-[0.6em] text-purple-200/60 font-medium mb-3 ${charge > 0 ? 'animate-none' : 'animate-pulse'}`}>
                {charge > 0 ? 'Igniting Lazarus Engine...' : 'Hold to Awaken'}
            </p>
            <div className="flex gap-2 justify-center">
                {Array.from({length: 3}).map((_, i) => (
                    <div key={i} className={`w-1 h-1 rounded-full bg-purple-400 transition-all duration-500 ${charge > (i * 33) ? 'scale-150 bg-white shadow-[0_0_8px_white]' : 'opacity-10'}`} />
                ))}
            </div>
        </div>
      </div>

      <style>{`
        @keyframes spin-gyro {
            0% { transform: rotate3d(1, 1, 1, 0deg); }
            100% { transform: rotate3d(1, 1, 1, 360deg); }
        }
      `}</style>
    </div>
  );
};
