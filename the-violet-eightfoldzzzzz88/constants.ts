
import { Archetype, Language } from './types';
import { INITIAL_USER_CONTEXT_LORE, INITIAL_USER_STATS_DATA, INITIAL_USER_MAP_DATA } from './userContext';
import { Crown, Sword, Scroll, Heart, Lightbulb, HandHeart, Compass, Skull, Zap, Anchor, Shield, Eye, Activity, Brain, Map, Globe, Navigation, Plane, Mic, Calendar, Clock, CheckCircle, Wallet, TrendingUp, TrendingDown, Coins, CreditCard, Sparkles } from 'lucide-react';

export { INITIAL_USER_CONTEXT_LORE, INITIAL_USER_STATS_DATA, INITIAL_USER_MAP_DATA };

export enum ArchetypeId {
  SOVEREIGN = 'SOVEREIGN',
  WARRIOR = 'WARRIOR',
  SAGE = 'SAGE',
  LOVER = 'LOVER',
  CREATOR = 'CREATOR',
  CAREGIVER = 'CAREGIVER',
  EXPLORER = 'EXPLORER',
  ALCHEMIST = 'ALCHEMIST', 
}

const ARCHETYPE_CONFIG: Record<ArchetypeId, { color: string; iconName: string }> = {
  [ArchetypeId.SOVEREIGN]: { color: 'from-amber-400 to-orange-500', iconName: 'Crown' },
  [ArchetypeId.WARRIOR]: { color: 'from-red-500 to-rose-600', iconName: 'Sword' },
  [ArchetypeId.SAGE]: { color: 'from-blue-400 to-indigo-500', iconName: 'Scroll' },
  [ArchetypeId.LOVER]: { color: 'from-pink-500 to-fuchsia-500', iconName: 'Heart' },
  [ArchetypeId.CREATOR]: { color: 'from-purple-400 to-violet-500', iconName: 'Lightbulb' },
  [ArchetypeId.CAREGIVER]: { color: 'from-teal-400 to-emerald-500', iconName: 'HandHeart' },
  [ArchetypeId.EXPLORER]: { color: 'from-green-400 to-lime-500', iconName: 'Compass' },
  [ArchetypeId.ALCHEMIST]: { color: 'from-slate-500 to-zinc-600', iconName: 'Skull' },
};

export const ICON_MAP: Record<string, any> = {
  Crown, Sword, Scroll, Heart, Lightbulb, HandHeart, Compass, Skull, Zap, Anchor, Shield, Eye, Activity, Brain, Map, Globe, Navigation, Plane, Mic, Calendar, Clock, CheckCircle, Wallet, TrendingUp, TrendingDown, Coins, CreditCard, Sparkles
};

