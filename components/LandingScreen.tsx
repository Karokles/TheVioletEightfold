
import React, { useEffect, useState, useRef } from 'react';

interface LandingScreenProps {
  onEnter: () => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({ onEnter }) => {
  const [mounted, setMounted] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [charging, setCharging] = useState(false);
  const rafRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    };
  }, []);

  const handleMouseDown = () => {
      if (exiting) return;

      window.dispatchEvent(new Event('violet-audio-unlock'));
      setCharging(true);

      if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = window.setTimeout(triggerExit, 1180);
  };

  const handleMouseUp = () => {
      if (exiting) return;

      if (exitTimerRef.current) {
          window.clearTimeout(exitTimerRef.current);
          exitTimerRef.current = null;
      }
      setCharging(false);
  };

  const triggerExit = () => {
      setExiting(true);
      // Wait for the flash animation to peak before unmounting
      setTimeout(onEnter, 1500); 
  };

  // Generate geometric rings
  const rings = Array.from({ length: 10 }).map((_, i) => i);

  // Dynamic Styles
  const containerStyle = {} as React.CSSProperties;

  const coreScale = exiting ? 'scale-[5] opacity-0 blur-md' : charging ? 'scale-[1.08]' : 'scale-100';

  return (
    <div 
        className={`fixed inset-0 z-[100] bg-[#05020a] flex items-center justify-center overflow-hidden transition-all duration-1000 ${exiting ? 'pointer-events-none' : ''}`}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
        style={containerStyle}
    >
      <div className={`absolute inset-0 transition-opacity duration-1000 ${exiting ? 'opacity-0' : 'opacity-100'}`}>
        <StarRoom charging={charging || exiting} />
      </div>
      
      {/* Background Ambience */}
      <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(5,2,10,0.10),rgba(5,2,10,0.46)_62%,rgba(5,2,10,0.74)_100%)] transition-opacity duration-500 ${exiting ? 'opacity-0' : ''}`} />
      <div className={`absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIj48ZmlsdGVyIGlkPSJnoiPjxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjY1IiBudW1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI2cpIiBvcGFjaXR5PSIwLjAzIi8+PC9zdmc+')] opacity-15 mix-blend-screen transition-opacity duration-500 ${exiting ? 'opacity-0' : ''}`} />
      
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
            className={`relative flex items-center justify-center transition-all duration-200 ${coreScale}`}
        >
            <div className="absolute h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.13)_0%,rgba(5,2,10,0.12)_42%,transparent_72%)] blur-sm" />
            {/* Rings */}
            {rings.map((i) => {
                const baseSize = (i + 1) * 48;
                const duration = 24 + i * 2.6;
                // Speed up significantly as charge increases
                const speedMult = (charging ? 3.8 : 1) + (hovering ? 0.35 : 0);
                
                // Color shifts to white hot
                const r = charging ? 245 : 168;
                const g = charging ? 218 : 85;
                const b = 255;
                const opacity = charging ? 0.78 : 0.5;
                const innerOpacity = charging ? 0.34 : 0.18;

                return (
                    <div
                        key={i}
                        className="absolute rounded-full border flex items-center justify-center pointer-events-none transition-all duration-100 z-10 mix-blend-screen"
                        style={{
                            width: `${baseSize}px`,
                            height: `${baseSize}px`,
                            // At 0 charge: Random 3D rotations. At 100 charge: Flatten to 0deg
                            transform: `rotateX(${charging ? 180 : 0}deg) rotateY(${charging ? 180 : 0}deg)`, 
                            borderColor: `rgba(${r}, ${g}, ${b}, ${opacity})`,
                            borderWidth: charging ? '2px' : '1.2px',
                            boxShadow: charging
                              ? `0 0 34px rgba(216,180,254,0.48), inset 0 0 13px rgba(255,255,255,${innerOpacity})`
                              : `0 0 10px rgba(216,180,254,0.24), inset 0 0 4px rgba(255,255,255,${innerOpacity})`,
                            animation: `spin-gyro ${duration / speedMult}s linear infinite ${i % 2 === 0 ? 'reverse' : 'normal'}`,
                        }}
                    >
                         {/* Particle decorations on rings */}
                         <div 
                            className="absolute top-0 w-1 h-1 bg-white rounded-full" 
                            style={{ 
                                boxShadow: charging ? '0 0 48px rgba(255,255,255,0.95)' : '0 0 16px rgba(255,255,255,0.95)',
                                opacity: charging ? 0.9 : 0.54
                            }} 
                         />
                    </div>
                );
            })}

            {/* Central Singularity Orb */}
            <div 
                className={`relative z-20 rounded-full transition-all duration-300 ${!charging && !exiting ? 'animate-pulse-slow' : ''}`}
                style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: charging ? '#ffffff' : '#e9d5ff',
                    // The glow becomes blinding
                    boxShadow: charging
                      ? '0 0 270px 110px rgba(216,180,254,0.82)'
                      : '0 0 40px 20px rgba(147,51,234,0.5)',
                    transform: `scale(${charging ? 3.2 : (hovering ? 1.5 : 1)})`,
                }}
            >
                {/* Inner Void - disappears at high charge */}
                <div className={`absolute inset-0 bg-black rounded-full transform transition-transform duration-300 ${charging ? 'scale-0' : 'scale-75'}`} />
            </div>
            
            {/* Charge Progress Ring */}
            <svg className="absolute z-10 w-48 h-48 rotate-[-90deg] pointer-events-none transition-transform duration-700" style={{ transform: `scale(${charging ? 2 : 1}) rotate(-90deg)` }}>
                 <circle
                    cx="96" cy="96" r="40"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={charging ? 7 : 2}
                    strokeDasharray="251"
                    strokeDashoffset={charging ? 0 : 251}
                    className="transition-[stroke-dashoffset,stroke-width] duration-700 ease-out drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                    strokeLinecap="round"
                    style={{ opacity: charging ? 1 : 0 }}
                 />
            </svg>

            {/* Hint Pulse (Only visible when idle) */}
            {!charging && !hovering && !exiting && (
                <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-purple-500 scale-150 duration-[3s]" />
            )}

        </div>
      </div>

      <style>{`
        @keyframes spin-gyro {
            0% { transform: rotate3d(1, 1, 1, 0deg); }
            100% { transform: rotate3d(1, 1, 1, 360deg); }
        }
        @keyframes star-flight {
            0% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.78; }
            100% { transform: translate3d(-2.2%, 1.5%, 0) scale(1.045); opacity: 0.78; }
        }
        @keyframes star-flight-near {
            0% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.48; }
            100% { transform: translate3d(2.8%, -2%, 0) scale(1.075); opacity: 0.48; }
        }
        .animate-star-flight {
            animation: star-flight 16s ease-in-out infinite alternate;
        }
        .animate-star-flight-fast {
            animation: star-flight 1.35s ease-in forwards;
        }
        .animate-star-flight-near {
            animation: star-flight-near 12s ease-in-out infinite alternate;
        }
        .animate-star-flight-near-fast {
            animation: star-flight-near 1.35s ease-in forwards;
        }
        @keyframes shooting-star {
            0% {
                transform: translate3d(-14vw, 12vh, 0) rotate(var(--angle)) scaleX(0.35);
                opacity: 0;
            }
            10% {
                opacity: var(--opacity);
            }
            55% {
                opacity: var(--opacity);
            }
            100% {
                transform: translate3d(118vw, -34vh, 0) rotate(var(--angle)) scaleX(1);
                opacity: 0;
            }
        }
        .shooting-star {
            position: absolute;
            left: var(--left);
            top: var(--top);
            width: var(--length);
            height: 1px;
            border-radius: 999px;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.86), rgba(165,243,252,0.35), transparent);
            box-shadow: 0 0 10px rgba(216,180,254,0.42);
            transform-origin: center;
            animation: shooting-star var(--duration) linear infinite;
            animation-delay: var(--delay);
            will-change: transform, opacity;
        }
      `}</style>
    </div>
  );
};

