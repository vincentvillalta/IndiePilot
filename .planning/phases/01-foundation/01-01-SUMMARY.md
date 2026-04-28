---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [pnpm, turborepo, nextjs, tailwindcss, biome, eslint, vitest, monorepo]

requires: []

provides:
  - "pnpm + Turborepo monorepo scaffold with apps/web (Next 16.2.4 + React 19), packages/ui (Tailwind v4 owner), packages/db (empty shell), tooling/tsconfig + tooling/eslint-config sidecars"
  - "`pnpm install && pnpm typecheck && pnpm lint && pnpm test && pnpm --filter @indiepilot/web build` all exit 0 on the bare scaffold"
  - "Wave 0 stub test files (7 total) seeded with `it.todo` placeholders so Plans 02/03/04 can swap in real assertions one-at-a-time without bootstrapping test infra"
  - "Locked workspace package names: @indiepilot/web, @indiepilot/ui, @indiepilot/db, @indiepilot/eslint-config — referenced by every downstream Phase 1 plan"
  - "Single-source TS config at tooling/tsconfig/base.json (strict + noUncheckedIndexedAccess + verbatimModuleSyntax)"
  - "Biome 2.4.13 + ESLint 9 flat-config sidecar wired into `pnpm lint` (both must pass)"
  - "Tailwind v4 ownership in packages/ui via @import 'tailwindcss' + @source directives; apps/web/app/globals.css is one-liner @import"
  - "pnpm-lock.yaml committed; CI can run --frozen-lockfile"

affects:
  - "01-02-PLAN.md (Database Package): consumes packages/db shell + tests/seed/types stubs + db:* root scripts"
  - "01-03-PLAN.md (Logger + ESLint rule): consumes apps/web/lib/ + tooling/eslint-config + logger.test.ts + no-raw-log.test.mjs stubs"
  - "01-04-PLAN.md (Inngest): consumes apps/web/inngest/ + apps/web/app/api/ + route.test.ts + health.test.ts stubs"
  - "01-05-PLAN.md (CI + Neon Branches): consumes pnpm-lock.yaml + turbo.json + per-package test scripts; ci.yml/neon-branch.yml workflows land here"
  - "01-06-PLAN.md (Bootstrap + Docs): consumes root package.json `bootstrap` script + .nvmrc + workspace structure"
  - "Every later phase: structured logger redaction policy, audit-log shape, Tailwind v4 token system, route-group structure"

tech-stack:
  added:
    - "pnpm 10.33.0 (packageManager pin via Corepack)"
    - "turbo 2.9.6 (task graph)"
    - "next 16.2.4 (App Router + Turbopack)"
    - "react 19.2.0 / react-dom 19.2.0"
    - "@biomejs/biome 2.4.13 (formatter + linter)"
    - "eslint 9.39.4 (flat config sidecar; rules wired in Plan 03)"
    - "vitest 3.2.4 (unit + integration runner)"
    - "@playwright/test 1.59.1 (declared, not exercised in Phase 1)"
    - "tailwindcss 4.1.16 + @tailwindcss/postcss 4.1.16 (CSS-first config)"
    - "typescript 5.9.3"
    - "@types/node 20.19.39"
    - "@vitejs/plugin-react 4 (Vitest React plugin)"
    - "zod 3.x (declared in apps/web for Phase 2+)"
  patterns:
    - "Single TS config source-of-truth at tooling/tsconfig/base.json; per-package tsconfig.json `extends` it"
    - "Per-package vitest.config.ts uses `mergeConfig(sharedConfig, ...)` from root vitest.shared.ts"
    - "Workspace deps via `workspace:*` protocol (e.g. apps/web depends on @indiepilot/ui + @indiepilot/db)"
    - "Tailwind v4 ownership: packages/ui owns the @import + @source + @theme; apps consume one-line @import"
    - "Wave 0 testing: stub test files with `it.todo` ship in scaffold so suite is green day-1; downstream plans replace todos with assertions"
    - "Route groups: app/(dashboard)/* + app/(marketing)/* (placeholder) + app/api/* (Plans 04+ fill)"
    - "ESLint 9 flat-config replaces .eslintignore with in-config `ignores` array"

