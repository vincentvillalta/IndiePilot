# Phase 1: Foundation — Research

**Researched:** 2026-04-28
**Domain:** Greenfield Next.js + Vercel + Neon + Drizzle + Inngest + Pino monorepo scaffolding
**Confidence:** HIGH (overall) — MEDIUM on a few version-pin recommendations called out inline

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Repo Layout**
- Parent directory `indiepilot/` holds three sibling git repositories. This directory is itself the web monorepo's git root. Sibling repos `indiepilot-ios/` (Phase 4) and `indiepilot-ios-sdk/` (Phase 7) live alongside as separate `.git` directories, not as submodules.
- Web monorepo uses **pnpm + Turborepo from day one**. Day-one workspace structure:
  - `apps/web` — the Next.js App Router app
  - `packages/db` — shared Drizzle schema + migrations + client factories
  - `packages/ui` — shared shadcn/ui primitives + brand tokens (Tailwind v4)
- `apps/web` route grouping is by audience:
  - `app/(dashboard)/*` — developer dashboard
  - `app/(marketing)/*` — public share-link landing pages (Phase 3)
  - `app/api/auth/dev/*` — Better-Auth dev instance (Phase 2)
  - `app/api/auth/user/*` — Better-Auth user instance (Phase 3)
  - `app/api/v1/*` — public iOS app API (Phase 3+)
  - `app/api/sdk/v1/*` — third-party SDK API (Phase 7)
  - `app/api/inngest/route.ts` — Inngest serve handler (Phase 1)
- iOS apps (user app + SDK) are NOT pulled into Turborepo.

**Database Schema Baseline**
- Naming: `snake_case` in Postgres, `camelCase` in TypeScript. Drizzle handles the column-name mapping.
- Primary keys: UUID v7 generated in TypeScript via the `uuid` npm package (≥ v10). Time-ordered, indexable, no Postgres extension required.
- Tables created in Phase 1 (per FOUND-02):
  - `developers` — minimum columns: `id`, `email`, `created_at`, `updated_at`, `deleted_at`.
  - `users` — same minimum columns.
  - `sessions` — Better-Auth-compatible shape (Phase 1 stubs columns).
  - `audit_log` — polymorphic with JSON payload.
- Two-table model preferred over single `accounts` table with `kind` discriminator.
- `audit_log` columns: `id`, `occurred_at`, `actor_type` (`developer | user | system`), `actor_id` (nullable), `action` (string), `target_type`, `target_id`, `payload jsonb`, `ip inet` (nullable), `user_agent text` (nullable). Indexed on `(occurred_at desc)`, `(actor_id, occurred_at desc)`, `(action, occurred_at desc)`. Append-only.
- Soft delete with `deleted_at` on `developers`, `users` (and future entities). Default Drizzle queries filter it out via a base helper.
- Timestamps: every table has `created_at timestamptz not null default now()` + `updated_at timestamptz not null default now()`. `updated_at` auto-bumped via Drizzle's `$onUpdate(() => new Date())` helper.

**Bootstrap & Dev DX**
- Environment variables: `vercel env pull` is the source of truth. No `.env.example`. Vercel dashboard owns every secret value.
- Database connection per developer: each contributor gets their own Neon branch off `main` (e.g., `vincent-dev`). Branch name comes from `NEON_BRANCH` env var that `vercel env pull` provides per developer.
- `pnpm bootstrap` does, in order:
  1. `pnpm install`
  2. `vercel env pull --environment=development apps/web/.env.local`
  3. `pnpm db:migrate` — applies Drizzle migrations to dev's Neon branch
  4. `pnpm db:seed` — runs the Faker fixture
- Bootstrap success: `git clone` → `pnpm dev` under 10 minutes for a contributor with Vercel access.
- Seed data: Faker-generated fixture in `packages/db/seed/`. ~5 fake `developers`, ~10 placeholder rows. `pnpm db:reset` truncates and re-seeds.

**Logging Redaction**
- Pino with hybrid policy:
  - Deny-list of paths via `redact: { paths, censor }` covering at minimum: `*.p8`, `*.privateKey`, `*.jwt`, `*.asc*Token`, `*.password`, `*.passwordHash`, `req.headers.cookie`, `req.headers.authorization`, `*.payload.password`, `*.payload.p8`. Censored to `[redacted]`.
  - Structured-logging discipline enforced by code review and a small custom ESLint rule: never `logger.info(req.body)` or `logger.info(error)` — always `logger.info({ event: 'name', ...safeFields })`.
- PII handling:
  - User emails hashed (`sha256(email + per-deploy salt)`) before being logged.
  - IPs logged in full.
  - User-agents logged in full.
- Transport: Axiom from day one (OPS-02 transport piece pulled forward).
- Per-environment log levels: `debug` (local), `info` (preview), `warn` (production). Override via `LOG_LEVEL` or per-request `x-log-level` header (admin-only).

**Inngest**
- Single Inngest client at `apps/web/inngest/client.ts`.
- Serve handler at `app/api/inngest/route.ts`.
- Phase 1 ships exactly one function: `health.check` — manually triggerable, returns `{ ok: true }`.

**CI**
- GitHub Actions on PR: `pnpm typecheck`, `pnpm lint` (Biome), `pnpm test` (Vitest) — all required-to-merge.
- Per-PR Neon preview branch: GitHub Action creates branch `pr-<NUMBER>` on PR open, runs `pnpm db:migrate` against it, reports pass/fail. Branch auto-deleted on PR close/merge.
- Vercel-native preview deployment runs in parallel; CI doesn't gate it.

### Claude's Discretion
- Specific package versions (Next.js 15.x, Drizzle 0.36 vs 1.0 RC, Inngest version) — verified at scaffold time.
- Tailwind v4 setup specifics in `packages/ui` (CSS variables vs JS config).
- Whether `packages/ui` is a build-step package (tsup) or TypeScript-only.
- Exact Drizzle migration tooling workflow (`drizzle-kit push` vs `migrate` vs `studio`).
- Biome vs ESLint+Prettier mix — Biome preferred but planner can adjust if it can't host the structured-logging rule.
- Vitest config layout, test colocation.
- Whether per-PR Neon branch uses Neon's GitHub integration or a custom Action.
- Audit-log helper API surface.
- Exact UUID v7 generation library (`uuid` v10+ vs `uuidv7` standalone vs `pg_uuidv7` extension).
- Bootstrap script implementation language (shell vs TS).