interface StarRoomProps {
  charging: boolean;
}

const StarRoom: React.FC<StarRoomProps> = ({ charging }) => {
  const roomRef = useRef<HTMLDivElement | null>(null);
  const farCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const nearCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const tiltRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvases = [
      { canvas: farCanvasRef.current, count: 150, alpha: 0.24, radius: 1.2 },
      { canvas: nearCanvasRef.current, count: 58, alpha: 0.38, radius: 1.8 },
    ];

    const paintLayer = (canvas: HTMLCanvasElement, count: number, alpha: number, radius: number) => {
      const context = canvas.getContext('2d');
      if (!context) return;

      const ratio = Math.min(window.devicePixelRatio || 1, 1.35);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      const gradient = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.72);
      gradient.addColorStop(0, 'rgba(20, 8, 40, 0.08)');
      gradient.addColorStop(0.45, 'rgba(6, 8, 18, 0.24)');
      gradient.addColorStop(1, 'rgba(1, 2, 8, 0.99)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      for (let index = 0; index < count; index += 1) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = Math.random() * radius + 0.35;
        const colorRoll = Math.random();
        const starAlpha = alpha * (0.35 + Math.random() * 0.65);
        context.fillStyle = colorRoll > 0.82
          ? `rgba(125, 211, 252, ${starAlpha})`
          : colorRoll > 0.52
            ? `rgba(216, 180, 254, ${starAlpha})`
            : `rgba(255, 255, 255, ${starAlpha})`;
        context.beginPath();
        context.arc(x, y, size, 0, Math.PI * 2);
        context.fill();
      }
    };

    const resize = () => {
      for (const layer of canvases) {
        if (layer.canvas) paintLayer(layer.canvas, layer.count, layer.alpha, layer.radius);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      mouseRef.current = {
        x: (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2,
        y: (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2,
      };
    };

    const resetPointer = () => {
      mouseRef.current = { x: 0, y: 0 };
    };

    let frameId = 0;
    const animateTilt = () => {
      tiltRef.current.x += (mouseRef.current.x - tiltRef.current.x) * 0.045;
      tiltRef.current.y += (mouseRef.current.y - tiltRef.current.y) * 0.045;

      if (roomRef.current) {
        const x = tiltRef.current.x;
        const y = tiltRef.current.y;
        const rotateX = -y * 2.6;
        const rotateY = x * 3.4;
        const shiftX = x * 10;
        const shiftY = y * 8;
        const scale = charging ? 1.045 : 1.025;
        roomRef.current.style.transform = `perspective(1100px) translate3d(${shiftX}px, ${shiftY}px, 0) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`;
      }

      frameId = window.requestAnimationFrame(animateTilt);
    };

    resize();
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', resetPointer);
    window.addEventListener('resize', resize);
    frameId = window.requestAnimationFrame(animateTilt);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', resetPointer);
      window.removeEventListener('resize', resize);
    };
  }, [charging]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#03040c]">
      <div
        ref={roomRef}
        className="absolute inset-[-7%] will-change-transform"
        style={{
          transformOrigin: '50% 50%',
          transformStyle: 'preserve-3d',
        }}
      >
        <canvas ref={farCanvasRef} className={`absolute inset-[-8%] h-[116%] w-[116%] will-change-transform ${charging ? 'animate-star-flight-fast' : 'animate-star-flight'}`} />
        <canvas ref={nearCanvasRef} className={`absolute inset-[-10%] h-[120%] w-[120%] opacity-70 will-change-transform ${charging ? 'animate-star-flight-near-fast' : 'animate-star-flight-near'}`} />
        {shootingStars.map((star, index) => (
          <span
            key={index}
            className="shooting-star"
            style={{
              '--left': star.left,
              '--top': star.top,
              '--length': star.length,
              '--duration': charging ? star.fastDuration : star.duration,
              '--delay': star.delay,
              '--angle': star.angle,
              '--opacity': charging ? '0.9' : star.opacity,
            } as React.CSSProperties}
          />
        ))}
        <div
          className="absolute inset-[-10%] bg-cover bg-center opacity-7 mix-blend-screen transition-transform duration-300 ease-out"
          style={{
            backgroundImage: "url('/images/stars/star-room-nebula.jpg')",
            transform: 'translateZ(-20px) scale(1.12)',
            filter: `brightness(${charging ? 0.46 : 0.34}) saturate(0.9) contrast(1.02)`,
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 0%, black 54%, transparent 96%)',
            maskImage: 'radial-gradient(ellipse at center, black 0%, black 54%, transparent 96%)',
          }}
        />
        <div
          className="absolute inset-[-12%] bg-cover bg-center opacity-4 mix-blend-screen transition-transform duration-300 ease-out"
          style={{
            backgroundImage: "url('/images/stars/star-room-wide-light.jpg')",
            transform: 'translateZ(-42px) scale(1.16)',
            filter: `brightness(${charging ? 0.38 : 0.28}) saturate(0.78)`,
            WebkitMaskImage: 'radial-gradient(ellipse at 48% 52%, black 0%, black 46%, transparent 90%)',
            maskImage: 'radial-gradient(ellipse at 48% 52%, black 0%, black 46%, transparent 90%)',
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(56,189,248,0.02),transparent_22%,transparent_78%,rgba(168,85,247,0.02)),linear-gradient(180deg,rgba(255,255,255,0.012),transparent_30%,rgba(125,211,252,0.015))]" />

        <div
          className="absolute inset-[-10%] bg-[radial-gradient(circle_at_center,rgba(2,1,7,0.08)_0%,rgba(2,1,7,0.16)_48%,rgba(1,1,6,0.62)_96%)] transition-opacity duration-300"
          style={{ opacity: charging ? 0.5 : 0.68 }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-[52vmin] w-[52vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 shadow-[0_0_80px_rgba(168,85,247,0.18),inset_0_0_70px_rgba(255,255,255,0.04)] transition-transform duration-300 ease-out"
          style={{
            transform: `translate3d(-50%, -50%, 24px) scale(${charging ? 1.1 : 1})`,
          }}
        />
      </div>
    </div>
  );
};

const shootingStars = [
  { left: '-18vw', top: '18vh', length: '110px', duration: '8.5s', fastDuration: '1.4s', delay: '-1.2s', angle: '-18deg', opacity: '0.42' },
  { left: '-24vw', top: '42vh', length: '72px', duration: '11s', fastDuration: '1.7s', delay: '-6.4s', angle: '-16deg', opacity: '0.34' },
  { left: '-12vw', top: '64vh', length: '96px', duration: '9.8s', fastDuration: '1.5s', delay: '-3.5s', angle: '-20deg', opacity: '0.38' },
  { left: '-30vw', top: '78vh', length: '60px', duration: '13s', fastDuration: '1.9s', delay: '-9.1s', angle: '-14deg', opacity: '0.3' },
  { left: '-8vw', top: '30vh', length: '128px', duration: '14s', fastDuration: '1.8s', delay: '-11s', angle: '-17deg', opacity: '0.28' },
  { left: '-20vw', top: '8vh', length: '84px', duration: '10.6s', fastDuration: '1.6s', delay: '-7.8s', angle: '-22deg', opacity: '0.32' },
];