key-files:
  created:
    - "package.json (root, scripts + packageManager + engines)"
    - "pnpm-workspace.yaml (apps/*, packages/*, tooling/*)"
    - "turbo.json (build/dev/typecheck/lint/test/db:* tasks; AXIOM_DATASET appears once in build env)"
    - "tooling/tsconfig/base.json (TS source of truth)"
    - "tsconfig.base.json (root re-export)"
    - "tooling/eslint-config/{package.json,index.js} (CJS sidecar; rules wired in Plan 03)"
    - "biome.jsonc (Biome 2.4 schema, formatter + linter, css.parser.tailwindDirectives:true)"
    - "eslint.config.js (flat config: global ignores + ...indiepilot)"
    - ".gitignore (.env*, .next, .turbo, .vercel, dist, build, coverage, IDE, *.tsbuildinfo, next-env.d.ts)"
    - ".nvmrc (Node 20)"
    - "vitest.shared.ts (root v8 coverage config)"
    - "apps/web/{package.json, tsconfig.json, next.config.ts, postcss.config.mjs, vitest.config.ts}"
    - "apps/web/app/{layout.tsx, globals.css, (dashboard)/page.tsx}"
    - "apps/web/lib/.gitkeep + apps/web/inngest/.gitkeep (track empty dirs for Plans 03/04)"
    - "packages/ui/{package.json, tsconfig.json, postcss.config.mjs, src/index.ts, src/styles/globals.css}"
    - "packages/db/{package.json, tsconfig.json, vitest.config.ts, src/index.ts}"
    - "Wave 0 stubs: apps/web/lib/__tests__/logger.test.ts, apps/web/app/api/inngest/__tests__/route.test.ts, apps/web/inngest/functions/__tests__/health.test.ts, packages/db/tests/{schema,types,seed}.test.ts, tooling/eslint-config/__tests__/no-raw-log.test.mjs"
    - "pnpm-lock.yaml (committed; CI uses --frozen-lockfile)"
  modified: []

key-decisions:
  - "Biome bumped 2.3 -> 2.4.13 (latest available at scaffold time). Required schema migration: `organizeImports` -> `assist.actions.source.organizeImports`, `files.ignore` -> `files.includes` with negation patterns. Plan called for 2.3.x; the registry's `^2.3` resolved to 2.4.13."
  - "Vitest 3.2 dropped CommonJS `require()` support — eslint-config test renamed `.test.js` -> `.test.mjs` with ESM `import`. Plan called for `.test.js`/`require()` pattern."
  - "ESLint 9 flat config drops `.eslintignore` — added `ignores` block to eslint.config.js covering .next/.turbo/dist/coverage/.vercel/node_modules/drizzle. Without this, `eslint .` walked into `.next/` build output and errored on missing `@typescript-eslint/no-unused-vars` rule references."
  - "tooling/eslint-config exports `[{}]` (not `[]`) to silence ESLint 9's ESLintEmptyConfigWarning."
  - "packages/ui test script uses `--passWithNoTests` (Phase 1 ships zero UI tests; Phase 2 BRAND-01 fills them)."
  - "next.config.ts uses `path.join(__dirname, '../../')` for `outputFileTracingRoot` because Next 16 warns on relative paths. Plan called for `'../../'` literal."
  - "Inngest signing keys NOT provisioned in Plan 01 (per plan boundary — that's Plan 04's checkpoint task)."
  - "vercel link / vercel env pull NOT executed in Plan 01 (per plan boundary — bootstrap script lives but is exercised in Plan 06's cold-clone smoke)."