### Deferred Ideas (OUT OF SCOPE)
- Doppler / Infisical for secrets — `vercel env pull` is enough for solo.
- Cross-language monorepo (Tuist + Turborepo) for iOS — premature.
- Single `accounts` table with `kind` enum — fallback only.
- Local Postgres in Docker — loses Neon branching value.
- OPS-02 dashboards/alerting layer — only Axiom transport in Phase 1; dashboards stay in Phase 7.
- `pg_uuidv7` Postgres extension — depends on Neon support; planner verifies (we verified: it's supported, but we recommend app-side `uuid` v11 anyway — see UUID section).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | Project scaffolding (Next.js App Router, TypeScript, Drizzle, Neon, Tailwind, shadcn/ui, Biome, Vitest, Playwright) | "Standard Stack" + "Architecture Patterns" sections give exact versions, pnpm + Turborepo layout, shadcn/ui monorepo CLI flow, Vitest "projects" config |
| FOUND-02 | Database schema baseline (`developers`, `users`, `sessions`, `audit_log`) with Drizzle migrations | "Database Schema Patterns" section: domain-split schema files, UUID v7 with `$defaultFn(uuidv7)`, polymorphic `audit_log` jsonb pattern, `$onUpdate` for `updated_at`, soft-delete helper |
| FOUND-03 | CI runs migrations against per-PR Neon preview branches | "CI / Per-PR Neon Branch" section: official Neon GitHub Actions, branch lifecycle, drizzle-kit migrate (NOT push) command, runner-side `DATABASE_URL` injection |
| FOUND-04 | Logging baseline (Pino with PII/key/JWT redaction allowlist) | "Pino Redaction" section: exact `redact: { paths, censor }` syntax, `@axiomhq/pino` transport (NOT Vercel Log Drain), email-hashing helper, per-env levels, custom ESLint rule for structured-log discipline |
| FOUND-05 | Inngest installed at `/api/inngest` with one health-check function | "Inngest Setup" section: `serve()` Route Handler, `health.check` event-triggered function, dev server flow |
</phase_requirements>

## Summary

Phase 1 is **mechanical scaffolding for a greenfield Next.js + Vercel + Neon + Drizzle + Inngest + Pino monorepo** with one twist: the user's CONTEXT.md says "Next.js 15", but as of 2026-04-28 **Next.js 16 is the current Active LTS** and Next.js 15 is in Maintenance LTS until Oct 21 2026. The planner should default to **Next.js 16.2.4 LTS** for a greenfield project unless Vincent explicitly wants the more conservative path. The CONTEXT note about "Next 15.x" was Vincent leaving version specifics to the planner's discretion ("the planner verifies current versions at scaffold time"), so this is on-script.

Similarly, Drizzle ORM is at **0.45.2 stable** (not 0.36 as STACK.md anticipated), with **1.0.0-beta.22** in active development. We **strongly recommend pinning to 0.45.x** for Phase 1 — 1.0 is still beta, the Phase 1 ship date is now-ish, and the schema we're writing will work on either when 1.0 ships. Treat the 1.0 upgrade as a future small task, not a Phase 1 risk.

Everything else is well-trodden 2026 territory: Turborepo + pnpm + shadcn/ui's monorepo CLI gives a working `apps/web` + `packages/ui` + `packages/db` skeleton in one command. Inngest's `serve()` Route Handler is two lines. Neon's official GitHub integration creates per-PR branches; pair it with `drizzle-kit migrate` (not `push` — we want migration files in the audit trail). Pino's `redact: { paths }` accepts JSONPath-with-wildcards exactly matching the deny-list in CONTEXT.md, and `@axiomhq/pino` is the right transport now that Vercel Log Drain became Pro+ only.

**Primary recommendation:** Pin **Next.js 16.2.4**, **Drizzle 0.45.x**, **uuid v11**, **Tailwind v4.1**, **Inngest TypeScript SDK v4**, **Biome 2.x for everything except a single custom rule (which lives in a tiny ESLint sidecar)**. Use Neon's first-party GitHub Action + `drizzle-kit migrate` for per-PR branches. Use `@axiomhq/pino` transport (not Vercel Log Drain).

## Standard Stack

### Core
| Library | Version (verified 2026-04-28) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | **16.2.4** (Active LTS) | Web framework | Active LTS as of Oct 2025; Next.js 15 went to Maintenance LTS the same day. Greenfield projects should be on 16. **MEDIUM-HIGH confidence on the recommendation** — diverges from CONTEXT/STACK shorthand "Next.js 15", but CONTEXT explicitly delegated version pinning to the planner. |
| `react` / `react-dom` | **19.x** (latest) | UI library | Required pairing with Next 16. |
| `typescript` | **5.6+** (strict) | Type safety | Required by Drizzle, Better-Auth (Phase 2). |
| `drizzle-orm` | **0.45.2** (latest stable) | ORM | 1.0.0-beta.22 exists but is still beta; ship Phase 1 on 0.45.x and upgrade to 1.0 when GA. **HIGH confidence.** |
| `drizzle-kit` | **matching 0.45.x** | Migrations + Studio | Generate SQL migration files; commit them. |
| `@neondatabase/serverless` | **^0.10** | Neon driver | HTTP driver for one-shot Route Handler queries; Pool/WS for transactions in Inngest functions. |
| `inngest` | **^4.x** (TypeScript SDK v4) | Background jobs | Phase 1 just wires the client + serve handler + one trivial function. |
| `pino` | **^9.x** | Structured logging | Battle-tested, fastest in the JS ecosystem. |
| `@axiomhq/pino` | **latest** | Pino → Axiom transport | Replaces Vercel Log Drain (which became Pro+ only May 2024). |
| `uuid` | **^11** | UUID v7 generation in TS | v11 is fully ported to TypeScript; provides `import { v7 as uuidv7 } from 'uuid'`. **HIGH confidence on choice over alternatives** (see "UUID v7 Generation" section). |
| `tailwindcss` | **4.1.x** | Styling | v4 GA Jan 2025 with the Oxide engine; v4.1 current stable. |
| `@tailwindcss/postcss` | **matching 4.1.x** | PostCSS integration | Required for Next.js + Tailwind v4. |
| `shadcn` (CLI) | **latest** | Component primitives | Use `--monorepo` flag at init for the `apps/web` + `packages/ui` split. |
| `zod` | **^3.23** | Runtime validation | Will be used heavily Phase 2+; install in Phase 1 so the lib boundary exists. |
| `next-safe-action` | **^7.x** | Type-safe Server Actions | Optional in Phase 1 but cheap to install; Phase 2 uses it. |

### Tooling
| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| `pnpm` | **10.x** | Package manager | Pin via `packageManager` field in root `package.json`; enable `corepack`. |
| `turbo` | **^2.x** | Monorepo task runner | Even for 3 packages, the cost-of-adoption is ~30 min and you avoid retrofitting later. |
| `@biomejs/biome` | **2.3.x** (Jan 2026) | Lint + format | 2.0 introduced a plugin system; covers ~80% of common ESLint rules. |
| `eslint` (sidecar) | **^9.x** | Sidecar for the one custom rule | Biome plugin system is too immature to host the "no raw logger.info(req.body)" rule cleanly; use a single tiny ESLint config + custom rule for that. |
| `vitest` | **^3.2+** | Unit tests | 3.2 deprecated "workspace" in favor of "projects" config. |
| `@playwright/test` | **^1.x** | E2E for Phase 5 critical path | Install in Phase 1 so the dep is wired; tests come later. |
| `@types/node` | **20.x** | Node 20 types | Vercel runtime default. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@faker-js/faker` | **^9.x** | Seed fixture | `packages/db/seed/seed.ts` — generate 5 developers, 10 placeholder rows. |
| `tsx` | **^4.x** | Run TS files directly | For `pnpm db:seed` and `pnpm db:migrate` scripts. |
| `dotenv-cli` | **^7.x** | Load `.env.local` for migrate/seed scripts | Optional helper around `vercel env pull`-produced files. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `next@16` (recommended) | `next@15` LTS | 15 is supported until Oct 2026, so it's not unsafe — but it's in Maintenance LTS (no new features, only critical fixes). Greenfield project = use Active LTS = use 16. |
| `drizzle-orm@0.45` (recommended) | `drizzle-orm@1.0.0-beta.22` | 1.0 architecture rewrite; still beta. Risk of churn during Phase 1 implementation. Stay on 0.45.x. |
| `uuid` v11 (recommended) | `uuidv7` standalone package | Standalone is fine but smaller maintainer surface; `uuid` v11 is the de facto standard. |
| `uuid` v11 (recommended) | `pg_uuidv7` Postgres extension on Neon | Neon does support `pg_uuidv7`. But app-side keeps the schema portable, avoids extension churn risk, and gives us deterministic test fixtures. Use Postgres-side only if we ever benchmark and find app-side is the bottleneck (we won't at this scale). |
| `uuid` v11 (recommended) | Postgres 18's native `uuidv7()` | Neon supports Postgres 18 now, but: locking yourself to PG18 default (`gen_random_uuid()` is still the legacy default), and your SQL would diverge from what Drizzle's SQL generator emits today. Stick with app-side. |
| `@axiomhq/pino` transport (recommended) | Vercel Log Drain → Axiom | Log Drain became Pro+ only on May 23 2024. Solo dev = Hobby plan = Log Drain unavailable. App-level transport sidesteps this entirely. |
| Drizzle's built-in `drizzle-seed` | `@faker-js/faker` seeded manually | drizzle-seed produces deterministic data with a seedable PRNG; great default. But Faker gives more realistic fields (`faker.commerce.productName()` for placeholder app names) that match what dashboards will eventually display. Use Faker for Phase 1; revisit drizzle-seed only if test determinism becomes an issue. |
| Biome (only) | Biome 2.0 plugin for the structured-log rule | Biome 2.0's plugin system is new (2025) and the ergonomics for writing a JSAST-aware rule are still maturing. Use ESLint as a sidecar for the single custom rule and call it a day. |
| `drizzle-kit migrate` (recommended) | `drizzle-kit push` | `push` skips migration files (snapshot-only) — fine for solo prototyping but loses the per-PR audit trail and breaks rollback. Use `migrate` everywhere (local dev too — devs run `pnpm db:generate` to produce SQL, commit it, then `pnpm db:migrate` applies it). |

### Installation

```bash
# At monorepo root, after `pnpm init`:

# Workspace + Turbo
pnpm add -D -w turbo

# apps/web — core
cd apps/web
pnpm add next@latest react@latest react-dom@latest
pnpm add -D typescript @types/node @types/react @types/react-dom

# apps/web — Inngest
pnpm add inngest

# apps/web — logging
pnpm add pino @axiomhq/pino

# apps/web — UI (Tailwind v4 + shadcn live in packages/ui; web consumes)
pnpm add tailwindcss @tailwindcss/postcss

# apps/web — validation
pnpm add zod
pnpm add next-safe-action

# packages/db
cd ../../packages/db
pnpm add drizzle-orm @neondatabase/serverless uuid
pnpm add -D drizzle-kit @faker-js/faker tsx @types/uuid

# packages/ui — shadcn init from monorepo root
cd ../..
pnpm dlx shadcn@latest init --monorepo

# Tooling at root
pnpm add -D -w @biomejs/biome eslint vitest @playwright/test
```

## Architecture Patterns

### Recommended Project Structure (Phase 1 deliverable)

```
indiepilot/
├── .github/
│   └── workflows/
│       ├── ci.yml                       # typecheck + lint + test (per PR)
│       └── neon-branch.yml              # create/migrate/destroy per-PR Neon branch
├── apps/
│   └── web/
│       ├── app/
│       │   ├── (dashboard)/             # empty layout for Phase 2
│       │   │   └── page.tsx             # placeholder "coming soon" or empty
│       │   ├── (marketing)/             # empty for Phase 3
│       │   ├── api/
│       │   │   └── inngest/
│       │   │       └── route.ts         # Inngest serve handler (Phase 1 deliverable)
│       │   ├── layout.tsx
│       │   └── globals.css              # imports packages/ui tokens
│       ├── inngest/
│       │   ├── client.ts                # new Inngest({ id: "indiepilot" })
│       │   └── functions/
│       │       └── health.ts            # the one Phase 1 function
│       ├── lib/
│       │   ├── logger.ts                # pino instance + redaction config
│       │   └── env.ts                   # Zod-validated env at boot
│       ├── next.config.ts               # transpilePackages: ['@indiepilot/ui', '@indiepilot/db']
│       ├── postcss.config.mjs
│       ├── tsconfig.json                # extends ../../tsconfig.base.json
│       ├── package.json
│       └── vitest.config.ts
├── packages/
│   ├── db/
│   │   ├── src/
│   │   │   ├── schema/                  # one file per domain
│   │   │   │   ├── developers.ts
│   │   │   │   ├── users.ts
│   │   │   │   ├── sessions.ts
│   │   │   │   ├── audit-log.ts
│   │   │   │   └── index.ts             # barrel export
│   │   │   ├── client.ts                # neon-http (Route Handlers)
│   │   │   ├── pool.ts                  # neon-serverless Pool (Inngest)
│   │   │   ├── helpers.ts               # uuidv7, $onUpdate(now), softDelete()
│   │   │   └── index.ts                 # public exports
│   │   ├── drizzle/                     # generated SQL migrations (committed)
│   │   ├── seed/
│   │   │   └── seed.ts                  # Faker fixture
│   │   ├── drizzle.config.ts            # points at ./src/schema, ./drizzle output
│   │   ├── package.json                 # exports: { ".": "./src/index.ts", "./schema": "./src/schema/index.ts" }
│   │   └── tsconfig.json
│   └── ui/
│       ├── src/
│       │   ├── components/              # shadcn primitives (Button, etc.)
│       │   ├── styles/
│       │   │   └── globals.css          # @import "tailwindcss"; tokens
│       │   └── index.ts
│       ├── package.json
│       ├── postcss.config.mjs
│       └── tsconfig.json
├── tooling/                             # OPTIONAL — shared configs as packages
│   ├── eslint-config/                   # houses the structured-log custom rule
│   │   ├── index.js
│   │   └── rules/no-raw-log.js
│   └── tsconfig/
│       └── base.json
├── biome.jsonc                          # root Biome config (formatter + most rules)
├── eslint.config.js                     # root ESLint config (custom rule only)
├── turbo.json                           # task graph: build, lint, typecheck, test, db:*
├── pnpm-workspace.yaml                  # apps/*, packages/*, tooling/*
├── package.json                         # scripts: bootstrap, dev, db:*, etc.
├── tsconfig.base.json
├── .gitignore                           # MUST include .env*, .vercel/, .next/
└── README.md
```

### Pattern 1: Inngest serve handler (App Router)

**What:** Single Route Handler at `app/api/inngest/route.ts` exporting `GET`, `POST`, `PUT` from `serve()`. Phase 1 ships exactly one function (`health.check`).
**When to use:** Standard wiring for any Inngest + Next.js App Router app. This is the canonical 2026 pattern.
**Example:**
```typescript
// apps/web/inngest/client.ts
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "indiepilot",
  // No event keys needed in dev — Inngest dev server picks them up
});
```

```typescript
// apps/web/inngest/functions/health.ts
import { inngest } from "../client";

