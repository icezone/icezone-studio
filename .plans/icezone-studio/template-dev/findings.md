# Template System Findings

## Codebase Observations
- Existing migrations go up to 010_triggers.sql
- Projects API pattern: createClient() + getAuthUser() for auth
- Validation uses Zod schemas in src/lib/validation.ts
- i18n has zh.json + en.json with module-prefixed keys
- CanvasSidebar uses lucide-react icons, memo pattern
- Dashboard has project grid with ProjectCard components
