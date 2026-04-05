# N8 Findings

## Key Observations
- Current `user_api_keys` table has `unique(user_id, provider)` constraint — only 1 key per provider
- API route uses `upsert` with `onConflict: 'user_id,provider'`
- Settings UI currently shows one key per provider with edit/delete
- `settingsStore.ts` uses `ProviderApiKeys = Record<string, string>` (single key per provider)
- AI generate routes don't currently fetch API keys from DB — will need integration
