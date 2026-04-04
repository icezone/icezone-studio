# Wave 0 + Wave 1 Implementation - Master Plan

> Status: INITIATED
> Created: 2026-04-04
> Updated: 2026-04-04
> Team: llm-dev, video-analysis-dev, canvas-dev, template-dev, storyboard-dev, infra-dev, reviewer

---

## 1. Overview

Implementing competitive features based on Tapnow Studio PP analysis:
- **Wave 0**: Core differentiation (N1-N3)
- **Wave 1**: Competitive improvements (N4-N8)

Detailed design: `docs/feature-design-wave0-wave1.md`
Implementation guide: `docs/implementation-guide-wave0-wave1.md`

---

## 2. Agent Team Structure

| Agent | Role | Worktree | Responsibilities |
|-------|------|----------|-----------------|
| **llm-dev** | LLM infrastructure | `D:/ws-llm-analysis` | N2, N3, N4 backend (Gemini/OpenAI) |
| **video-analysis-dev** | Video analysis | `D:/ws-video-analysis` | N1 backend (ffmpeg scene detection) |
| **canvas-dev** | Frontend nodes | `D:/ws-canvas-nodes-v2` | N1, N2, N3, N4 frontend components |
| **template-dev** | Template system | `D:/ws-templates` | N5, N6 (full-stack) |
| **storyboard-dev** | Storyboard enhance | `D:/ws-storyboard-enhance` | N7 (StoryboardGenNode) |
| **infra-dev** | API Key rotation | `D:/ws-key-rotation` | N8 (key management) |
| **reviewer** | Code review | main repo | Security/quality/performance |

---

## 3. Wave 0 Features ✅ COMPLETE

**Status**: All Wave 0 features delivered (N1, N2, N3)
- Backend: 2 agents, 45 tests, 2889 lines added
- Frontend: 1 agent, 15 tests, full UI integration
- Total: 60 TDD tests, 0 TypeScript errors

**Worktrees**:
- N1 backend: `worktree-agent-afb3df02` (commit a147c5a)
- N2+N3 backend: `worktree-agent-a1df0d50` (commit fa77565)
- N1+N2+N3 frontend: `worktree-agent-aa355e8d` (committed)

---

## 3. Wave 0 Features

### N1: Video Intelligence Analysis Node ✅ BACKEND COMPLETE

**Owner**: video-analysis-dev (backend) + canvas-dev (frontend)

**Backend Tasks** (video-analysis-dev):
- [x] Scene detection service (ffmpeg)
- [x] Frame extraction service
- [x] POST /api/video/analyze API route
- [x] Job system integration

**Frontend Tasks** (canvas-dev, after backend API ready):
- [ ] VideoAnalysisNode component
- [ ] Node registration in nodeRegistry
- [ ] Gateway integration
- [ ] E2E test

**Status**: Backend complete (commit a147c5a in worktree-agent-afb3df02), frontend pending
**Dependencies**: None (parallel with N2/N3)
**Worktree**: `C:\icezone\storyboard-copilot-web\.claude\worktrees\agent-afb3df02` (branch: worktree-agent-afb3df02)

---

### N2: Reverse Prompt Generation ✅ BACKEND COMPLETE

**Owner**: llm-dev (backend) + canvas-dev (frontend)

**Backend Tasks** (llm-dev):
- [x] Gemini/OpenAI provider setup
- [x] Reverse prompt service (generic/chinese styles)
- [x] POST /api/ai/reverse-prompt API route
- [x] Prompt templates

**Frontend Tasks** (canvas-dev, after backend API ready):
- [ ] ReversePromptDialog component
- [ ] LlmAnalysisGateway interface
- [ ] Toolbar button integration
- [ ] E2E test

**Status**: Backend complete (worktree-agent-a1df0d50), frontend pending
**Dependencies**: None (parallel with N1/N3)
**Worktree**: `worktree-agent-a1df0d50`

---

### N3: Director-Level Shot Analysis ✅ BACKEND COMPLETE

**Owner**: llm-dev (backend) + canvas-dev (frontend)

