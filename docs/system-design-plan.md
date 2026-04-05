# System Design Plan: IceZone Studio

## Context

IceZone Studio 是一款 AI 驱动的分镜创作工具（图片生成/编辑、视频生成、节点画布）。现有桌面版（Tauri 2，仓库 `Storyboard-Copilot`）已验证核心工作流，现升级扩展为 Web SaaS 产品以实现更广泛的用户触达、多用户支持和商业化（覆盖全球和中国市场）。

**仓库策略**：桌面版仓库 `Storyboard-Copilot` 保留不变。Web 版在独立新仓库 `icezone-studio` 中开发。
**代码复用**：最大化沿用桌面版现有代码 — 画布域逻辑（`domain/`）、模型定义（`models/`）、工具体系（`tools/`）、UI 组件（`ui/`、`nodes/`）、Store（`canvasStore.ts`）直接复制或微调。仅重写基础设施层（Tauri 命令 → API Routes、本地持久化 → Supabase、本地文件 → Supabase Storage）。
**Development approach**: TDD with Playwright for UI testing. Git worktrees + parallel subagents for independent workstreams. Local browser verification first, CI/CD after feature stabilization.
**Market requirements**: OAuth supports Google + WeChat. Payments support PayPal + Alipay + WeChat Pay. UI localization supports complete English (`en`) and Chinese (`zh`) coverage.

---

## 1. Target Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel (Next.js 15)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │Marketing │  │Auth Pages│  │ App Shell │  │  API   │  │
│  │  (SSG)   │  │ (public) │  │(protected)│  │ Routes │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
│                                    │             │       │
│         ┌──────────────────────────┤             │       │
│         │  Canvas (client-side)    │             │       │
│         │  @xyflow/react + Zustand │             │       │
│         └──────────────────────────┘             │       │
└──────────────────────────────────────────────────┼───────┘
                                                   │
                    ┌──────────────────────────────┐│
                    │         Supabase              ││
                    │  ┌────────┐ ┌──────────────┐ ││
                    │  │  Auth  │ │   Postgres    │ ││
                    │  │(Google │ │  (RLS + jobs) │ ││
                    │  │ +WeChat)│ │              │ ││
                    │  └────────┘ └──────────────┘ ││
                    │  ┌────────┐ ┌──────────────┐ ││
                    │  │Storage │ │   Realtime    │ ││
                    │  │(assets)│ │(job updates)  │ ││
                    │  └────────┘ └──────────────┘ ││
                    └──────────────────────────────┘│
                                                    │
                    ┌───────────────────────────────┐│
                    │  Background Workers            │
                    │  (Vercel Cron / Edge Functions) │
                    │  - Video job polling            │
                    │  - Asset cleanup                │
                    │  - Credit refresh               │
                    └────────────────────────────────┘
