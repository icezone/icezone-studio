# Changelog

All notable changes to IceZone Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

## [0.3.0] - 2026-04-05

### Added
- Project renamed from "Storyboard Copilot" to **IceZone Studio**
- N1 Video Analysis: scene detection + keyframe extraction via `/api/video/analyze`
- N2 Reverse Prompt: image-to-prompt generation via Gemini Vision (`/api/ai/reverse-prompt`)
- N3 Shot Analysis: professional shot/camera/lighting/composition analysis (`/api/ai/shot-analysis`)
- N4 Novel/Script Input: text-to-scene splitting + character extraction (`/api/ai/novel-analyze`)
- N5+N6 Template system: official templates, user custom templates, community publish/share
- N7 Batch storyboard generation enhancement
- N8 Multi API key rotation with automatic failover
- `data-testid` attributes on key UI components for E2E testing
- Comprehensive E2E tests for Wave 0 + Wave 1 features

### Fixed
- Template save button wiring and error handling
- TypeScript type errors and ESLint `as any` replacements for CI
- E2E test selectors matching actual UI (data-testid, provider buttons, navigation)
- Landing page title assertion updated for IceZone Studio branding

### Changed
- CLAUDE.md and AGENTS.md updated with full feature inventory
- Implementation docs moved to `docs/` folder

## [0.2.0] - 2026-04-04

### Added
- Canvas sidebar with node menu, layers, history, zoom controls
- Dark mode support with theme-aware node borders
- Node beautification and popup system
- Project name display in canvas header
- i18n save status indicators

### Fixed
- Race condition causing project name to be lost on save
- Strict mode violation when multiple project cards exist
- Canvas project name display and i18n save status

## [0.1.0] - 2026-04-03

### Added
- Complete canvas engine with @xyflow/react 12
- 11 node types: Upload, AI Image, Export, Text Annotation, Group, Storyboard, Storyboard Gen, AI Video, Video Result, Novel Input, Video Analysis
- 7 image generation models across 4 providers (KIE, FAL, GRSAI, PPIO)
- 5 video generation models across 3 providers (Kling 3.0, Sora2, VEO 3)
- Built-in tools: Crop, Annotate, Split Storyboard
- Supabase Auth (Email + Google OAuth)
- Project CRUD with dashboard
- Dual-write persistence (Supabase Postgres + IndexedDB) with conflict detection
- BYOK API key management with AES-256-GCM encryption (6 providers)
- 23+ API endpoints for AI generation, image processing, projects, templates, settings
- i18n support (Chinese + English)
- CI/CD pipeline with GitHub Actions (TypeScript + Lint + Unit tests + Build + E2E)
- Vercel deployment configuration
- E2E test suite with Playwright

### Fixed
- ReactFlowProvider wrapping to prevent initialization errors
- ESLint warnings cleanup for CI compliance
- Dashboard project list timing and test ID issues
- Duplicate middleware.ts conflict with proxy
- Post-login redirect and missing middleware restoration
- Auth and dashboard E2E test failures
- Missing i18n imports in auth and app layouts
- Canvas page undefined CSS token usage

---

## Changelog Guidelines

When making changes to this project, update this file following these rules:

1. **Add entries under `[Unreleased]`** as you work
2. **Group changes** by type: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`
3. **Move entries** from `[Unreleased]` to a versioned section when releasing
4. **Use conventional commits** in git (`feat:`, `fix:`, `docs:`, `chore:`, etc.)
5. **Keep descriptions concise** — one line per change, user-facing language preferred
