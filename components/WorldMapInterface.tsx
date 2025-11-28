
import React, { useState, useMemo } from 'react';
import { MapLocation } from '../types';
import { Navigation, Shield, Skull, Home, Anchor, Zap, Crosshair, Map as MapIcon, Info } from 'lucide-react';

interface WorldMapInterfaceProps {
    mapData: MapLocation[];
}

// Simplified High-Quality World Map Paths (Equirectangular Projection)
// These look much better than triangles but are optimized for file size.
const WORLD_PATHS = [
    // North America
    "M 165 55 L 175 60 L 170 75 L 155 85 L 135 75 L 125 60 L 140 50 Z M 260 65 L 290 55 L 320 60 L 300 85 L 275 80 Z M 100 85 L 130 90 L 160 110 L 190 100 L 230 110 L 250 140 L 230 170 L 210 165 L 190 180 L 170 170 L 160 210 L 180 230 L 195 235 L 210 260 L 225 285 L 235 295 L 245 285 L 215 240 L 175 200 L 135 170 L 90 150 L 50 120 L 30 100 L 60 85 Z",
    // South America
    "M 235 295 L 255 300 L 295 330 L 325 360 L 295 430 L 265 480 L 245 490 L 225 430 L 215 380 L 205 340 L 225 310 Z",
    // Europe & Asia (Combined for simplicity/continuity)
    "M 450 135 L 435 150 L 420 145 L 415 160 L 430 170 L 440 165 L 450 180 L 465 175 L 475 185 L 490 180 L 500 190 L 515 185 L 530 200 L 550 195 L 575 220 L 600 230 L 630 220 L 650 240 L 675 245 L 700 230 L 730 220 L 760 210 L 780 180 L 820 150 L 850 140 L 900 140 L 950 130 L 970 110 L 920 100 L 850 80 L 780 70 L 700 75 L 620 80 L 560 75 L 520 85 L 485 110 L 470 125 Z",
    // Africa
    "M 415 160 L 400 180 L 380 185 L 375 210 L 390 240 L 415 250 L 430 280 L 450 320 L 480 350 L 520 380 L 550 400 L 580 380 L 570 340 L 590 310 L 600 280 L 575 260 L 550 250 L 530 220 L 510 210 L 480 200 L 460 190 L 440 185 Z",
    // Australia
    "M 780 340 L 820 330 L 860 340 L 900 370 L 880 410 L 840 420 L 800 410 L 770 380 Z",
    // Greenland
    "M 290 40 L 330 35 L 360 45 L 350 70 L 310 80 L 290 60 Z",
    // UK
    "M 430 115 L 450 110 L 455 130 L 440 140 L 425 130 Z",
    // Japan
    "M 900 160 L 920 150 L 930 170 L 910 180 Z",
    // Madagascar
    "M 590 330 L 610 320 L 615 360 L 600 370 Z"
];