patterns-established:
  - "Workspace package naming: @indiepilot/{web,ui,db,eslint-config}"
  - "Three-track tooling/ layout: tooling/tsconfig (config), tooling/eslint-config (CJS sidecar package). Package shells live in tooling/* not packages/* so they're not user-facing."
  - "Wave 0 stub test pattern: every test file ships in the scaffold with `it.todo` placeholders. Downstream plans replace todos one-at-a-time and immediately get RED -> GREEN feedback."
  - "Per-package script delegation: root scripts call `turbo run X` or `pnpm --filter @indiepilot/Y X`; never per-package one-offs."
  - "Tailwind v4 + monorepo CSS ownership: packages/ui owns the @import 'tailwindcss' line, the @source directives, and the @theme tokens. Apps consume via one-line @import of the published CSS export."

requirements-completed:
  - FOUND-01

duration: 5 min
completed: 2026-04-28
---

# Phase 1 Plan 01: Workspace Bootstrap Summary

**pnpm + Turborepo monorepo with Next 16.2.4 (React 19) on apps/web, Tailwind-v4-owning packages/ui, packages/db shell, tooling/eslint-config sidecar, Biome 2.4 + ESLint 9 flat-config wiring, and 7 Wave 0 stub test files seeded for Plans 02/03/04 to fill.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-28T20:39:12Z
- **Completed:** 2026-04-28T20:44:40Z
- **Tasks:** 3 of 3
- **Files created:** 39 (10 root config + 9 apps/web + 6 packages/ui + 4 packages/db + 3 tooling + 7 Wave 0 stubs); pnpm-lock.yaml committed
- **Files modified:** 0 (greenfield bootstrap)

## Accomplishments

- Workspace scaffolds cleanly: `pnpm install` resolves with no missing peers, lockfile committed
- `pnpm typecheck && pnpm lint && pnpm test` all exit 0 on the bare scaffold (Phase 1 quick-gate green day-1)
- `pnpm --filter @indiepilot/web build` produces a working `.next/standalone/` output (validates `transpilePackages` + `outputFileTracingRoot` wiring)
- All locked architectural shapes from CONTEXT/RESEARCH landed exactly: package names, TS config inheritance, Tailwind-v4 ownership, route groups, env-var array on `turbo.json` build (AXIOM_DATASET appears exactly once)
- 7 Wave 0 stub test files exist with `it.todo` placeholders matching VALIDATION.md row-for-row — Plans 02/03/04 will replace todos with real assertions

## Task Commits

1. **Task 1: Initialize pnpm + Turborepo workspace root with Biome + ESLint sidecar + shared tsconfig** — `5260855` (chore)
2. **Task 2: Scaffold apps/web Next.js 16 + packages/ui + packages/db package shells** — `6c25fb7` (feat)
3. **Task 3: Wave 0 stub tests + install + verify scaffold runs end-to-end** — `1393105` (test)

**Plan metadata commit:** _(added below by `git_commit_metadata`)_

## Files Created/Modified

### Root workspace (10 files)
- `package.json` — name=indiepilot, packageManager=pnpm@10.33.0, engines.node>=20, all bootstrap/dev/build/test/lint/typecheck/db:* scripts, devDeps: turbo/biome/eslint/vitest/playwright/typescript/@types/node
- `pnpm-workspace.yaml` — apps/*, packages/*, tooling/*
- `turbo.json` — task graph from RESEARCH; build env array exactly once each: DATABASE_URL, NEON_BRANCH, AXIOM_TOKEN, AXIOM_DATASET, INNGEST_SIGNING_KEY, INNGEST_EVENT_KEY, LOG_HASH_SALT, LOG_LEVEL, VERCEL_ENV, NODE_ENV
- `tooling/tsconfig/base.json` — single TS source of truth (ES2022 + strict + noUncheckedIndexedAccess + verbatimModuleSyntax + Bundler resolution)
- `tsconfig.base.json` — thin root re-export
- `tooling/eslint-config/package.json` + `index.js` — CJS sidecar package, exports `[{}]`
- `biome.jsonc` — 2.4.13 schema, formatter (2-space, 100 wide, double quotes, semicolons, trailing commas), recommended linter rules, css.parser.tailwindDirectives:true, files.includes with negation patterns
- `eslint.config.js` — flat config: global ignores (.next, .turbo, dist, coverage, .vercel, node_modules, drizzle) + ...indiepilot
- `.gitignore` — node_modules, .turbo, .next, dist, build, .env*, **/.vercel/, IDE noise, *.tsbuildinfo, next-env.d.ts
- `.nvmrc` — `20`
- `vitest.shared.ts` — root v8 coverage config

