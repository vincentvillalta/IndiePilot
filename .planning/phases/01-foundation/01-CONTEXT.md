# Phase 1: Foundation - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Working scaffolding for the IndiePilot **web monorepo** (Next.js 15 on Vercel + Drizzle + Neon + Inngest + structured logging) that any contributor can clone, bootstrap, and run against a per-PR Neon preview branch. Delivers FOUND-01..05 only — no developer auth, no ASC integration, no public API, no UI surfaces. Just an empty room with the lights on.

Out of this phase: developer auth (Phase 2), ASC key upload (Phase 2), any user-facing UI (Phase 3+), iOS work (Phase 4+).

</domain>

<decisions>
## Implementation Decisions

### Repo Layout

- **Parent directory `indiepilot/` holds three sibling git repositories.** This directory is itself the web monorepo's git root. Sibling repos `indiepilot-ios/` (Phase 4 iOS user app) and `indiepilot-ios-sdk/` (Phase 7 SDK) live alongside as separate `.git` directories, not as submodules.
- **Web monorepo uses pnpm + Turborepo from day one.** Day-one workspace structure:
  - `apps/web` — the Next.js 15 App Router app
  - `packages/db` — shared Drizzle schema + migrations + client factories
  - `packages/ui` — shared shadcn/ui primitives + brand tokens (Tailwind v4)
- **`apps/web` route grouping is by audience:**
  - `app/(dashboard)/*` — developer dashboard (cookie-auth, will be gated by Better-Auth dev instance in Phase 2)
  - `app/(marketing)/*` — public share-link landing pages (Phase 3)
  - `app/api/auth/dev/*` — Better-Auth dev instance (Phase 2)
  - `app/api/auth/user/*` — Better-Auth user instance (Phase 3)
  - `app/api/v1/*` — public iOS app API (Phase 3+)
  - `app/api/sdk/v1/*` — third-party SDK API (Phase 7)
  - `app/api/inngest/route.ts` — Inngest serve handler (Phase 1)
- **iOS apps (user app + SDK) are NOT pulled into Turborepo.** Different toolchain (Xcode, SwiftPM); cross-language monorepo is premature.

### Database Schema Baseline

- **Naming:** `snake_case` in Postgres, `camelCase` in TypeScript. Drizzle handles the column-name mapping; raw SQL queries stay idiomatic.
- **Primary keys:** UUID v7 via the `uuid` npm package (≥ v10) generated in TypeScript. Time-ordered, indexable, no Postgres extension required. All new tables use `id uuid primary key default uuid_generate_v7()` shape (or app-generated, TBD by planner).
- **Tables created in Phase 1 (per FOUND-02):**
  - `developers` — placeholder for the dev-side Better-Auth instance to attach to in Phase 2; minimum columns: `id`, `email`, `created_at`, `updated_at`, `deleted_at`.
  - `users` — placeholder for the iOS user-side Better-Auth instance (Phase 3); same minimum columns.
  - `sessions` — Better-Auth-compatible shape (Phase 1 stubs the columns; Better-Auth wires it up in Phase 2/3).
  - `audit_log` — see polymorphic shape below.
- **Two-table model is preferred** over one-table-with-`kind`-discriminator. Matches the dual-Better-Auth-instance pattern from research. Fallback (single table + role column) is acknowledged in research as a MEDIUM-confidence alternative; revisit only if Phase 2 scaffolding shows real friction.
- **`audit_log` is polymorphic with a JSON payload:**
  - Columns: `id`, `occurred_at`, `actor_type` (`developer | user | system`), `actor_id` (nullable), `action` (string, e.g. `kms.decrypt`, `asc.invite.queued`, `auth.dev.signin`), `target_type`, `target_id`, `payload jsonb`, `ip inet` (nullable), `user_agent text` (nullable).
  - Indexed on `(occurred_at desc)`, `(actor_id, occurred_at desc)`, `(action, occurred_at desc)`.
  - Append-only by convention (no UPDATE / DELETE in code paths).
- **Soft delete with `deleted_at`** on `developers`, `users`, `apps`, `feedback`, and other user-facing entities. Default Drizzle queries filter it out via a base helper. Hard delete reserved for DSAR / GDPR erasure flows.
- **Timestamps:** every table has `created_at timestamptz not null default now()` + `updated_at timestamptz not null default now()`. `updated_at` auto-bumped via Drizzle's `$onUpdate(() => new Date())` helper.