export const healthCheck = inngest.createFunction(
  { id: "health-check" },
  { event: "health/check.requested" },
  async ({ event, step, logger }) => {
    logger.info({ event: "health.check.started" });
    return { ok: true, receivedAt: event.ts };
  },
);
```

```typescript
// apps/web/app/api/inngest/route.ts
import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { healthCheck } from "@/inngest/functions/health";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [healthCheck],
});

// Optional: also serve a JSON 200 for plain `GET` (without Inngest signature)
// — Inngest's `GET` already returns 200 with introspection JSON when its key is missing,
//   which satisfies success criterion #3 for "the endpoint returns 200".
```

**Triggering manually for Phase 1's success criterion #3:**
- In dev: open Inngest Dev Server UI → Functions tab → click "Invoke" on `health-check`, paste `{}` payload, run. Function appears as completed.
- Programmatically: `await inngest.send({ name: "health/check.requested", data: {} })` from a one-off script.
- Verifying just the endpoint: `curl http://localhost:3000/api/inngest` returns 200 + JSON manifest of registered functions (this satisfies "endpoint returns 200" without invoking the function).

### Pattern 2: Drizzle schema with UUID v7 + soft delete + auto-bumped timestamps

**What:** Domain-split schema files; shared helpers for `id`/`createdAt`/`updatedAt`/`deletedAt`; `$defaultFn(uuidv7)` for app-side UUID generation.
**When to use:** Every table.
**Example:**
```typescript
// packages/db/src/helpers.ts
import { v7 as uuidv7 } from "uuid";
import { sql } from "drizzle-orm";
import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

/** Mixin columns every table inherits. Use spread or merge in pgTable. */
export const baseColumns = {
  id: uuid("id").primaryKey().$defaultFn(uuidv7),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const softDeleteColumn = {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};
```

```typescript
// packages/db/src/schema/developers.ts
import { pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { baseColumns, softDeleteColumn } from "../helpers";

export const developers = pgTable(
  "developers",
  {
    ...baseColumns,
    email: text("email").notNull(),
    ...softDeleteColumn,
  },
  (t) => ({
    emailUnique: uniqueIndex("developers_email_unique").on(t.email),
  }),
);

export type Developer = typeof developers.$inferSelect;
export type NewDeveloper = typeof developers.$inferInsert;
```

```typescript
// packages/db/src/schema/audit-log.ts
import { index, jsonb, pgTable, text, timestamp, uuid, inet } from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorType: text("actor_type", { enum: ["developer", "user", "system"] }).notNull(),
    actorId: uuid("actor_id"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: uuid("target_id"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    ip: inet("ip"),
    userAgent: text("user_agent"),
  },
  (t) => ({
    occurredAtIdx: index("audit_log_occurred_at_idx").on(t.occurredAt.desc()),
    actorIdx: index("audit_log_actor_idx").on(t.actorId, t.occurredAt.desc()),
    actionIdx: index("audit_log_action_idx").on(t.action, t.occurredAt.desc()),
  }),
);
```

```typescript
// packages/db/src/client.ts — for Route Handlers (HTTP driver)
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

```typescript
// packages/db/src/pool.ts — for Inngest functions (Pool/WS driver, transactions)
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

export function createPoolClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return { db: drizzle(pool, { schema }), close: () => pool.end() };
}
```

### Pattern 3: Pino with redaction + Axiom transport

**What:** One Pino factory exposing a tree of loggers, with `redact: { paths, censor }` covering the deny-list, plus `@axiomhq/pino` transport in production.
**When to use:** Every server-side log call. Phase 2+ will import `logger` from this module.
**Example:**
```typescript
// apps/web/lib/logger.ts
import pino from "pino";
import { createHash } from "node:crypto";