```

**Tech stack**: Next.js 15 (App Router), React 19, TypeScript, Zustand 5, @xyflow/react 12, TailwindCSS 4, Supabase (Auth + Postgres + Storage + Realtime), PayPal, Alipay, WeChat Pay, sharp, zod, i18next/react-i18next

---

## 2. Repository Structure

```
icezone-studio/
├── app/
│   ├── (marketing)/              # Landing, pricing (SSG)
│   │   ├── page.tsx
│   │   └── pricing/page.tsx
│   ├── (auth)/                   # Login, signup, callback (Google + WeChat OAuth)
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── callback/page.tsx
│   ├── (app)/                    # Authenticated app shell
│   │   ├── layout.tsx            # Auth guard + sidebar
│   │   ├── dashboard/page.tsx    # Project list
│   │   ├── canvas/[id]/page.tsx  # Canvas workspace ('use client')
│   │   ├── settings/page.tsx     # Profile + API keys + prefs (fully en/zh localized)
│   │   └── billing/page.tsx      # Plans + credits + history
│   ├── (admin)/                  # Admin tools (future)
│   │   └── layout.tsx
│   └── api/
│       ├── projects/             # Project CRUD
│       ├── projects/[id]/draft/  # Draft read/write
│       ├── assets/               # Upload, complete, delete
│       ├── ai/                   # Image gen (submit, poll)
│       ├── video/                # Video gen (submit, poll)
│       ├── image/                # Split, crop, merge, metadata
│       ├── jobs/[id]/            # Job status
│       ├── billing/              # Checkout, portal
│       ├── settings/             # API keys (BYOK)
│       └── webhooks/             # PayPal / Alipay / WeChat Pay notifications
├── src/
│   ├── features/canvas/          # MIGRATED from desktop
│   │   ├── domain/               # Copy as-is (canvasNodes, nodeRegistry, nodeDisplay)
│   │   ├── application/          # Copy ports.ts, eventBus.ts; adapt imageData, toolProcessor
│   │   │   ├── ports.ts          # UNCHANGED -- the migration seam
│   │   │   ├── canvasServices.ts # CHANGED -- swap adapter wiring
│   │   │   ├── imageData.ts      # REWRITTEN -- Supabase Storage + browser APIs
│   │   │   └── toolProcessor.ts  # ADAPTED -- remove direct Tauri command imports
│   │   ├── infrastructure/       # NEW web adapters
│   │   │   ├── webAiGateway.ts
│   │   │   ├── webVideoGateway.ts
│   │   │   ├── webImageSplitGateway.ts
│   │   │   └── webImagePersistence.ts
│   │   ├── models/               # Copy as-is (registry, providers, definitions)
│   │   ├── nodes/                # Copy with Tauri import removal
│   │   ├── tools/                # Copy as-is
│   │   ├── ui/                   # Copy as-is
│   │   ├── edges/                # Copy as-is
│   │   ├── hooks/                # Copy as-is
│   │   └── pricing/              # Copy as-is
│   ├── features/project/         # NEW -- project management for web
│   ├── features/settings/        # ADAPTED -- server-side API key storage
│   ├── stores/
│   │   ├── canvasStore.ts        # Copy as-is (zero Tauri deps)
│   │   ├── projectStore.ts       # REWRITTEN -- Supabase + IndexedDB local cache
│   │   └── authStore.ts          # NEW -- Supabase auth state
│   ├── components/ui/            # Copy primitives.tsx, motion.ts
│   ├── i18n/                     # Copy and enforce en/zh key parity
│   ├── lib/
│   │   ├── supabase/client.ts    # Browser Supabase client
│   │   ├── supabase/server.ts    # Server Supabase client (SSR + API routes)
│   │   ├── supabase/middleware.ts # Auth middleware helpers
│   │   └── validation/           # Zod schemas for API inputs
│   └── server/
│       ├── ai/                   # Ported from Rust: image AI providers
│       │   ├── types.ts          # AIProvider interface
│       │   ├── registry.ts       # Provider registry (HashMap pattern)
│       │   └── providers/        # ppio.ts, grsai.ts, kie.ts, fal.ts
│       ├── video/                # Ported from Rust: video providers
│       │   ├── types.ts          # VideoProvider interface
│       │   ├── registry.ts
│       │   └── providers/        # kling.ts, sora2.ts, veo.ts, kie-common.ts
│       ├── image/                # Ported from Rust: sharp-based processing
│       │   └── processor.ts      # split, crop, merge, metadata, resize
│       ├── jobs/                  # Job orchestration
│       │   ├── jobService.ts     # Create, poll, update, refund
│       │   └── worker.ts         # Background polling logic
│       └── billing/
│           ├── paypal.ts         # PayPal checkout, capture, webhooks
│           ├── alipay.ts         # Alipay checkout + notifications
│           ├── wechatPay.ts      # WeChat Pay checkout + notifications
│           └── credits.ts        # Credit ledger operations
├── supabase/
│   └── migrations/               # SQL migration files
├── middleware.ts                  # Route protection
├── __tests__/                    # Test files (co-located + top-level integration)
│   ├── e2e/                      # Playwright E2E tests
│   ├── api/                      # API route tests
│   └── unit/                     # Unit tests
└── package.json
```

---

## 3. Database Schema (Supabase Postgres)

Merges v1 simplicity with v2's draft/snapshot/asset model.

### 3.1 Core Tables

```sql
-- profiles: user identity + server-owned fields
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  theme TEXT DEFAULT 'system',
  locale TEXT DEFAULT 'zh',
  plan TEXT NOT NULL DEFAULT 'free',        -- server-owned
  credits INTEGER NOT NULL DEFAULT 100,     -- server-owned cache
  is_admin BOOLEAN NOT NULL DEFAULT false,  -- server-owned
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- projects: identity + metadata (NOT canvas state)
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private',  -- private | public
  thumbnail_asset_id UUID,
  node_count_cache INTEGER NOT NULL DEFAULT 0,
  latest_draft_id UUID,                        -- FK to project_drafts
  flagged BOOLEAN NOT NULL DEFAULT false,
  flag_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_user_updated ON projects(user_id, updated_at DESC);

-- project_drafts: current editable canvas state (v2 model)
CREATE TABLE public.project_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL DEFAULT 1,
  nodes_json JSONB NOT NULL DEFAULT '[]',
  edges_json JSONB NOT NULL DEFAULT '[]',
  viewport_json JSONB NOT NULL DEFAULT '{"x":0,"y":0,"zoom":1}',
  history_json JSONB NOT NULL DEFAULT '{"past":[],"future":[]}',
  image_pool_json JSONB NOT NULL DEFAULT '{}',
  saved_by_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_drafts_project ON project_drafts(project_id);

-- project_assets: tracked media (images, videos, thumbnails)
CREATE TABLE public.project_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,                    -- upload | generated | preview | video | thumbnail
  storage_bucket TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  width INTEGER,
  height INTEGER,
  duration_ms INTEGER,
  checksum TEXT,
  visibility TEXT NOT NULL DEFAULT 'private',
  source_asset_id UUID,                 -- parent asset (e.g., original -> crop)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);
CREATE INDEX idx_assets_owner ON project_assets(owner_user_id);
CREATE INDEX idx_assets_project ON project_assets(project_id);