**Backend Tasks** (llm-dev):
- [x] Shot analysis service (reuse N2 LLM infra)
- [x] POST /api/ai/shot-analysis API route
- [x] Structured output schema

**Frontend Tasks** (canvas-dev, after backend API ready):
- [ ] ShotAnalysisDialog component
- [ ] Toolbar button integration
- [ ] E2E test

**Status**: Backend complete (worktree-agent-a1df0d50), frontend pending
**Dependencies**: Shares LLM infra with N2
**Worktree**: `worktree-agent-a1df0d50`

---

## 4. Wave 1 Features

### N4: Novel/Script Input Node ⏳

**Owner**: llm-dev (backend) + canvas-dev (frontend)

**Backend Tasks** (llm-dev, after Wave 0 LLM infra):
- [ ] Novel analysis service
- [ ] Character extraction
- [ ] Scene segmentation
- [ ] POST /api/ai/novel-analyze API route

**Frontend Tasks** (canvas-dev, after backend API ready):
- [ ] NovelInputNode component
- [ ] Batch storyboard generation logic
- [ ] E2E test

**Status**: Not started
**Dependencies**: Wave 0 LLM infrastructure complete

---

### N5: Workflow Template System ⏳

**Owner**: template-dev (full-stack, independent)

**Tasks**:
- [ ] Database migration (workflow_templates table)
- [ ] Template serializer/deserializer
- [ ] API routes (GET/POST/DELETE /api/templates)
- [ ] TemplateLibrary UI
- [ ] SaveTemplateDialog UI
- [ ] JSON import/export
- [ ] Official templates seed data
- [ ] E2E test

**Status**: Not started
**Dependencies**: None (independent)

---

### N6: User Template Sharing ⏳

**Owner**: template-dev (extends N5)

**Tasks**:
- [ ] PATCH /api/templates/[id]/publish route
- [ ] Community templates browsing
- [ ] PublishTemplateDialog UI
- [ ] Sorting/filtering (popular/newest/tags)
- [ ] E2E test

**Status**: Not started
**Dependencies**: N5 complete

---

### N7: Smart Storyboard Batch Generation Enhancement ⏳

**Owner**: storyboard-dev (independent)

**Tasks**:
- [ ] Extend StoryboardGenFrameItem (startFrame/endFrame)
- [ ] Multi-reference image support
- [ ] Batch generate logic (parallel jobs)
- [ ] FrameReferenceEditor component
- [ ] FrameControlEditor component
- [ ] Progress tracking UI
- [ ] E2E test

**Status**: Not started
**Dependencies**: None (independent)

---

### N8: Multi API Key Rotation ⏳

**Owner**: infra-dev (independent)

**Tasks**:
- [ ] Database migration (api_keys table extend)
- [ ] ApiKeyRotator algorithm (Round-Robin)
- [ ] Error classification (rate_limit/quota/invalid)
- [ ] API integration (image/video generate routes)
- [ ] Settings UI (multi-key management)
- [ ] E2E test

**Status**: Not started
**Dependencies**: None (independent)

---

## 5. Parallel Execution Strategy

### Wave 0 Start

```
┌─────────────────────────────────────────┐
│ Start Simultaneously:                   │
│  - video-analysis-dev (N1 backend)      │
│  - llm-dev (N2+N3 backend)              │
│                                         │
│ Wait for API ready, then:               │
│  - canvas-dev (N1+N2+N3 frontend)       │
└─────────────────────────────────────────┘
```

**Unlock Conditions**:
| Condition | Trigger | Unlocks |
|-----------|---------|---------|
| N1 backend API ready | video-analysis-dev | canvas-dev N1 frontend |
| N2+N3 backend API ready | llm-dev | canvas-dev N2+N3 frontend |
| Wave 0 complete | team-lead | Wave 1 launch |

### Wave 1 Start (after Wave 0 LLM infra ready)

```
┌─────────────────────────────────────────┐
│ Start Simultaneously:                   │
│  - llm-dev (N4 backend)                 │
│  - template-dev (N5 → N6)               │
│  - storyboard-dev (N7)                  │
│  - infra-dev (N8)                       │
│                                         │
│ Wait for API ready, then:               │
│  - canvas-dev (N4 frontend)             │
└─────────────────────────────────────────┘
```

