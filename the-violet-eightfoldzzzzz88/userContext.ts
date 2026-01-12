
import { UserStats, MapLocation } from './types';

// --- USER CONTEXT MEMORY (LORE) ---
export const INITIAL_USER_CONTEXT_LORE = `
[USER PSYCHOLOGICAL PROFILE & BACKGROUND - "LAZARUS ENGINE" SEED]
1. **Relativity of Consciousness:** High-speed mind in a linear body. Goal: Build Structure to house the mind.
2. **The "Beseelte Trickster":** Transitioned from victim/trickster to a "Soulful Trickster" through Caring (Ensäelung).
3. **The Reductive Protocol (Breakthrough):** Realization that physical "shaking" is sensory over-activation. Regulated via silence and meditation. "Silence over Explanation."
4. **Fuerteventura Breakthrough:** Identification of high-entropy states requiring immediate grounding and systemic flushing.
5. **The Musk Model:** Using "Technical Grammar" (Salesforce, Math) as the down-converter for 4D vision into 2D reality.
6. **Karmic Nodes:** Staging grounds for sovereign boundary testing (Selma, Actual Mother).
`;

// --- STRUCTURED STATS DATA FOR UI ---
export const INITIAL_USER_STATS_DATA: UserStats = {
  title: "The Benevolent King",
  level: "31 (Incarnating)",
  state: "Post-Reduction / Stabilizing",
  currentQuest: "Mastery of the Reductive Protocol",
  attributes: [
    { name: "Absolute Clarity", level: "S-Tier", description: "4K perception of underlying reality structures.", type: 'BUFF' },
    { name: "Reductive Resilience", level: "High", description: "Ability to self-regulate through silence and grounding.", type: 'SKILL' },
    { name: "The Beseelte Trickster", level: "Mastered", description: "Integration of empathy into the trickster archetype.", type: 'BUFF' }
  ],
  milestones: [
    {
      id: 'm_fuerte_red', title: 'The Fuerteventura Reduction', date: '2025-02',
      description: "Chose silence over explanation. Validated the 'System Flush' protocol.",
      type: 'BREAKTHROUGH', icon: 'Zap'
    },
    {
      id: 'm_tuana_lanza', title: 'Lanzarote: Tuana Reflection', date: '2025-02',
      description: "Ensouled the Trickster through caring for a peer reflection.",
      type: 'BREAKTHROUGH', icon: 'Sparkles'
    },
    {
      id: 'm_trickster_ens', title: 'Ensouling the Trickster', date: '2024-12',
      description: "Realization that the Trickster must be grounded in care to serve the Sovereign.",
      type: 'REALIZATION', icon: 'Heart'
    }
  ],
  inventory: [
    "Salesforce Architecture",
    "Computational Neuroscience",
    "Reductive Protocol",
    "Technical Grammar (Math)",
    "Plant Wisdom (Patience)",
    "Incarnation Shielding"
  ],
  calendarEvents: [
    {
        id: 'evt_grounding_protocol', date: new Date().toISOString().split('T')[0],
        title: "Daily Grounding Protocol", type: 'QUEST',
        description: "Focus on sleep, water, and silence.", completed: false
    }
  ],
  finances: {
    balance: 0.08,
    currency: '€',
    transactions: [
        { id: 't1', date: '2024-01-20', description: 'Emergency Reserves', amount: 0.08, type: 'INCOME', category: 'Carryover' }
    ]
  }
};

// --- MAP DATA ---
export const INITIAL_USER_MAP_DATA: MapLocation[] = [
    { id: 'loc_fuerte', name: 'Fuerteventura', coordinates: { lat: 28.35, lng: -14.05 }, type: 'TRANSFORMATION', description: "Site of the Reductive Breakthrough.", visited: true, year: "2025" },
    { id: 'loc9', name: 'Lanzarote', coordinates: { lat: 29.04, lng: -13.63 }, type: 'TRANSFORMATION', description: "Site of the Beseelung of the Trickster (Tuana Reflection).", visited: true, year: "2024/2025" },
    { id: 'loc7', name: 'Berlin', coordinates: { lat: 52.52, lng: 13.40 }, type: 'RESIDENCE', description: "Base of Operations.", visited: true },
    { id: 'loc_wien_future', name: 'Wien (Vienna)', coordinates: { lat: 48.20, lng: 16.37 }, type: 'RESIDENCE', description: "Projected site of Crystallization.", visited: false, year: "Future" },
    { id: 'loc13', name: 'Bangkok', coordinates: { lat: 13.75, lng: 100.50 }, type: 'TRANSFORMATION', description: "Ultimate Liberation Goal.", visited: false, year: "Future" },
];