-- ai_jobs: durable execution state for image/video/tool jobs
CREATE TABLE public.ai_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  node_id TEXT,
  job_type TEXT NOT NULL,               -- image | video | split | crop | merge
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | running | succeeded | failed
  progress NUMERIC,
  request_json JSONB,
  result_json JSONB,
  error_code TEXT,
  error_message TEXT,
  external_job_id TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  credit_hold_amount INTEGER NOT NULL DEFAULT 0,
  credits_consumed INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_jobs_user_status ON ai_jobs(user_id, status);
CREATE INDEX idx_jobs_polling ON ai_jobs(status, updated_at) WHERE status IN ('pending', 'running');

-- credit_ledger: immutable accounting
CREATE TABLE public.credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,             -- grant | consume | hold | release | refund | topup
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_type TEXT,                  -- job | payment | subscription | admin
  reference_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ledger_user ON credit_ledger(user_id, created_at DESC);

-- plans: subscription tier definitions
CREATE TABLE public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly_usd NUMERIC,
  price_monthly_cny NUMERIC,
  monthly_credits INTEGER NOT NULL,
  max_projects INTEGER,
  max_storage_mb INTEGER NOT NULL,
  features JSONB NOT NULL DEFAULT '{}',
  stripe_price_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- payments: payment transactions
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  type TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  external_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- user_api_keys: BYOK encrypted storage (Pro+ only)
CREATE TABLE public.user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,          -- pgcrypto encrypted
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);
```

### 3.2 RLS Policies

```sql
-- All tables get RLS enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only access own data
CREATE POLICY "own_profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "own_projects" ON projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "public_projects_read" ON projects FOR SELECT USING (visibility = 'public');
CREATE POLICY "own_drafts" ON project_drafts FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
CREATE POLICY "own_assets" ON project_assets FOR ALL USING (auth.uid() = owner_user_id);
CREATE POLICY "own_jobs" ON ai_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_ledger" ON credit_ledger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_payments" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_api_keys" ON user_api_keys FOR ALL USING (auth.uid() = user_id);
```

### 3.3 Triggers

```sql
-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_timestamp BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_projects_timestamp BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_drafts_timestamp BEFORE UPDATE ON project_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_jobs_timestamp BEFORE UPDATE ON ai_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 4. API Routes Design

### 4.1 Project APIs

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/[id]` | Get project metadata |
| PATCH | `/api/projects/[id]` | Update name, visibility |
| DELETE | `/api/projects/[id]` | Delete project + assets |
| GET | `/api/projects/[id]/draft` | Load canvas draft |
| PUT | `/api/projects/[id]/draft` | Save canvas draft (full) |
| PATCH | `/api/projects/[id]/draft/viewport` | Save viewport only |

### 4.2 Asset APIs

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/assets/upload` | Get signed upload URL |
| POST | `/api/assets/complete` | Register uploaded asset metadata |
| GET | `/api/assets/[id]` | Get asset info + signed URL |
| DELETE | `/api/assets/[id]` | Soft-delete asset |

### 4.3 AI & Media APIs

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/ai/image/generate` | Submit image generation job |
| POST | `/api/ai/video/generate` | Submit video generation job |
| GET | `/api/jobs/[id]` | Poll job status |
| POST | `/api/image/split` | Split image into grid (sharp) |
| POST | `/api/image/crop` | Crop image (sharp) |
| POST | `/api/image/merge` | Merge storyboard (sharp) |
| POST | `/api/image/metadata` | Read/write PNG metadata |

### 4.4 Billing APIs

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/billing/paypal/checkout` | Create PayPal checkout order |
| POST | `/api/billing/paypal/capture` | Capture approved PayPal payment |
| POST | `/api/billing/alipay/checkout` | Create Alipay payment order |
| POST | `/api/billing/wechat/checkout` | Create WeChat Pay order |
| POST | `/api/webhooks/paypal` | PayPal webhook handler |
| POST | `/api/webhooks/alipay` | Alipay notification handler |
| POST | `/api/webhooks/wechat-pay` | WeChat Pay notification handler |

### 4.5 Settings APIs

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/settings/api-keys` | List user's BYOK providers |
| PUT | `/api/settings/api-keys` | Set/update API key (encrypted) |
| DELETE | `/api/settings/api-keys/[provider]` | Remove API key |

### 4.6 Auth/OAuth Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/auth/login` | Render login options (Google / WeChat) |
| GET | `/auth/callback` | OAuth callback handler |
| POST | `/api/auth/oauth/google` | Start Google OAuth flow |
| POST | `/api/auth/oauth/wechat` | Start WeChat OAuth flow |

### 4.7 API Route Pattern

Every API route follows this pattern:

```typescript
// app/api/ai/image/generate/route.ts
export async function POST(request: NextRequest) {
  // 1. Auth: validate Supabase session
  const supabase = createServerClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 2. Validate: zod schema
  const body = generateImageSchema.parse(await request.json());

  // 3. Authorize: check credits, plan limits
  const profile = await getProfile(supabase, user.id);
  if (profile.credits < cost) return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });

  // 4. Execute: create job, call provider
  const job = await jobService.createImageJob(user.id, body);

  // 5. Return: job ID for polling
  return NextResponse.json({ jobId: job.id });
}
```

---

## 5. Ports & Adapters Architecture

`ports.ts` defines core interfaces. `canvasServices.ts` wires the web adapters.

### 5.1 Service Wiring

```typescript
// canvasServices.ts
export const canvasAiGateway = webAiGateway;
export const canvasVideoAiGateway = webVideoGateway;
export const canvasToolProcessor = new CanvasToolProcessor(webImageSplitGateway, uuidGenerator);
```

### 5.2 ImagePersistence Port

```typescript
// ports.ts (new addition)
interface ImagePersistence {
  resolveDisplayUrl(imageUrl: string): string;
  persistImage(source: string): Promise<string>;
  prepareNodeImage(source: string): Promise<{ imageUrl: string; previewImageUrl: string; aspectRatio: string }>;
  loadImageAsDataUrl(source: string): Promise<string>;
}
```

**Web implementation**: Upload to Supabase Storage, return public/signed URLs.

### 5.4 New Port: ProjectPersistence (extracted from projectStore.ts)

```typescript
// ports.ts (new addition)
interface ProjectPersistence {
  listSummaries(): Promise<ProjectSummary[]>;
  getProject(id: string): Promise<Project | null>;
  getDraft(projectId: string): Promise<ProjectDraft | null>;
  saveDraft(projectId: string, draft: ProjectDraft): Promise<void>;
  saveViewport(projectId: string, viewport: Viewport): Promise<void>;
  createProject(name: string): Promise<ProjectSummary>;
  renameProject(id: string, name: string): Promise<void>;
  deleteProject(id: string): Promise<void>;
}
```

---

## 6. Server-Side Provider Architecture

### 6.1 AI Provider Interface (ported from Rust trait)

```typescript
// src/server/ai/types.ts
interface AIProvider {
  name: string;
  supportsModel(model: string): boolean;
  listModels(): string[];
  setApiKey(apiKey: string): void;
  // Unified job-based API (even for sync providers)
  submitJob(apiKey: string, request: GenerateRequest): Promise<{ jobId: string; immediate?: string }>;
  pollJob(apiKey: string, jobId: string): Promise<JobPollResult>;
}
```

### 6.2 Providers to Port

| Provider | Rust Lines | Complexity | Key Behavior |
|----------|-----------|------------|--------------|
| PPIO | ~350 | LOW | Sync POST, non-resumable |
| GRSAI | 371 | MEDIUM | Submit+poll, reference image encoding |
| KIE (image) | 528 | HIGH | File upload (multipart) + submit + poll |
| FAL | 385 | MEDIUM-HIGH | Queue API with fallback endpoint patterns |

### 6.3 Video Providers to Port

| Provider | Rust Lines | Complexity | Shared Infra |
|----------|-----------|------------|-------------|
| KIE Common | ~385 | MEDIUM | Upload + polling (shared by all 3) |
| Kling | 291 | MEDIUM | Element uploads, multi-shot |
| Sora2 | 241 | LOW | Simple param mapping |
| Veo | 241 | LOW | Different endpoint, seed validation |

### 6.4 Image Processing (sharp replacement for Rust image crate)

| Capability | Rust Impl | Web Impl |
|-----------|-----------|----------|
| Split image into grid | `image` crate crop | `sharp.extract()` per cell |
| Crop by aspect ratio | `image` crate | `sharp.extract()` |
| Merge storyboard | `fast_image_resize` + `imageproc` + `ab_glyph` | `sharp.composite()` + bundled font |
| PNG metadata | `png` crate iTXt chunk | `pngjs` or `sharp.metadata()` + custom chunk |
| Resize/preview | `fast_image_resize` | `sharp.resize()` |
| Content-addressed storage | MD5 hash | `crypto.createHash('md5')` |

**Font handling for storyboard merge**: Bundle a CJK-compatible font (Noto Sans CJK) instead of system font detection. Use `sharp` text overlay or `@napi-rs/canvas` for text rendering.

---

## 7. Client-Side Reliability (v2 requirements)

### 7.1 Local Draft Cache (IndexedDB)

Every canvas save goes to both Supabase AND IndexedDB:
- **IndexedDB**: immediate, provides offline resilience
- **Supabase**: debounced, provides cloud persistence

On load: check IndexedDB draft timestamp vs Supabase draft timestamp. If local is newer, prompt user to restore.

### 7.2 Save State UX

Display save indicator in canvas header:
- `saving` -- write in progress
- `saved` -- successfully synced to Supabase
- `unsynced` -- local changes not yet synced
- `offline` -- network unavailable, changes cached locally
- `conflict` -- another session modified the draft (revision mismatch)

### 7.3 Conflict Detection

