---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-28
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2+ (unit + integration), Playwright 1.x (E2E — declared, not exercised in Phase 1) |
| **Config files** | `apps/web/vitest.config.ts`, `packages/db/vitest.config.ts`, optional `vitest.shared.ts` at root |
| **Quick run command** | `pnpm test` (Turbo runs each package's test script, only changed packages) |
| **Full suite command** | `pnpm test && pnpm typecheck && pnpm lint` |
| **Estimated runtime** | ~5s quick (changed packages only), ~30s full suite |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test && pnpm typecheck && pnpm lint`
- **Before `/gsd:verify-work`:** Full suite must be green + manual `curl /api/inngest` returns 200 against deployed preview + one real PR demonstrates Neon branch lifecycle (create → migrate → comment → delete on close)
- **Max feedback latency:** ~5s for unit tests, ~30s full suite

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 1 | FOUND-01 | unit (typecheck) | `pnpm typecheck` | ❌ W0 — needs tsconfigs | ⬜ pending |
| TBD | TBD | 1 | FOUND-01 | unit (lint) | `pnpm lint` (Biome + ESLint sidecar) | ❌ W0 — needs config files | ⬜ pending |
| TBD | TBD | 1 | FOUND-01 | smoke (manual) | `pnpm dev` shows "Ready in <Xs>" on :3000 | n/a — manual | ⬜ pending |
| TBD | TBD | 1 | FOUND-02 | unit (shape) | `pnpm --filter @indiepilot/db test tests/schema.test.ts` | ❌ W0 — file missing | ⬜ pending |
| TBD | TBD | 1 | FOUND-02 | unit (types) | `pnpm --filter @indiepilot/db test tests/types.test.ts` | ❌ W0 — file missing | ⬜ pending |
| TBD | TBD | 1 | FOUND-02 | integration (CI) | `DATABASE_URL=<test-branch> pnpm db:migrate` then assert 4 tables exist | ✅ inline in `neon-branch.yml` (W0) | ⬜ pending |
| TBD | TBD | 1 | FOUND-02 | integration (seed) | `pnpm db:seed` then SQL count assertions | ❌ W0 — `tests/seed.test.ts` missing | ⬜ pending |
| TBD | TBD | 2 | FOUND-03 | E2E (real PR) | Open PR → observe `Neon Preview Branch / setup` job goes green; comment posted | n/a — manual on first PR | ⬜ pending |
| TBD | TBD | 2 | FOUND-03 | integration (CI) | `Apply migrations` step inside `neon-branch.yml` exits 0 | ✅ inline in workflow (W0) | ⬜ pending |
| TBD | TBD | 2 | FOUND-03 | E2E (cleanup) | Close PR → branch removed from Neon | n/a — manual | ⬜ pending |
| TBD | TBD | 1 | FOUND-04 | unit (redaction) | `pnpm --filter @indiepilot/web test apps/web/lib/__tests__/logger.test.ts` | ❌ W0 — file missing | ⬜ pending |
| TBD | TBD | 1 | FOUND-04 | unit (hash stability) | Same `logger.test.ts` | ❌ W0 — file missing | ⬜ pending |
| TBD | TBD | 1 | FOUND-04 | unit (transport fallback) | Same `logger.test.ts` | ❌ W0 — file missing | ⬜ pending |
| TBD | TBD | 1 | FOUND-04 | unit (custom rule) | `pnpm --filter @indiepilot/eslint-config test tooling/eslint-config/__tests__/no-raw-log.test.js` | ❌ W0 — file missing | ⬜ pending |
| TBD | TBD | 2 | FOUND-05 | integration (route) | `pnpm --filter @indiepilot/web test apps/web/app/api/inngest/__tests__/route.test.ts` | ❌ W0 — file missing | ⬜ pending |
| TBD | TBD | 2 | FOUND-05 | integration (function) | Optional Inngest dev-server smoke; OR shape unit test in `apps/web/inngest/functions/__tests__/health.test.ts` | ❌ W0 — file missing | ⬜ pending |
| TBD | TBD | 2 | FOUND-05 | smoke (deploy) | `curl https://<preview>.vercel.app/api/inngest` returns 200 with manifest JSON | n/a — manual on preview | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task IDs are TBD — populated by gsd-planner; this matrix anchors them.*

---

## Wave 0 Requirements

Test files and config that must exist before implementation tasks can be verified (greenfield — none exist):

- [ ] `apps/web/vitest.config.ts` — Vitest config for the Next.js app
- [ ] `packages/db/vitest.config.ts` — Vitest config for the DB package
- [ ] `vitest.shared.ts` (root, optional) — shared coverage/reporter config
- [ ] `apps/web/lib/__tests__/logger.test.ts` — stubs covering FOUND-04 (redaction, email hash, transport fallback)
- [ ] `apps/web/app/api/inngest/__tests__/route.test.ts` — stubs covering FOUND-05 (GET 200)
- [ ] `apps/web/inngest/functions/__tests__/health.test.ts` — stubs covering FOUND-05 (function shape returns `{ ok: true }`)
- [ ] `packages/db/tests/schema.test.ts` — stubs covering FOUND-02 (table exports + columns)
- [ ] `packages/db/tests/types.test.ts` — stubs covering FOUND-02 (Drizzle generates type-safe queries)
- [ ] `packages/db/tests/seed.test.ts` — stubs covering FOUND-02 (seed populates expected counts)
- [ ] `tooling/eslint-config/__tests__/no-raw-log.test.js` — stubs covering FOUND-04 (custom rule via ESLint `RuleTester`)
- [ ] `.github/workflows/ci.yml` — typecheck + lint + test gate (this file IS the test for FOUND-03 in part)
- [ ] `.github/workflows/neon-branch.yml` — per-PR Neon branch lifecycle (covers FOUND-03 by being the test for it)
- [ ] Framework install: `vitest`, `@vitejs/plugin-react`, `playwright`, `@axiomhq/pino`, `pino`, `pino-pretty` — included in `pnpm install` step of bootstrap

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `pnpm dev` starts Next.js cleanly on port 3000 | FOUND-01 | Dev server lifecycle is awkward to assert in CI without bloat; cheap to verify by eye | After `pnpm bootstrap`, run `pnpm dev` from repo root, observe `Ready in <Xs>` on `http://localhost:3000` |
| First real PR demonstrates Neon branch lifecycle (create → migrate → comment → delete on close) | FOUND-03 | The full PR-open → PR-close round trip is best validated against the real GitHub + Neon integration once, not mocked | Open a draft PR with a no-op change; observe `Neon Preview Branch / setup` job runs to green; comment with branch URL appears on PR; close PR; observe `cleanup` job runs and the branch disappears from Neon dashboard |
| `curl /api/inngest` against deployed preview returns 200 with manifest JSON | FOUND-05 | Inngest's signing key wiring only fully works on a real deployment with env vars, not in unit/integration tests | Push a branch; on Vercel preview URL, `curl https://<preview>.vercel.app/api/inngest` should return 200 + JSON containing the registered `health.check` function |
| `health.check` Inngest function executes when invoked | FOUND-05 | Inngest dev-server lifecycle in CI adds complexity without much value — the route + function-shape tests cover 90% of the wiring | After `pnpm dev`, in another terminal: `pnpm dlx inngest-cli dev`; from a third: `curl -X POST http://localhost:8288/e/dev_key -H "Content-Type: application/json" -d '{"name":"health/check.requested"}'`; observe function run completes in Inngest UI |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies declared
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (planner enforces during task ordering)
- [ ] Wave 0 covers all MISSING test-file references above
- [ ] No watch-mode flags in commands (CI-clean)
- [ ] Feedback latency < 30s for full suite
- [ ] `nyquist_compliant: true` set in frontmatter (planner sets this after task IDs are filled in)

**Approval:** pending
