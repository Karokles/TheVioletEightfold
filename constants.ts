// Minimal constants file - only for non-content constants like icons and enums
import { Crown, Sword, Scroll, Heart, Lightbulb, HandHeart, Compass, Skull, Zap, Anchor, Shield, Eye, Activity, Brain } from 'lucide-react';

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

export const ICON_MAP: Record<string, any> = {
  Crown, Sword, Scroll, Heart, Lightbulb, HandHeart, Compass, Skull, Zap, Anchor, Shield, Eye, Activity, Brain
};