Use `revision` column on `project_drafts`:
1. Client loads draft, remembers `revision = N`
2. On save, send `PUT /api/projects/[id]/draft` with `expectedRevision: N`
3. Server checks: if `current_revision == N`, save and increment to `N+1`
4. If mismatch: return 409 Conflict. Client shows merge prompt or force-save option.

### 7.4 Duplicate Tab Detection

Use `BroadcastChannel` API:
- On canvas mount, broadcast "canvas-open:{projectId}"
- If another tab responds, show warning: "Project open in another tab"

---

## 8. Node Component Web API Reference

### 8.1 Node File Operations

| Component | Operation | Web Implementation |
|-----------|----------|-------------------|
| `StoryboardNode.tsx` | File open | Browser `<input type="file">` |
| `StoryboardNode.tsx` | File save/reveal | Browser download `<a download>` |
| `StoryboardNode.tsx` | Path join | URL API |
| `TextAnnotationNode.tsx` | Open URL | `window.open(url, '_blank')` |
| `VideoGenNode.tsx` | Save video | Browser download |
| `VideoResultNode.tsx` | Save video | Browser download |
| `NodeActionToolbar.tsx` | Save image | Browser download |

### 8.2 Application Layer

| File | Implementation | Effort |
|------|---------------|--------|
| `imageData.ts` | ImagePersistence port + Supabase Storage | HIGH |
| `toolProcessor.ts` | Injected ports only | LOW |
| `canvasServices.ts` | Web adapter wiring | TRIVIAL |

---

## 9. Workstreams for Parallel Implementation

These workstreams are **independent enough** to run in parallel git worktrees with subagents.

### Workstream A: Auth + App Shell + Middleware

**Dependencies**: None (greenfield)
**Git worktree**: `ws/auth-shell`
**Scope**:
- Next.js 15 project scaffolding
- Supabase client setup (browser + server)
- Auth pages (login, signup, callback)
- OAuth provider setup (Google + WeChat)
- Middleware route protection
- App layout with auth guard
- Profile auto-creation trigger

**Tests**:
- Unit: middleware auth redirect logic
- Integration: OAuth callback handling (Google + WeChat)
- E2E (Playwright): signup flow, login flow, protected route redirect

### Workstream B: Database Schema + Project Persistence

**Dependencies**: Workstream A (auth)
**Git worktree**: `ws/project-persistence`
**Scope**:
- Supabase migration files (all tables)
- RLS policies
- Project CRUD API routes
- Draft save/load API routes
- Rewritten `projectStore.ts` (Supabase + IndexedDB)
- Debounced save + viewport save
- Conflict detection (revision-based)

**Tests**:
- Unit: image pool encoding/decoding, debounce logic
- API: project CRUD, draft save/load, RLS isolation
- E2E: create project, rename, delete, auto-save on canvas edit

### Workstream C: Canvas Migration + Node Cleanup

**Dependencies**: Workstream B (project persistence)
**Git worktree**: `ws/canvas-migration`
**Scope**:
- Copy canvas domain/ (as-is)
- Copy canvas models/ (as-is)
- Copy canvas tools/ (as-is)
- Copy canvas ui/ (as-is)
- Copy canvas edges/ (as-is)
- Adapt canvas nodes/ (remove Tauri imports per Section 8.1)
- Rewrite `imageData.ts` with ImagePersistence port
- Adapt `toolProcessor.ts` (remove direct command imports)
- Swap `canvasServices.ts` wiring
- Canvas page (`'use client'`)
- Asset upload pipeline (browser -> Supabase Storage)

**Tests**:
- Unit: imageData web functions, aspect ratio parsing
- E2E: canvas loads, nodes render, drag/connect, upload image, undo/redo

### Workstream D: Server-Side AI Providers

**Dependencies**: Workstream A (auth for API route pattern)
**Git worktree**: `ws/ai-providers`
**Scope**:
- AI provider interface + registry (TypeScript)
- Port PPIO provider
- Port GRSAI provider
- Port KIE provider (image) + shared upload logic
- Port FAL provider
- API routes: `/api/ai/image/generate`, `/api/jobs/[id]`
- Job service: create job, credit hold, poll, complete/fail, refund
- Web AI gateway (`webAiGateway.ts`)

**Tests**:
- Unit: provider request/response mapping, credit calculations
- Integration: mock provider -> job lifecycle (submit -> poll -> complete)
- E2E: image generation flow on canvas

### Workstream E: Server-Side Video Providers

**Dependencies**: Workstream D (shared KIE common infra, job service)
**Git worktree**: `ws/video-providers`
**Scope**:
- Video provider interface + registry
- Port KIE common (upload + polling)
- Port Kling provider
- Port Sora2 provider
- Port Veo provider
- API routes: `/api/ai/video/generate`
- Realtime job updates (Supabase Realtime channel)
- Web video gateway (`webVideoGateway.ts`)
- Video result handling (asset registration)

**Tests**:
- Unit: provider param mapping, seed validation, duration->frames conversion
- Integration: mock provider -> video job lifecycle
- E2E: video generation flow, progress updates, result node creation