### Bootstrap & Dev DX

- **Environment variables:** `vercel env pull` is the source of truth. No `.env.example`. The dev runs `pnpm bootstrap` after linking the Vercel project. Vercel dashboard owns the value of every secret.
- **Database connection per developer:** each contributor (today: just Vincent) gets their own Neon branch off `main` (e.g., `vincent-dev`). Branch name comes from the `NEON_BRANCH` env var that `vercel env pull` provides per developer. Local migrations and seeds are isolated.
- **`pnpm bootstrap` does, in order:**
  1. `pnpm install` — Node deps for the workspace
  2. `vercel env pull --environment=development apps/web/.env.local`
  3. `pnpm db:migrate` — applies Drizzle migrations to the dev's Neon branch
  4. `pnpm db:seed` — runs the Faker fixture
- **Bootstrap success criterion (from FOUND criterion #1):** time from `git clone` → `pnpm dev` is under 10 minutes for a contributor with Vercel access already provisioned.
- **Seed data:** Faker-generated fixture lives in `packages/db/seed/`. Generates ~5 fake `developers`, ~10 placeholder `apps` (just rows, no R2 assets), ~50 feedback items, plus matching funnel-event rows. `pnpm db:reset` truncates and re-seeds.

### Logging Redaction

- **Pino with hybrid policy:**
  - **Deny-list** of paths via `redact: { paths, censor }` covering at minimum: `*.p8`, `*.privateKey`, `*.jwt`, `*.asc*Token`, `*.password`, `*.passwordHash`, `req.headers.cookie`, `req.headers.authorization`, `*.payload.password`, `*.payload.p8`. Censored to `[redacted]`.
  - **Structured-logging discipline** enforced by code review and a small custom ESLint rule (TBD by planner): never `logger.info(req.body)` or `logger.info(error)` — always `logger.info({ event: 'name', ...safeFields })`. Raw object dumping is the leak vector deny-lists miss.
- **PII handling:**
  - User emails are hashed (`sha256(email + per-deploy salt)`) before being logged. Stable across log lines for correlation; not reversible by an attacker without the salt.
  - IPs logged in full (needed for abuse detection per OPS-06 in Phase 7).
  - User-agents logged in full.
- **Transport: Axiom from day one** (deviates from STATE.md's expected Phase 7 timing — flagged here so the planner brings the OPS-02 transport piece forward).
  - Axiom integration uses Vercel's Log Drain or `@axiomhq/pino` transport — planner picks the lower-friction option.
  - The dashboards/alerting layer (OPS-03 alert thresholds, etc.) stays in Phase 7.
- **Per-environment log levels:** `debug` in local dev, `info` in Vercel preview, `warn` in production. Override via `LOG_LEVEL` env var or a per-request `x-log-level` header (admin-only, not exposed in production).

### Inngest

- Single Inngest client at `apps/web/inngest/client.ts`.
- Serve handler at `app/api/inngest/route.ts`.
- Phase 1 ships exactly one function: `health.check` (manually triggerable; returns `{ ok: true }`) — proves the wiring without doing real work. Real durable jobs (`asc.*`, `waitlist.*`, `email.*`) come in later phases.

### CI

- GitHub Actions on PR: `pnpm typecheck`, `pnpm lint` (Biome), `pnpm test` (Vitest) — all required-to-merge.
- Per-PR Neon preview branch: GitHub Action calls Neon API to create branch `pr-<NUMBER>` on PR open, runs `pnpm db:migrate` against it, and reports pass/fail. Branch is auto-deleted on PR close/merge.
- Vercel-native preview deployment runs in parallel; CI doesn't gate it.

### Claude's Discretion

- Specific package versions (Next 15.x, Drizzle 0.36 vs 1.0 RC, Inngest version) — the planner verifies current versions at scaffold time.
- Tailwind v4 setup specifics in `packages/ui` (CSS variables vs JS config, etc.).
- Whether `packages/ui` is a build-step package (tsup) or a TypeScript-only package re-exported via `paths` — planner decides.
- Exact Drizzle migration tooling (`drizzle-kit` push vs migrate vs studio) workflow.
- Biome vs ESLint+Prettier mix — Biome is preferred but planner can adjust if it can't host the structured-logging rule.
- Vitest config layout, test file colocation patterns.
- Whether the per-PR Neon branch uses Neon's GitHub integration or a custom Action — planner picks lower-friction.
- Audit-log helper API surface (a single `audit({ actor, action, target, payload })` function vs explicit calls).
- The exact UUID v7 generation library (`uuid` v10+ vs `uuidv7` standalone vs Postgres-side via `pg_uuidv7` extension if Neon supports it).
- Bootstrap script implementation language (shell vs TS).

</decisions>

<specifics>
## Specific Ideas

- "Cleanest mental model for solo dev, but I want to be ready for the iOS SDK and a future marketing site" — drove the pnpm + Turborepo decision over single-app.
- "Don't make me re-fill secrets every clone" — drove `vercel env pull` over committed `.env.example`.
- "I want my schema experiments not to step on anyone else's" — drove per-developer Neon branch.
- "Defense in depth on the .p8 keys, even at the logging layer" — drove the hybrid redaction + structured-logging-discipline policy rather than deny-list-only.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets

None. This is a greenfield repository. The `.git` directory exists; the `.planning/` directory exists with PROJECT.md, REQUIREMENTS.md, ROADMAP.md, research/, and DESIGN-PROMPT.md. No code, no `package.json`, no `apps/` or `packages/`.

### Established Patterns

- **Stack is locked by `.planning/research/STACK.md`:** Next.js 15 (App Router, Node runtime, NOT Edge for ASC/KMS routes), React 19, TypeScript 5.6+, Drizzle ORM (~0.36), Better-Auth 1.6+, Inngest, AWS KMS via `@aws-crypto/client-node`, `jose` for JWT, Resend + React Email, Tailwind v4 + shadcn/ui, Zod, pino, next-safe-action, Cloudflare R2, sharp.
- **Architecture rules from `.planning/research/ARCHITECTURE.md`** (relevant to Phase 1's structural decisions):
  - Two Better-Auth instances will land in Phase 2 (dev) and Phase 3 (user). Phase 1's `developers` and `users` table stubs must accommodate this.
  - ASC API calls *only* in Inngest functions, never in Route Handlers — lint-enforced. Phase 1 establishes the `lib/asc/*` and `lib/crypto/*` directory shells but does not implement them.
  - KMS encryption uses `encryptionContext: { developerId }`. Phase 1 doesn't ship encryption code, but the `audit_log.action` namespace anticipates `kms.encrypt`, `kms.decrypt`.

### Integration Points

- **Phase 2 will:** add Better-Auth dev instance + KMS module + ASC key upload UI on top of the `developers` table, `audit_log` table, Inngest client, and brand baseline that Phase 1 sets up.
- **Phase 3 will:** add Better-Auth user instance + R2 + sharp + public discovery API + ISR pages on top of the route-group structure Phase 1 establishes.
- **Phase 5 will:** add `lib/asc/*`, `lib/crypto/*`, and the `asc.invite` Inngest function — using the directory shells, redaction allowlist, and audit-log shape Phase 1 puts in place.
- **Every later phase relies on:** the Pino redaction policy (especially around `.p8` and JWTs in Phases 2 and 5), the audit-log shape (every sensitive op writes here), and the per-PR Neon preview branch (every migration is exercised before merge).

</code_context>

<deferred>
## Deferred Ideas

- **Doppler / Infisical for secrets** — `vercel env pull` is enough for solo. Revisit when a teammate joins.
- **Cross-language monorepo (Tuist + Turborepo)** for iOS — premature; iOS repos stay separate.
- **Single `accounts` table with `kind` enum** instead of separate `developers` + `users` — fallback if Phase 2/3 dual-Better-Auth setup proves painful. Currently MEDIUM-confidence per research.
- **Local Postgres in Docker** — loses Neon branching value; revisit only if Neon free tier becomes limiting.
- **OPS-02 dashboards/alerting layer** — Axiom *transport* moved into Phase 1; the dashboards, alert thresholds, and on-call wiring remain in Phase 7 as planned.
- **`pg_uuidv7` Postgres extension** for native UUID v7 generation — depends on Neon's extension support; planner verifies and may keep app-side generation.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-28*
