
import React, { useEffect, useState, useRef } from 'react';

interface LandingScreenProps {
  onEnter: () => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({ onEnter }) => {
  const [mounted, setMounted] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [hovering, setHovering] = useState(false);
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
              const next = prev + 1.2; // Slightly slower charge for dramatic effect
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
              const next = prev - 4; // Fast decay
              if (next <= 0) return 0;
              rafRef.current = requestAnimationFrame(decay);
              return next;
          });
      };
      rafRef.current = requestAnimationFrame(decay);
  };

  const triggerExit = () => {
      setExiting(true);
      // Wait for the flash animation to peak before unmounting
      setTimeout(onEnter, 1500); 
  };

  // Generate geometric rings
  const rings = Array.from({ length: 16 }).map((_, i) => i);

  // Dynamic Styles
  const containerStyle = {
      '--charge': charge / 100,
  } as React.CSSProperties;

  // Shake intensity calculation
  const shakeIntensity = charge > 50 ? (charge - 50) / 10 : 0;
  const shakeStyle = charge > 50 && !exiting ? {
      transform: `translate(${Math.random() * shakeIntensity - shakeIntensity/2}px, ${Math.random() * shakeIntensity - shakeIntensity/2}px)`
  } : {};

  return (
    <div 
        className={`fixed inset-0 z-[100] bg-[#05020a] flex items-center justify-center overflow-hidden transition-all duration-1000 ${exiting ? 'pointer-events-none' : ''}`}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
        style={containerStyle}
    >
      
      {/* Background Ambience */}
      <div className={`absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIj48ZmlsdGVyIGlkPSJnoiPjxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjY1IiBudW1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI2cpIiBvcGFjaXR5PSIwLjAzIi8+PC9zdmc+')] opacity-20 transition-opacity duration-500 ${exiting ? 'opacity-0' : ''}`} />
      
      {/* The Flash Overlay (White Out Effect) */}
      <div className={`absolute inset-0 bg-white z-[150] transition-opacity duration-[1500ms] ease-out pointer-events-none ${exiting ? 'opacity-100' : 'opacity-0'}`} />

      {/* Interactive Core Area */}
      <div 
        className="relative w-full h-full flex items-center justify-center cursor-pointer select-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        
        {/* The Gyroscope / Hyper-Object */}
        <div 
            className={`relative flex items-center justify-center transition-all duration-300 ${exiting ? 'scale-[5] opacity-0 blur-md' : 'scale-100'}`}
            style={shakeStyle}
        >
            
            {/* Rings */}
            {rings.map((i) => {
                const baseSize = (i + 1) * 35;
                const duration = 20 + i * 2;
                // Speed up significantly as charge increases
                const speedMult = 1 + (charge / 5) + (hovering ? 0.5 : 0);
                
                // Color shifts to white hot
                const r = Math.min(255, 168 + charge * 2);
                const g = Math.min(255, 85 + charge * 2);
                const b = Math.min(255, 247 + charge * 2);
                const opacity = 0.2 + (charge/100);

                return (
                    <div
                        key={i}
                        className="absolute rounded-full border flex items-center justify-center pointer-events-none transition-all duration-100"
                        style={{
                            width: `${baseSize}px`,
                            height: `${baseSize}px`,
                            // At 0 charge: Random 3D rotations. At 100 charge: Flatten to 0deg
                            transform: `rotateX(${charge * 1.8}deg) rotateY(${charge * 1.8}deg)`, 
                            borderColor: `rgba(${r}, ${g}, ${b}, ${opacity})`,
                            borderWidth: charge > 80 ? '3px' : '1px',
                            boxShadow: charge > 20 ? `0 0 ${charge}px rgba(255,255,255,${charge/400})` : 'none',
                            animation: `spin-gyro ${duration / speedMult}s linear infinite ${i % 2 === 0 ? 'reverse' : 'normal'}`,
                        }}
                    >
                         {/* Particle decorations on rings */}
                         <div 
                            className="absolute top-0 w-1 h-1 bg-white rounded-full" 
                            style={{ 
                                boxShadow: `0 0 ${10 + charge}px white`,
                                opacity: 0.2 + (charge/150)
                            }} 
                         />
                    </div>
                );
            })}

            {/* Central Singularity Orb */}
            <div 
                className={`relative z-20 rounded-full transition-all duration-100 ${charge === 0 && !exiting ? 'animate-pulse-slow' : ''}`}
                style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: charge > 90 ? '#ffffff' : '#e9d5ff',
                    // The glow becomes blinding
                    boxShadow: `0 0 ${40 + charge * 4}px ${20 + charge * 2}px rgba(${147 + charge}, ${51 + charge}, ${234 + charge}, ${0.5 + charge/100})`,
                    transform: `scale(${1 + (charge / 30) + (hovering && !charge ? 0.5 : 0)})`,
                }}
            >
                {/* Inner Void - disappears at high charge */}
                <div className={`absolute inset-0 bg-black rounded-full transform transition-transform duration-100 ${charge > 80 ? 'scale-0' : 'scale-75'}`} />
            </div>
            
            {/* Charge Progress Ring */}
            <svg className="absolute z-10 w-48 h-48 rotate-[-90deg] pointer-events-none transition-transform duration-300" style={{ transform: `scale(${1 + charge/100}) rotate(-90deg)` }}>
                 <circle
                    cx="96" cy="96" r="40"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={2 + (charge/20)}
                    strokeDasharray="251"
                    strokeDashoffset={251 - (251 * charge) / 100}
                    className="transition-[stroke-dashoffset] duration-75 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                    strokeLinecap="round"
                    style={{ opacity: charge > 0 ? 1 : 0 }}
                 />
            </svg>

            {/* Hint Pulse (Only visible when idle) */}
            {charge === 0 && !hovering && !exiting && (
                <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-purple-500 scale-150 duration-[3s]" />
            )}

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
