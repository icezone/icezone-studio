# N8 - Multi API Key Rotation

## Goal
Allow users to configure multiple API keys per provider with automatic round-robin rotation and intelligent error handling.

## Tasks
- [x] N8.1 — Database Migration (011_api_keys_multi.sql)
- [x] N8.2 — Rotation Algorithm (TDD: tests first, then implementation)
- [x] N8.3 — API Integration (settings route + ai generate routes)
- [x] N8.4 — Frontend Settings UI + i18n

## Acceptance Criteria
- Multiple keys per provider stored with key_index
- Round-robin rotation across active keys
- Error classification: rate_limited, quota_exhausted, invalid, server_error, unknown
- Auto-recovery for rate-limited keys (60s)
- 3-strike blacklist for unknown errors
- Settings UI shows key status badges and management controls
- i18n keys in both zh.json and en.json
