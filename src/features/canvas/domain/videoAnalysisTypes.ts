// Domain-safe re-exports so canvas code never imports from src/server/*.
// If server types ever require runtime deps, split them into a pure-types module.

export type {
  ReversePromptResult,
  ShotAnalysisResult,
  ReversePromptStyle,
} from '@/server/ai/analysis/types';
