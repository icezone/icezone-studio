<div align="center">

# IceZone Studio

### AI Creative Studio — Node-Based Canvas for Image & Video Generation

[![CI](https://github.com/icezone/icezone-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/icezone/icezone-studio/actions)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS 4](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

<p align="center">
  <strong>A professional-grade Web SaaS platform for AI-powered image generation, video production, storyboard creation, and creative workflow management — all on an interactive node-based canvas.</strong>
</p>

[Live Demo](https://icezone.studio) · [Documentation](docs/) · [Changelog](CHANGELOG.md)

</div>

---

## Highlights

- **Node-Based Canvas** — Drag-and-drop creative workflow with 11 node types powered by [@xyflow/react](https://reactflow.dev/)
- **Multi-Provider AI** — 7 image models (KIE, FAL, GRSAI, PPIO) + 5 video models (Kling, Sora2, VEO)
- **AI Analysis Suite** — Video scene detection, reverse prompt generation, shot analysis, novel/script splitting
- **BYOK (Bring Your Own Key)** — 6 provider slots with AES-256-GCM encrypted storage and automatic key rotation
- **Real-Time Collaboration** — Supabase Postgres + IndexedDB dual-write with conflict detection
- **Template Marketplace** — Official + user templates with community publish/share
- **i18n Ready** — Full Chinese + English localization

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| UI | React 19 + TailwindCSS 4 |
| Canvas | @xyflow/react 12 |
| State | Zustand 5 |
| Language | TypeScript 5 |
| Backend | Supabase (Auth + Postgres + Storage + Realtime) |
| Image Processing | sharp |
| Auth | Supabase Auth (Email + Google + WeChat OAuth) |
| Testing | Vitest + Playwright |
| CI/CD | GitHub Actions |

---

## Node Types

| Node | Description |
|------|------------|
| **Upload** | Image upload and import |
| **AI Image** | AI image generation & editing (7 models) |
| **Export Image** | Generation/processing result export |
| **Text Annotation** | Canvas text notes |
| **Group** | Node grouping for workflow organization |
| **Storyboard** | Storyboard grid splitting & export |
| **Storyboard Gen** | AI storyboard generation + batch processing |
| **AI Video** | Video generation (text/image-driven, 5 models) |
| **Video Result** | Video result playback |
| **Novel Input** | Novel/script text analysis & scene splitting |
| **Video Analysis** | Video scene detection + keyframe extraction |

---

## AI Models

### Image Generation (7 Models / 4 Providers)

| Provider | Models | Features |
|----------|--------|----------|
| **KIE** | Default provider | Standard + Professional mode |
| **FAL** | Multiple models | Fast generation |
| **GRSAI** | Tiered quality | Multiple quality tiers |
| **PPIO** | Extended models | Extended parameter support |

### Video Generation (5 Models / 3 Providers)

| Provider | Models | Duration | Features |
|----------|--------|----------|----------|
| **Kling** | Kling 3.0 | 3s / 5s / 10s / 15s | Multi-shots, Elements |
| **Sora2** | Sora 2 | 10s / 15s | Image-to-video |
| **VEO** | VEO 3 / VEO 3 Fast | Variable | Audio support |

### AI Analysis (4 Features)

| Feature | Description | Endpoint |
|---------|------------|----------|
| **Video Analysis** | Scene detection + keyframe extraction | `/api/video/analyze` |
| **Reverse Prompt** | Image-to-prompt via Gemini Vision | `/api/ai/reverse-prompt` |
| **Shot Analysis** | Professional shot/camera/lighting analysis | `/api/ai/shot-analysis` |
| **Novel Splitting** | Text-to-scene splitting + character extraction | `/api/ai/novel-analyze` |

---

## Quick Start

### Prerequisites

- Node.js >= 18
- npm >= 9
- Supabase account (for auth & storage)

### Installation

```bash
# Clone the repository
git clone https://github.com/icezone/icezone-studio.git
cd icezone-studio

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase and API keys

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access IceZone Studio.

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Providers (optional — users can configure via BYOK)
KIE_API_KEY=your_kie_key
FAL_API_KEY=your_fal_key
```

---

## Development

```bash
# Development server
npm run dev

# Type checking
npx tsc --noEmit

# Unit tests
npx vitest run

# Lint
npm run lint

# Full build
npm run build

# E2E tests
npx playwright test

# Supabase local
npx supabase start
npx supabase db reset
```

---

## Architecture

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── (app)/              # Authenticated app routes
│   │   ├── canvas/[id]/    # Canvas editor page
│   │   ├── dashboard/      # Project dashboard
│   │   └── settings/       # User settings
│   ├── api/                # 23+ API endpoints
│   └── page.tsx            # Landing page
├── features/
│   ├── canvas/             # Core canvas engine
│   │   ├── domain/         # Node types, registry, business rules
│   │   ├── nodes/          # 11 node components
│   │   ├── models/         # AI model definitions (image + video)
│   │   ├── tools/          # Built-in tools (crop, annotate, split)
│   │   ├── application/    # Ports & adapters, services
│   │   ├── infrastructure/ # Web gateways & persistence
│   │   └── ui/             # Overlays, toolbars, dialogs
│   └── templates/          # Template system (library, serializer)
├── server/
│   ├── ai/                 # AI provider implementations
│   ├── video/              # Video provider implementations
│   └── image/              # sharp image processing
├── stores/                 # Zustand state management
├── components/ui/          # Shared UI primitives
├── i18n/                   # Internationalization (zh + en)
└── lib/supabase/           # Supabase client utilities
```

---

## Features Overview

### Canvas & Workflow
- Interactive node-based canvas with drag & drop
- Multi-select with right-click box selection
- Copy/paste, undo/redo, keyboard shortcuts
- Node grouping and ungrouping
- Auto-save with dual-write persistence (Supabase + IndexedDB)
- Conflict detection with revision-based optimistic locking

### Tools
- **Crop** — Interactive image cropping
- **Annotate** — Image annotation overlay
- **Split Storyboard** — Grid-based storyboard splitting

### Template System
- 3 official workflow templates (Novel-to-Storyboard, Video Rebuild, Batch Image Gen)
- Save/load custom templates
- Community publish & share
- JSON import/export

### BYOK (Bring Your Own Key)
- 6 providers: KIE, PPIO, GRSAI, FAL, OpenAI, Anthropic
- AES-256-GCM encrypted key storage
- Multi-key support with automatic rotation
- Key status tracking (active, rate-limited, exhausted, invalid)

### Internationalization
- Full Chinese and English support
- Runtime language switching
- i18next with namespace-based key organization

---

## API Endpoints

| Category | Endpoints | Description |
|----------|-----------|-------------|
| AI Generation | `/api/ai/generate`, `/api/ai/reverse-prompt`, `/api/ai/shot-analysis`, `/api/ai/novel-analyze` | Image generation & AI analysis |
| Video | `/api/video/generate`, `/api/video/analyze` | Video generation & analysis |
| Image Processing | `/api/image/split`, `/api/image/crop`, `/api/image/merge` | Server-side image tools |
| Projects | `/api/projects/*` | Project CRUD & draft management |
| Templates | `/api/templates/*` | Template CRUD & community sharing |
| Assets | `/api/assets/*` | Media asset upload & management |
| Settings | `/api/settings/*` | API key management (BYOK) |
| Jobs | `/api/jobs/[id]` | Async task polling |

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Follow TDD workflow: write failing test → implement → refactor
4. Ensure all checks pass: `npx tsc --noEmit && npx vitest run && npm run lint`
5. Commit with conventional commits (`feat:`, `fix:`, `docs:`, etc.)
6. Push to the branch and open a Pull Request

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <strong>Built with Next.js, React, and Supabase</strong>
  <br/>
  <sub>IceZone Studio &copy; 2026</sub>
</div>
