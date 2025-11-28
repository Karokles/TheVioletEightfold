import archetypesData from './archetypes.json';
import uiTextData from './ui-text.json';
import brandingData from './branding.json';
import loreTemplateData from './user-lore-template.json';
import statsTemplateData from './user-stats-template.json';
import { Archetype, Language } from '../types';
import { ArchetypeId } from '../constants';

export interface ArchetypeConfig {
  name: { EN: string; DE: string };
  role: { EN: string; DE: string };
  description: { EN: string; DE: string };
  domains: string[];
  systemPrompt: { EN: string; DE: string };
  color: string;
  iconName: string;
}

export const getArchetypes = (lang: Language): Record<ArchetypeId, Archetype> => {
  const result = {} as Record<ArchetypeId, Archetype>;

  (Object.keys(archetypesData) as ArchetypeId[]).forEach((id) => {
    const config = archetypesData[id as keyof typeof archetypesData] as ArchetypeConfig;
    result[id] = {
      id,
      name: config.name[lang],
      role: config.role[lang],
      description: config.description[lang],
      domains: config.domains,
      systemPrompt: config.systemPrompt[lang],
      color: config.color,
      iconName: config.iconName,
    };
  });

  return result;
};

export const getUIText = (lang: Language) => uiTextData[lang];

export const getBranding = (lang: Language) => ({
  appTitle: brandingData.appTitle[lang],
  subtitle: brandingData.subtitle[lang],
  protocolName: brandingData.protocolName[lang],
});

export const getLoreTemplate = () => loreTemplateData.template;

export const getStatsTemplate = () => statsTemplateData;

