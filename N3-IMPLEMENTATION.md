# N3: Director-Level Shot Analysis - Implementation Summary

## Overview

Implemented the complete N3 Shot Analysis feature, enabling professional cinematography analysis of images on the canvas. The feature uses Gemini Vision (multimodal) to analyze shots and return structured results covering shot type, camera movement, subject, lighting, color palette, mood, composition, and a director's note.

## Files Created

| File | Purpose |
|------|---------|
| `src/server/ai/analysis/shotAnalysisService.ts` | Shot analysis business logic, normalizes LLM output |
| `src/server/ai/analysis/prompts/shotAnalysis.ts` | Professional cinematography system prompt |
| `src/app/api/ai/shot-analysis/route.ts` | POST API route with auth, validation, error handling |
| `src/features/canvas/ui/ShotAnalysisDialog.tsx` | Dialog UI with loading/error/success states, color swatches, copy/export |
| `src/features/canvas/infrastructure/webLlmAnalysisGateway.ts` | Frontend gateway adapter for LLM analysis API |
| `__tests__/unit/shotAnalysisService.test.ts` | 8 unit tests covering happy path, multi-frame, edge cases |
| `__tests__/e2e/shot-analysis.spec.ts` | E2E tests for API route validation |

## Files Modified

| File | Changes |
|------|---------|
| `src/server/ai/analysis/types.ts` | Added `ShotAnalysisParams`, `ShotAnalysisResult`, `LlmVisionAnalysisRequest` types |
| `src/server/ai/analysis/providers/geminiAnalysis.ts` | Added `analyzeVisionWithGemini()` for multimodal (image+text) analysis |
| `src/features/canvas/application/ports.ts` | Added `ShotAnalysisPayload`, `ShotAnalysisResult`, `LlmAnalysisGateway` interface |
| `src/features/canvas/application/canvasServices.ts` | Wired `webLlmAnalysisGateway` |
| `src/features/canvas/ui/NodeActionToolbar.tsx` | Added "Shot Analysis" button (ScanSearch icon) for nodes with images |
| `src/i18n/locales/zh.json` | Added `shotAnalysis.*` i18n keys (Chinese) |
| `src/i18n/locales/en.json` | Added `shotAnalysis.*` i18n keys (English) |

## Architecture

```
User clicks "Shot Analysis" on toolbar
  -> ShotAnalysisDialog opens
  -> webLlmAnalysisGateway.analyzeShot()
  -> POST /api/ai/shot-analysis (auth + validation)
  -> shotAnalysisService.analyzeShot()
  -> analyzeVisionWithGemini() (multimodal: images + prompt)
  -> Gemini API (generativelanguage.googleapis.com)
  -> Structured JSON response
  -> Dialog renders results with color swatches, copy, export
```

## Key Design Decisions

1. **Multimodal Gemini**: Extended the existing `geminiAnalysis.ts` provider with `analyzeVisionWithGemini()` that sends inline image data alongside text, supporting both data: URIs and http(s) URLs.

2. **Shared Infrastructure**: Reuses `safeJsonParse` from N2's `novelAnalysisService`. The `LlmAnalysisGateway` port is designed to be shared between N2 and N3.

3. **Robust Normalization**: `normalizeShotResult()` provides sensible defaults for every field, so malformed LLM output never crashes the UI.

4. **Multi-frame Support**: Up to 8 additional frames can be sent for camera movement analysis; the prompt adapts its instructions based on single vs. multi-frame input.

5. **Bilingual Output**: The system prompt instructs the LLM to respond in Chinese or English based on user language setting.

## Verification

- TypeScript: `npx tsc --noEmit` passes cleanly
- Unit tests: 8/8 pass (shotAnalysisService.test.ts)
- Full suite: 344/346 pass (2 pre-existing failures in assets-upload.test.ts, unrelated)
