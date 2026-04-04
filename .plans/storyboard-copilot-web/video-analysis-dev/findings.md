# Findings — video-analysis-dev

## Key Observations

1. Job service (`src/server/jobs/jobService.ts`) uses `type: 'image' | 'video'` but the type field is currently unused (suppressed with `void`). Need to extend to support `'video_analysis'`.
2. Job polling in `src/app/api/jobs/[id]/route.ts` checks video providers then image providers. For video_analysis, need a separate path since it's not a generation provider.
3. Existing test pattern: Supabase mocked via `vi.hoisted()` + `vi.mock()` with chainable query builders.
4. `fluent-ffmpeg` and `@ffmpeg-installer/ffmpeg` are not yet in package.json — need to install.
