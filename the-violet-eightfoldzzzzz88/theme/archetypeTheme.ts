// Archetype Theme System - Single Source of Truth
// Uses RGB values for CSS variables (production-safe, no Tailwind purging)

import { ArchetypeId } from '../constants';

export interface ArchetypeTheme {
  accent: string;        // Main accent color (RGB)
  accentStrong: string;  // Stronger variant for highlights (RGB)
  glow: string;          // Glow color with opacity (rgba)
  ring: string;          // Ring/border color with opacity (rgba)
  gradientFrom: string; // Gradient start (RGB)
  gradientTo: string;    // Gradient end (RGB)
}

// RGB color mappings based on Tailwind defaults
// SOVEREIGN: amber-400 to orange-500
// WARRIOR: red-500 to rose-600
// SAGE: blue-400 to indigo-500
// LOVER: pink-500 to fuchsia-500
// CREATOR: purple-400 to violet-500
// CAREGIVER: teal-400 to emerald-500
// EXPLORER: green-400 to lime-500
// ALCHEMIST: slate-500 to zinc-600

export const ARCHETYPE_THEME: Record<ArchetypeId, ArchetypeTheme> = {
  [ArchetypeId.SOVEREIGN]: {
    accent: '251, 191, 36',           // amber-400
    accentStrong: '249, 115, 22',     // orange-500
    glow: 'rgba(251, 191, 36, 0.6)',  // amber-400 with opacity
    ring: 'rgba(251, 191, 36, 0.8)',  // amber-400 with opacity
    gradientFrom: '251, 191, 36',     // amber-400
    gradientTo: '249, 115, 22',       // orange-500
  },
  [ArchetypeId.WARRIOR]: {
    accent: '239, 68, 68',            // red-500
    accentStrong: '225, 29, 72',      // rose-600
    glow: 'rgba(239, 68, 68, 0.6)',
    ring: 'rgba(239, 68, 68, 0.8)',
    gradientFrom: '239, 68, 68',
    gradientTo: '225, 29, 72',
  },
  [ArchetypeId.SAGE]: {
    accent: '96, 165, 250',           // blue-400
    accentStrong: '99, 102, 241',     // indigo-500
    glow: 'rgba(96, 165, 250, 0.6)',
    ring: 'rgba(96, 165, 250, 0.8)',
    gradientFrom: '96, 165, 250',
    gradientTo: '99, 102, 241',
  },
  [ArchetypeId.LOVER]: {
    accent: '236, 72, 153',           // pink-500
    accentStrong: '217, 70, 239',     // fuchsia-500
    glow: 'rgba(236, 72, 153, 0.6)',
    ring: 'rgba(236, 72, 153, 0.8)',
    gradientFrom: '236, 72, 153',
    gradientTo: '217, 70, 239',
  },
  [ArchetypeId.CREATOR]: {
    accent: '168, 85, 247',           // purple-400
    accentStrong: '139, 92, 246',     // violet-500
    glow: 'rgba(168, 85, 247, 0.6)',
    ring: 'rgba(168, 85, 247, 0.8)',
    gradientFrom: '168, 85, 247',
    gradientTo: '139, 92, 246',
  },
  [ArchetypeId.CAREGIVER]: {
    accent: '45, 212, 191',           // teal-400
    accentStrong: '16, 185, 129',     // emerald-500
    glow: 'rgba(45, 212, 191, 0.6)',
    ring: 'rgba(45, 212, 191, 0.8)',
    gradientFrom: '45, 212, 191',
    gradientTo: '16, 185, 129',
  },
  [ArchetypeId.EXPLORER]: {
    accent: '74, 222, 128',           // green-400
    accentStrong: '132, 204, 22',    // lime-500
    glow: 'rgba(74, 222, 128, 0.6)',
    ring: 'rgba(74, 222, 128, 0.8)',
    gradientFrom: '74, 222, 128',
    gradientTo: '132, 204, 22',
  },
  [ArchetypeId.ALCHEMIST]: {
    accent: '100, 116, 139',         // slate-500
    accentStrong: '82, 82, 91',      // zinc-600
    glow: 'rgba(100, 116, 139, 0.6)',
    ring: 'rgba(100, 116, 139, 0.8)',
    gradientFrom: '100, 116, 139',
    gradientTo: '82, 82, 91',
  },
};

// Helper function to generate CSS variables object
export const getArchetypeCSSVars = (archetypeId: ArchetypeId): React.CSSProperties => {
  const theme = ARCHETYPE_THEME[archetypeId];
  return {
    '--archetype-accent': theme.accent,
    '--archetype-accent-strong': theme.accentStrong,
    '--archetype-glow': theme.glow,
    '--archetype-ring': theme.ring,
    '--archetype-gradient-from': theme.gradientFrom,
    '--archetype-gradient-to': theme.gradientTo,
  } as React.CSSProperties;
};

// Helper to get theme object
export const getArchetypeTheme = (archetypeId: ArchetypeId): ArchetypeTheme => {
  return ARCHETYPE_THEME[archetypeId];
};

