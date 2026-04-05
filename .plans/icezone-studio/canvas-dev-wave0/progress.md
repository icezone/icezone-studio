# canvas-dev-wave0 Progress

## N4: Novel/Script Input Node — Frontend

### N4.2 NovelInputNode Component
- **Status**: DONE
- Domain types added: `NovelInputNodeData`, `NovelCharacter`, `NovelScene`, `isNovelInputNode`
- Registered in `nodeRegistry.ts` with correct connectivity (sourceHandle only)
- Registered in `nodes/index.ts`
- Display name added to `nodeDisplay.ts`
- i18n keys added to both zh.json and en.json
- Component created: `NovelInputNode.tsx` with full UI
- Tests: 9 tests passing in `novelInputNode.test.ts`

### N4.3 Batch Storyboard Generation
- **Status**: DONE
- Application logic: `novelToStoryboard.ts`
- Creates storyboardGenNode for each selected scene
- Auto-creates edge connections
- Positions nodes in vertical stack (300px spacing, 400px right offset)
- Fills visualPrompt into frame descriptions
- Tests: 6 tests passing in `novelBatchGenerate.test.ts`

### Verification
- `npx tsc --noEmit`: PASS
- `npx vitest run`: 277/279 pass (2 pre-existing failures in assets-upload.test.ts)
- `npx vitest run __tests__/unit/i18n-parity.test.ts`: PASS