### Workstream F: Image Processing APIs

**Dependencies**: None (can start with Workstream A)
**Git worktree**: `ws/image-processing`
**Scope**:
- `sharp`-based image processor (split, crop, merge, resize, metadata)
- API routes: `/api/image/split`, `/api/image/crop`, `/api/image/merge`, `/api/image/metadata`
- Storyboard merge with text overlay (bundled CJK font)
- Content-addressed storage in Supabase Storage
- Web image split gateway (`webImageSplitGateway.ts`)

**Tests**:
- Unit: split grid calculation, crop coordinates, merge layout
- Integration: upload image -> split -> verify output count and dimensions
- E2E: storyboard split tool on canvas

### Workstream G: Billing + Credits

**Dependencies**: Workstream A (auth), Workstream B (schema)
**Git worktree**: `ws/billing`
**Scope**:
- Plan definitions (seed data)
- PayPal integration (checkout, capture, webhooks)
- Alipay integration (checkout + async notifications)
- WeChat Pay integration (checkout + async notifications)
- Credit ledger operations (grant, hold, consume, refund)
- Billing page UI
- Credit display in app header

**Tests**:
- Unit: credit hold/release/refund arithmetic
- Integration: payment notification -> plan/credit update (PayPal/Alipay/WeChat)
- E2E: billing page, provider selection, successful top-up flow

### Workstream H: Landing + Marketing + Settings

**Dependencies**: Workstream A (auth)
**Git worktree**: `ws/landing-settings`
**Scope**:
- Landing page (SSG)
- Pricing page
- Settings page (profile, API keys, preferences)
- Theme/language persistence
- Full en/zh localization for auth, app shell, canvas UI, settings, billing, and errors
- SEO meta tags

**Tests**:
- Unit: locale key parity check (`zh.json` and `en.json` have matching keys)
- E2E: language switch `en`/`zh` with no raw key leaks
- E2E: landing page renders, pricing comparison, settings save

---

## 10. Implementation Phases (Sequencing)

### Phase 0: Architecture Lock (parallel: A, F)

- Workstream A: Auth + App Shell
- Workstream F: Image Processing APIs (independent)
- Decision: worker platform, final schema review

### Phase 1: Editor MVP (parallel: B, C after B foundation)

- Workstream B: Database Schema + Project Persistence
- Workstream C: Canvas Migration (starts after B has API routes ready)

### Phase 2: AI MVP (parallel: D, E after D foundation)

- Workstream D: Server-Side AI Providers
- Workstream E: Server-Side Video Providers (starts after D has shared infra)

### Phase 3: Launch Hardening (parallel: G, H)

- Workstream G: Billing + Credits
- Workstream H: Landing + Marketing + Settings

### Phase 4: CI/CD Pipeline + Deployment

- Git repo to remote server automated deployment pipeline
- Priority: feature development + local browser verification first; CI/CD hardens the release path

### Phase 5: Post-Launch Optimization

- Performance monitoring and optimization
- Community features (publish, fork, report)
- Admin tools and moderation

---

## 11. TDD Strategy

### 11.1 Test Framework

- **Unit tests**: Vitest (fast, Vite-native)
- **API route tests**: Vitest + `next/test-utils` or supertest
- **E2E tests**: Playwright (browser-based UI testing)

### 11.2 TDD Workflow Per Task

1. Write failing test(s) that describe expected behavior
2. Implement minimum code to pass
3. Refactor while keeping tests green
4. Run full test suite before commit

### 11.3 Test Categories

| Category | Tool | Location | Runs |
|----------|------|----------|------|
| Unit | Vitest | `__tests__/unit/` or co-located `*.test.ts` | Every commit |
| API | Vitest | `__tests__/api/` | Every commit |
| E2E | Playwright | `__tests__/e2e/` | Pre-merge |

### 11.4 Playwright E2E Test Plan

```
__tests__/e2e/
├── auth.spec.ts           # Signup, login, logout, protected routes
├── dashboard.spec.ts      # Project CRUD, list, rename, delete
├── canvas-basic.spec.ts   # Load canvas, add nodes, connect, undo/redo
├── canvas-upload.spec.ts  # Image upload, display, preview
├── canvas-tools.spec.ts   # Crop, annotate, split tools
├── image-gen.spec.ts      # Image generation flow (mocked provider)
├── video-gen.spec.ts      # Video generation flow (mocked provider)
├── save-restore.spec.ts   # Auto-save, refresh restore, conflict
├── billing.spec.ts        # Plan display, provider selection, top-up flow
├── settings.spec.ts       # Theme, language, API keys
└── landing.spec.ts        # Marketing page rendering
```

---

## 12. Git Worktree Strategy

### 12.1 Setup

