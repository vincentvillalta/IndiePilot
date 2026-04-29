# Phase 1 — Deferred Items

Items discovered during plan execution that are out-of-scope for the current plan and should be addressed by their owning plan.

---

## From 01-03 (Logger + ESLint Rule) execution — 2026-04-28

### Sibling-plan lint debt (not for 01-03 to fix)

While running `pnpm lint` after 01-03-T1 (no-raw-log rule), the following errors surfaced in files owned by parallel-running plans 01-02 (DB) and 01-04 (Inngest). These will be resolved by those plans' own format/lint passes; 01-03 must not touch them per SCOPE BOUNDARY rule.

- `apps/web/app/api/inngest/__tests__/route.test.ts` — `assist/source/organizeImports` + `format` errors (owner: 01-04)
- `apps/web/inngest/functions/__tests__/health.test.ts` — `assist/source/organizeImports` (owner: 01-04)
- `packages/db/src/schema/index.ts` — `assist/source/organizeImports` (owner: 01-02)
- `packages/db/tests/types.test.ts` — `lint/style/useImportType` (owner: 01-02)

Plan 01-03's own files (`tooling/eslint-config/**`, `apps/web/lib/**`) lint clean after `biome check --write` on those paths.