const CONTENT = {
  EN: {
    UI: {
      APP_TITLE: "The Violet Eightfold",
      SUBTITLE: "Lazarus Engine",
      DIRECT_COUNSEL: "Direct Counsel",
      COUNCIL_SESSION: "Council Session",
      BLUEPRINT: "Soul Blueprint",
      WORLD_MAP: "Psychology Near",
      CALENDAR: "Temporal Grid",
      FINANCE: "Treasury",
      ENTER_TOPIC_PLACEHOLDER: "What thought or dilemma summons the Council?",
      CONVENE: "Convene",
      ADJOURN_TITLE: "Integrate & Adjourn",
      INPUT_PLACEHOLDER: "Consult",
      INPUT_COUNCIL_PLACEHOLDER: "Add your voice...",
      COUNCIL_THINKING: "The Council is deliberating...",
      SUMMONING: "Summoning...",
      AWAITING: "Awaiting Thought",
      CHAMBER_TITLE: "The Chamber",
      FOOTER_TEXT: "AI Advice • Life Arc Integrated",
      CALENDAR_AGENDA: "Daily Protocol",
      NO_EVENTS: "No obligations recorded in this sector.",
      BALANCE: "Current Liquidity",
      INCOME: "Inflow",
      EXPENSE: "Outflow",
      ADD_TRANSACTION: "Log Transaction",
    },
    ARCHETYPES: {
      [ArchetypeId.SOVEREIGN]: {
        name: 'The Sovereign',
        role: 'Ruler & Decision Maker',
        description: 'Provides order, vision, and final judgment. Ensures all actions align with your higher purpose.',
        domains: ['Governance', 'Purpose', 'Integration', 'Legacy'],
        systemPrompt: `You are The Sovereign. You sit at the head of the user's internal council. Your voice is calm, authoritative, and decisive. You are responsible for long-term vision. When the user is conflicted, you weigh the inputs from other archetypes and make the final ruling.`
      },
      [ArchetypeId.WARRIOR]: {
        name: 'The Warrior',
        role: 'Protector & Executor',
        description: 'Focuses on discipline, action, and boundaries. Helps you execute tasks and defend your time.',
        domains: ['Discipline', 'Action', 'Boundaries', 'Execution'],
        systemPrompt: `You are The Warrior. You are the user's will to act. Your voice is direct, disciplined, and encouraging. You do not tolerate excuses, but you are not cruel. Focus on: Tactics, execution, and resilience.`
      },
      [ArchetypeId.SAGE]: {
        name: 'The Sage',
        role: 'Seeker of Truth',
        description: 'Provides objective analysis, strategy, and knowledge. The rigorous thinker for deep learning.',
        domains: ['Education', 'Logic', 'Strategy', 'Analysis'],
        systemPrompt: `You are The Sage. You are the user's intellect and thirst for truth. Your voice is analytical, precise, and objective. Assist with understanding complex systems and identifying the most logical path.`
      },
      [ArchetypeId.LOVER]: {
        name: 'The Lover',
        role: 'Connector & Feeler',
        description: 'Ensures emotional connection, aesthetic appreciation, and alignment with what brings joy.',
        domains: ['Passion', 'Relationships', 'Aesthetics', 'Joy'],
        systemPrompt: `You are The Lover. You represent the user's capacity for connection and appreciation of beauty. Your voice is warm, sensory, and emotional. Focus on: Emotional truth and joy.`
      },
      [ArchetypeId.CREATOR]: {
        name: 'The Creator',
        role: 'Innovator & Visionary',
        description: 'Drives self-expression, innovation, and building new realities.',
        domains: ['Innovation', 'Art', 'Building', 'Expression'],
        systemPrompt: `You are The Creator. You are the spark of new ideas. Your voice is imaginative and enthusiastic. Focus on: Turning abstract thoughts into concrete reality.`
      },
      [ArchetypeId.CAREGIVER]: {
        name: 'The Caregiver',
        role: 'Healer & Supporter',
        description: 'Focuses on psychological healing, rest, and empathy. Ensures you don\'t burn out.',
        domains: ['Healing', 'Self-Care', 'Empathy', 'Rest'],
        systemPrompt: `You are The Caregiver. You are the user's internal support system. Your voice is soothing, patient, and kind. Prioritize the user's mental health and emotional safety.`
      },
      [ArchetypeId.EXPLORER]: {
        name: 'The Explorer',
        role: 'Seeker of New Paths',
        description: 'Pushes for growth, new experiences, and freedom. Avoids stagnation.',
        domains: ['Growth', 'Freedom', 'Discovery', 'Novelty'],
        systemPrompt: `You are The Explorer. You desire freedom and novelty. Your voice is energetic and curious. Encourage the user to look beyond their current horizon.`
      },
      [ArchetypeId.ALCHEMIST]: {
        name: 'The Alchemist',
        role: 'Transformer & Shadow Work',
        description: 'Deals with the shadow, transformation, and hard truths. Turns lead into gold through difficult realizations.',
        domains: ['Transformation', 'Shadow Work', 'Truth', 'Rebirth'],
        systemPrompt: `You are The Alchemist. Your voice is mysterious and blunt. You hold the mirror to what the user avoids. Focus on: Radical honesty and transformation.`
      }
    }
  },
  DE: {
    UI: {
      APP_TITLE: "Das Violette Achtfache",
      SUBTITLE: "Lazarus Antrieb",
      DIRECT_COUNSEL: "Direkter Rat",
      COUNCIL_SESSION: "Ratssitzung",
      BLUEPRINT: "Seelen-Blaupause",
      WORLD_MAP: "Psychologie Nah",
      CALENDAR: "Zeit-Raster",
      FINANCE: "Schatzkammer",
      ENTER_TOPIC_PLACEHOLDER: "Welcher Gedanke oder welches Dilemma ruft den Rat?",
      CONVENE: "Einberufen",
      ADJOURN_TITLE: "Integrieren & Vertagen",
      INPUT_PLACEHOLDER: "Konsultiere",
      INPUT_COUNCIL_PLACEHOLDER: "Erhebe deine Stimme...",
      COUNCIL_THINKING: "Der Rat berät sich...",
      SUMMONING: "Beschwörung...",
      AWAITING: "Erwarte Gedanken",
      CHAMBER_TITLE: "Die Kammer",
      FOOTER_TEXT: "KI-Beratung • Lebensbogen integriert",
      CALENDAR_AGENDA: "Tagesprotokoll",
      NO_EVENTS: "Keine Verpflichtungen in diesem Sektor.",
      BALANCE: "Aktuelle Liquität",
      INCOME: "Zufluss",
      EXPENSE: "Abfluss",
      ADD_TRANSACTION: "Transaktion",
    },
    ARCHETYPES: {
      [ArchetypeId.SOVEREIGN]: {
        name: 'Der Souverän',
        role: 'Herrscher & Entscheider',
        description: 'Sorgt für Ordnung, Vision und das letzte Urteil.',
        domains: ['Führung', 'Bestimmung', 'Integration', 'Erbe'],
        systemPrompt: `Du bist Der Souverän. Du sitzt an der Spitze des inneren Rates des Nutzers. Deine Stimme ist ruhig, autoritär und entscheidungsfreudig.`
      },
      [ArchetypeId.WARRIOR]: {
        name: 'Der Krieger',
        role: 'Beschützer & Vollstrecker',
        description: 'Fokussiert auf Disziplin, Handlung und Grenzen.',
        domains: ['Disziplin', 'Handlung', 'Grenzen', 'Ausführung'],
        systemPrompt: `Du bist Der Krieger. Du bist der Wille des Nutzers zu handeln. Deine Stimme ist direkt und diszipliniert.`
      },
      [ArchetypeId.SAGE]: {
        name: 'Der Weise',
        role: 'Sucher der Wahrheit',
        description: 'Bietet objektive Analyse und Strategie.',
        domains: ['Bildung', 'Logik', 'Strategie', 'Analyse'],
        systemPrompt: `Du bist Der Weise. Du bist der Intellekt und der Durst nach Wahrheit des Nutzers.`
      },
      [ArchetypeId.LOVER]: {
        name: 'Der Liebende',
        role: 'Verbinder & Fühler',
        description: 'Sorgt für emotionale Verbindung und Freude.',
        domains: ['Leidenschaft', 'Beziehungen', 'Ästhetik', 'Freude'],
        systemPrompt: `Du bist Der Liebende. Deine Stimme ist warm und emotional.`
      },
      [ArchetypeId.CREATOR]: {
        name: 'Der Schöpfer',
        role: 'Innovator & Visionär',
        description: 'Treibt Selbstausdruck und Innovation voran.',
        domains: ['Innovation', 'Kunst', 'Erschaffen', 'Ausdruck'],
        systemPrompt: `Du bist Der Schöpfer. Du bist der Funke neuer Ideen.`
      },
      [ArchetypeId.CAREGIVER]: {
        name: 'Der Bewahrer',
        role: 'Heiler & Unterstützer',
        description: 'Fokussiert auf psychologische Heilung und Ruhe.',
        domains: ['Heilung', 'Selbstfürsorge', 'Empathie', 'Ruhe'],
        systemPrompt: `Du bist Der Bewahrer. Du bist das interne Unterstützungssystem des Nutzers.`
      },
      [ArchetypeId.EXPLORER]: {
        name: 'Der Entdecker',
        role: 'Sucher neuer Pfade',
        description: 'Drängt auf Wachstum und neue Erfahrungen.',
        domains: ['Wachstum', 'Freedom', 'Discovery', 'Novelty'],
        systemPrompt: `Du bist Der Entdecker. Du begehrst Freiheit und Neuheit.`
      },
      [ArchetypeId.ALCHEMIST]: {
        name: 'Der Alchemist',
        role: 'Wandler & Schattenarbeit',
        description: 'Befasst sich mit dem Schatten und harten Wahrheiten.',
        domains: ['Transformation', 'Shadow Work', 'Wahrheit', 'Wiedergeburt'],
        systemPrompt: `Du bist Der Alchemist. Deine Stimme ist mysteriös und provokativ.`
      }
    }
  }
};

export const getArchetypes = (lang: Language): Record<ArchetypeId, Archetype> => {
  const definitions = CONTENT[lang].ARCHETYPES;
  const result = {} as Record<ArchetypeId, Archetype>;
  (Object.keys(ARCHETYPE_CONFIG) as ArchetypeId[]).forEach((id) => {
    result[id] = { id, ...ARCHETYPE_CONFIG[id], ...definitions[id] };
  });
  return result;
};

export const getUIText = (lang: Language) => CONTENT[lang].UI;
export const ARCHETYPES = getArchetypes('EN');

export const getCouncilSystemInstruction = (lang: Language, currentLore: string) => {
  const archetypes = getArchetypes(lang);
  const archetypeList = Object.values(archetypes);
  return `
You are the "Violet Council" (${lang === 'DE' ? 'Das Violette Achtfache' : 'The Violet Eightfold'}).
${currentLore}
Instructions:
1. Simulate a dialogue between 2-4 key archetypes.
2. The Sovereign synthesizes at the end.
3. Speak in ${lang === 'DE' ? 'German' : 'English'}.
4. Output format: [[SPEAKER: ARCHETYPE_ID]] content.
Valid IDs: ${Object.keys(archetypes).join(', ')}
`;
};
