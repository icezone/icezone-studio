/** Types for novel/script text analysis */

export interface NovelAnalysisParams {
  text: string
  language?: 'auto' | 'zh' | 'en'
  maxScenes?: number          // default 20
  sceneGranularity?: 'coarse' | 'medium' | 'fine'  // default 'medium'
}

export interface ExtractedCharacter {
  id: string
  name: string
  description: string
  aliases: string[]
}

export interface ExtractedScene {
  title: string
  summary: string
  visualPrompt: string        // English prompt for AI image generation
  characters: string[]        // character IDs present in scene
  location: string
  mood: string
  timeOfDay?: string
  sourceTextRange: { start: number; end: number }
}

export interface NovelAnalysisResult {
  characters: ExtractedCharacter[]
  scenes: ExtractedScene[]
}

export interface LlmAnalysisRequest {
  systemPrompt: string
  userMessage: string
  temperature?: number
}