```bash
# Main branch stays clean
git checkout main

# Create worktrees for parallel work
git worktree add ../ws-auth-shell -b ws/auth-shell
git worktree add ../ws-project-persistence -b ws/project-persistence
git worktree add ../ws-canvas-migration -b ws/canvas-migration
git worktree add ../ws-ai-providers -b ws/ai-providers
git worktree add ../ws-video-providers -b ws/video-providers
git worktree add ../ws-image-processing -b ws/image-processing
git worktree add ../ws-billing -b ws/billing
git worktree add ../ws-landing-settings -b ws/landing-settings
```

### 12.2 Integration

Each worktree branch merges to `main` via PR when workstream is complete:
1. Run full test suite in worktree
2. Rebase on latest `main`
3. Create PR with workstream summary
4. Merge after review

### 12.3 Parallel Subagent Assignment

Subagents can work simultaneously on independent worktrees:
- **Agent 1**: Workstream A (auth) -> then B (persistence)
- **Agent 2**: Workstream F (image processing) -> then D (AI providers)
- **Agent 3**: Workstream C (canvas migration, after B merges)
- **Agent 4**: Workstream E (video, after D merges) + G (billing)
- **Agent 5**: Workstream H (landing + settings)

---

## 13. Verification Plan

### 13.1 Per-Workstream Gates

Each workstream must pass before merge:
- All TDD tests pass (unit + integration)
- Playwright E2E tests pass for affected flows
- `npx tsc --noEmit` -- zero TS errors
- `npm run build` -- successful production build

### 13.2 End-to-End Smoke Test (Post All Merges)

1. Sign up -> verify email -> login -> see dashboard
2. Create project -> canvas loads -> add nodes -> connect -> undo/redo
3. Upload image -> node displays it -> auto-saves
4. Refresh -> canvas restores from Supabase
5. Open two tabs -> conflict warning shown
6. Generate image -> credits deducted -> result node appears
7. Generate video -> progress shown -> result node created
8. Use crop/split tools -> derived nodes created
9. Settings -> change theme/language -> persists
10. Billing -> view plan -> see credit balance
11. Try accessing another user's project -> 403
12. Landing page -> pricing -> sign up CTA

### 13.3 Performance Benchmarks

- Canvas with 20+ nodes: drag/zoom stays smooth (no regression from desktop)
- Auto-save latency: < 500ms from edit to Supabase write
- Image upload: < 2s for 5MB file
- Canvas load: < 1s for typical project (10 nodes)

---

## 14. Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| New repo vs migrate | **New repo** | Clean Next.js scaffold, copy reusable code in |
| Schema model | **Draft/snapshot** (v2) | Supports conflict detection, publish/unpublish |
| Image storage | **Supabase Storage** with asset records | Tracked media, signed URLs, lifecycle management |
| Job execution | **Vercel API routes + Supabase Realtime** | Start simple; add dedicated worker if polling load grows |
| Video polling | **Client polls API route, API route polls provider** | Avoids long-running serverless functions |
| Local cache | **IndexedDB** (idb-keyval) | Offline resilience, crash recovery |
| Auth | **Supabase Auth** (email + Google + WeChat) | Covers global + China OAuth expectations |
| API keys | **Platform keys default** + BYOK for Pro | Security: keys never reach browser |
| Test framework | **Vitest + Playwright** | Fast unit tests + real browser E2E |
| Payments | **PayPal + Alipay + WeChat Pay** | Supports both global and China payment channels at launch |
| Localization | **Complete en/zh parity** | Ensures bilingual UX consistency across all user surfaces |

---

## 15. CI/CD Pipeline Design

### 15.1 Strategy

Feature development and local browser verification take priority. CI/CD is implemented in Phase 4 after core features are stable (Phase 0-3).

### 15.2 Pipeline Architecture

```
Git Push (main / PR branch)
    │
    ├── GitHub Actions: CI Pipeline
    │   ├── Install dependencies (npm ci)
    │   ├── Type check (tsc --noEmit)
    │   ├── Unit + API tests (vitest run)
    │   ├── Build (next build)
    │   ├── E2E tests (playwright, against preview)
    │   └── Lint check
    │
    ├── PR → main: Deploy to Staging
    │   ├── Vercel Preview Deployment (automatic)
    │   ├── Run E2E tests against preview URL
    │   └── Supabase staging project (separate instance)
    │
    └── Merge to main: Deploy to Production
        ├── Vercel Production Deployment (automatic)
        ├── Supabase migration apply (via CLI in CI)
        ├── Post-deploy smoke test
        └── Notify (Slack/webhook)
```

### 15.3 Deployment Target

| Component | Hosting | Trigger |
|-----------|---------|---------|
| Next.js App | Vercel | Git push to `main` |
| Supabase (DB + Auth + Storage) | Supabase Cloud | Migrations via `supabase db push` in CI |
| Preview Environments | Vercel Preview | PR creation/update |

### 15.4 GitHub Actions Workflows

**CI (every push/PR)**:
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  check:
    - npm ci
    - npx tsc --noEmit
    - npx vitest run
    - npm run build
  e2e:
    needs: check
    - npx playwright install
    - npx playwright test
```

**Deploy to Production (merge to main)**:
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    - Vercel auto-deploys (connected via Vercel GitHub integration)
    - npx supabase db push --linked
    - Post-deploy smoke test (curl health endpoint)
```