export const WorldMapInterface: React.FC<WorldMapInterfaceProps> = ({ mapData }) => {
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);

  // Safety: Ensure locations is an array
  const locations = Array.isArray(mapData) ? mapData : [];

  // Standard Equirectangular Projection
  // Map dimensions: 1000x500
  // Lat: 90 (top) to -90 (bottom) -> y: 0 to 500
  // Lng: -180 (left) to 180 (right) -> x: 0 to 1000
  const getXY = (lat: number, lng: number) => {
    // Clamp values to avoid out of bounds
    const safeLat = Math.max(-90, Math.min(90, lat));
    const safeLng = Math.max(-180, Math.min(180, lng));
    
    const x = (safeLng + 180) * (1000 / 360);
    const y = (90 - safeLat) * (500 / 180);
    return { x, y };
  };

  const getLocationColor = (type: MapLocation['type']) => {
    switch (type) {
        case 'ORIGIN': return 'text-amber-400 border-amber-500 shadow-amber-500/50';
        case 'RESIDENCE': return 'text-cyan-400 border-cyan-500 shadow-cyan-500/50';
        case 'SHADOW_REALM': return 'text-purple-500 border-purple-600 shadow-purple-600/50';
        case 'TRAUMA': return 'text-red-500 border-red-600 shadow-red-600/50';
        case 'TRANSFORMATION': return 'text-emerald-400 border-emerald-500 shadow-emerald-500/50';
        case 'VACATION': return 'text-pink-400 border-pink-500 shadow-pink-500/50';
        default: return 'text-white border-white shadow-white/50';
    }
  };

  const getLocationIcon = (type: MapLocation['type']) => {
    switch (type) {
        case 'SHADOW_REALM': return Skull;
        case 'TRAUMA': return Shield;
        case 'TRANSFORMATION': return Zap;
        case 'RESIDENCE': return Home;
        case 'ORIGIN': return Anchor;
        case 'VACATION': return MapIcon;
        default: return Navigation;
    }
  };

  // Define lines for the "Life Path" - Using Quadratic Curves for "Flight Path" look
  const pathSequence = ['loc1', 'loc2', 'loc3', 'loc6', 'loc7'];
  
  // Calculate curves
  const flightPaths = useMemo(() => {
    const paths = [];
    if (!locations.length) return [];

    for (let i = 0; i < pathSequence.length - 1; i++) {
        const startLoc = locations.find(l => l.id === pathSequence[i]);
        const endLoc = locations.find(l => l.id === pathSequence[i+1]);
        
        if (startLoc && endLoc) {
            const start = getXY(startLoc.coordinates.lat, startLoc.coordinates.lng);
            const end = getXY(endLoc.coordinates.lat, endLoc.coordinates.lng);
            
            // Calculate a control point to create an arc
            // The arc should rise "up" (lower Y value)
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;
            
            // Arc height depends on distance
            const dist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
            const arcHeight = dist * 0.2; 
            
            const controlX = midX;
            const controlY = midY - arcHeight;

            paths.push(`M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`);
        }
    }
    return paths;
  }, [locations, pathSequence]);

  return (
    <div className="flex-1 w-full h-full relative overflow-hidden bg-[#05020a] flex flex-col font-sans">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(76,29,149,0.1),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] opacity-20 pointer-events-none" />

      {/* Header HUD */}
      <div className="absolute top-8 left-8 z-30 pointer-events-none animate-fade-in-up">
         <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-8 bg-purple-500/80 rounded-sm shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
            <div>
                <h2 className="text-2xl font-bold text-white uppercase tracking-[0.2em] drop-shadow-md">
                    Psychogeography
                </h2>
                <div className="flex items-center gap-2 text-[10px] text-purple-400/80 tracking-[0.3em] uppercase font-mono">
                    <Crosshair size={10} />
                    <span>Global Incarnation Grid</span>
                </div>
            </div>
         </div>
      </div>

      {/* Map Container - Centered */}
      <div className="flex-1 relative flex items-center justify-center p-4 md:p-10 perspective-1000 overflow-hidden">
        
        {/* The Holographic Map Card */}
        <div className="relative w-full max-w-7xl aspect-[2/1] bg-[#0f0716]/80 border border-purple-500/20 rounded-lg shadow-[0_0_100px_rgba(0,0,0,0.8)] backdrop-blur-sm group overflow-hidden transform transition-transform duration-1000 hover:scale-[1.01]">
           
           {/* Scanline Effect */}
           <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[size:100%_4px] opacity-10 pointer-events-none z-20" />
           <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none z-20 animate-pulse-slow" />
           
           {/* Radar Sweep Animation */}
           <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,transparent_300deg,rgba(168,85,247,0.1)_360deg)] animate-[spin_10s_linear_infinite] pointer-events-none z-10 opacity-30 rounded-full scale-150" />

           {/* Grid Overlay inside map */}
           <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-20" />

           {/* Interactive SVG Layer */}
           <svg viewBox="0 0 1000 500" className="w-full h-full relative z-10">
              <defs>
                <filter id="glow-map">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <pattern id="gridPattern" width="10" height="10" patternUnits="userSpaceOnUse">
                   <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(139, 92, 246, 0.2)" strokeWidth="0.5"/>
                </pattern>
                <linearGradient id="flightGradient" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100%" y2="0">
                    <stop offset="0%" stopColor="transparent" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>
              
              {/* World Continents */}
              <g fill="url(#gridPattern)" stroke="#4338ca" strokeWidth="0.8" filter="url(#glow-map)">
                 {WORLD_PATHS.map((path, idx) => (
                    <path key={idx} d={path} className="fill-[#1e1b4b]/60 hover:fill-[#312e81]/80 transition-colors duration-500" />
                 ))}
              </g>

              {/* Flight Paths (Curves) */}
              <g fill="none" strokeWidth="1.5" strokeLinecap="round" opacity="0.6">
                  {flightPaths.map((d, i) => (
                      <path key={i} d={d} stroke="url(#flightGradient)" strokeDasharray="4 4" className="animate-[dash_30s_linear_infinite]" />
                  ))}
                  <style>{`@keyframes dash { to { stroke-dashoffset: -1000; } }`}</style>
              </g>

              {/* Interactive Locations */}
              {locations.map((loc) => {
                const { x, y } = getXY(loc.coordinates.lat, loc.coordinates.lng);
                const isSelected = selectedLocation?.id === loc.id;
                
                // Color mapping
                let mainColor = "#a78bfa"; // Default purple
                if (loc.type === 'ORIGIN') mainColor = "#fbbf24"; // Amber
                if (loc.type === 'TRAUMA') mainColor = "#ef4444"; // Red
                if (loc.type === 'TRANSFORMATION') mainColor = "#10b981"; // Emerald
                if (loc.type === 'RESIDENCE') mainColor = "#22d3ee"; // Cyan
                if (loc.type === 'SHADOW_REALM') mainColor = "#9333ea"; // Dark Purple

                return (
                    <g key={loc.id} 
                       onClick={() => setSelectedLocation(loc)} 
                       className="cursor-pointer group/node"
                       style={{ transformOrigin: `${x}px ${y}px` }}
                    >
                        {/* Hover/Selection Target (Invisible but large) */}
                        <circle cx={x} cy={y} r={15} fill="transparent" />
                        
                        {/* Connecting Line to "Ground" (Simulating altitude for importance) */}
                        {isSelected && (
                             <line x1={x} y1={y} x2={x} y2={y} stroke={mainColor} strokeWidth="1" className="animate-fade-in" />
                        )}

                        {/* Outer Ripple (Ping) */}
                        <circle cx={x} cy={y} r={isSelected ? 12 : 4} 
                                stroke={mainColor} strokeWidth="1" fill="none" opacity="0.6"
                                className={isSelected ? "animate-ping" : "group-hover/node:animate-ping opacity-0 group-hover/node:opacity-50"} 
                        />

                        {/* Core Marker */}
                        <circle cx={x} cy={y} r={isSelected ? 5 : 3} 
                                fill={mainColor} 
                                stroke="white" strokeWidth={isSelected ? 1.5 : 0}
                                className="transition-all duration-300 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" 
                        />

                        {/* Label (On Hover/Select) */}
                        <g className={`transition-opacity duration-300 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover/node:opacity-100'}`}>
                            <rect x={x + 8} y={y - 12} width={loc.name.length * 7 + 10} height="16" rx="2" fill="#0f0716" stroke={mainColor} strokeWidth="0.5" opacity="0.9" />
                            <text x={x + 13} y={y} fill="white" fontSize="9" fontWeight="bold" className="uppercase font-mono tracking-wide">
                                {loc.name}
                            </text>
                        </g>
                    </g>
                );
              })}
           </svg>
           
        </div>

        {/* Info HUD Side Panel (Right) - Appears on Selection */}
        {selectedLocation && (
            <div className="absolute right-4 md:right-10 top-1/2 -translate-y-1/2 w-80 z-40 animate-fade-in-up">
                <div className={`relative bg-[#0a0510]/95 backdrop-blur-xl border border-l-4 rounded-xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden ${getLocationColor(selectedLocation.type).split(' ')[1]}`}>
                    
                    {/* Decorative Background Icon */}
                    <div className="absolute -right-6 -bottom-6 opacity-5 rotate-12">
                        {(() => { const Icon = getLocationIcon(selectedLocation.type); return <Icon size={120} />; })()}
                    </div>

                    <div className="flex justify-between items-start mb-2 relative z-10">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono mb-1">Sector Analysis</span>
                            <h3 className="text-xl font-bold text-white uppercase tracking-wider drop-shadow-md">
                                {selectedLocation.name}
                            </h3>
                        </div>
                        <button onClick={() => setSelectedLocation(null)} className="text-white/40 hover:text-white transition-colors">✕</button>
                    </div>

                    <div className="h-px w-full bg-gradient-to-r from-white/20 to-transparent my-4" />

                    {/* Metadata Tags */}
                    <div className="flex flex-wrap gap-2 mb-4 relative z-10">
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded border bg-black/20 text-[10px] font-bold uppercase tracking-wider shadow-sm ${getLocationColor(selectedLocation.type)}`}>
                            {(() => { const Icon = getLocationIcon(selectedLocation.type); return <Icon size={10} />; })()}
                            {selectedLocation.type.replace('_', ' ')}
                        </div>
                        
                        {selectedLocation.year && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-white/10 bg-white/5 text-[10px] text-white/70 uppercase tracking-wider font-mono">
                                <span>T: {selectedLocation.year}</span>
                            </div>
                        )}
                        
                        {selectedLocation.visited && (
                             <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-emerald-500/20 bg-emerald-900/10 text-[10px] text-emerald-400 uppercase tracking-wider font-mono">
                                <span>SYNCED</span>
                            </div>
                        )}
                    </div>

                    <div className="bg-[#150a26]/50 rounded-lg p-3 border border-white/5 mb-2 relative z-10">
                         <p className="text-sm text-purple-100/80 leading-relaxed font-light font-sans">
                            {selectedLocation.description}
                        </p>
                    </div>
                    
                    <div className="text-[9px] text-white/20 font-mono mt-2 text-right">
                        LAT: {selectedLocation.coordinates.lat.toFixed(4)} | LNG: {selectedLocation.coordinates.lng.toFixed(4)}
                    </div>
                </div>
            </div>
        )}

        {/* Empty State Prompt */}
        {!selectedLocation && (
            <div className="absolute bottom-8 text-center animate-pulse-subtle pointer-events-none">
                 <div className="flex flex-col items-center gap-2 text-purple-400/50">
                    <Info size={16} />
                    <span className="text-[10px] uppercase tracking-[0.3em]">Select a node to decrypt memory fragments</span>
                 </div>
            </div>
        )}

      </div>
    </div>
  );
};