### apps/web (9 files)
- `package.json` — @indiepilot/web, type=module, next@16.2.4, react@^19, react-dom@^19, zod, @indiepilot/{ui,db}@workspace:*, devDeps: tailwindcss/@tailwindcss/postcss/@types/{node,react,react-dom}/typescript/@vitejs/plugin-react/@indiepilot/eslint-config@workspace:*
- `tsconfig.json` — extends ../../tooling/tsconfig/base.json + dom libs + next plugin + paths {@/*: ['./*']}
- `next.config.ts` — transpilePackages: ['@indiepilot/ui', '@indiepilot/db'], output: 'standalone', outputFileTracingRoot: path.join(__dirname, '../../')
- `postcss.config.mjs` — @tailwindcss/postcss plugin
- `app/layout.tsx` — minimal RootLayout
- `app/(dashboard)/page.tsx` — 'IndiePilot — Phase 1 scaffold OK' placeholder
- `app/globals.css` — one-line @import of @indiepilot/ui/styles/globals.css
- `vitest.config.ts` — mergeConfig(shared, node env, **/__tests__/**/*.test.ts include)
- `lib/.gitkeep` + `inngest/.gitkeep` — track empty dirs for Plans 03/04

### packages/ui (6 files)
- `package.json` — @indiepilot/ui, exports './' + './styles/globals.css', test uses --passWithNoTests
- `tsconfig.json` — extends base + dom libs
- `src/index.ts` — `export {};` barrel
- `src/styles/globals.css` — @import 'tailwindcss' + @source directives + @theme with --color-brand-50 placeholder
- `postcss.config.mjs` — @tailwindcss/postcss plugin

### packages/db (4 files)
- `package.json` — @indiepilot/db, type=module, exports './'
- `tsconfig.json` — extends base, includes src/+tests/+seed/
- `src/index.ts` — `export {};` barrel (Plan 02 fills)
- `vitest.config.ts` — mergeConfig(shared, node env, tests/**/*.test.ts include)

### Wave 0 stubs (7 files)
- `apps/web/lib/__tests__/logger.test.ts` (3 describes, 7 todos — Plan 03 fills FOUND-04)
- `apps/web/app/api/inngest/__tests__/route.test.ts` (1 describe, 2 todos — Plan 04 fills FOUND-05)
- `apps/web/inngest/functions/__tests__/health.test.ts` (1 describe, 3 todos — Plan 04 fills FOUND-05)
- `packages/db/tests/schema.test.ts` (1 describe, 5 todos — Plan 02 fills FOUND-02)
- `packages/db/tests/types.test.ts` (1 describe, 2 todos — Plan 02 fills FOUND-02)
- `packages/db/tests/seed.test.ts` (1 describe, 2 todos — Plan 02 fills FOUND-02; asserts 5 devs + 10 users per CONTEXT lock)
- `tooling/eslint-config/__tests__/no-raw-log.test.mjs` (1 describe, 4 todos — Plan 03 fills FOUND-04)

### pnpm-lock.yaml
- Committed after `pnpm install --no-frozen-lockfile`. CI will use `--frozen-lockfile` per Plan 05's `ci.yml`.

## Decisions Made

