# Template System (N5 + N6) Task Plan

## Goal
Build the full-stack Workflow Template System enabling users to save, load, share, and browse reusable canvas workflow templates.

## Tasks

### N5.1 - Database Migration
- [x] Create `supabase/migrations/011_workflow_templates.sql`

### N5.2 - Template Serializer (TDD)
- [x] Write failing tests `__tests__/unit/templates/templateSerializer.test.ts`
- [x] Implement `src/features/canvas/application/templateSerializer.ts`
- [x] All tests green

### N5.3 - API Routes (TDD)
- [x] Write failing tests `__tests__/api/templates.test.ts`
- [x] Implement API routes
- [x] All tests green

### N5.4 - Frontend UI
- [x] TemplateCard component
- [x] TemplateLibrary panel
- [x] SaveTemplateDialog
- [x] Modify CanvasSidebar - add template button
- [x] Modify Dashboard - add template entry

### N5.5 - Official Templates
- [x] Create seed data

### N6.1 - Template Sharing Backend (TDD)
- [x] Write failing tests `__tests__/api/template-share.test.ts`
- [x] Implement publish/unpublish API
- [x] Extend GET /api/templates for community browsing

### N6.2 - Community UI
- [x] CommunityTemplates component
- [x] PublishTemplateDialog
- [x] Extend TemplateLibrary with community tab

### i18n
- [x] Add all template keys to zh.json + en.json

## Verification
- `npx tsc --noEmit` passes
- `npx vitest run` passes