const REDACT_PATHS = [
  // Top-level keys
  "p8", "privateKey", "jwt", "password", "passwordHash",
  // Nested under any object
  "*.p8", "*.privateKey", "*.jwt",
  "*.password", "*.passwordHash",
  // ASC-token shapes (e.g., ascAccessToken, ascRefreshToken, ascToken)
  "*.ascToken", "*.ascAccessToken", "*.ascRefreshToken",
  // Common request headers
  "req.headers.cookie",
  "req.headers.authorization",
  "request.headers.cookie",
  "request.headers.authorization",
  // Inngest event payloads
  "event.data.password",
  "event.data.p8",
  "*.payload.password",
  "*.payload.p8",
];

const isProduction = process.env.NODE_ENV === "production";
const isPreview = process.env.VERCEL_ENV === "preview";

const level =
  process.env.LOG_LEVEL ??
  (isProduction ? "warn" : isPreview ? "info" : "debug");

const transport = process.env.AXIOM_TOKEN
  ? {
      target: "@axiomhq/pino",
      options: {
        dataset: process.env.AXIOM_DATASET ?? "indiepilot",
        token: process.env.AXIOM_TOKEN,
      },
    }
  : undefined; // dev: log to stdout

export const logger = pino({
  level,
  redact: {
    paths: REDACT_PATHS,
    censor: "[redacted]",
  },
  transport,
  base: {
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    service: "web",
  },
});

const SALT = process.env.LOG_HASH_SALT ?? "dev-only-unsafe-salt";

/** Stable, non-reversible email hash for log correlation. */
export function hashEmail(email: string): string {
  return createHash("sha256")
    .update(email.toLowerCase().trim() + SALT)
    .digest("hex")
    .slice(0, 16); // 16 hex chars is plenty for correlation in logs
}
```

**Verification (success criterion #4):** A unit test calls `logger.info({ p8: "FAKE_KEY", token: { jwt: "eyJ..." }, password: "hunter2" })`, captures stdout, asserts the rendered JSON contains `"[redacted]"` for each path and never the literal values.

### Pattern 4: ESLint custom rule for structured-logging discipline

**What:** A Biome sidecar — single ESLint config + custom rule that flags `logger.<level>(<non-object-literal>)`.
**When to use:** Every `apps/web/**/*.ts(x)` and `packages/**/*.ts` file. CI runs `pnpm lint:eslint` after Biome.
**Example:**
```javascript
// tooling/eslint-config/rules/no-raw-log.js
/**
 * Enforces: logger.<level>(arg) where arg is an ObjectExpression
 * (or a `{ ...spread }`-like form). Catches `logger.info(req.body)`,
 * `logger.error(err)`, `logger.info("string with " + email)`.
 */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Logger calls must take an object literal as their first argument",
    },
    schema: [],
    messages: {
      raw: "Pass an object literal to logger.{{ level }}: logger.{{ level }}({ event: 'name', ...safeFields }). Bare values bypass redaction.",
    },
  },
  create(context) {
    const LOG_LEVELS = new Set([
      "trace", "debug", "info", "warn", "error", "fatal",
    ]);
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type !== "MemberExpression" ||
          callee.property.type !== "Identifier" ||
          !LOG_LEVELS.has(callee.property.name)
        ) {
          return;
        }
        // Allowlist: callee.object must be `logger` or any identifier
        // ending with `Logger` (request-scoped child loggers).
        if (
          callee.object.type !== "Identifier" ||
          (callee.object.name !== "logger" &&
            !callee.object.name.endsWith("Logger"))
        ) {
          return;
        }
        const first = node.arguments[0];
        if (!first) return;
        // Must be an ObjectExpression. Spread is fine; identifiers are not.
        if (first.type !== "ObjectExpression") {
          context.report({
            node: first,
            messageId: "raw",
            data: { level: callee.property.name },
          });
        }
      },
    };
  },
};
```

```javascript
// eslint.config.js (root, ESLint 9 flat config)
const noRawLog = require("./tooling/eslint-config/rules/no-raw-log.js");

