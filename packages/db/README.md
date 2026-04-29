# @indiepilot/db

## Driver choice

- **`db`** (HTTP, `neon-http`) — for Next.js Route Handlers. Single round-trip per query. Does NOT support interactive transactions.
- **`createPoolClient()`** (Pool/WS, `neon-serverless`) — for Inngest functions and any code path needing transactions or multiple sequential queries. Caller MUST `await close()`.

## Audit

Use `audit({ actor, action, target?, payload? })` for any sensitive op (KMS decrypt, ASC invite queued, auth events). Append-only.

## Migrations

`pnpm db:generate` to author. `pnpm db:migrate` to apply. Never `push` in CI.
