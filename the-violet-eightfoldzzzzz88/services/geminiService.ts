
import { GoogleGenAI, Chat, GenerateContentResponse, Type } from "@google/genai";
import { getArchetypes, getCouncilSystemInstruction, ArchetypeId } from '../constants';
import { Language, UserStats, ScribeAnalysis, EightfoldMode, GuardedState } from '../types';

const getClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API_KEY not found in environment variables");
    }
    return new GoogleGenAI({ apiKey });
};

const getGuardedInstruction = (mode: EightfoldMode, state: GuardedState, lang: Language) => {
    if (mode === 'OG') return "";
    const isDe = lang === 'DE';
    let specificRule = "";
    switch (state) {
        case 'STABILIZATION':
            specificRule = isDe ? "STABILISIERUNG: Bewahrer führt. Fokus auf Regulation." : "STABILIZATION: Caregiver leads. Focus on regulation.";
            break;
        case 'REFLECTION':
            specificRule = isDe ? "REFLEXION: Weise führt. Fokus auf Analyse." : "REFLECTION: Sage leads. Focus on analysis.";
            break;
        case 'INTEGRATION':
            specificRule = isDe ? "INTEGRATION: Souverän führt. Fokus auf Handlung." : "INTEGRATION: Sovereign leads. Focus on action.";
            break;
    }
    return `[CRYSTAL PATH: ${state}] Rule: ${specificRule}`;
};

// State management for ongoing chats
let activeArchetypeChat: Chat | null = null;
let activeArchetypeId: ArchetypeId | null = null;
let activeLanguage: Language | null = null;
let activeMode: EightfoldMode | null = null;
let activeState: GuardedState | null = null;

let activeCouncilChat: Chat | null = null;

export const sendMessageToArchetype = async (
    archetypeId: ArchetypeId, 
    message: string, 
    lang: Language, 
    currentLore: string, 
    mode: EightfoldMode = 'OG', 
    state: GuardedState = 'REFLECTION'
) => {
    const ai = getClient();
    
    // Create new chat if parameters changed or no chat exists
    if (!activeArchetypeChat || activeArchetypeId !== archetypeId || activeLanguage !== lang || activeMode !== mode || activeState !== state) {
        const archetype = getArchetypes(lang)[archetypeId];
        const guardedPrompt = getGuardedInstruction(mode, state, lang);
        
        activeArchetypeChat = ai.chats.create({
            model: 'gemini-3-flash-preview', 
            config: {
                systemInstruction: `${archetype.systemPrompt}\n\n[CONTEXT]\n${currentLore}\n\n${guardedPrompt}\nRespond in ${lang === 'DE' ? 'German' : 'English'}.`,
            }
        });
        
        activeArchetypeId = archetypeId;
        activeLanguage = lang;
        activeMode = mode;
        activeState = state;
    }
    
    return activeArchetypeChat.sendMessageStream({ message });
};

export const startCouncilSession = async (
    topic: string, 
    lang: Language, 
    currentLore: string, 
    mode: EightfoldMode = 'OG', 
    state: GuardedState = 'REFLECTION'
) => {
    const ai = getClient();
    const guardedPrompt = getGuardedInstruction(mode, state, lang);

    activeCouncilChat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
            systemInstruction: `${getCouncilSystemInstruction(lang, currentLore)}\n${guardedPrompt}`,
            temperature: 0.7,
        }
    });

    const introMsg = lang === 'DE' ? `Thema: "${topic}". Rat, beginnt.` : `Topic: "${topic}". Council, begin.`;
    return activeCouncilChat.sendMessageStream({ message: introMsg });
};

export const sendMessageToCouncil = async (message: string) => {
    if (!activeCouncilChat) throw new Error("Council session not initialized.");
    return activeCouncilChat.sendMessageStream({ message });
};

export const analyzeSessionForUpdates = async (historyText: string, currentStats: UserStats, lang: Language): Promise<ScribeAnalysis> => {
    const ai = getClient();
    const prompt = `Analyze transcript for JSON updates: ${historyText}\nCurrent Stats: ${JSON.stringify(currentStats)}`;
    
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    newLoreEntry: { type: Type.STRING, description: "New key insight or event to add to user lore." },
                    updatedQuest: { type: Type.STRING, description: "Updated name of the current life quest." },
                    newMilestone: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            title: { type: Type.STRING },
                            date: { type: Type.STRING },
                            description: { type: Type.STRING },
                            type: { type: Type.STRING, description: "One of: BREAKTHROUGH, BENCHMARK, REALIZATION" },
                            icon: { type: Type.STRING, description: "Lucide icon name (e.g., Zap, Sparkles, Heart)." }
                        }
                    },
                    newAttribute: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            level: { type: Type.STRING },
                            description: { type: Type.STRING },
                            type: { type: Type.STRING, description: "One of: BUFF, DEBUFF, SKILL" }
                        }
                    }
                }
            }
        }
    });

    try {
        const text = response.text;
        if (!text) return {};
        // Clean potential markdown if the model ignored responseMimeType
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("Analysis JSON parse error:", e);
        return {};
    }
};