**Database Migration**:
```yaml
# .github/workflows/migrate.yml
# Runs Supabase migrations on staging/production
- supabase link --project-ref $PROJECT_REF
- supabase db push
```

### 15.5 Environment Configuration

| Environment | Supabase Project | Vercel Target | Branch |
|-------------|-----------------|---------------|--------|
| Local Dev | `supabase start` (local) | `npm run dev` | any |
| Staging | staging project | Vercel Preview | PR branches |
| Production | production project | Vercel Production | `main` |

### 15.6 Secrets Management

GitHub Secrets required:
- `SUPABASE_ACCESS_TOKEN` — CI migration runner
- `SUPABASE_PROJECT_REF_STAGING` / `SUPABASE_PROJECT_REF_PROD`
- `SUPABASE_DB_PASSWORD_STAGING` / `SUPABASE_DB_PASSWORD_PROD`
- Vercel deployment handled via Vercel GitHub integration (no manual token)

### 15.7 Implementation Priority

1. **Phase 0-3**: Local development only (`npm run dev` + browser verification)
2. **Phase 4 Step 1**: Set up Vercel project + GitHub integration (auto-deploy on push)
3. **Phase 4 Step 2**: Add CI workflow (type check + unit tests + build)
4. **Phase 4 Step 3**: Add E2E tests in CI
5. **Phase 4 Step 4**: Add Supabase migration in CI
6. **Phase 4 Step 5**: Add staging environment with preview deployments

---

## 16. Risk Mitigations (renumbered from 15)

| Risk | Mitigation |
|------|-----------|
| Data loss during early web use | IndexedDB local cache + save-state indicator |
| Image pool encoding breaks on web | Unit tests for encode/decode with representative project data |
| Sharp can't replicate Rust merge quality | Test storyboard merge output visually; bundle CJK font |
| Vercel timeout on heavy image processing | Set function timeout to 60s; reject files > 20MB |
| Provider API key leakage | Server-only key access; BYOK encrypted with pgcrypto |
| OAuth callback/provider drift (Google vs WeChat) | Provider-specific auth adapters + integration callback tests |
| Multi-provider payment reconciliation | Normalized payment event model + idempotent handlers per gateway |
| Missing translations at launch | CI locale parity check + Playwright locale-switch regression tests |
| Canvas perf regression | Benchmark with 20+ node projects; keep @xyflow/react client-only |
| Conflict between parallel worktrees | Clear module boundaries; integration tests after merge |

---

## 17. Complete API Reference

### Server-Side APIs

| # | API | Purpose | Location |
|---|-----|---------|----------|
| 1 | `POST /api/settings/api-keys` | Set provider API key | API route |
| 2 | `POST /api/ai/image/generate` | Submit image generation job | API route |
| 3 | `GET /api/jobs/[id]` | Poll job status | API route |
| 4 | `GET /api/ai/models` | List available models | API route |
| 5 | `POST /api/image/split` | Split image into grid (sharp) | API route |
| 6 | `POST /api/image/crop` | Crop image (sharp) | API route |
| 7 | `POST /api/image/merge` | Merge storyboard images (sharp) | API route |
| 8 | `POST /api/image/metadata` | Read/write PNG metadata | API route |
| 9 | `POST /api/ai/video/generate` | Submit video generation job | API route |
| 10 | `GET /api/video/cache-stats` | Video cache statistics | API route |
| 11 | `DELETE /api/video/cache` | Clear video cache | API route |
| 12 | `GET /api/video/models` | List video models | API route |
| 13 | `GET /api/projects` | List user's projects | API route |
| 14 | `POST /api/projects` | Create project | API route |
| 15 | `GET /api/projects/[id]` | Get project metadata | API route |
| 16 | `PATCH /api/projects/[id]` | Update project (rename, visibility) | API route |
| 17 | `DELETE /api/projects/[id]` | Delete project | API route |
| 18 | `GET /api/projects/[id]/draft` | Load canvas draft | API route |
| 19 | `PUT /api/projects/[id]/draft` | Save canvas draft | API route |
| 20 | `PATCH /api/projects/[id]/draft/viewport` | Save viewport only | API route |
| 21 | `POST /api/assets/upload` | Get signed upload URL | API route |
| 22 | `POST /api/assets/complete` | Register asset metadata | API route |
| 23 | `POST /api/billing/paypal/checkout` | Create PayPal order | API route |
| 24 | `POST /api/billing/alipay/checkout` | Create Alipay order | API route |
| 25 | `POST /api/billing/wechat/checkout` | Create WeChat Pay order | API route |

### Client-Side Operations

| Operation | Web Implementation |
|-----------|-------------------|
| Image upload | `<input type="file">` -> Supabase Storage |
| Image persist | Upload to Supabase Storage |
| Image download | Browser `<a download>` |
| Clipboard copy | `navigator.clipboard.write()` |
| Open URL | `window.open(url, '_blank')` |
| System info | `navigator.userAgent` |