**Unlock Conditions**:
| Condition | Trigger | Unlocks |
|-----------|---------|---------|
| N4 backend API ready | llm-dev | canvas-dev N4 frontend |
| N5 template base complete | template-dev | template-dev N6 |

---

## 6. TDD Requirements

Every task must follow TDD:
1. **RED**: Write failing test
2. **GREEN**: Minimal code to pass
3. **REFACTOR**: Clean up, tests stay green

**Minimum test coverage per feature**:
- Unit tests: 5+ test cases (`__tests__/unit/`)
- API tests: 3+ test cases (`__tests__/api/`)
- E2E tests: 1+ user flow (`__tests__/e2e/`)

---

## 7. CI/CD Checkpoints

### Every commit:
```bash
npx tsc --noEmit       # Type check
npx vitest run         # Unit + API tests
npm run lint           # Lint
```

### Feature complete:
```bash
npm run build          # Full build
npx playwright test    # E2E tests
```

### Before merge:
- [ ] All TDD tests pass
- [ ] Type check zero errors
- [ ] Build succeeds
- [ ] E2E critical paths pass
- [ ] i18n zh/en both present
- [ ] Reviewer approval
- [ ] CI green

---

## 8. Worktree Setup Commands

```bash
# Create all worktrees
git worktree add D:/ws-llm-analysis -b wave0-llm
git worktree add D:/ws-video-analysis -b wave0-video-analysis
git worktree add D:/ws-canvas-nodes-v2 -b wave0-canvas
git worktree add D:/ws-templates -b wave1-templates
git worktree add D:/ws-storyboard-enhance -b wave1-storyboard
git worktree add D:/ws-key-rotation -b wave1-key-rotation
```

---

## 9. Progress Tracking

Track in each agent's folder:
- `.plans/storyboard-copilot-web/{agent}/task_plan.md`
- `.plans/storyboard-copilot-web/{agent}/progress.md`
- `.plans/storyboard-copilot-web/{agent}/findings.md`

---

## 10. Known Risks

| Risk | Mitigation |
|------|------------|
| ffmpeg dependency on Vercel | Use @ffmpeg-installer/ffmpeg, test deployment |
| LLM response unstable JSON | Implement robust parsing with fallback |
| Multi-key rotation edge cases | Extensive unit tests for error classification |
| Template serialization data loss | Version schema, comprehensive round-trip tests |

---

## Implementation Complete ✅

**Wave 0 + Wave 1 fully delivered** (2026-04-04)

### Wave 0 Summary
- N1 Video Analysis: Scene detection + keyframe extraction
- N2 Reverse Prompt: Gemini/OpenAI multi-style generation
- N3 Shot Analysis: Director-level cinematography breakdown

### Wave 1 Summary
- N4 Novel Input: Character extraction + scene segmentation → batch storyboards
- N5 Template System: Save/load/JSON import-export
- N6 Template Sharing: Community browsing with tags/sorting
- N7 Storyboard Enhancement: First/last frame control + multi-reference + batch parallel generation
- N8 API Key Rotation: Round-robin with intelligent error handling

### Stats
- **Total agents**: 6 (video-analysis-dev, llm-dev, canvas-dev, template-dev, storyboard-dev, infra-dev)
- **Total commits**: 7 (all in isolated worktrees)
- **Total tests**: 149 new tests (100% passing)
- **Lines added**: ~6,500+
- **Time**: ~3.5 hours parallel execution

### Worktrees
All changes in isolated git worktrees, ready for review and merge:
- `worktree-agent-afb3df02` (N1 backend + N4 backend)
- `worktree-agent-a1df0d50` (N2+N3 backend)
- `worktree-agent-aa355e8d` (N1+N2+N3 frontend)
- `worktree-agent-a904fcbc` (N5+N6 templates)
- `worktree-agent-acebe91a` (N7 storyboard)
- `worktree-agent-a231c150` (N8 key rotation)
- Main repo (N4 frontend)