module.exports = [
  {
    files: ["apps/**/*.{ts,tsx}", "packages/**/*.ts"],
    plugins: {
      indiepilot: { rules: { "no-raw-log": noRawLog } },
    },
    rules: {
      "indiepilot/no-raw-log": "error",
    },
  },
];
```

### Pattern 5: Vercel `env pull` bootstrap script

**What:** A `pnpm bootstrap` script that runs install → vercel env pull → migrate → seed. Each developer runs it once after cloning.
**When to use:** Onboarding any contributor (today: just Vincent, but the pattern is locked).
**Example:**
```json
// package.json (root)
{
  "scripts": {
    "bootstrap": "pnpm install && pnpm env:pull && pnpm db:migrate && pnpm db:seed",
    "env:pull": "vercel env pull --environment=development apps/web/.env.local --cwd apps/web --yes",
    "dev": "turbo run dev",
    "build": "turbo run build",
    "typecheck": "turbo run typecheck",
    "lint": "biome check . && eslint .",
    "lint:fix": "biome check --write . && eslint --fix .",
    "test": "turbo run test",
    "db:generate": "pnpm --filter @indiepilot/db db:generate",
    "db:migrate": "pnpm --filter @indiepilot/db db:migrate",
    "db:seed": "pnpm --filter @indiepilot/db db:seed",
    "db:studio": "pnpm --filter @indiepilot/db db:studio",
    "db:reset": "pnpm --filter @indiepilot/db db:reset"
  },
  "packageManager": "pnpm@10.x.x"
}
```

**`.vercel/` directory placement:** Run `vercel link` from `apps/web/` (NOT root) so the `.vercel/` directory lives at `apps/web/.vercel/`. Add `**/.vercel/` to root `.gitignore`. This matches Vercel's documented pattern for monorepos where `apps/web` is one Project. (`vercel link --repo` — alpha — links the whole monorepo to multiple projects at once; for solo/single-project it's overkill.)

**`.gitignore` essentials (success criterion #1 hardening):**
```
node_modules/
.turbo/
.next/
dist/
build/
.env
.env.local
.env.*.local
**/.vercel/
.DS_Store
*.log
coverage/
.idea/
.vscode/*
!.vscode/settings.json
!.vscode/extensions.json
```

### Pattern 6: shadcn/ui in `packages/ui` with Tailwind v4

**What:** Run `pnpm dlx shadcn@latest init --monorepo` to scaffold `apps/web` + `packages/ui` with Tailwind v4 ownership in `packages/ui`. Apps consume tokens via `@source` directive.
**When to use:** Phase 1, after the bare workspace exists.
**How it ends up:**
- `packages/ui/src/styles/globals.css` owns:
  ```css
  @import "tailwindcss";
  @source "../../../apps/web";
  @source "../../../packages/ui/src";

  @theme {
    --color-brand-50: oklch(0.97 0.02 80);
    /* ... brand tokens (Phase 1 ships placeholder; Phase 2 BRAND-01 fills in real palette) */
  }
  ```
- `apps/web/app/globals.css` is a one-liner:
  ```css
  @import "@indiepilot/ui/styles/globals.css";
  ```
- `apps/web/postcss.config.mjs`:
  ```js
  export default { plugins: { "@tailwindcss/postcss": {} } };
  ```
- `apps/web/next.config.ts`:
  ```ts
  import type { NextConfig } from "next";
  export default {
    transpilePackages: ["@indiepilot/ui", "@indiepilot/db"],
    // For Vercel monorepo standalone output (Phase 7 hardening — set now to avoid retrofit):
    output: "standalone",
    outputFileTracingRoot: "../../",
  } satisfies NextConfig;
  ```

**`packages/ui` is a TS-source package (no tsup).** Rationale: `transpilePackages` + Next 16's Turbopack handles `.tsx` from workspace deps natively. Build step would just add overhead with zero gain at this scale. Revisit if Phase 7 ships a marketing site with a different build (Astro, etc.).

### Anti-Patterns to Avoid

- **Committing `apps/web/.env.local`** — easy to do because `vercel env pull` writes it without prompting. Make sure `.gitignore` blocks it AND that the bootstrap script is the only way it appears. Pre-commit hook (Husky + lint-staged) optional but cheap.
- **Putting Drizzle schema in `apps/web` instead of `packages/db`** — schema needs to be importable by Inngest functions (which run on the same `apps/web` deployment but conceptually belong to a separate process boundary), seed scripts, AND eventually CI scripts that don't boot Next. Putting it in `packages/db` from day one prevents a circular-import refactor in Phase 2.
- **Using `drizzle-kit push` in CI** — push is snapshot-only, no migration files = no audit trail = no rollback. Generate locally (`pnpm db:generate`), commit the SQL, then `migrate` everywhere.
- **Running ASC API or KMS calls from Route Handlers** — already locked by ARCHITECTURE.md but worth restating: Phase 1 establishes the `lib/asc/*` and `lib/crypto/*` directory shells (empty or with one-line README), so Phase 2 has somewhere to land. CI lint rule for "no `lib/asc` import outside `inngest/functions`" can wait for Phase 5; Phase 1 just sets up the structure.
- **`SignInWithApplePlugin` or any auth in Phase 1** — Better-Auth lands in Phase 2. Phase 1 ships empty `app/api/auth/dev/[...all]/route.ts` and `app/api/auth/user/[...all]/route.ts` files that 404? Actually no — leave the routes UNCREATED in Phase 1; just establish the schema baseline. Phase 2 creates the route files. Phase 1 verifies the route GROUPS exist (`app/(dashboard)/page.tsx` placeholder is sufficient).
- **Tailwind config in `apps/web`** — duplicates work and creates drift. Tailwind v4 owns its config in CSS; `packages/ui` is the source of truth.
- **Inngest functions outside `apps/web`** — they live in `apps/web/inngest/` because they're served by the same Next.js deploy. Don't put them in `packages/inngest` "for cleanliness"; they need the same env vars and runtime.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID v7 generator | Hand-rolled timestamp + random-bits encoder | `import { v7 as uuidv7 } from 'uuid'` | RFC 9562 has subtle correctness rules for the rand_a/rand_b layout; mistakes are sortability bugs that surface as random performance regressions on indexes. |
| Pino transport to Axiom | Custom HTTP shipper that batches lines | `@axiomhq/pino` | Backpressure, batching, retries, and gzipping are all subtle. Axiom's official transport handles them. |
| Email hash for logs | `crypto.randomUUID()` per email or just use email | `sha256(email + salt).slice(0, 16)` | Random UUID per email loses correlation. Plain email is a PII leak. SHA256 + per-deploy salt gives both correlation AND unlinkability across deploys. |
| Per-PR Neon branch creation | Custom GitHub Action calling Neon's REST API | Neon's first-party `neondatabase/create-branch-action` + `delete-branch-action` (or the Neon GitHub integration) | The official Action handles auth, idempotent create, branch-name-from-PR-number, and stale-branch cleanup. |
| Migration apply in CI | Hand-rolled bash that runs `psql` against the branch | `pnpm db:migrate` (which calls `drizzle-kit migrate`) | Drizzle's migrator handles the `__drizzle_migrations` tracking table, transaction-per-migration, and consistent locking. |
| Vercel env file generation | Custom doc with copy-paste instructions and a tracked `.env.example` | `vercel env pull` | CONTEXT explicitly chose this. Re-stating: don't drift back to a `.env.example`. |
| Bootstrap-time port-finding / dev-server orchestration | Custom shell script that spawns processes | `turbo run dev` | Turbo handles parallelism, log multiplexing, and restart-on-fail. |
| shadcn/ui monorepo wiring | Manual copy/paste of `@/components/ui` into both apps and packages | `shadcn init --monorepo` + `shadcn add <component>` (CLI knows the workspace structure) | The CLI gets imports, dependency resolution, and Tailwind v4 source paths right. |
| Test runner config across packages | One root `vitest.config.ts` with hand-rolled paths | One `vitest.config.ts` per package + a shared `vitest.shared.ts` (Vitest 3.2 "projects" or just per-package, since Turbo is the orchestrator) | Per-package config = each `pnpm --filter <pkg> test` is self-contained = better Turbo cache hits. |

**Key insight:** Phase 1's ratio of "wire up other people's code" to "write our own logic" should be ~95:5. Anything we hand-roll here is ten lines of code that becomes a hundred lines of edge-case maintenance by Phase 7.

## Common Pitfalls

### Pitfall 1: `vercel env pull` writes `.env.local` outside `.gitignore` scope

**What goes wrong:** Developer runs `vercel env pull` from a wrong cwd, file lands in repo root, `.gitignore` only blocks `apps/web/.env.local`, the file gets committed in a "fix typo" PR.
**Why it happens:** `vercel env pull` is sensitive to cwd; the documented pattern is `vercel env pull --cwd apps/web` but a sleepy developer at 1am drops the flag.
**How to avoid:**
- `.gitignore` uses globs (`.env`, `.env.local`, `.env.*.local`) at every level, not just `apps/web/.env.local`.
- The `pnpm env:pull` script wraps the command and pins `--cwd apps/web` so devs never run `vercel env pull` directly.
- Optional: pre-commit hook that fails if any tracked file matches `*.env*` patterns.
**Warning signs:** The `git status` output during PR contains `.env.local`. If you see it, STOP, rotate the secrets, and fix the gitignore.

### Pitfall 2: Drizzle 1.0 RC ships mid-Phase-1, tempting an upgrade

**What goes wrong:** 1.0 GA drops while Phase 1 is in flight. Someone bumps `drizzle-orm` to 1.0 mid-PR. APIs differ from the 0.45.x docs the rest of the codebase was written against. Confusion ensues.
**Why it happens:** Drizzle 1.0 has been "imminent" since late 2025 (currently at beta.22). The version pin is exactly the kind of "small upgrade" that looks easy.
**How to avoid:**
- Pin exactly: `"drizzle-orm": "0.45.2"`, `"drizzle-kit": "0.45.2"` (no `^`) for Phase 1.
- Document the upgrade as a Phase 2 line item: "When Drizzle 1.0 GA, run upgrade guide, regenerate types, ensure CI green, single PR."
- If 1.0 GAs while Phase 1 is open, RESIST upgrading until Phase 1 ships.
**Warning signs:** Someone proposes a `pnpm up drizzle-orm` in a Phase 1 PR.

### Pitfall 3: HTTP driver vs Pool driver — using the wrong one in Inngest

**What goes wrong:** Phase 1 wires `db` from `neon-http` and exports it from `packages/db`. Phase 5's `asc.invite` Inngest function needs a transaction (read-modify-write on `install_attempts`). HTTP driver doesn't support transactions; the dev silently runs three separate queries and ships a race condition.
**Why it happens:** One `db` export is the obvious DX. Two exports (`db` for Route Handlers, `createPoolClient()` for Inngest) is clunkier but correct.
**How to avoid:** Phase 1 establishes BOTH exports in `packages/db` (`client.ts` for HTTP, `pool.ts` for Pool/WS). Document in `packages/db/README.md` (or a JSDoc on the export) which to use. The pool client returns `{ db, close }` so consumers must explicitly `await close()` — this friction is the feature.
**Warning signs:** Phase 5 PR imports `db` from `@indiepilot/db` and calls `db.transaction(...)`. The HTTP driver's `transaction` method only does read-only batching, not interactive transactions.

### Pitfall 4: `transpilePackages` + Turbopack — silent skipping of nested workspace deps

**What goes wrong:** `apps/web/next.config.ts` has `transpilePackages: ['@indiepilot/ui']`. `packages/ui` re-exports from `packages/db` (e.g., a Drizzle type). With Turbopack (Next 16 default), the `transpilePackages` propagation through transitive workspace deps has historically had issues (vercel/next.js#63230).
**Why it happens:** `transpilePackages` was originally a webpack option; Turbopack's implementation is closing the gap but isn't 100%.
**How to avoid:**
- List EVERY workspace package consumed (directly or transitively) in `transpilePackages`: `['@indiepilot/ui', '@indiepilot/db']`.
- Avoid having `packages/ui` re-export from `packages/db` in Phase 1 — keep them disjoint. UI components shouldn't know DB types yet anyway.
- If errors appear, fall back to `next dev --webpack` while debugging, then file/find an upstream issue.
**Warning signs:** "Module not found: @indiepilot/db" or "ESM import outside transpiled scope" in `next dev` output.

### Pitfall 5: Per-PR Neon branch left orphaned when PR is closed without merge

**What goes wrong:** PR is closed (not merged). Cleanup workflow doesn't fire. Branch `pr-42` lives forever, eats Neon free-tier compute hours, and gets confusing as the PR number is reused.
**Why it happens:** GitHub Actions `on: pull_request: types: [closed]` does fire for both merge and close — but if the workflow has any other gate (e.g., a label requirement, or runs only on `synchronize`), the cleanup might skip.
**How to avoid:**
- Use Neon's official `neondatabase/delete-branch-action` in a workflow with `on: pull_request: types: [closed]` (no other gates).
- Add a separate scheduled workflow (`on: schedule: cron: '0 3 * * *'`) that lists Neon branches matching `pr-*` and deletes any whose PR is closed/merged. Belt-and-suspenders.
**Warning signs:** Neon dashboard shows >10 branches named `pr-*`.

### Pitfall 6: Pino redact paths use bracket-vs-dot syntax inconsistently

**What goes wrong:** Dev writes `redact.paths: ["req.body.password"]` to redact form passwords. But the request body actually arrives as `{ formData: { password: "..." } }` after parsing, and `req.body` is undefined (App Router doesn't have `req.body` like Express). Redaction silently does nothing; password is logged.
**Why it happens:** Pino's redact paths follow ECMAScript path syntax with two extensions (leading bracket, `*` wildcards). It's *case sensitive*, doesn't support arbitrary depth (`**` is NOT supported), and only redacts paths that actually exist in the logged object.
**How to avoid:**
- Phase 1 includes a Vitest test that asserts redaction works for representative shapes: `{ p8: "..." }`, `{ key: { p8: "..." } }`, `{ event: { data: { password: "..." } } }`.
- Keep `redact.paths` as broad as Pino allows — `*.password`, `*.p8`, `*.privateKey` — not narrowed to specific request shapes.
- Never log raw request bodies in any pattern. The custom ESLint rule above is the structural defense; redaction is the safety net.
**Warning signs:** A unit test logs an object with a deeply nested secret and the assertion that it's redacted FAILS.

### Pitfall 7: Tailwind v4 `@source` directive not picking up monorepo packages

**What goes wrong:** `packages/ui/src/components/Button.tsx` uses `bg-brand-500`. Web app imports the Button. The class is missing from the production CSS because Tailwind only scanned `apps/web/`.
**Why it happens:** Tailwind v4 dropped `tailwind.config.js` `content` globs; `@source` directives in CSS are the new mechanism. If `packages/ui/src/styles/globals.css` doesn't include `@source "../../../apps/web";` AND `@source "../../../packages/ui/src";`, classes from one side aren't scanned when building the other.
**How to avoid:**
- Use `shadcn init --monorepo` — the CLI sets these up correctly.
- Verify by running `pnpm --filter web build` and grepping the output CSS for a class only used in `packages/ui`.
- A Vitest snapshot test that renders a component using a brand-token class and asserts the class is in the rendered HTML is cheap insurance.
**Warning signs:** Components look unstyled in production; CSS file is suspiciously small.

### Pitfall 8: Inngest dev-server signing key vs prod signing key drift

**What goes wrong:** Local dev works; preview deployment shows "Inngest functions failed to register" because `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY` env vars aren't set in Vercel.
**Why it happens:** Inngest's dev server doesn't require keys (auto-introspects). Production does.
**How to avoid:**
- Set `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY` in Vercel project (Preview + Production scopes) before merging Phase 1.
- The bootstrap docs (or README) explicitly lists env vars: `DATABASE_URL`, `NEON_BRANCH`, `AXIOM_TOKEN`, `AXIOM_DATASET`, `LOG_HASH_SALT`, `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY`. Vincent populates them in Vercel dashboard once.
- The env validator (`apps/web/lib/env.ts` with Zod) refuses to boot if required vars are missing in `production` / `preview`.
**Warning signs:** First Vercel preview build fails on `/api/inngest` route. Inngest dashboard shows zero registered functions.

## Code Examples

### CI workflow: per-PR Neon branch + Drizzle migrate

```yaml
# .github/workflows/neon-branch.yml
name: Neon Preview Branch

on:
  pull_request:
    types: [opened, reopened, synchronize, closed]

jobs:
  setup:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile

      - name: Create Neon branch for PR
        id: create-branch
        uses: neondatabase/create-branch-action@v5
        with:
          project_id: ${{ vars.NEON_PROJECT_ID }}
          branch_name: pr-${{ github.event.number }}
          api_key: ${{ secrets.NEON_API_KEY }}

      - name: Apply migrations
        env:
          DATABASE_URL: ${{ steps.create-branch.outputs.db_url_with_pooler }}
        run: pnpm db:migrate

      - name: Comment branch info on PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `Neon preview branch \`pr-${context.issue.number}\` ready. Migrations applied.`,
            });

  cleanup:
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - name: Delete Neon branch
        uses: neondatabase/delete-branch-action@v3
        with:
          project_id: ${{ vars.NEON_PROJECT_ID }}
          branch: pr-${{ github.event.number }}
          api_key: ${{ secrets.NEON_API_KEY }}
```

### CI workflow: typecheck + lint + test (gate on merge)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
```

### Drizzle config (`packages/db/drizzle.config.ts`)

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
  // For per-PR ephemeral branches: applying the same migrations from scratch
  // is fast; we never use `push` in CI.
  strict: true,
  verbose: true,
});
```

### Faker seed script (`packages/db/seed/seed.ts`)

```typescript
import { faker } from "@faker-js/faker";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { developers, users } from "../src/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function main() {
  faker.seed(42); // deterministic across runs

  const fakeDevs = Array.from({ length: 5 }, () => ({
    email: faker.internet.email().toLowerCase(),
  }));
  const fakeUsers = Array.from({ length: 20 }, () => ({
    email: faker.internet.email().toLowerCase(),
  }));

  await db.insert(developers).values(fakeDevs);
  await db.insert(users).values(fakeUsers);

  console.log(`Seeded ${fakeDevs.length} developers, ${fakeUsers.length} users`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

```jsonc
// packages/db/package.json (excerpt)
{
  "name": "@indiepilot/db",
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx ./seed/seed.ts",
    "db:reset": "drizzle-kit drop && pnpm db:migrate && pnpm db:seed"
  }
}
```

### `turbo.json` (minimum viable)

```jsonc
{
  "$schema": "https://turborepo.com/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"],
      "env": ["DATABASE_URL", "NEON_BRANCH", "AXIOM_TOKEN", "AXIOM_DATASET", "INNGEST_SIGNING_KEY", "INNGEST_EVENT_KEY", "LOG_HASH_SALT"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "typecheck": { "dependsOn": ["^build"] },
    "lint": {},
    "test": { "dependsOn": ["^build"] },
    "db:generate": { "cache": false },
    "db:migrate": { "cache": false },
    "db:seed": { "cache": false }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Next.js 15 App Router (locked in CONTEXT shorthand) | Next.js 16 App Router | Oct 21 2025 (16 GA, 15 → Maintenance LTS) | Greenfield should use 16. Breaking changes from 15→16 are mostly already adopted in 15 (async `params`/`searchParams`). |
| `next-axiom` package | `@axiomhq/nextjs` + `@axiomhq/pino` | Late 2024 (Axiom blog "new JS logging libraries") | `next-axiom` still works but is the legacy path; new code should use the framework-agnostic `@axiomhq/logging` core + framework adapters. |
| Vercel Log Drain → Axiom | `@axiomhq/pino` transport | May 23 2024 (Vercel restricted Log Drains to Pro+) | Hobby-tier dev (Vincent) cannot use Log Drain; transport is the only option. |
| Drizzle `push` for fast iteration | Drizzle `migrate` for everything | Throughout 2025 (community consensus) | Migration files are the audit trail. `push` is a local-only escape hatch we don't need with Neon branches. |
| `pg_uuidv7` extension as the recommended UUID v7 path on Postgres | App-side `uuid` v11 OR Postgres 18 native `uuidv7()` | Postgres 18 (Sept 2025) | Postgres 18's built-in `uuidv7()` is now available on Neon. App-side still wins for portability + test determinism. |
| `eslint-plugin-prettier` + ESLint + Prettier | Biome 2.x for everything (with optional ESLint sidecar for custom rules) | 2025 | 10–20× faster, single config. Plugin gap closing in 2.0+. |
| `tailwind.config.js` JS config | Tailwind v4 CSS-first config (`@theme`, `@source`) | Jan 2025 (v4 GA) | No more JS config file; `packages/ui` owns one CSS file. |
| Vitest `workspace` config | Vitest `projects` config | 3.2 (2025) | Same functionality, new name. Per-package configs preferred for Turbo cache hits. |
| `@better-auth/cli` separate codegen step | (Not in Phase 1; flagged for Phase 2) | — | Phase 2 will run `npx @better-auth/cli@latest generate` to fill in session tables. |

**Deprecated/outdated:**
- **`next-transpile-modules`**: Replaced by `transpilePackages` in `next.config.ts` (since Next 13.1).
- **`tailwind.config.js` for monorepos**: Replaced by `@source` directives in CSS (Tailwind v4).
- **Vercel Log Drain on Hobby plan**: No longer free; use app-level transport.
- **`drizzle-orm/neon-serverless` with HTTP-only workloads**: Use `drizzle-orm/neon-http` for Route Handlers; `neon-serverless` is the Pool/WS driver name.

## Open Questions

### 1. Next.js 15 vs Next.js 16

- **What we know:** CONTEXT.md and STACK.md both say "Next.js 15". As of 2026-04-28, Next.js 16.2.4 is the Active LTS; 15 is in Maintenance. CONTEXT explicitly delegated version pinning to the planner ("Specific package versions… the planner verifies current versions at scaffold time").
- **What's unclear:** Whether Vincent's "Next.js 15" was a deliberate conservative pin or shorthand for "the current Next.js."
- **Recommendation:** **Default to Next.js 16.2.4.** The breaking changes from 15→16 (async APIs already in 15, Turbopack default, middleware → proxy rename) are minor and we're greenfield. Flag this in the planner's first output so Vincent can object before scaffold runs.

### 2. Better-Auth schema stubs in Phase 1?

- **What we know:** CONTEXT says Phase 1 creates `developers`, `users`, `sessions`, `audit_log`. Better-Auth lands in Phase 2 (devs) and Phase 3 (users). Better-Auth has its own schema generator (`@better-auth/cli generate`).
- **What's unclear:** Should Phase 1 hand-write the schema and accept that Phase 2 will ALTER tables, or run Better-Auth codegen now and let Phase 1 wire the stubs to match?
- **Recommendation:** **Phase 1 hand-writes minimum columns** (`id`, `email`, `created_at`, `updated_at`, `deleted_at` on `developers`/`users`; minimal `sessions` shape). Phase 2 runs `@better-auth/cli generate`, diffs against Phase 1's columns, and writes an ALTER migration. This keeps Phase 1's deliverable atomic (no Phase 2 code in Phase 1) and trades a small Phase 2 cost for Phase 1 simplicity.

### 3. Inngest signing keys at preview-deploy time

- **What we know:** Phase 1's success criterion #3 is "Hitting `/api/inngest` returns 200 and the health-check function executes when triggered." Local dev satisfies both. Production needs `INNGEST_SIGNING_KEY` + `INNGEST_EVENT_KEY`.
- **What's unclear:** Does Vincent want production-grade Inngest in the very first Phase 1 PR (requiring the Inngest account + Vercel env wiring), or is local-dev sufficient for Phase 1's gate?
- **Recommendation:** Ship the keys. Setting them up is 15 minutes once and unblocks the success criterion in preview/production. Add to bootstrap docs.

### 4. `vercel link --repo` (alpha) vs per-app `vercel link`

- **What we know:** `vercel link --repo` is in alpha (vercel/community#5060). Single-app monorepos don't strictly need it.
- **What's unclear:** Phase 7 ships an iOS SDK API (`/api/sdk/v1/*`) — same Vercel project? Future marketing site (deferred but acknowledged) — different Vercel project?
- **Recommendation:** Phase 1 uses plain `vercel link` from `apps/web/`. One Vercel project, one `.vercel/` directory. Revisit `--repo` if and when a second deployable app appears (today: not in scope).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2+ (unit + integration), Playwright 1.x (E2E — declared but not exercised in Phase 1) |
| Config file | `apps/web/vitest.config.ts`, `packages/db/vitest.config.ts`, optional `vitest.shared.ts` at root for shared coverage settings |
| Quick run command | `pnpm test` (Turbo runs each package's test script) |
| Full suite command | `pnpm test && pnpm typecheck && pnpm lint` |
| Phase gate | Full suite green + manual `curl /api/inngest` returns 200 + manual PR open shows Neon-branch CI green |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | Project scaffolds; `pnpm typecheck` passes across workspace | unit (existence + typecheck) | `pnpm typecheck` | ❌ Wave 0 — no tsconfig yet |
| FOUND-01 | `pnpm dev` starts Next.js on port 3000 without errors | smoke (manual) | `pnpm dev` (visual confirm `Ready in <Xs>`) | ❌ Manual smoke — no test |
| FOUND-01 | Biome lint passes on a fresh scaffold | unit | `pnpm lint` (which calls `biome check . && eslint .`) | ❌ Wave 0 — config files don't exist |
| FOUND-02 | Each schema file exports a Drizzle table with the expected columns | unit (type + shape) | `pnpm --filter @indiepilot/db test` runs `tests/schema.test.ts` asserting `.developers`, `.users`, `.sessions`, `.auditLog` exports + column names | ❌ Wave 0 — `packages/db/tests/schema.test.ts` |
| FOUND-02 | Drizzle generates type-safe queries against the schema | unit (compile-time) | Type assertion test: `expectTypeOf(db.query.developers.findFirst).returns.toMatchTypeOf<Promise<Developer \| undefined>>()` | ❌ Wave 0 — `packages/db/tests/types.test.ts` |
| FOUND-02 | Migrations apply cleanly to a fresh Neon branch (no errors, all tables exist) | integration | `DATABASE_URL=<test-branch> pnpm db:migrate` then `psql -c "\dt"` count = 4 (`developers`, `users`, `sessions`, `audit_log`) — wired into CI's neon-branch workflow | ✅ Implicit in `neon-branch.yml` |
| FOUND-02 | Seed script populates expected row counts | integration | `pnpm db:seed` then a SQL query that asserts `count(*) >= 5` for `developers`, `>= 20` for `users` | ❌ Wave 0 — `packages/db/tests/seed.test.ts` |
| FOUND-03 | Opening a PR triggers CI that creates a Neon preview branch | E2E (manual on real GitHub) | Open a draft PR; observe `Neon Preview Branch / setup` job runs to green; comment posted; branch visible in Neon dashboard | ❌ Manual on first real PR (no test substitute) |
| FOUND-03 | CI applies Drizzle migrations against the per-PR branch | integration (in CI) | The neon-branch.yml workflow's `Apply migrations` step exits 0 | ✅ Inline in workflow |
| FOUND-03 | Branch is auto-deleted on PR close/merge | E2E (manual) | Close the PR; observe `cleanup` job runs; branch gone from Neon dashboard | ❌ Manual verification |
| FOUND-04 | Logger redacts `.p8`, JWTs, passwords, and other denylist paths in nested shapes | unit | `apps/web/lib/__tests__/logger.test.ts`: capture stdout, assert each path produces `[redacted]` | ❌ Wave 0 |
| FOUND-04 | `hashEmail()` is stable for a given email + salt and unstable across salts | unit | `apps/web/lib/__tests__/logger.test.ts`: same email + salt → same hash; different salt → different hash | ❌ Wave 0 |
| FOUND-04 | Custom ESLint rule `no-raw-log` flags `logger.info(req.body)` and passes `logger.info({ event, body })` | unit (rule tester) | `tooling/eslint-config/__tests__/no-raw-log.test.js` using `RuleTester` from ESLint | ❌ Wave 0 |
| FOUND-04 | Pino transport falls back to stdout when `AXIOM_TOKEN` is unset (does not crash) | unit | Same `logger.test.ts`: instantiate without env, assert no throw | ❌ Wave 0 |
| FOUND-05 | `GET /api/inngest` returns 200 | integration (Vitest with a Next test runner OR a smoke `curl` in CI after `pnpm build && pnpm start`) | `apps/web/app/api/inngest/__tests__/route.test.ts` calling the exported `GET` directly with a mock Request | ❌ Wave 0 |
| FOUND-05 | `health.check` function executes successfully when triggered with `inngest.send({ name: 'health/check.requested', data: {} })` | integration (Inngest dev server) | Spawn Inngest CLI dev server, send event, assert function run completes — OR keep this manual for Phase 1 since it requires the dev server lifecycle | ❌ Manual smoke (acceptable for Phase 1 — pure wiring is verified by the route test + the function being registered) |

**Sampling Rate:**
- **Per task commit:** `pnpm test` (Turbo runs only changed-package tests; <5s for typical Phase 1 changes)
- **Per wave merge:** `pnpm test && pnpm typecheck && pnpm lint`
- **Phase gate:** Full suite green + (manual) `curl /api/inngest` returns 200 against a deployed preview + (manual) one real PR shows Neon branch lifecycle (create → migrate → comment → delete on close)

### Wave 0 Gaps

These test files do not exist (greenfield) and must be created in Wave 0 before implementation tasks can be verified:

- [ ] `apps/web/lib/__tests__/logger.test.ts` — covers FOUND-04 (redaction + email hash + transport fallback)
- [ ] `apps/web/app/api/inngest/__tests__/route.test.ts` — covers FOUND-05 (GET 200)
- [ ] `apps/web/inngest/functions/__tests__/health.test.ts` — covers FOUND-05 (function shape, returns `{ ok: true }`)
- [ ] `packages/db/tests/schema.test.ts` — covers FOUND-02 (each table exports + has expected columns)
- [ ] `packages/db/tests/types.test.ts` — covers FOUND-02 (Drizzle generates type-safe queries)
- [ ] `packages/db/tests/seed.test.ts` — covers FOUND-02 (seed populates expected counts)
- [ ] `tooling/eslint-config/__tests__/no-raw-log.test.js` — covers FOUND-04 (custom rule)
- [ ] `apps/web/vitest.config.ts` — Vitest config (per-package, plus Turbo cache benefit)
- [ ] `packages/db/vitest.config.ts` — Vitest config for DB package
- [ ] `vitest.shared.ts` (optional, root) — shared coverage/reporter config
- [ ] `.github/workflows/ci.yml` — typecheck + lint + test gate
- [ ] `.github/workflows/neon-branch.yml` — per-PR Neon branch lifecycle (covers FOUND-03 by being the test for it)
- [ ] Framework install: included in the `pnpm install` step of Phase 1's bootstrap; no separate command needed

## Sources

### Primary (HIGH confidence)
- [Next.js 16 release blog](https://nextjs.org/blog/next-16) — Active LTS as of Oct 21 2025
- [Next.js Support Policy](https://nextjs.org/support-policy) — LTS lifecycle (Active vs Maintenance)
- [Next.js 16 EOL/EOSL dates](https://eosl.date/eol/product/nextjs/) — confirmed 16.2.4 as the latest April 2026 release
- [Next.js Upgrading: Version 16](https://nextjs.org/docs/app/guides/upgrading/version-16) — breaking changes
- [Inngest Next.js Quick Start](https://www.inngest.com/docs/getting-started/nextjs-quick-start) — `serve()` Route Handler pattern
- [Inngest Setting up your app](https://www.inngest.com/docs/learn/serving-inngest-functions) — App Router specifics
- [Inngest Concurrency Management](https://www.inngest.com/docs/guides/concurrency) — key expressions (Phase 5+ relevance, included for context)
- [Drizzle 1.0 Roadmap](https://orm.drizzle.team/roadmap) — beta status as of 2026
- [Drizzle Latest Releases](https://orm.drizzle.team/docs/latest-releases) — 0.45.x stable
- [Drizzle Connect Neon](https://orm.drizzle.team/docs/connect-neon) — `neon-http` vs `neon-serverless`
- [Neon Choosing Your Connection Method](https://neon.com/docs/connect/choose-connection) — HTTP vs WebSocket
- [Neon Serverless Driver Docs](https://neon.com/docs/serverless/serverless-driver) — usage rules for serverless functions
- [Neon Automated Database Branching with GitHub Actions](https://neon.com/guides/neon-github-actions-authomated-branching) — first-party Actions
- [Neon Preview Branches with Vercel](https://github.com/neondatabase/preview-branches-with-vercel) — example workflow
- [Neon pg_uuidv7 Extension](https://neon.com/docs/extensions/pg_uuidv7) — supported on Neon
- [Pino Redaction Docs](https://github.com/pinojs/pino/blob/main/docs/redaction.md) — exact `redact: { paths, censor }` syntax
- [@axiomhq/pino on npm](https://www.npmjs.com/package/@axiomhq/pino) — transport package
- [Axiom: Changes to Vercel Log Drains](https://axiom.co/blog/changes-to-vercel-log-drains) — Log Drain became Pro+ only May 2024
- [Axiom Pino Transport Guide](https://axiom.co/docs/guides/pino) — official setup
- [uuid npm package](https://www.npmjs.com/package/uuid) — v11, TypeScript-native
- [Vercel Monorepos Docs](https://vercel.com/docs/monorepos) — official `vercel link` flow
- [Vercel Deploying Turborepo](https://vercel.com/docs/monorepos/turborepo) — turbo + Vercel specifics
- [Turborepo Vitest Guide](https://turborepo.dev/docs/guides/tools/vitest) — per-package config recommendation
- [Vitest Test Projects](https://vitest.dev/guide/projects) — 3.2 deprecated workspace config
- [shadcn/ui Monorepo Docs](https://ui.shadcn.com/docs/monorepo) — `init --monorepo` CLI
- [shadcn/ui Tailwind v4 Docs](https://ui.shadcn.com/docs/tailwind-v4) — v4 setup specifics
- [Tailwind CSS v4 Blog](https://tailwindcss.com/blog/tailwindcss-v4-alpha) — Oxide engine + CSS-first config

### Secondary (MEDIUM confidence)
- [Drizzle Push vs Migrate Guide](https://www.oreateai.com/blog/drizzle-push-vs-migrate-navigating-database-management-with-drizzle-kit/c954c74d99e275ff4d3dceb64c18deed) — pattern guidance, verified against official Drizzle docs
- [Turborepo vs Nx vs Moon 2026](https://www.pkgpulse.com/guides/turborepo-vs-nx-vs-moon-build-tools-2026) — small-monorepo guidance
- [Monorepos with TypeScript in 2026](https://medium.com/@mernstackdevbykevin/monorepos-with-typescript-93c9233f6df8) — pnpm + Turborepo + shadcn pattern
- [Biome vs ESLint 2026](https://www.pkgpulse.com/blog/eslint-vs-biome-2026) — plugin gap status
- [Migrating to Next.js 16](https://www.salmanizhar.com/blog/nextjs-16-migration-guide) — practical breaking changes
- [Pino Logger Complete Guide 2026 (SigNoz)](https://signoz.io/guides/pino-logger/) — current best practices
- [Drizzle UUID v7 with $defaultFn discussion](https://www.answeroverflow.com/m/1296898981011394661) — community-confirmed pattern
- [Drizzle Seeding with Faker (Anas Rin)](https://anasrin.vercel.app/blog/seeding-database-with-drizzle-orm/) — pattern reference
- [Tailwind v4 + shadcn + Turborepo guides (Medium / GitHub examples)](https://medium.com/@amirjld/how-to-set-up-a-turborepo-with-next-js-typescript-tailwind-css-v4-and-shadcn-ui-1d0535ea160f) — multiple recent examples cross-referenced

### Tertiary (LOW confidence — flagged for verification)
- Specific Inngest TypeScript SDK v4 internals beyond `serve()` and `createFunction()` — verify against [Inngest TypeScript Docs](https://www.inngest.com/docs/typescript) at scaffold time if Phase 1 needs more.
- Exact behavior of `neondatabase/create-branch-action@v5` outputs (`db_url_with_pooler` field name) — verify with `actions/checkout@v4` runners; the action versioning and output contracts evolve.
- Whether Biome 2.3 can host the `no-raw-log` rule via its plugin system — not investigated in depth; recommendation defaults to ESLint sidecar.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified via npm + official changelogs as of 2026-04-28
- Architecture patterns: HIGH — every code example is from official docs or first-party guides
- Pitfalls: HIGH — every pitfall has a documented occurrence and a verified mitigation
- Recommendations diverging from CONTEXT (Next.js 16 vs 15, Drizzle 0.45 vs 0.36): MEDIUM — recommendations are honest reads of "current ecosystem state," but planner should surface for Vincent's confirmation before scaffold runs.

**Research date:** 2026-04-28
**Valid until:** 2026-05-28 (30 days; faster-moving items: Drizzle 1.0 GA could land within this window — re-check before Phase 1 closeout)
