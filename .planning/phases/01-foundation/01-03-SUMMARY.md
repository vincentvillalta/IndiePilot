# Plan 01-03 — Logger + ESLint `no-raw-log` Rule (SUMMARY)

Status: completed.

## Versions installed (apps/web)
- `pino@^9.14.0`
- `@axiomhq/pino@^1.6.0`
- `pino-pretty@^13.1.3` (devDependency)
- `zod@^3.23.0` (already installed by Plan 01)

## Final REDACT_PATHS

Verbatim, in `apps/web/lib/logger.ts`:

```ts
const REDACT_PATHS = [
  "p8",
  "privateKey",
  "jwt",
  "password",
  "passwordHash",
  "*.p8",
  "*.privateKey",
  "*.jwt",
  "*.password",
  "*.passwordHash",
  "*.ascToken",
  "*.ascAccessToken",
  "*.ascRefreshToken",
  "req.headers.cookie",
  "req.headers.authorization",
  "request.headers.cookie",
  "request.headers.authorization",
  "event.data.password",
  "event.data.p8",
  "*.payload.password",
  "*.payload.p8",
];
```

Downstream phases (Phase 2 KMS, Phase 5 ASC invite) MUST log only through this
logger so these paths apply automatically.

## hashEmail truncation

`hashEmail()` returns the first 16 hex chars of SHA-256(`email.toLowerCase().trim() + LOG_HASH_SALT`).
Rationale: 64 bits of collision resistance is plenty at our scale and short
enough to scan in log lines. Per-deploy unlinkability comes from rotating
`LOG_HASH_SALT` in Vercel env (a fresh `openssl rand -hex 32` per deploy is
fine — old hashes don't need to remain comparable across rotations).

## ESLint sidecar setup

- `tooling/eslint-config` uses `typescript-eslint` flat preset so the rule runs
  against `.ts`/`.tsx`.
- `indiepilot/no-raw-log` is the only project-authored rule in Phase 1.
- The RuleTester suite in `tooling/eslint-config/__tests__/no-raw-log.test.mjs`
  was completed in Wave 0 (commit `f94703e`); this plan added the rule
  implementation to make it green.

## env contract validated by `apps/web/lib/env.ts`

Required at runtime (parsed at module load via Zod):
- `DATABASE_URL` (optional at build/test; tightened later)
- `LOG_HASH_SALT` (default `"dev-only-unsafe-salt"` — Vercel env should always
  set a real one)
- `AXIOM_TOKEN` (optional → stdout fallback)
- `AXIOM_DATASET` (default `"indiepilot"`)
- `LOG_LEVEL` (optional override)
- `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY` (optional in Phase 1)
- `NODE_ENV` (default `"development"`)
- `VERCEL_ENV` (optional — Vercel sets this on preview/prod)
- `NEON_BRANCH` (optional — `vercel env pull` sets this)

Plan 06's bootstrap doc should mirror this list.

## Verification (whole monorepo, this plan's scope)
- `pnpm --filter @indiepilot/web typecheck` ✓
- `pnpm --filter @indiepilot/web test` — 19 tests pass (13 logger + 3 health + 3 route)
- `pnpm --filter @indiepilot/web lint` ✓ (Biome + ESLint sidecar)
- `pnpm --filter @indiepilot/eslint-config test` ✓ (RuleTester)

Lint failures in `packages/db` files (`tests/types.test.ts` `useImportType`,
`src/schema/index.ts` import order) are owned by Plan 01-02 per
`deferred-items.md` — out of 01-03 scope.