1. **Biome 2.4.13 (not 2.3.x):** `^2.3` resolved to the latest 2.4 patch. Required schema migration; documented in deviations.
2. **ESM-only Vitest 3.2:** eslint-config test moved from `.test.js`/CJS to `.test.mjs`/ESM. Plan-spec was outdated for the installed major.
3. **Flat-config `ignores` mandatory:** ESLint 9 dropped `.eslintignore` honoring; added explicit ignores block to `eslint.config.js`.
4. **Empty config silencer:** Sidecar exports `[{}]` (one empty object) instead of `[]` so ESLint 9 doesn't warn.
5. **`--passWithNoTests` for packages/ui:** No UI tests exist until Phase 2; without this, vitest exits 1.
6. **Absolute `outputFileTracingRoot`:** Next 16 warns on relative paths; resolved with `path.join(__dirname, '../../')`.
7. **Per-task atomic commits over single mega-commit:** Each task got its own commit (chore/feat/test) so `git bisect` works at task granularity.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Biome 2.4 schema migration**
- **Found during:** Task 3 (`pnpm lint` in install + verify step)
- **Issue:** Plan called for Biome 2.3.x. The `^2.3` semver resolved to 2.4.13 (latest available). Biome 2.4 renamed several keys: top-level `organizeImports` → `assist.actions.source.organizeImports`; `files.ignore` array → `files.includes` array with negation patterns (`!**/.next/**` etc); `$schema` URL must match installed version. Bare lint failed with `Found an unknown key 'organizeImports'`.
- **Fix:** Migrated `biome.jsonc` to 2.4 schema. Bumped `$schema` to `https://biomejs.dev/schemas/2.4.13/schema.json`. Reorganized formatter/linter blocks. Added `css.parser.tailwindDirectives: true` so `packages/ui/src/styles/globals.css` (with Tailwind-v4 `@source` and `@theme`) parses without errors.
- **Files modified:** `biome.jsonc`
- **Verification:** `pnpm lint` exits 0 across all 35 files
- **Commit:** `1393105` (Task 3)

**2. [Rule 3 - Blocking] Vitest 3.2 ESM-only — eslint-config test renamed**
- **Found during:** Task 3 (`pnpm test` in install + verify step)
- **Issue:** Plan specified `tooling/eslint-config/__tests__/no-raw-log.test.js` with `const { describe, it } = require("vitest");`. Vitest 3.2 dropped CommonJS `require()` support (error: "Vitest cannot be imported in a CommonJS module using require()").
- **Fix:** Removed `.test.js`, created `.test.mjs` with `import { describe, it } from "vitest";`. The eslint-config package itself stays CJS (`"type": "commonjs"`); only the test file is ESM via `.mjs` extension.
- **Files modified:** `tooling/eslint-config/__tests__/no-raw-log.test.mjs` (created), `tooling/eslint-config/__tests__/no-raw-log.test.js` (deleted)
- **Verification:** `pnpm --filter @indiepilot/eslint-config test` runs 4 todo tests successfully
- **Commit:** `1393105` (Task 3)

