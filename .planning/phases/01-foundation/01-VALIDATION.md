---
phase: 1
slug: foundation
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-28
last_updated: 2026-04-28
nyquist_exceptions:
  - task: "01-04-T2"
    reason: "human-verify-checkpoint"
    notes: "Inngest Cloud + Vercel env dashboard configuration. Inline `<automated>` smoke (boot dev server, curl /api/inngest, kill) was added per W5; the dashboard config itself remains human-only."
  - task: "01-05-T2"
    reason: "human-verify-checkpoint"
    notes: "First-real-PR exercise. Full PR-open → migrate → comment → close → cleanup round trip can only be observed against the real GitHub + Neon integration once. No CI substitute."
  - task: "01-06-T2"
    reason: "human-verify-checkpoint"
    notes: "Cold-clone wall-clock measurement (FOUND-01 #1) + preview-deploy curl smoke. Wall-clock is fundamentally human-timed; preview deploy is exercised via the same first PR as 01-05-T2."
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

Task IDs use `{phase}-{plan}-T{task}` format. Plans are sequential (01..06); tasks within plans are 1-indexed.

The `Nyquist Exception` column is non-empty only for the three human-verify checkpoints whitelisted in frontmatter `nyquist_exceptions`. All other rows have automated `<verify>` commands.

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Nyquist Exception | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|-------------------|--------|
| 01-01-T1 | 01-01 (Workspace Bootstrap) | 1 | FOUND-01 | unit (typecheck) | `pnpm typecheck` | ✅ created in 01-01-T1 (root tsconfig.base.json + per-package tsconfig.json) | — | ⬜ pending |
| 01-01-T1 | 01-01 (Workspace Bootstrap) | 1 | FOUND-01 | unit (lint) | `pnpm lint` (Biome + ESLint sidecar) | ✅ created in 01-01-T1 (biome.jsonc + eslint.config.js + sidecar stub); finalized by 01-03-T1 (no-raw-log rule) | — | ⬜ pending |
| 01-06-T2 | 01-06 (Bootstrap + Docs) | 3 | FOUND-01 | smoke (manual) | MISSING — wall-clock measurement | n/a — manual checkpoint in 01-06-T2 (cold-clone smoke) | `human-verify-checkpoint` | ⬜ pending |
| 01-02-T1 | 01-02 (Database Package) | 2 | FOUND-02 | unit (shape) | `pnpm --filter @indiepilot/db test tests/schema.test.ts` | ✅ stub by 01-01-T3; real assertions by 01-02-T1 | — | ⬜ pending |
| 01-02-T1 | 01-02 (Database Package) | 2 | FOUND-02 | unit (types) | `pnpm --filter @indiepilot/db test tests/types.test.ts` | ✅ stub by 01-01-T3; real assertions by 01-02-T1 | — | ⬜ pending |
| 01-05-T1 | 01-05 (CI + Neon Branches) | 3 | FOUND-02 | integration (CI) | `DATABASE_URL=<test-branch> pnpm db:migrate` then assert 4 tables exist | ✅ inline in `.github/workflows/neon-branch.yml` (created by 01-05-T1) | — | ⬜ pending |
| 01-02-T3 + 01-06-T2 | 01-02 (seed unit) + 01-06 (cold-clone smoke) | 2, 3 | FOUND-02 | integration (seed) | `pnpm db:seed` then SQL count assertions: exactly 5 developers + exactly 10 users (CONTEXT lock; B1 fix updated from 20 to 10) | ✅ unit shape by 01-02-T3 (`buildSeedData()` asserts `toBe(5)` + `toBe(10)`); integration via real seed run in 01-06-T2 cold-clone | — | ⬜ pending |
| 01-05-T2 | 01-05 (CI + Neon Branches) | 3 | FOUND-03 | E2E (real PR) | MISSING — first-PR exercise | n/a — manual checkpoint on first PR | `human-verify-checkpoint` | ⬜ pending |
| 01-05-T1 | 01-05 (CI + Neon Branches) | 3 | FOUND-03 | integration (CI) | `Apply migrations` step inside `neon-branch.yml` exits 0 | ✅ inline in workflow (01-05-T1) | — | ⬜ pending |
| 01-05-T2 | 01-05 (CI + Neon Branches) | 3 | FOUND-03 | E2E (cleanup) | MISSING — first-PR-close exercise | n/a — manual checkpoint on first PR | `human-verify-checkpoint` | ⬜ pending |
| 01-03-T2 | 01-03 (Logger + ESLint) | 2 | FOUND-04 | unit (redaction) | `pnpm --filter @indiepilot/web test apps/web/lib/__tests__/logger.test.ts` | ✅ stub by 01-01-T3; real assertions by 01-03-T2 | — | ⬜ pending |
| 01-03-T2 | 01-03 (Logger + ESLint) | 2 | FOUND-04 | unit (hash stability) | Same `logger.test.ts` | ✅ same file as above | — | ⬜ pending |
| 01-03-T2 | 01-03 (Logger + ESLint) | 2 | FOUND-04 | unit (transport fallback) | Same `logger.test.ts` | ✅ same file as above | — | ⬜ pending |
| 01-03-T1 | 01-03 (Logger + ESLint) | 2 | FOUND-04 | unit (custom rule) | `pnpm --filter @indiepilot/eslint-config test tooling/eslint-config/__tests__/no-raw-log.test.js` | ✅ stub by 01-01-T3; real assertions by 01-03-T1 | — | ⬜ pending |
| 01-04-T1 | 01-04 (Inngest) | 2 | FOUND-05 | integration (route) | `pnpm --filter @indiepilot/web test apps/web/app/api/inngest/__tests__/route.test.ts` | ✅ stub by 01-01-T3; real assertions by 01-04-T1 | — | ⬜ pending |
| 01-04-T1 | 01-04 (Inngest) | 2 | FOUND-05 | integration (function) | `pnpm --filter @indiepilot/web test apps/web/inngest/functions/__tests__/health.test.ts` (asserts `healthHandler` direct invocation per W1) | ✅ stub by 01-01-T3; real assertions by 01-04-T1 | — | ⬜ pending |
| 01-04-T2 | 01-04 (Inngest) | 2 | FOUND-05 | smoke (post-checkpoint) | Inline: `pnpm dev > /tmp/dev.log 2>&1 & sleep 8 && curl -fsS http://localhost:3000/api/inngest \| grep -q "health-check" && kill %1` (W5 fix — replaces previous MISSING) | n/a — runs after dashboard config in 01-04-T2 | `human-verify-checkpoint` (dashboard config itself; the inline smoke provides programmatic pass/fail) | ⬜ pending |
| 01-06-T2 | 01-06 (Bootstrap + Docs) | 3 | FOUND-05 | smoke (deploy) | MISSING — preview deploy curl | n/a — manual checkpoint in 01-06-T2 (against first PR's preview) | `human-verify-checkpoint` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Nyquist Exception: empty for fully-automated rows; `human-verify-checkpoint` for the 3 whitelisted human-only verifications (01-04-T2 dashboard part, 01-05-T2, 01-06-T2 — see frontmatter `nyquist_exceptions`).*

---

## Wave 0 Requirements

Test files and config that must exist before implementation tasks can be verified (greenfield — none exist):

- [x] `apps/web/vitest.config.ts` — Vitest config for the Next.js app (created by 01-01-T2)
- [x] `packages/db/vitest.config.ts` — Vitest config for the DB package (created by 01-01-T2)
- [x] `vitest.shared.ts` (root, optional) — shared coverage/reporter config (created by 01-01-T1)
- [x] `apps/web/lib/__tests__/logger.test.ts` — stubs covering FOUND-04; real assertions land in 01-03-T2 (created by 01-01-T3)
- [x] `apps/web/app/api/inngest/__tests__/route.test.ts` — stubs covering FOUND-05; real assertions land in 01-04-T1 (created by 01-01-T3)
- [x] `apps/web/inngest/functions/__tests__/health.test.ts` — stubs covering FOUND-05; real assertions land in 01-04-T1 (importing `healthHandler` directly per W1) (created by 01-01-T3)
- [x] `packages/db/tests/schema.test.ts` — stubs covering FOUND-02; real assertions land in 01-02-T1 (created by 01-01-T3)
- [x] `packages/db/tests/types.test.ts` — stubs covering FOUND-02; real assertions land in 01-02-T1 (created by 01-01-T3)
- [x] `packages/db/tests/seed.test.ts` — stubs covering FOUND-02; real assertions land in 01-02-T3 (asserts `SEED_USERS_COUNT === 10` per CONTEXT lock; B1 fix corrected from 20 to 10) (created by 01-01-T3)
- [x] `tooling/eslint-config/__tests__/no-raw-log.test.js` — stubs covering FOUND-04; real assertions land in 01-03-T1 (created by 01-01-T3)
- [x] `.github/workflows/ci.yml` — typecheck + lint + test gate (created by 01-05-T1)
- [x] `.github/workflows/neon-branch.yml` — per-PR Neon branch lifecycle (created by 01-05-T1)
- [x] Framework install: `vitest`, `@vitejs/plugin-react`, `playwright`, `@axiomhq/pino`, `pino`, `pino-pretty` — included in `pnpm install` step of bootstrap (handled by 01-01-T3 + 01-03-T2 + 01-04-T1)

---

## Manual-Only Verifications

These are the rows in the per-task table where automated `<verify>` is `MISSING`. All are whitelisted as `nyquist_exception: human-verify-checkpoint` in frontmatter. They are one-time, human-witnessed events with no fully-automated CI substitute.

| Behavior | Requirement | Why Manual | Test Instructions | Owning Task | Nyquist Exception |
|----------|-------------|------------|-------------------|-------------|-------------------|
| `pnpm dev` starts Next.js cleanly on port 3000 | FOUND-01 | Dev server lifecycle is awkward to assert in CI without bloat; cheap to verify by eye | After `pnpm bootstrap`, run `pnpm dev` from repo root, observe `Ready in <Xs>` on `http://localhost:3000` | 01-06-T2 | `human-verify-checkpoint` |
| First real PR demonstrates Neon branch lifecycle (create → migrate → comment → delete on close) | FOUND-03 | The full PR-open → PR-close round trip is best validated against the real GitHub + Neon integration once, not mocked | Open a draft PR with a no-op change; observe `Neon Preview Branch / setup` job runs to green; comment with branch URL appears on PR; close PR; observe `cleanup` job runs and the branch disappears from Neon dashboard | 01-05-T2 | `human-verify-checkpoint` |
| `curl /api/inngest` against deployed preview returns 200 with manifest JSON | FOUND-05 | Inngest's signing key wiring only fully works on a real deployment with env vars, not in unit/integration tests | Push a branch; on Vercel preview URL, `curl https://<preview-url>.vercel.app/api/inngest` should return 200 + JSON containing the registered `health.check` function | 01-06-T2 | `human-verify-checkpoint` |
| `health.check` Inngest function executes when invoked | FOUND-05 | Inngest dev-server lifecycle in CI adds complexity without much value — the route + function-shape tests cover 90% of the wiring | After `pnpm dev`, in another terminal: `pnpm dlx inngest-cli dev`; from a third: `curl -X POST http://localhost:8288/e/dev_key -H "Content-Type: application/json" -d '{"name":"health/check.requested"}'`; observe function run completes in Inngest UI | 01-06-T2 | `human-verify-checkpoint` |
| Cold-clone-to-running under 10 minutes (FOUND-01 #1) | FOUND-01 | Wall-clock measurement requires a real clean clone; cannot be automated as part of CI without absurd overhead | `time (git clone … && cd … && vercel link --cwd apps/web && pnpm bootstrap && pnpm dev &)`; total < 10:00 | 01-06-T2 | `human-verify-checkpoint` |
| Inngest signing keys land in Vercel env (Development + Preview + Production scopes) | FOUND-05 | Dashboard-only flow on both Inngest Cloud and Vercel; the inline `<automated>` smoke in 01-04-T2 verifies the local result, but the dashboard config itself has no CLI surface | Inngest Dashboard > Apps > IndiePilot > Manage > Signing Keys; copy each into Vercel env scope. The inline smoke in 01-04-T2's `<automated>` block (W5 fix) provides post-config programmatic pass/fail | 01-04-T2 | `human-verify-checkpoint` (dashboard config; inline smoke covers post-config) |
| GitHub repo NEON_API_KEY secret + NEON_PROJECT_ID variable + branch protection on main | FOUND-03 | Dashboard-only flow on GitHub | `gh secret set NEON_API_KEY`; `gh variable set NEON_PROJECT_ID`; Settings > Branches > Protect main | 01-05-T2 | `human-verify-checkpoint` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify, an `<automated>MISSING — …</automated>` declaration paired with a `nyquist_exception: human-verify-checkpoint` frontmatter entry, OR Wave 0 dependencies declared
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (planner enforces during task ordering — checkpoint tasks bracket fully-automated implementation tasks; the three whitelisted human-verify checkpoints are bracketed by the automated test suites of Plans 01-04 + Plan 06's Task 1)
- [x] Wave 0 covers all MISSING test-file references above
- [x] No watch-mode flags in commands (CI-clean)
- [x] Feedback latency < 30s for full suite
- [x] `nyquist_compliant: true` set in frontmatter (planner sets this after task IDs are filled in)
- [x] Three human-verify checkpoints whitelisted as `nyquist_exception: human-verify-checkpoint` in frontmatter `nyquist_exceptions` array (W5 fix — explicit exemption for 01-04-T2, 01-05-T2, 01-06-T2)
- [x] Seed-count assertions reference exactly 5 developers + exactly 10 users (B1 fix — corrected from 20 to 10 to match CONTEXT lock)

**Approval:** matrix populated by gsd-planner; cold-clone-smoke + first-real-PR sign-off pending at 01-06-T2.
