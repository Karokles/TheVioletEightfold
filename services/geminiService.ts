
import { GoogleGenAI, ChatSession, Type } from "@google/genai";
import { getArchetypes, getCouncilSystemInstruction, ArchetypeId } from '../constants';
import { Language, UserStats, MapLocation, ScribeAnalysis } from '../types';

const getClient = () => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY not found in environment variables");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// --- Direct Chat with an Archetype ---

let chatSession: ChatSession | null = null;
let currentArchetypeId: ArchetypeId | null = null;
let currentLanguage: Language = 'EN';

export const getArchetypeChat = async (archetypeId: ArchetypeId, lang: Language, currentLore: string) => {
    const ai = getClient();
    
    // If switching archetypes, language, or starting fresh
    if (!chatSession || currentArchetypeId !== archetypeId || currentLanguage !== lang) {
        const archetype = getArchetypes(lang)[archetypeId];
        chatSession = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: `
                ${archetype.systemPrompt}
                
                [CURRENT USER LORE & CONTEXT]
                ${currentLore}
                
                Context: You are part of the "Violet Council" web app. 
                Keep responses concise, helpful, and strictly in character.
                IMPORTANT: You must respond in ${lang === 'DE' ? 'German (Deutsch)' : 'English'}.
                `,
            },
            history: [] 
        });
        currentArchetypeId = archetypeId;
        currentLanguage = lang;
    }
    return chatSession;
};

export const sendMessageToArchetype = async (archetypeId: ArchetypeId, message: string, lang: Language, currentLore: string) => {
    const chat = await getArchetypeChat(archetypeId, lang, currentLore);
    return chat.sendMessageStream({ message });
};

// --- Council Session (Multi-Agent Simulation) ---

let councilSession: ChatSession | null = null;
let councilLanguage: Language = 'EN';

export const startCouncilSession = async (topic: string, lang: Language, currentLore: string) => {
    const ai = getClient();
    
    const model = 'gemini-3-pro-preview'; 
    
    // Reset session if language changes or it doesn't exist
    // Note: We always create a new session on 'start' to clear context for a new topic
    // This aligns with "every council session is a new start"
    councilSession = ai.chats.create({
        model,
        config: {
            systemInstruction: getCouncilSystemInstruction(lang, currentLore),
            temperature: 0.7,
        },
        history: []
    });
    councilLanguage = lang;

    const introMsg = lang === 'DE' 
        ? `Der Nutzer hat den Rat einberufen. Das Thema ist: "${topic}". Beginnt die Beratung.`
        : `The user has convened the council. The topic is: "${topic}". Begin the deliberation.`;

    return councilSession.sendMessageStream({
        message: introMsg
    });
};

export const sendMessageToCouncil = async (message: string) => {
    if (!councilSession) {
        throw new Error("Council session not initialized. Call startCouncilSession first.");
    }
    return councilSession.sendMessageStream({ message });
};

// --- The Scribe (Background Agent) ---

export const analyzeSessionForUpdates = async (
    historyText: string, 
    currentStats: UserStats, 
    lang: Language
): Promise<ScribeAnalysis> => {
    const ai = getClient();
    
    const prompt = `
    You are "The Scribe" (Der Chronist). You operate in the background of the Violet Council.
    Your task is to read the transcript of the Council Session and extract meaningful updates for the User's "Soul Blueprint" (Stats) and "Psychogeography" (Map).
    
    [TRANSCRIPT START]
    ${historyText}
    [TRANSCRIPT END]

    [CURRENT QUEST]: ${currentStats.currentQuest}
    [CURRENT STATE]: ${currentStats.state}
    [CURRENT DATE]: ${new Date().toISOString()}

    Analyze the transcript. Did the user or council reach a breakthrough? 
    1. **Lore**: Extract a concise summary (1-2 sentences) of any NEW realization to add to the user's permanent context lore.
    2. **Milestone**: If a major epiphany occurred, create a milestone object.
    3. **Attribute**: If a new skill or trait was defined, create an attribute object.
    4. **Location**: If a specific geographic location was discussed as significant (past trauma or future goal), create a map location object (estimate lat/lng).
    5. **Quest/State**: Did the user's current quest or emotional state change?
    6. **Finance**: If the user mentioned spending or receiving money (e.g., "I spent 5 euro on coffee" or "I got paid"), create a transaction.
    7. **Calendar**: If the user mentioned a date, deadline, or appointment (e.g., "I have a test on Friday"), create a calendar event.

    Return purely JSON data matching the schema. If nothing new happened, return empty fields.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    newLoreEntry: { type: Type.STRING, description: "A short text summary of the new realization to append to context memory." },
                    updatedQuest: { type: Type.STRING, description: "Update ONLY if the current life quest has shifted." },
                    updatedState: { type: Type.STRING, description: "Update ONLY if the user's emotional state has shifted." },
                    newMilestone: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            title: { type: Type.STRING },
                            date: { type: Type.STRING },
                            description: { type: Type.STRING },
                            type: { type: Type.STRING, enum: ['BREAKTHROUGH', 'BENCHMARK', 'REALIZATION'] },
                            icon: { type: Type.STRING },
                        }
                    },
                    newAttribute: {
                         type: Type.OBJECT,
                         properties: {
                             name: { type: Type.STRING },
                             level: { type: Type.STRING },
                             description: { type: Type.STRING },
                             type: { type: Type.STRING, enum: ['BUFF', 'DEBUFF', 'SKILL'] },
                         }
                    },
                    newLocation: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            name: { type: Type.STRING },
                            coordinates: { 
                                type: Type.OBJECT, 
                                properties: { lat: { type: Type.NUMBER }, lng: { type: Type.NUMBER } } 
                            },
                            type: { type: Type.STRING, enum: ['ORIGIN', 'RESIDENCE', 'VACATION', 'TRAUMA', 'TRANSFORMATION', 'SHADOW_REALM'] },
                            description: { type: Type.STRING },
                            visited: { type: Type.BOOLEAN },
                            year: { type: Type.STRING }
                        }
                    },
                    newCalendarEvent: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            date: { type: Type.STRING, description: "YYYY-MM-DD format" },
                            title: { type: Type.STRING },
                            type: { type: Type.STRING, enum: ['DEADLINE', 'MEETING', 'BIRTHDAY', 'QUEST', 'SOCIAL', 'FINANCE', 'OTHER'] },
                            description: { type: Type.STRING },
                        }
                    },
                    newTransaction: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            date: { type: Type.STRING, description: "YYYY-MM-DD format" },
                            description: { type: Type.STRING },
                            amount: { type: Type.NUMBER },
                            type: { type: Type.STRING, enum: ['INCOME', 'EXPENSE'] },
                            category: { type: Type.STRING },
                        }
                    }
                }
            }
        }
    });

    if (response.text) {
        try {
            return JSON.parse(response.text) as ScribeAnalysis;
        } catch (e) {
            console.error("Failed to parse Scribe JSON", e);
            return {};
        }
    }
    return {};
};
