import React from 'react';
import { ArchetypeId, getArchetypes, ICON_MAP } from '../constants';
import { Language } from '../types';
import { getArchetypeCSSVars, getArchetypeTheme } from '../theme/archetypeTheme';

interface RoundTableProps {
  activeArchetype: ArchetypeId;
  onSelectArchetype: (id: ArchetypeId) => void;
  mini?: boolean;
  language: Language;
}

export const RoundTable: React.FC<RoundTableProps> = ({ activeArchetype, onSelectArchetype, mini = false, language }) => {
  const archetypes = Object.values(getArchetypes(language));
  // Responsive dimensions
  const radius = mini ? 40 : 60; 
  const center = mini ? 50 : 80;
  const activeData = getArchetypes(language)[activeArchetype];
  const activeTheme = getArchetypeTheme(activeArchetype);
  const cssVars = getArchetypeCSSVars(activeArchetype);

  return (
    <div 
      className="flex flex-col items-center relative z-10 transition-all duration-700 animate-float transform-gpu"
      data-archetype={activeArchetype}
      style={cssVars}
    >
      
      {/* Holographic HUD Header - Relative in Flow */}
      {!mini && (
        <div className="flex flex-col items-center justify-center z-30 animate-fade-in -mb-5 pointer-events-none">
            {/* Tech decoration lines */}
            <div className="flex items-center gap-3 opacity-60 mb-2">
                <div className="h-px w-8 bg-gradient-to-r from-transparent to-purple-500" />
                {/* Spectral pulsing indicator */}
                <div className="relative">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-300 shadow-[0_0_10px_currentColor] animate-pulse-glow" />
                  <div className="absolute inset-0 rounded-full bg-purple-400 opacity-50 animate-ping" />
                </div>
                <div className="h-px w-8 bg-gradient-to-l from-transparent to-purple-500" />
            </div>
            
            {/* Label */}
            <div className="text-[8px] text-purple-300/60 tracking-[0.4em] uppercase font-mono mb-1">
                {language === 'DE' ? 'AKTIVE SCHNITTSTELLE' : 'ACTIVE INTERFACE'}
            </div>
            
            {/* Active Name Display - Uses Archetype Color */}
            <div className="relative px-6 md:px-8 py-2.5 md:py-3 group min-h-[2.5rem] md:min-h-[3rem]">
                {/* Glass Container */}
                <div className="absolute inset-0 border border-white/10 rounded-xl transform bg-[#0a0510]/80 backdrop-blur-md shadow-lg" />
                
                {/* Animated Text - Uses CSS Variable for Archetype Color */}
                <h3 
                  className="relative text-xs md:text-sm font-bold tracking-[0.2em] uppercase whitespace-nowrap z-10 transition-all duration-700"
                  style={{
                    color: `rgb(var(--archetype-accent))`,
                    textShadow: `0 0 10px var(--archetype-glow)`,
                  }}
                >
                    {activeData.name}
                </h3>
            </div>

            {/* Data Stream Connection Line */}
            <div className="relative h-8 w-px mt-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-purple-500/30 to-transparent" />
                {/* Moving particle */}
                <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-transparent via-purple-300/80 to-transparent blur-[1px] animate-[float_2s_infinite]" />
            </div>
        </div>
      )}

      {/* Table Container - Responsive Sizing */}
      <div className={`relative ${mini ? 'w-[100px] h-[100px]' : 'w-[160px] h-[160px] md:w-[180px] md:h-[180px]'} flex items-center justify-center group perspective-500`}>
        
        {/* Animated Background Rings */}
        <div className="absolute inset-0 pointer-events-none transform-gpu">
            {/* Outer Base */}
            <div className={`absolute inset-0 rounded-full border ${mini ? 'border-purple-500/20' : 'border-purple-500/10'} bg-gradient-to-b from-violet-900/10 to-transparent shadow-[0_0_60px_rgba(109,40,217,0.15)] backdrop-blur-[1px]`} />
            
            {/* Rotating Ring 1 (Clockwise) */}
            <div className="absolute inset-[8%] rounded-full border border-purple-500/5 border-t-purple-400/20 border-r-purple-400/10 animate-spin-slow" />
            
            {/* Rotating Ring 2 (Counter-Clockwise) */}
            <div className="absolute inset-[22%] rounded-full border border-dashed border-purple-500/10 animate-spin-slow-reverse" />
            
            {/* Static Inner Ring */}
            <div className="absolute inset-[35%] rounded-full border border-purple-500/5 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]" />
        </div>
        
        {/* Central Resonance Core */}
        <div className="absolute z-10 flex items-center justify-center">
           <div className={`${mini ? 'w-8 h-8' : 'w-20 h-20'} rounded-full flex items-center justify-center relative`}>
               {/* Core Outer Glow - Uses CSS Variable */}
               <div 
                 className="absolute inset-0 rounded-full opacity-10 blur-2xl animate-pulse-slow transition-colors duration-700"
                 style={{
                   background: `linear-gradient(to bottom right, rgb(var(--archetype-gradient-from)), rgb(var(--archetype-gradient-to)))`,
                 }}
               />
               
               {/* Core Structure - Dark with Archetype Colored Dot */}
               <div className={`relative w-full h-full rounded-full border border-white/5 bg-[#0a0510]/90 flex items-center justify-center shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-sm overflow-hidden`}>
                  {/* Inner Energy Source - Uses CSS Variable for Archetype Color */}
                  <div 
                    className="w-[30%] h-[30%] rounded-full opacity-90 animate-pulse transition-colors duration-700"
                    style={{
                      backgroundColor: `rgb(var(--archetype-accent-strong))`,
                      boxShadow: `0 0 20px var(--archetype-glow)`,
                    }}
                  />
                  
                  {/* Grid overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:10px_10px] opacity-30" />
                  
                  {/* Scanning Lines */}
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-transparent animate-spin-slow-reverse opacity-40" />
               </div>
               
               {/* Orbiting Electron */}
               <div className="absolute inset-0 border border-white/5 rounded-full animate-[spin_8s_linear_infinite] border-t-purple-400/40" />
               <div className="absolute inset-2 border border-white/5 rounded-full animate-[spin_12s_linear_infinite_reverse] border-b-purple-400/30" />
           </div>
        </div>

        {/* Seats */}
        {archetypes.map((archetype, index) => {
          const angle = (index * 360) / archetypes.length;
          const radian = (angle * Math.PI) / 180;
          const x = center + radius * Math.cos(radian) - (mini ? 12 : 20);
          const y = center + radius * Math.sin(radian) - (mini ? 12 : 20);

          const Icon = ICON_MAP[archetype.iconName];
          const isActive = activeArchetype === archetype.id;

          return (
            <button
              key={archetype.id}
              onClick={() => onSelectArchetype(archetype.id as ArchetypeId)}
              className={`absolute rounded-full flex items-center justify-center transition-all duration-500 group/btn
                ${isActive 
                  ? `scale-110 z-20 bg-transparent text-white ring-2 border-2 border-white/80 backdrop-blur-sm` 
                  : 'bg-transparent text-white/70 hover:text-white hover:scale-110 border border-white/20 backdrop-blur-sm hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:border-white/40'
                }`}
              style={{
                left: `${x}px`,
                top: `${y}px`,
                width: `${mini ? 24 : 40}px`,
                height: `${mini ? 24 : 40}px`,
                ...(isActive ? {
                  boxShadow: `0 0 25px var(--archetype-glow)`,
                  borderColor: `var(--archetype-ring)`,
                } : {}),
              }}
              title={archetype.name}
            >
              {/* Active glow - Uses CSS Variable for Archetype Color */}
              {isActive && (
                <>
                  <div 
                    className="absolute inset-0 rounded-full animate-pulse-subtle blur-sm"
                    style={{
                      backgroundColor: `var(--archetype-glow)`,
                      opacity: 0.3,
                    }}
                  />
                  <div 
                    className="absolute inset-[-2px] rounded-full border animate-pulse"
                    style={{
                      borderColor: `var(--archetype-ring)`,
                    }}
                  />
                </>
              )}
              
              <Icon 
                size={mini ? 12 : 20} 
                strokeWidth={isActive ? 2.5 : 1.5} 
                className={`relative z-10 transition-transform duration-300 group-hover/btn:scale-110 ${isActive ? 'text-white' : 'text-white/70'}`}
                style={isActive ? {
                  filter: `drop-shadow(0 0 8px var(--archetype-glow))`,
                } : {}}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};