**3. [Rule 3 - Blocking] ESLint 9 flat config — global `ignores` block needed**
- **Found during:** Task 3 (`pnpm lint` after web build)
- **Issue:** ESLint 9 flat config does NOT honor `.eslintignore`. Without an `ignores` block in `eslint.config.js`, `eslint .` walked into `apps/web/.next/build/chunks/` and `apps/web/.next/standalone/` and errored on 15 references to `@typescript-eslint/no-unused-vars` (a rule that's not loaded). Build artifacts must be ignored at the flat-config level.
- **Fix:** Added a leading `{ ignores: [...] }` block to `eslint.config.js` covering: `**/.next/**`, `**/dist/**`, `**/.turbo/**`, `**/coverage/**`, `**/.vercel/**`, `**/node_modules/**`, `**/drizzle/**`. The Biome `files.includes` block already had these — flat-config required parallel coverage.
- **Files modified:** `eslint.config.js`
- **Verification:** `pnpm lint` exits 0 even with `.next/` populated by a prior build
- **Commit:** `1393105` (Task 3)

**4. [Rule 2 - Missing Critical] ESLint empty-config warning suppressed**
- **Found during:** Task 3 (`pnpm lint:fix` output)
- **Issue:** `tooling/eslint-config/index.js` originally exported `[]` per plan. ESLint 9 emits `ESLintEmptyConfigWarning` when running with a fully empty config — this is noise in CI logs and would mask real warnings.
- **Fix:** Changed to `module.exports = [{}];` (one empty config object). Same effective rule set (none), no warning.
- **Files modified:** `tooling/eslint-config/index.js`
- **Verification:** `pnpm lint` and `pnpm lint:fix` produce no warnings
- **Commit:** `1393105` (Task 3)

**5. [Rule 3 - Blocking] packages/ui test passes with no test files**
- **Found during:** Task 3 (`pnpm test` first run — `@indiepilot/ui:test` failed with "No test files found, exiting with code 1")
- **Issue:** `vitest run` exits 1 on packages with zero test files. Phase 1 ships no UI tests (Phase 2 BRAND-01 will).
- **Fix:** Changed `packages/ui/package.json` test script to `vitest run --passWithNoTests`. Plans 02+ will add tests, but the flag is harmless then too.
- **Files modified:** `packages/ui/package.json`
- **Verification:** `pnpm --filter @indiepilot/ui test` exits 0 on empty suite
- **Commit:** `1393105` (Task 3)

**6. [Rule 1 - Bug] Absolute `outputFileTracingRoot` in next.config.ts**
- **Found during:** Task 3 (`pnpm --filter @indiepilot/web build`)
- **Issue:** Plan specified `outputFileTracingRoot: "../../"` (relative). Next 16 warns: "outputFileTracingRoot should be absolute, using: /Users/.../indiepilot". The auto-resolution worked but emitted a warning every build, polluting CI logs.
- **Fix:** Imported `node:path` and used `path.join(__dirname, "../../")` to compute an absolute path. `__dirname` works in `next.config.ts` because Next loads it via tsx with CommonJS-compatible globals.
- **Files modified:** `apps/web/next.config.ts`
- **Verification:** Build produces no warnings; standalone output unchanged
- **Commit:** `1393105` (Task 3)

---

**Total deviations:** 6 auto-fixed (4 Rule 3 - Blocking, 1 Rule 2 - Missing Critical, 1 Rule 1 - Bug)
**Impact on plan:** All deviations were tooling-version mismatches (Biome 2.3→2.4, Vitest 2→3 ESM, ESLint 8→9 flat config) or correctness fixes (Next 16 absolute-path warning, ESLint empty-config noise, Vitest no-tests exit). No scope creep; no architectural changes. The plan's intent (greenfield monorepo scaffold that compiles + lints + tests + builds clean) was preserved exactly. **Recommendation for future plans:** when calling for `^X.Y` semver, the planner should sanity-check against the installed major's current docs — Biome and Vitest both broke compatibility within the major in 2025-2026.

## Issues Encountered

None beyond the deviations above. The deviations were mechanical version-skew fixes, not problems with the plan's strategic direction.

## Authentication Gates

None — Plan 01 is offline scaffolding only. Vercel CLI / Inngest dashboard / Neon API auth all live in later plans (06 / 04 / 05 respectively).

## User Setup Required

None — no external services configured in this plan. Vercel project link + env pull are part of `pnpm bootstrap` but exercised in Plan 06's cold-clone smoke. Inngest signing keys land in Plan 04. Neon API key + GitHub secrets land in Plan 05.

## Notes / Context-Budget Observation

This plan touched **39 files across 3 tasks** (10 root config + 19 package files + 7 Wave 0 stubs + the 3 fix-up edits during Task 3 install). The plan flagged a "context-budget watch" target of <25% per task, ~50% total. Actual usage was within target — Task 1's 12-file root config burst was the heaviest chunk but landed cleanly without splitting. Three rounds of inline fixes during Task 3 (Biome 2.4 migration, Vitest ESM rename, ESLint flat-config ignores) added some context churn but stayed well below the split threshold. **Positive data point for similar-scope plans in future phases:** ~30-file mechanical scaffolds are tractable in 3 tasks at standard context budget. The next plan facing similar scope (likely Plan 06 bootstrap docs) does not need to pre-split.

## Next Phase Readiness

**Plan 02 (Database Package) is unblocked:**
- `packages/db/` shell exists with `package.json`, `tsconfig.json`, `vitest.config.ts`, empty `src/index.ts`
- Wave 0 stubs `packages/db/tests/{schema,types,seed}.test.ts` ready for `it.todo` -> real assertion swap
- Root `db:generate / db:migrate / db:seed / db:studio / db:reset` scripts delegate via `pnpm --filter @indiepilot/db ...` (will work once Plan 02 adds the actual db:* scripts)
- `tooling/tsconfig/base.json` provides strict TS settings

**Plan 03 (Logger + ESLint rule):**
- `apps/web/lib/` directory exists (.gitkeep tracks it)
- `tooling/eslint-config/` package exists with empty flat-config; ready to host the `no-raw-log` rule
- Wave 0 stubs `apps/web/lib/__tests__/logger.test.ts` and `tooling/eslint-config/__tests__/no-raw-log.test.mjs` ready

**Plan 04 (Inngest):**
- `apps/web/inngest/` and `apps/web/app/api/` directories exist (.gitkeep / route.test.ts paths)
- Wave 0 stubs `apps/web/app/api/inngest/__tests__/route.test.ts` and `apps/web/inngest/functions/__tests__/health.test.ts` ready

**Plan 05 (CI + Neon Branches):**
- `pnpm-lock.yaml` committed; `--frozen-lockfile` will work in CI
- `turbo.json` task graph in place; CI workflows will call `pnpm typecheck && pnpm lint && pnpm test`
- `.github/workflows/` does NOT yet exist — Plan 05 creates it

**Plan 06 (Bootstrap + Docs):**
- Root `bootstrap` script exists in `package.json` chain
- `.nvmrc` pins Node 20

**No blockers for Wave 2 plans.** Wave 2 (Plans 02, 03, 04) can be planned and executed in parallel — they only consume Plan 01 outputs, not each other.

## Self-Check: PASSED

**Files (key-files.created):**
- FOUND: package.json
- FOUND: pnpm-workspace.yaml
- FOUND: turbo.json
- FOUND: tooling/tsconfig/base.json
- FOUND: tooling/eslint-config/index.js
- FOUND: biome.jsonc
- FOUND: eslint.config.js
- FOUND: .gitignore
- FOUND: .nvmrc
- FOUND: vitest.shared.ts
- FOUND: apps/web/package.json
- FOUND: apps/web/next.config.ts
- FOUND: apps/web/app/layout.tsx
- FOUND: apps/web/app/(dashboard)/page.tsx
- FOUND: packages/ui/src/styles/globals.css
- FOUND: packages/db/package.json
- FOUND: packages/db/vitest.config.ts
- FOUND: apps/web/lib/__tests__/logger.test.ts
- FOUND: apps/web/app/api/inngest/__tests__/route.test.ts
- FOUND: apps/web/inngest/functions/__tests__/health.test.ts
- FOUND: packages/db/tests/schema.test.ts
- FOUND: packages/db/tests/types.test.ts
- FOUND: packages/db/tests/seed.test.ts
- FOUND: tooling/eslint-config/__tests__/no-raw-log.test.mjs
- FOUND: pnpm-lock.yaml

**Commits (task hashes):**
- FOUND: 5260855 (Task 1)
- FOUND: 6c25fb7 (Task 2)
- FOUND: 1393105 (Task 3)

**Quick gate (last green run):**
- `pnpm typecheck` — exit 0 (3 packages, FULL TURBO cache hit)
- `pnpm lint` — exit 0 (Biome 35 files + ESLint clean)
- `pnpm test` — exit 0 (4 packages, 25 todo tests skipped, none failed)
- `pnpm --filter @indiepilot/web build` — exit 0 (Next 16 standalone output)

---
*Phase: 01-foundation*
*Completed: 2026-04-28*
