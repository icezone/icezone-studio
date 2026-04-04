# llm-dev Findings

## N4 Implementation Notes

### Architecture Decision
- The existing `src/server/ai/` directory contains image generation providers (ppio, grsai, kie, fal) with `AIProvider` interface for image gen.
- Novel analysis is a fundamentally different capability (text-in, structured-JSON-out), so placed in a new `src/server/ai/analysis/` subtree.
- The Gemini provider for analysis is separate from image providers since it uses a different API endpoint (`generateContent` vs image generation).

### Robust JSON Parsing
- LLMs sometimes wrap JSON in markdown code fences (`\`\`\`json ... \`\`\``). `safeJsonParse` handles this.
- On complete parse failure, returns `{ characters: [], scenes: [] }` rather than crashing.

### Pre-existing Test Failures
- `__tests__/api/assets-upload.test.ts` has 2 failures unrelated to this work (multipart form data parsing mismatch).
